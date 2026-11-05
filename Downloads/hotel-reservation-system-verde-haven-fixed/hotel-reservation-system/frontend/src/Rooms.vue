
<script setup>
import { onMounted, ref, watch } from "vue";
import { getRoomImage, getRoomName } from "./utils/roomImages.js";
import axios from "axios";
import DemoGCashPayment from "./DemoGCashPayment.vue";

const props = defineProps({
  initialRoomId: {
    type: [Number, String],
    default: null
  }
});

const rooms = ref([]);
const loading = ref(true);
const error = ref("");
const selectedRoom = ref(null);
const checkIn = ref("");
const checkOut = ref("");
const guestsCount = ref(1);
const reservationError = ref("");
const reservationLoading = ref(false);


// NEW: GCash demo payment checkout
const checkoutReservation = ref(null);
const checkoutToken = ref("");

const getRoomNumber = (room) =>
  room.room_number || room.number || room.id || "—";

const getRoomPrice = (room) =>
  Number(room.price_per_night ?? room.price ?? 0);

const getRoomCapacity = (room) =>
  Math.max(1, Number(room.capacity) || 1);

const isAvailable = (room) =>
  String(room.status || "").toLowerCase() === "available";

const formatPrice = (price) =>
  Number(price || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const todayString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// OPEN RESERVATION FORM
function openReservation(room) {
  if (!isAvailable(room)) {
    reservationError.value =
      "This room is currently unavailable.";
    return;
  }

  selectedRoom.value = room;
  checkIn.value = "";
  checkOut.value = "";
  guestsCount.value = 1;
  reservationError.value = "";
}

// OPEN ROOM SELECTED FROM 3D TOUR
function openInitialRoom() {
  if (!props.initialRoomId || !rooms.value.length) {
    return;
  }

  const room = rooms.value.find(
    item =>
      String(item.id) ===
      String(props.initialRoomId)
  );

  if (room && isAvailable(room)) {
    openReservation(room);
  } else if (room) {
    reservationError.value =
      "The selected room is currently unavailable.";
  }
}

// FETCH ROOMS FROM POSTGRESQL
async function fetchRooms() {
  loading.value = true;
  error.value = "";

  try {
    const response = await axios.get(
      "http://localhost:4000/api/rooms"
    );

    const data = response.data;

    rooms.value = Array.isArray(data)
      ? data
      : Array.isArray(data?.rooms)
        ? data.rooms
        : [];

    openInitialRoom();

  } catch (err) {
    console.error("Load rooms error:", err);

    error.value =
      err.response?.data?.message ||
      "We couldn't load the rooms. Please check that the backend is running and try again.";

  } finally {
    loading.value = false;
  }
}

watch(
  () => props.initialRoomId,
  newRoomId => {
    if (!newRoomId || !rooms.value.length) {
      return;
    }

    const room = rooms.value.find(
      item =>
        String(item.id) === String(newRoomId)
    );

    if (room && isAvailable(room)) {
      openReservation(room);
    } else if (room) {
      reservationError.value =
        "The selected room is currently unavailable.";
    }
  }
);

// CLOSE RESERVATION FORM
function closeReservation() {
  if (reservationLoading.value) return;

  selectedRoom.value = null;
  reservationError.value = "";
}

// CREATE RESERVATION AND OPEN GCASH CHECKOUT
async function reserveRoom() {
  reservationError.value = "";

  const room = selectedRoom.value;

  if (!room) return;

  if (!checkIn.value || !checkOut.value) {
    reservationError.value =
      "Please select your check-in and check-out dates.";
    return;
  }

  const today = todayString();

  if (checkIn.value < today) {
    reservationError.value =
      "Check-in cannot be in the past.";
    return;
  }

  if (checkOut.value <= checkIn.value) {
    reservationError.value =
      "Check-out date must be after check-in date.";
    return;
  }

  const guestCount = Number(guestsCount.value);
  const capacity = getRoomCapacity(room);

  if (
    !Number.isInteger(guestCount) ||
    guestCount < 1 ||
    guestCount > capacity
  ) {
    reservationError.value =
      `This room allows up to ${capacity} guests.`;
    return;
  }

  let user;

  try {
    user = JSON.parse(
      localStorage.getItem("user") || "null"
    );
  } catch (err) {
    console.error("Read user session error:", err);
    user = null;
  }

  if (!user?.id) {
    reservationError.value =
      "Your login session is invalid. Please log in again.";
    return;
  }

  try {
    reservationLoading.value = true;

    // STEP 1: SAVE BOOKING TO POSTGRESQL
    const response = await axios.post(
      "http://localhost:4000/api/reservations",
      {
        user_id: user.id,
        room_id: room.id,
        check_in: checkIn.value,
        check_out: checkOut.value,
        guests_count: guestCount
      }
    );

    // STEP 2: GET RESERVATION AND TOKEN
    const booking = response.data?.reservation;
    const token = response.data?.demo_payment_token;

    // STEP 3: SAVE DEMO PAYMENT TOKEN
    if (booking?.id && token) {
      sessionStorage.setItem(
        `verde_demo_token_${booking.id}`,
        token
      );

      sessionStorage.setItem(
        "verde_demo_checkout",
        JSON.stringify({
          reservation: booking,
          token
        })
      );

      // STEP 4: AUTOMATICALLY OPEN GCASH QR
      checkoutReservation.value = booking;
      checkoutToken.value = token;

    } else {
      window.alert(
        "Reservation created, but the demo token is missing."
      );
    }

    // STEP 5: RESET BOOKING FORM
    selectedRoom.value = null;
    checkIn.value = "";
    checkOut.value = "";
    guestsCount.value = 1;

  } catch (err) {
    console.error("Reservation error:", err);

    reservationError.value =
      err.response?.data?.message ||
      "We couldn't create your reservation. Please check your connection and try again.";

  } finally {
    reservationLoading.value = false;
  }
}

// CLOSE GCASH DEMO CHECKOUT
function closeCheckout() {
  checkoutReservation.value = null;
  checkoutToken.value = "";
}

onMounted(fetchRooms);
</script>

<template>
  <main class="rooms-page">

    <!-- PAGE HEADER -->
    <header class="page-header">
      <div>
        <span class="eyebrow">
          FIND YOUR COMFORT
        </span>

        <h1>Our Rooms &amp; Suites</h1>

        <p>
          Thoughtfully prepared spaces for a restful
          and memorable stay.
        </p>
      </div>

      <div
        v-if="!loading && !error"
        class="room-total"
      >
        <span>{{ rooms.length }}</span>

        <small>
          {{ rooms.length === 1 ? "room" : "rooms" }}
          listed
        </small>
      </div>
    </header>

    <!-- LOADING STATE -->
    <div
      v-if="loading"
      class="state-card"
    >
      <span class="loading-spinner"></span>

      <h2>Preparing your stay</h2>

      <p>
        We're getting our rooms ready for you.
      </p>
    </div>

    <!-- ERROR STATE -->
    <div
      v-else-if="error"
      class="state-card error-state"
    >
      <div class="state-icon">!</div>

      <h2>Rooms are temporarily unavailable</h2>

      <p>{{ error }}</p>

      <button
        class="retry-button"
        type="button"
        @click="fetchRooms"
      >
        Try Again
      </button>
    </div>

    <!-- EMPTY STATE -->
    <div
      v-else-if="rooms.length === 0"
      class="state-card"
    >
      <div class="state-icon">⌂</div>

      <h2>No rooms to display yet</h2>

      <p>
        Please check again later for
        available accommodation.
      </p>
    </div>

    <!-- HOTEL ROOM CARDS -->
    <section
      v-else
      class="rooms-grid"
    >
      <article
        v-for="room in rooms"
        :key="room.id"
        class="room-card"
      >
        <!-- ROOM IMAGE -->
        <div class="room-image">
          <img
            :src="getRoomImage(room)"
            :alt="getRoomName(room)"
            loading="lazy"
          />

          <span class="room-category">
            {{ getRoomName(room) }}
          </span>

          <span
            class="availability-badge"
            :class="
              isAvailable(room)
                ? 'available'
                : 'unavailable'
            "
          >
            <span class="status-dot"></span>

            {{
              room.status ||
              "Status unavailable"
            }}
          </span>

          <div class="image-caption">
            <span>VERDE HAVEN</span>
            <span>STAY. RELAX. DISCOVER.</span>
          </div>
        </div>

        <!-- ROOM CONTENT -->
        <div class="room-content">
          <div class="room-heading">
            <div>
              <span class="room-number-label">
                ROOM {{ getRoomNumber(room) }}
              </span>

              <h2>{{ getRoomName(room) }}</h2>
            </div>

            <div class="capacity-badge">
              <span>♧</span>
              {{ getRoomCapacity(room) }} guests
            </div>
          </div>

          <p class="room-description">
            {{
              room.description ||
              "A welcoming space designed for a comfortable and relaxing stay."
            }}
          </p>

          <div class="room-divider"></div>

          <div class="room-bottom">
            <div class="price-block">
              <span class="price-label">
                ROOM RATE
              </span>

              <div class="price">
                <strong>
                  ₱{{ formatPrice(getRoomPrice(room)) }}
                </strong>

                <span>/ night</span>
              </div>
            </div>

            <button
              class="reserve-button"
              type="button"
              :disabled="!isAvailable(room)"
              @click="openReservation(room)"
            >
              {{
                isAvailable(room)
                  ? "Reserve Room"
                  : "Unavailable"
              }}

              <span v-if="isAvailable(room)">
                →
              </span>
            </button>
          </div>
        </div>
      </article>
    </section>

    <!-- FOOTER -->
    <footer
      v-if="!loading && !error && rooms.length"
      class="rooms-footer"
    >
      <span class="footer-leaf">✦</span>

      <p>
        A comfortable stay, with the warm
        hospitality of Mindoro.
      </p>
    </footer>

    <!-- RESERVATION MODAL -->
    <div
      v-if="selectedRoom"
      class="modal-overlay"
      @click.self="closeReservation"
    >
      <section
        class="reservation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-title"
      >
        <button
          class="close-button"
          type="button"
          aria-label="Close reservation form"
          :disabled="reservationLoading"
          @click="closeReservation"
        >
          ×
        </button>

        <div class="modal-top">
          <span class="eyebrow">
            YOUR STAY, YOUR WAY
          </span>

          <div class="modal-icon">⌂</div>

          <h2 id="reservation-title">
            Reserve Your Stay
          </h2>

          <p>
            Let's make your next stay
            a memorable one.
          </p>
        </div>

        <!-- SELECTED ROOM SUMMARY -->
        <div class="selected-room-summary">
          <img
            :src="getRoomImage(selectedRoom)"
            :alt="getRoomName(selectedRoom)"
          />

          <div class="summary-room-details">
            <span>
              ROOM {{ getRoomNumber(selectedRoom) }}
            </span>

            <h3>
              {{ getRoomName(selectedRoom) }}
            </h3>

            <p>
              Up to
              {{ getRoomCapacity(selectedRoom) }}
              guests
            </p>
          </div>

          <div class="summary-price">
            <strong>
              ₱{{
                formatPrice(
                  getRoomPrice(selectedRoom)
                )
              }}
            </strong>

            <span>/ night</span>
          </div>
        </div>

        <!-- RESERVATION FORM -->
        <form
          class="reservation-form"
          @submit.prevent="reserveRoom"
        >
          <div class="form-row">

            <!-- CHECK IN -->
            <div class="form-group">
              <label for="check-in">
                Check-in date
              </label>

              <input
                id="check-in"
                v-model="checkIn"
                type="date"
                :min="todayString()"
                required
                :disabled="reservationLoading"
              />
            </div>

            <!-- CHECK OUT -->
            <div class="form-group">
              <label for="check-out">
                Check-out date
              </label>

              <input
                id="check-out"
                v-model="checkOut"
                type="date"
                :min="checkIn || todayString()"
                required
                :disabled="reservationLoading"
              />
            </div>
          </div>

          <!-- NUMBER OF GUESTS -->
          <div class="form-group">
            <label for="guests">
              Number of guests
            </label>

            <select
              id="guests"
              v-model.number="guestsCount"
              required
              :disabled="reservationLoading"
            >
              <option
                v-for="count in getRoomCapacity(selectedRoom)"
                :key="count"
                :value="count"
              >
                {{ count }}
                {{
                  count === 1
                    ? "Guest"
                    : "Guests"
                }}
              </option>
            </select>

            <small>
              Maximum room capacity:
              {{ getRoomCapacity(selectedRoom) }}
              guests
            </small>
          </div>

          <!-- RESERVATION ERROR -->
          <div
            v-if="reservationError"
            class="reservation-error"
            role="alert"
          >
            <span>!</span>
            {{ reservationError }}
          </div>

          <!-- FORM ACTIONS -->
          <div class="modal-actions">
            <button
              class="cancel-button"
              type="button"
              :disabled="reservationLoading"
              @click="closeReservation"
            >
              Cancel
            </button>

            <button
              class="confirm-button"
              type="submit"
              :disabled="reservationLoading"
            >
              {{
                reservationLoading
                  ? "Submitting..."
                  : "Confirm Reservation"
              }}

              <span v-if="!reservationLoading">
                →
              </span>
            </button>
          </div>

          <p class="modal-note">
            Your reservation will be submitted
            through the existing Verde Haven
            booking system.
          </p>
        </form>
      </section>
    </div>

    <!-- NEW: AUTOMATIC GCASH QR DEMO CHECKOUT -->
    <div
      v-if="checkoutReservation && checkoutToken"
      class="modal-overlay checkout-overlay"
      @click.self="closeCheckout"
    >
      <section
        class="checkout-modal"
        role="dialog"
        aria-modal="true"
        aria-label="GCash Demo QR Checkout"
      >
        <button
          class="checkout-close"
          type="button"
          aria-label="Close payment checkout"
          @click="closeCheckout"
        >
          ×
        </button>

        <DemoGCashPayment
          :reservation="checkoutReservation"
          :demo-token="checkoutToken"
        />

        <p class="checkout-footnote">
          You can check your payment status later
          under My Reservations.
          This is a demonstration only.
          No money will be transferred.
        </p>
      </section>
    </div>
    
  </main>
</template>

<style scoped>
/* ORIGINAL ROOM PAGE DESIGN */

.rooms-page {
  width: 100%;
  box-sizing: border-box;
  color: #203e30;
  font-family: "DM Sans", Arial, sans-serif;
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.eyebrow {
  display: block;
  margin-bottom: 8px;
  color: #a5824d;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 2px;
}

.page-header h1 {
  margin: 0 0 8px;
  color: #173d30;
  font-family: "Playfair Display", Georgia, serif;
  font-size: clamp(25px, 3vw, 34px);
  font-weight: 600;
  line-height: 1.2;
}

.page-header p {
  margin: 0;
  color: #788579;
  font-size: 12px;
  line-height: 1.7;
}

.room-total {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 9px 13px;
  border: 1px solid #e5e4d8;
  border-radius: 9px;
  background: #fff;
  color: #315a43;
}

.room-total span {
  font-size: 16px;
  font-weight: 800;
}

.room-total small {
  color: #7b887b;
  font-size: 10px;
}

.rooms-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
}

.room-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid #e6e3d9;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 7px 23px rgba(34, 57, 40, 0.045);
  transition: transform 0.22s ease, box-shadow 0.22s ease;
}

