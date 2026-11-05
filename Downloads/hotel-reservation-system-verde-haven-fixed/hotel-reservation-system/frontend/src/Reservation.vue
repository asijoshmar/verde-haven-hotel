
<script setup>
import { ref, computed, onMounted } from "vue";
import axios from "axios";
import DemoGCashPayment from "./DemoGCashPayment.vue";

const emit = defineEmits(["browse-rooms"]);

const API = "http://localhost:4000/api";

// RESERVATION STATE
const reservations = ref([]);
const loading = ref(true);
const error = ref("");

// GCASH PAYMENT STATE
const selectedReservation = ref(null);
const demoToken = ref("");
const paymentError = ref("");

// CURRENT LOGGED-IN USER
function getSavedUser() {
  try {
    return JSON.parse(
      localStorage.getItem("user") || "null"
    );
  } catch {
    return null;
  }
}

const user = getSavedUser();

// FETCH RESERVATIONS FROM POSTGRESQL
async function fetchReservations() {
  error.value = "";

  if (!user?.id) {
    error.value =
      "Please log in again to view your reservations.";
    loading.value = false;
    return;
  }

  loading.value = true;

  try {
    const response = await axios.get(
      `${API}/reservations/user/${user.id}`
    );

    const data = response.data;

    reservations.value = Array.isArray(data)
      ? data
      : Array.isArray(data?.reservations)
        ? data.reservations
        : [];

  } catch (err) {
    console.error("Reservations error:", err);

    error.value =
      err.response?.data?.message ||
      "Unable to load reservations. Please try again.";

  } finally {
    loading.value = false;
  }
}

// GO TO ROOMS
function browseRooms() {
  emit("browse-rooms");
}

// NORMALIZE RESERVATION STATUS
function normalizedStatus(status) {
  return String(status || "pending")
    .trim()
    .toLowerCase();
}

// STATUS CSS CLASS
function statusClass(status) {
  const value = normalizedStatus(status);

  if (value.includes("cancel")) {
    return "cancelled";
  }

  if (value.includes("complete")) {
    return "completed";
  }

  if (value.includes("confirm")) {
    return "confirmed";
  }

  if (value.includes("paid")) {
    return "paid";
  }

  return "pending";
}

// GET TOKEN SAVED DURING BOOKING
function tokenForReservation(reservation) {
  if (!reservation?.id) return "";

  // Check token saved for this reservation.
  const directToken = sessionStorage.getItem(
    `verde_demo_token_${reservation.id}`
  );

  if (directToken) {
    return directToken;
  }

  // Fallback to most recent checkout.
  try {
    const saved = JSON.parse(
      sessionStorage.getItem("verde_demo_checkout") ||
      "null"
    );

    const sameReservation =
      String(saved?.reservation?.id) ===
      String(reservation.id);

    const sameGuest =
      String(saved?.reservation?.user_id) ===
      String(user?.id);

    if (
      sameReservation &&
      sameGuest &&
      typeof saved?.token === "string"
    ) {
      return saved.token;
    }

  } catch (err) {
    console.warn(
      "Invalid saved demo checkout:",
      err
    );
  }

  return "";
}

// OPEN GCASH PAYMENT MODAL
function openPayment(reservation) {
  if (statusClass(reservation.status) !== "pending") {
    return;
  }

  selectedReservation.value = reservation;

  demoToken.value =
    tokenForReservation(reservation);

  paymentError.value = demoToken.value
    ? ""
    : "No demo payment token found. Please create a new test booking.";
}

// CLOSE PAYMENT MODAL
async function closePayment() {
  selectedReservation.value = null;
  demoToken.value = "";
  paymentError.value = "";

  // Refresh so admin-approved bookings show as confirmed.
  await fetchReservations();
}