.room-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 13px 28px rgba(34, 57, 40, 0.09);
}

.room-image {
  position: relative;
  height: 205px;
  overflow: hidden;
  background: #d8dfd3;
}

.room-image::after {
  position: absolute;
  inset: 0;
  content: "";
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(13, 38, 29, 0.3),
    transparent 45%,
    rgba(13, 38, 29, 0.48)
  );
}

.room-image > img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.room-category,
.availability-badge,
.image-caption {
  position: absolute;
  z-index: 1;
}

.room-category {
  top: 15px;
  left: 15px;
  max-width: 55%;
  overflow: hidden;
  padding: 8px 11px;
  border-radius: 6px;
  background: rgba(17, 54, 39, 0.88);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.availability-badge {
  top: 15px;
  right: 15px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 6px;
  background: #fff;
  color: #31563d;
  font-size: 9px;
  font-weight: 700;
  text-transform: capitalize;
}

.availability-badge.unavailable {
  color: #974638;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #4d9a62;
}

.unavailable .status-dot {
  background: #c56555;
}

.image-caption {
  right: 14px;
  bottom: 12px;
  left: 14px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: #fff;
  font-size: 7px;
  font-weight: 800;
  letter-spacing: 1.4px;
  text-shadow: 0 1px 5px #000;
}

.room-content {
  padding: 20px;
}

.room-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.room-number-label {
  display: block;
  margin-bottom: 6px;
  color: #a1814e;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 1.5px;
}

.room-heading h2 {
  margin: 0;
  color: #203f30;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.3;
}

.capacity-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  padding: 7px 9px;
  border: 1px solid #e6e9df;
  border-radius: 7px;
  background: #f6f7f1;
  color: #657566;
  font-size: 9px;
  white-space: nowrap;
}

.room-description {
  min-height: 40px;
  margin: 12px 0 17px;
  color: #7b877c;
  font-size: 11px;
  line-height: 1.8;
}

.room-divider {
  height: 1px;
  background: #eeeae1;
}

.room-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 17px;
}

.price-label {
  display: block;
  margin-bottom: 5px;
  color: #98a094;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 1.2px;
}

.price {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 5px;
}

.price strong {
  color: #1d4835;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 21px;
}

.price span {
  color: #899187;
  font-size: 10px;
}

.reserve-button,
.retry-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 39px;
  padding: 0 14px;
  border: 1px solid #1c4936;
  border-radius: 7px;
  background: #1c4936;
  color: #fff;
  font-family: inherit;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}

.reserve-button:hover:not(:disabled),
.retry-button:hover {
  background: #2c6248;
}

.reserve-button:disabled {
  border-color: #e2e4dc;
  background: #e8e9e2;
  color: #90978e;
  cursor: not-allowed;
}

.rooms-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 27px;
  padding: 17px;
  border-top: 1px solid #e9e5da;
  color: #7e8a7d;
  text-align: center;
}

.rooms-footer p {
  margin: 0;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 12px;
  font-style: italic;
}

.footer-leaf {
  color: #b18d52;
}

.state-card {
  display: flex;
  min-height: 220px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 25px;
  border: 1px solid #e7e4da;
  border-radius: 14px;
  background: #fff;
  text-align: center;
}