// FORMAT DATE
function formatDate(value) {
  if (!value) return "—";

  const raw = String(value);

  const date =
    /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? new Date(`${raw}T12:00:00`)
      : new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

// FORMAT PHP CURRENCY
function formatMoney(value) {
  return Number(value || 0).toLocaleString(
    "en-PH",
    {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );
}

// SUMMARY COUNTERS
const totalBookings = computed(() =>
  reservations.value.length
);

const pendingCount = computed(() =>
  reservations.value.filter(
    reservation =>
      statusClass(reservation.status) === "pending"
  ).length
);

const confirmedCount = computed(() =>
  reservations.value.filter(
    reservation =>
      statusClass(reservation.status) === "confirmed"
  ).length
);

// RESERVATION REFERENCE
function reservationNumber(reservation) {
  const id =
    reservation.reservation_id ??
    reservation.id ??
    reservation.booking_id;

  return id == null
    ? "—"
    : `VH-${String(id).padStart(5, "0")}`;
}

// ROOM NAME
function roomName(reservation) {
  return (
    reservation.room_type ||
    reservation.room_name ||
    reservation.name ||
    (
      reservation.room_number
        ? `Room ${reservation.room_number}`
        : "Reserved Room"
    )
  );
}

// GUEST COUNT
function guestCount(reservation) {
  return (
    reservation.guests_count ??
    reservation.number_of_guests ??
    reservation.guest_count ??
    reservation.guests ??
    1
  );
}

// ROOM IMAGE
function roomImage(reservation) {
  const suppliedImage =
    reservation.room_image_url ||
    reservation.room_image ||
    reservation.image_url ||
    reservation.image ||
    reservation.photo_url;

  if (suppliedImage) {
    return suppliedImage;
  }

  const name = roomName(reservation).toLowerCase();

  if (
    name.includes("family") ||
    name.includes("deluxe") ||
    name.includes("superior")
  ) {
    return "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=500&q=80";
  }

  return "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=500&q=80";
}

// LOAD ON PAGE OPEN
onMounted(fetchReservations);
</script>

<template>
  <main class="reservations-page">

    <!-- PAGE HEADER -->
    <header class="page-heading">
      <div>
        <div class="breadcrumb">
          <span>VERDE HAVEN</span>
          <span class="breadcrumb-slash">/</span>
          <strong>My Reservations</strong>
        </div>

        <div class="eyebrow">
          YOUR JOURNEY WITH US
        </div>

        <h1>My Reservations</h1>

        <p class="subtitle">
          View your bookings, stay details,
          and reservation status.
        </p>
      </div>

      <button
        class="refresh-button"
        type="button"
        :disabled="loading"
        @click="fetchReservations"
      >
        ↻ {{ loading ? "Loading..." : "Refresh" }}
      </button>
    </header>

    <!-- SUMMARY CARDS -->
    <section class="summary-grid">

      <!-- TOTAL BOOKINGS -->
      <article class="summary-card">
        <div class="summary-icon green-icon">
          ▣
        </div>

        <div class="summary-content">
          <span>Total Bookings</span>
          <strong>{{ totalBookings }}</strong>
          <small>All your reservations</small>
        </div>
      </article>

      <!-- PENDING -->
      <article class="summary-card">
        <div class="summary-icon gold-icon">
          ◷
        </div>

        <div class="summary-content">
          <span>Pending</span>
          <strong>{{ pendingCount }}</strong>
          <small>Awaiting confirmation</small>
        </div>
      </article>

      <!-- CONFIRMED -->
      <article class="summary-card">
        <div class="summary-icon sage-icon">
          ✓
        </div>

        <div class="summary-content">
          <span>Confirmed</span>
          <strong>{{ confirmedCount }}</strong>
          <small>Ready for your stay</small>
        </div>
      </article>
    </section>

    <!-- BOOKINGS PANEL -->
    <section class="booking-panel">
      <header class="panel-heading">
        <div>
          <h2>Your Reservations</h2>
        </div>

        <button
          class="book-room-button"
          type="button"
          @click="browseRooms"
        >
          ＋ Book a Room
        </button>
      </header>

      <!-- LOADING -->
      <div
        v-if="loading"
        class="state-panel"
      >
        <div class="spinner"></div>

        <h3>Loading your reservations</h3>

        <p>
          Please wait while we retrieve
          your bookings.
        </p>
      </div>

      <!-- ERROR -->
      <div
        v-else-if="error"
        class="state-panel"
      >
        <h3>Unable to load reservations</h3>

        <p>{{ error }}</p>

        <button
          class="book-room-button"
          type="button"
          @click="fetchReservations"
        >
          Try Again
        </button>
      </div>

      <!-- EMPTY -->
      <div
        v-else-if="reservations.length === 0"
        class="empty-panel"
      >
        <div class="empty-icon">
          ⌂
        </div>

        <h3>No reservations yet</h3>

        <p>
          Your next relaxing getaway starts here.
        </p>

        <button
          class="book-room-button"
          type="button"
          @click="browseRooms"
        >
          Explore Our Rooms →
        </button>
      </div>

      <!-- RESERVATION CARDS -->
      <div
        v-else
        class="reservation-list"
      >
        <article
          v-for="reservation in reservations"
          :key="reservation.id"
          class="reservation-card"
        >

          <!-- ROOM PHOTO -->
          <img
            class="room-photo"
            :src="roomImage(reservation)"
            :alt="roomName(reservation)"
            loading="lazy"
          />

          <!-- ROOM INFORMATION -->
          <div class="room-information">
            <span class="reservation-reference">
              RESERVATION NO.
              {{ reservationNumber(reservation) }}
            </span>

            <h3>
              {{ roomName(reservation) }}
            </h3>

            <div class="detail-line">
              <span>▣</span>

              {{ formatDate(reservation.check_in) }}
              –
              {{ formatDate(reservation.check_out) }}
            </div>

            <div class="detail-line">
              <span>♙</span>

              {{ guestCount(reservation) }}

              {{
                Number(guestCount(reservation)) === 1
                  ? "Guest"
                  : "Guests"
              }}
            </div>
          </div>

          <!-- PRICE AND STATUS -->
          <div class="room-price">
            <span
              class="status-badge"
              :class="statusClass(reservation.status)"
            >
              {{ reservation.status || "Pending" }}
            </span>

            <strong>
              {{
                formatMoney(
                  reservation.total_amount
                )
              }}
            </strong>

            <small>Total Amount</small>
          </div>

          <!-- ACTIONS -->
          <div class="reservation-actions">

            <!-- PAYMENT BUTTON -->
            <button
              v-if="
                statusClass(reservation.status) ===
                'pending'
              "
              class="pay-button"
              type="button"
              @click="openPayment(reservation)"
            >
              Continue to Payment →
            </button>

            <!-- CONFIRMED -->
            <div
              v-else-if="
                statusClass(reservation.status) ===
                'confirmed'
              "
              class="confirmed-label"
            >
              ✓ Booking Confirmed
            </div>

            <!-- CANCELLED -->
            <div
              v-else-if="
                statusClass(reservation.status) ===
                'cancelled'
              "
              class="cancelled-label"
            >
              × Cancelled
            </div>

            <!-- OTHER STATUS -->
            <div
              v-else
              class="other-label"
            >
              {{ reservation.status || "Pending" }}
            </div>

            <button
              class="details-button"
              type="button"
              disabled
            >
              View Details
            </button>
          </div>

        </article>
      </div>
    </section>

    <!-- PAGE FOOTER -->
    <footer class="page-footer">
      <span>
        VERDE HAVEN BOUTIQUE HOTEL
      </span>

      <span>
        Stay. Relax. Discover.
      </span>
    </footer>

    <!-- GCASH QR DEMO PAYMENT MODAL -->
    <div
      v-if="selectedReservation"
      class="modal-overlay"
      @click.self="closePayment"
    >
      <section
        class="payment-modal"
        role="dialog"
        aria-modal="true"
        aria-label="GCash demo QR checkout"
      >

        <!-- CLOSE -->
        <button
          type="button"
          class="modal-close"
          aria-label="Close payment modal"
          @click="closePayment"
        >
          ×
        </button>

        <!-- PAYMENT COMPONENT -->
        <DemoGCashPayment
          v-if="demoToken"
          :reservation="selectedReservation"
          :demo-token="demoToken"
        />

        <!-- MISSING TOKEN -->
        <div
          v-else
          class="payment-unavailable"
        >
          <div class="modal-logo">
            VH
          </div>

          <h2>Demo Checkout Unavailable</h2>

          <p class="payment-error">
            {{ paymentError }}
          </p>

          <p>
            Your reservation was found, but its
            demo payment token is not available
            in this browser session.
          </p>

          <p>
            For testing, create a new reservation
            after connecting the booking form
            to the demo token storage.
          </p>

          <button
            type="button"
            class="cancel-button"
            @click="closePayment"
          >
            Close
          </button>
        </div>
      </section>
    </div>

  </main>
</template>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap");

/* GENERAL */
.reservations-page {
  --forest: #10372d;
  --forest-light: #1b4c3c;
  --gold: #c9aa70;
  --cream: #f7f5ee;
  --ink: #193b30;
  --muted: #77837b;
  --border: #e7e2d6;

  min-height: 100%;
  padding: 27px 30px;
  background: var(--cream);
  color: var(--ink);
  font-family: "DM Sans", sans-serif;
}

.reservations-page * {
  box-sizing: border-box;
}

.reservations-page button {
  font: inherit;
  cursor: pointer;
}

.reservations-page button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

/* HEADER */
.page-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 23px;
}

.breadcrumb {
  display: flex;
  gap: 9px;
  margin-bottom: 23px;
  color: #8b9489;
  font-size: 9px;
  letter-spacing: 1px;
}

.breadcrumb strong {
  color: var(--forest);
}

.breadcrumb-slash {
  color: var(--gold);
}

.eyebrow {
  margin-bottom: 5px;
  color: #a27d43;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.6px;
}

.page-heading h1,
.panel-heading h2,
.room-information h3,
.state-panel h3,
.empty-panel h3 {
  margin: 0;
  color: var(--forest);
  font-family: "Playfair Display", Georgia, serif;
  font-weight: 600;
}

.page-heading h1 {
  font-size: 34px;
}

.subtitle {
  margin: 7px 0 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.7;
}

.refresh-button {
  padding: 9px 13px;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: white;
  color: var(--forest);
  font-size: 10px !important;
}

/* SUMMARY CARDS */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 19px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 77px;
  padding: 12px 14px;
  border: 1px solid #e7e8e1;
  border-radius: 5px;
  background: #fff;
}