.state-card h2 {
  margin: 12px 0 7px;
  color: #234333;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 21px;
}

.state-card p {
  max-width: 420px;
  margin: 0;
  color: #7c887c;
  font-size: 12px;
  line-height: 1.7;
}

.state-icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 50%;
  background: #f5ead9;
  color: #956e39;
  font-size: 22px;
}

.error-state .state-icon {
  background: #fff0ec;
  color: #a34738;
}

.retry-button {
  margin-top: 18px;
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #e5ebdf;
  border-top-color: #2d6147;
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  padding: 20px;
  background: rgba(12, 33, 25, 0.68);
  backdrop-filter: blur(5px);
}

.reservation-modal {
  position: relative;
  width: 100%;
  max-width: 550px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  box-sizing: border-box;
  padding: 28px;
  border: 1px solid #e6e3d9;
  border-radius: 17px;
  background: #fffdf8;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.26);
}

.close-button {
  position: absolute;
  top: 15px;
  right: 17px;
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid #e9e7dd;
  border-radius: 50%;
  background: #fff;
  color: #526357;
  font-size: 23px;
  cursor: pointer;
}

.close-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-top {
  padding: 5px 0 20px;
  text-align: center;
}

.modal-top .eyebrow {
  margin-bottom: 12px;
}