.summary-icon {
  display: grid;
  place-items: center;
  width: 39px;
  height: 39px;
  flex-shrink: 0;
  border-radius: 50%;
  font-size: 18px;
}

.green-icon,
.sage-icon {
  background: #e0ebdf;
  color: #326748;
}

.gold-icon {
  background: #f6e9d0;
  color: #a57b39;
}

.summary-content {
  display: grid;
  gap: 2px;
}

.summary-content span {
  color: #647b70;
  font-size: 10px;
}

.summary-content strong {
  color: var(--forest);
  font-family: "Playfair Display", Georgia, serif;
  font-size: 23px;
  line-height: 1.15;
}

.summary-content small {
  color: #90978e;
  font-size: 9px;
}

/* RESERVATION PANEL */
.booking-panel {
  padding: 15px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: white;
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 15px;
}

.panel-heading h2 {
  font-size: 21px;
}

.book-room-button {
  padding: 10px 13px;
  border: 1px solid var(--forest);
  border-radius: 5px;
  background: var(--forest);
  color: white;
  font-size: 10px !important;
  font-weight: 700 !important;
}

.book-room-button:hover,
.pay-button:hover {
  background: var(--forest-light);
}

/* RESERVATION CARDS */
.reservation-list {
  display: grid;
  gap: 10px;
}

.reservation-card {
  display: grid;
  grid-template-columns:
    125px minmax(150px, 1fr) 150px 155px;
  align-items: center;
  gap: 15px;
  padding: 9px;
  border: 1px solid #e8e7df;
  border-radius: 6px;
  background: #fffefa;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.reservation-card:hover {
  border-color: #d2c29f;
  box-shadow: 0 5px 15px #193b300b;
}

.room-photo {
  display: block;
  width: 125px;
  height: 91px;
  border-radius: 4px;
  object-fit: cover;
  background: #e6e9df;
}

.room-information {
  min-width: 0;
}

.reservation-reference {
  color: #a27d43;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.6px;
}

.room-information h3 {
  margin: 5px 0;
  font-size: 18px;
  overflow-wrap: anywhere;
}

.detail-line {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 5px;
  color: #77837b;
  font-size: 9px;
  line-height: 1.4;
}

.detail-line span {
  color: #527468;
}

.room-price {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  padding-left: 14px;
  border-left: 1px solid #ece8df;
}

.status-badge {
  display: inline-block;
  padding: 5px 9px;
  border-radius: 20px;
  background: #f8efd9;
  color: #966e30;
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
}

.status-badge.confirmed,
.status-badge.paid {
  background: #dff0e4;
  color: #33734b;
}

.status-badge.cancelled {
  background: #fbe4e7;
  color: #b44b59;
}

.status-badge.completed {
  background: #e7edf5;
  color: #4d6588;
}

.room-price > strong {
  color: var(--forest);
  font-size: 15px;
  overflow-wrap: anywhere;
}

.room-price > small {
  margin-top: -5px;
  color: #89938a;
  font-size: 9px;
}

/* RESERVATION ACTIONS */
.reservation-actions {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

.pay-button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 10px 8px;
  border: 1px solid var(--forest);
  border-radius: 5px;
  background: var(--forest);
  color: white;
  font-size: 9px !important;
  font-weight: 700 !important;
}

.details-button {
  width: 100%;
  padding: 9px 8px;
  border: 1px solid #b9cbc0;
  border-radius: 5px;
  background: transparent;
  color: var(--forest);
  font-size: 9px !important;
}

.confirmed-label,
.cancelled-label,
.other-label {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 33px;
  padding: 7px 5px;
  border-radius: 5px;
  font-size: 9px;
  font-weight: 700;
  text-align: center;
}

.confirmed-label {
  background: #e6f2eb;
  color: #36724b;
}

.cancelled-label {
  background: #fbecef;
  color: #b34b59;
}

.other-label {
  background: #f6f1e4;
  color: #98753d;
  text-transform: capitalize;
}