.modal-icon {
  display: grid;
  width: 42px;
  height: 42px;
  margin: 0 auto 12px;
  place-items: center;
  border-radius: 12px;
  background: #eaf0e6;
  color: #28543d;
  font-size: 23px;
}

.modal-top h2 {
  margin: 0 0 7px;
  color: #1e4332;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 27px;
}

.modal-top p {
  margin: 0;
  color: #7e897e;
  font-size: 11px;
}

.selected-room-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e7e6dc;
  border-radius: 11px;
  background: #f8f7f1;
}

.selected-room-summary img {
  width: 78px;
  height: 70px;
  flex-shrink: 0;
  border-radius: 7px;
  object-fit: cover;
}

.summary-room-details {
  min-width: 0;
  flex: 1;
}

.summary-room-details > span {
  color: #a1814e;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 1px;
}

.summary-room-details h3 {
  margin: 5px 0;
  color: #244634;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 15px;
}

.summary-room-details p {
  margin: 0;
  color: #808b80;
  font-size: 10px;
}

.summary-price {
  text-align: right;
}

.summary-price strong {
  display: block;
  color: #234b37;
  font-size: 13px;
}

.summary-price span {
  color: #818b80;
  font-size: 9px;
}

.reservation-form {
  margin-top: 22px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.form-group {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 17px;
}

.form-group label {
  color: #435749;
  font-size: 11px;
  font-weight: 700;
}

.form-group input,
.form-group select {
  width: 100%;
  min-width: 0;
  height: 43px;
  box-sizing: border-box;
  padding: 0 11px;
  border: 1px solid #dedfd4;
  border-radius: 7px;
  outline: none;
  background: #fff;
  color: #304b3a;
  font-family: inherit;
  font-size: 11px;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #66876c;
  box-shadow: 0 0 0 3px rgba(58, 105, 72, 0.1);
}

.form-group input:disabled,
.form-group select:disabled {
  background: #f1f2ec;
  cursor: not-allowed;
}

.form-group small {
  color: #859084;
  font-size: 9px;
}

.reservation-error {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin: 4px 0 15px;
  padding: 11px 12px;
  border: 1px solid #f0cbc3;
  border-radius: 8px;
  background: #fff1ee;
  color: #963f31;
  font-size: 11px;
  line-height: 1.6;
}

.reservation-error span {
  font-weight: 800;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

.modal-actions button {
  min-height: 42px;
  padding: 0 15px;
  border: 1px solid transparent;
  border-radius: 7px;
  font-family: inherit;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}

.modal-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cancel-button {
  border-color: #e0e3d9 !important;
  background: #fff !important;
  color: #5e6d60 !important;
}

.confirm-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  background: #1c4936;
  color: #fff;
}

.confirm-button:hover:not(:disabled) {
  background: #2b6046;
}

.modal-note {
  margin: 15px 0 0;
  color: #92998d;
  font-size: 9px;
  line-height: 1.6;
  text-align: center;
}

/* NEW: GCASH DEMO CHECKOUT */

.checkout-overlay {
  z-index: 3000;
}

.checkout-modal {
  position: relative;
  width: min(100%, 1080px);
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  border: 1px solid #e5dfd0;
  border-radius: 16px;
  background: #fffdf8;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.3);
}

.checkout-close {
  position: sticky;
  top: 12px;
  left: calc(100% - 48px);
  z-index: 10;
  display: block;
  width: 34px;
  height: 34px;
  margin: 12px 12px -46px auto;
  border: 1px solid #dcded3;
  border-radius: 50%;
  background: white;
  color: #183e2f;
  font-size: 23px;
  cursor: pointer;
}

.checkout-modal :deep(.demo-checkout) {
  max-width: 100%;
  margin: 0;
  border-radius: 0;
}

.checkout-footnote {
  margin: 0;
  padding: 0 24px 20px;
  color: #788477;
  font-size: 11px;
  text-align: center;
}

/* RESPONSIVE */

@media (min-width: 1200px) {
  .rooms-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .room-image {
    height: 190px;
  }
}

@media (max-width: 760px) {
  .rooms-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .room-image {
    height: 160px;
  }

  .room-content {
    padding: 14px;
  }

  .room-heading {
    flex-direction: column;
    gap: 8px;
  }

  .room-heading h2 {
    font-size: 17px;
  }

  .room-description {
    min-height: 55px;
    font-size: 10px;
  }

  .room-bottom {
    align-items: flex-start;
    flex-direction: column;
  }

  .reserve-button {
    width: 100%;
  }

  .availability-badge {
    padding: 7px;
    font-size: 8px;
  }

  .image-caption {
    font-size: 6px;
    letter-spacing: 0.8px;
  }
}

@media (max-width: 480px) {
  .page-header {
    align-items: flex-start;
  }

  .page-header h1 {
    font-size: 25px;
  }

  .page-header p {
    max-width: 270px;
  }

  .room-total {
    padding: 7px 9px;
  }

  .room-total small {
    display: none;
  }

  .rooms-grid {
    grid-template-columns: 1fr;
  }

  .room-image {
    height: 205px;
  }

  .room-heading {
    flex-direction: row;
    align-items: flex-start;
  }

  .room-description {
    min-height: auto;
  }

  .room-bottom {
    align-items: center;
    flex-direction: row;
  }

  .reserve-button {
    width: auto;
  }

  .reservation-modal {
    padding: 22px 17px;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .selected-room-summary {
    flex-wrap: wrap;
  }

  .selected-room-summary img {
    width: 65px;
    height: 62px;
  }

  .summary-price {
    margin-left: auto;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .modal-actions button {
    width: 100%;
  }
}

</style>