/* LOADING / EMPTY STATES */
.state-panel,
.empty-panel {
  padding: 40px 15px;
  text-align: center;
}

.state-panel h3,
.empty-panel h3 {
  margin-bottom: 8px;
  font-size: 23px;
}

.state-panel p,
.empty-panel p {
  margin: 0 auto 17px;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.8;
}

.spinner {
  width: 29px;
  height: 29px;
  margin: 0 auto 14px;
  border: 2px solid #e5e9df;
  border-top-color: var(--forest);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.empty-icon {
  display: grid;
  place-items: center;
  width: 53px;
  height: 53px;
  margin: 0 auto 15px;
  border-radius: 50%;
  background: #e7eee4;
  color: var(--forest);
  font-size: 27px;
}

/* FOOTER */
.page-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 22px;
  padding-top: 13px;
  border-top: 1px solid #e6e2d8;
  color: #92998f;
  font-size: 8px;
  letter-spacing: 1px;
}

.page-footer span:last-child {
  color: #6f806e;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 12px;
  font-style: italic;
  letter-spacing: 0;
}

/* GCASH PAYMENT MODAL */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: #0a1f17b8;
  backdrop-filter: blur(4px);
}

.payment-modal {
  position: relative;
  width: 100%;
  max-width: 1050px;
  max-height: 94vh;
  overflow-y: auto;
  padding: 12px;
  border: 1px solid #e7e0d0;
  border-radius: 12px;
  background: #fffdf8;
}

.modal-close {
  position: absolute;
  z-index: 10;
  top: 10px;
  right: 12px;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: #f0f0e9;
  color: var(--forest);
  font-size: 22px;
  cursor: pointer;
}

.modal-close:hover {
  background: #e2e9dc;
}

.payment-modal :deep(.demo-checkout) {
  margin: 0;
  max-width: none;
  padding: 20px;
}

.payment-unavailable {
  padding: 34px 22px;
  line-height: 1.7;
  color: #193b30;
}

.payment-unavailable h2 {
  font-family: "Playfair Display", Georgia, serif;
  font-size: 27px;
  text-align: center;
}

.payment-unavailable p {
  color: #6f7d72;
  font-size: 13px;
}

.modal-logo {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin: 0 auto 14px;
  border: 1px solid #d8c49d;
  border-radius: 50%;
  background: #f8f1e2;
  color: #997841;
  font-family: "Playfair Display", Georgia, serif;
}

.payment-error {
  padding: 10px;
  border-radius: 6px;
  background: #fbe8e5;
  color: #a4473c !important;
}

.cancel-button {
  padding: 10px 14px;
  border: 1px solid #dedfd3;
  border-radius: 5px;
  background: white;
  color: #536456;
  font-size: 11px;
  cursor: pointer;
}

/* ANIMATION */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* TABLET */
@media (max-width: 1050px) {
  .reservation-card {
    grid-template-columns:
      105px minmax(120px, 1fr) 125px;
    gap: 12px;
  }

  .room-photo {
    width: 105px;
    height: 88px;
  }

  .reservation-actions {
    grid-column: 2 / -1;
    flex-direction: row;
  }

  .reservation-actions > * {
    flex: 1;
  }

  .room-price {
    padding-left: 10px;
  }
}

/* MOBILE */
@media (max-width: 680px) {
  .reservations-page {
    padding: 20px 12px;
  }

  .page-heading h1 {
    font-size: 29px;
  }

  .summary-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .summary-card {
    min-height: 70px;
  }

  .booking-panel {
    padding: 12px;
  }

  .panel-heading {
    align-items: flex-start;
  }

  .panel-heading h2 {
    font-size: 18px;
  }

  .book-room-button {
    max-width: 125px;
    line-height: 1.5;
  }

  .reservation-card {
    grid-template-columns:
      94px minmax(0, 1fr);
    gap: 11px;
    padding: 9px;
  }

  .room-photo {
    width: 94px;
    height: 94px;
  }

  .room-information h3 {
    font-size: 16px;
  }

  .room-price {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 6px 12px;
    padding: 10px 0 0;
    border-left: 0;
    border-top: 1px solid #ece8df;
  }

  .room-price > strong {
    justify-self: end;
  }

  .room-price > small {
    grid-column: 2;
    justify-self: end;
    margin-top: -5px;
  }

  .reservation-actions {
    grid-column: 1 / -1;
    flex-direction: column;
  }

  .page-footer {
    flex-direction: column;
  }

  .payment-modal {
    padding: 12px;
  }

  .payment-modal :deep(.demo-checkout) {
    padding: 15px;
  }
}
</style>
