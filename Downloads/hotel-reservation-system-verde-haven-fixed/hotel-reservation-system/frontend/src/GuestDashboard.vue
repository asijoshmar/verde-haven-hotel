
<script setup>
import { ref, computed, onMounted } from "vue";
import axios from "axios";
import Rooms from "./Rooms.vue";
import Hotel3DTour from "./Hotel3DTour.vue";

const API = "http://localhost:4000/api";

const activePage = ref("dashboard");

const selected3DRoom = ref(null);

const handle3DRoomBooking = (room) => {
  if (!room?.id) {
    window.alert("Could not identify the selected room. Please try again.");
    return;
  }

  selected3DRoom.value = room;
  goTo("rooms");
};

const reservations = ref([]);
const reservationsLoading = ref(false);
const reservationsError = ref("");
const selectedReservation = ref(null);
const paymentLoading = ref(false);
const reservationSort = ref("newest");

const savedUser = ref(null);

try {
  savedUser.value = JSON.parse(localStorage.getItem("user") || "null");
} catch {
  savedUser.value = null;
}

const guestName = computed(() => {
  const user = savedUser.value;
  if (!user) return "Guest";

  return (
    user.name ||
    user.full_name ||
    user.username ||
    user.first_name ||
    user.email?.split("@")[0] ||
    "Guest"
  );
});

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
});

const pendingCount = computed(() =>
  reservations.value.filter(
    r => String(r.status || "").toLowerCase() === "pending"
  ).length
);

const confirmedCount = computed(() =>
  reservations.value.filter(
    r => String(r.status || "").toLowerCase() === "confirmed"
  ).length
);

const sortedReservations = computed(() => {
  const result = [...reservations.value];

  if (reservationSort.value === "oldest") {
    return result.reverse();
  }

  if (reservationSort.value === "check-in") {
    return result.sort(
      (a, b) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime()
    );
  }

  return result;
});

const totalSpent = computed(() =>
  reservations.value
    .filter(r => String(r.status || "").toLowerCase() === "confirmed")
    .reduce((total, r) => total + Number(r.total_amount || 0), 0)
);

const formatDate = date => {
  if (!date) return "—";

  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "—";

  return value.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
};

const formatAmount = amount =>
  Number(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const statusClass = status =>
  String(status || "pending").toLowerCase().replace(/\s+/g, "-");

/* RESERVATION ROOM PHOTOS */
const getReservationImage = (reservation, index) => {
  const roomType = String(reservation?.room_type || "").toLowerCase();

  if (roomType.includes("suite")) {
    return "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=80";
  }

  if (roomType.includes("family")) {
    return "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1000&q=80";
  }

  if (roomType.includes("deluxe")) {
    return "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1000&q=80";
  }

  const roomPhotos = [
    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80"
  ];

  return roomPhotos[index % roomPhotos.length];
};

const fetchReservations = async () => {
  reservationsError.value = "";

  if (!savedUser.value?.id) {
    reservationsError.value =
      "Your account could not be identified. Please log in again.";
    return;
  }

  try {
    reservationsLoading.value = true;

    const response = await axios.get(
      `${API}/reservations/user/${savedUser.value.id}`
    );

    reservations.value = Array.isArray(response.data)
      ? response.data
      : [];

    if (selectedReservation.value) {
      selectedReservation.value =
        reservations.value.find(
          reservation =>
            String(reservation.id) === String(selectedReservation.value.id)
        ) || null;
    }

    if (activePage.value === "reservations" && !selectedReservation.value) {
      selectedReservation.value =
        reservations.value.find(
          reservation =>
            String(reservation.status || "").toLowerCase() === "pending"
        ) ||
        reservations.value[0] ||
        null;
    }
  } catch (error) {
    console.error("Reservations error:", error);
    reservationsError.value =
      error.response?.data?.message ||
      "Could not load your reservations. Please try again.";
  } finally {
    reservationsLoading.value = false;
  }
};

const goTo = async page => {
  activePage.value = page;

  if (page === "reservations" || page === "payments") {
    await fetchReservations();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
};

const openPayment = reservation => {
  const status = String(reservation.status || "").toLowerCase();

  if (status === "confirmed" || status === "cancelled") return;

  selectedReservation.value = reservation;
};

const closePayment = () => {
  if (!paymentLoading.value) {
    selectedReservation.value = null;
  }
};

const processPayment = async () => {
  if (!selectedReservation.value || paymentLoading.value) return;

  try {
    paymentLoading.value = true;

    const reservation = selectedReservation.value;

    const response = await axios.post(`${API}/payments`, {
      reservation_id: reservation.id,
      amount: reservation.total_amount,
      payment_method: "Test Payment"
    });

    window.alert(response.data?.message || "Payment processed.");

    selectedReservation.value = null;
    await fetchReservations();
  } catch (error) {
    console.error("Payment error:", error);
    window.alert(
      error.response?.data?.message ||
      "Payment failed. Please try again."
    );
  } finally {
    paymentLoading.value = false;
  }
};

const logout = () => {
  if (window.confirm("Are you sure you want to log out?")) {
    localStorage.removeItem("user");
    window.location.reload();
  }
};

onMounted(() => {
  if (savedUser.value?.id) {
    fetchReservations();
  }
});
</script>

<template>
  <div
    class="guest-layout"
    :class="{ 'reservations-active': activePage === 'reservations' }"
  >
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-mark">VH</div>
        <h1>VERDE HAVEN</h1>
        <span>BOUTIQUE HOTEL</span>
      </div>

      <div class="sidebar-label">GUEST MENU</div>

      <nav class="sidebar-nav">
        <button
          :class="{ active: activePage === 'dashboard' }"
          @click="goTo('dashboard')"
        >
          <span class="nav-icon">⌂</span>
          <span>Dashboard</span>
        </button>

        <button
  type="button"
  @click="goTo('3d-tour')"
  :class="{ active: activePage === '3d-tour' }"
>
  <span>🏨</span>
  <span>3D Hotel Tour</span>
</button>

        <button
          :class="{ active: activePage === 'rooms' }"
          @click="goTo('rooms')"
        >
          <span class="nav-icon">▦</span>
          <span>Browse Rooms</span>
        </button>

        <button
          :class="{ active: activePage === 'reservations' }"
          @click="goTo('reservations')"
        >
          <span class="nav-icon">▤</span>
          <span>My Reservations</span>
          <span v-if="pendingCount" class="nav-badge">
            {{ pendingCount }}
          </span>
        </button>

        <button
          :class="{ active: activePage === 'payments' }"
          @click="goTo('payments')"
        >
          <span class="nav-icon">₱</span>
          <span>Payments</span>
        </button>
      </nav>

      <div class="sidebar-bottom">
        <div class="guest-profile">
          <div class="avatar">
            {{ guestName.charAt(0).toUpperCase() }}
          </div>
          <div class="profile-copy">
            <strong>{{ guestName }}</strong>
            <span>Valued Guest</span>
          </div>
        </div>

        <button class="logout-button" @click="logout">
          <span>⇥</span> Log Out
        </button>
      </div>
    </aside>

    <div class="main-area">
      <header class="topbar">
        <div class="breadcrumb">
          <span>VERDE HAVEN</span>
          <span class="breadcrumb-slash">/</span>
          <strong>
            {{
  activePage === "dashboard"
    ? "Dashboard"
    : activePage === "rooms"
    ? "Browse Rooms"
    : activePage === "3d-tour"
    ? "3D Hotel Tour"
    : activePage === "reservations"
    ? "My Reservations"
    : "Payments"
}}
          </strong>
        </div>

        <div class="topbar-user">
          <span class="topbar-status"></span>
          <span>{{ guestName }}</span>
          <div class="topbar-avatar">
            {{ guestName.charAt(0).toUpperCase() }}
          </div>
        </div>
      </header>

      <!-- DASHBOARD HOME -->
      <main v-if="activePage === 'dashboard'" class="page-content">
        <section class="welcome-heading">
          <div>
            <span class="eyebrow">YOUR STAY, YOUR WAY</span>
            <h2>{{ greeting }}, {{ guestName }}!</h2>
            <p>
              Welcome to Verde Haven. Find your comfort, enjoy your stay,
              and make every moment memorable.
            </p>
          </div>

          <button class="outline-button" @click="goTo('reservations')">
            View My Reservations <span>→</span>
          </button>
        </section>

        <section class="hero-banner">
          <div class="hero-content">
            <span class="hero-eyebrow">WELCOME TO VERDE HAVEN</span>
            <h2>A little escape.<br />A lot of comfort.</h2>
            <p>
              Discover a relaxing stay inspired by the warmth and beauty
              of Mindoro.
            </p>
            <button class="gold-button" @click="goTo('rooms')">
              Explore Our Rooms <span>→</span>
            </button>
          </div>
          <div class="hero-caption">
            <span class="caption-line"></span>
            <span>STAY. RELAX. DISCOVER.</span>
          </div>
        </section>

        <section class="stats-grid">
          <article class="stat-card">
            <div class="stat-icon sage-icon">▤</div>
            <div class="stat-copy">
              <span>Total Reservations</span>
              <strong>{{ reservations.length }}</strong>
              <small>Your bookings with us</small>
            </div>
          </article>

          <article class="stat-card">
            <div class="stat-icon gold-icon">◷</div>
            <div class="stat-copy">
              <span>Pending Reservations</span>
              <strong>{{ pendingCount }}</strong>
              <small>Awaiting confirmation</small>
            </div>
          </article>

          <article class="stat-card">
            <div class="stat-icon green-icon">✓</div>
            <div class="stat-copy">
              <span>Confirmed Stays</span>
              <strong>{{ confirmedCount }}</strong>
              <small>Confirmed reservations</small>
            </div>
          </article>

          <article class="stat-card">
            <div class="stat-icon cream-icon">₱</div>
            <div class="stat-copy">
              <span>Confirmed Payments</span>
              <strong class="amount-value">
                ₱{{ formatAmount(totalSpent) }}
              </strong>
              <small>Total confirmed booking value</small>
            </div>
          </article>
        </section>

        <section class="section-title-row">
          <div>
            <span class="eyebrow">FIND YOUR COMFORT</span>
            <h2>Explore Our Rooms</h2>
            <p>Thoughtfully prepared spaces for a restful stay.</p>
          </div>
          <button class="text-link" @click="goTo('rooms')">
            View all rooms <span>→</span>
          </button>
        </section>

        <div class="rooms-shell">
          <Rooms :initial-room-id="selected3DRoom?.id" />
        </div>

        <section class="recent-section">
          <div class="section-title-row">
            <div>
              <span class="eyebrow">YOUR STAY AT A GLANCE</span>
              <h2>Recent Reservations</h2>
              <p>Keep track of your latest bookings.</p>
            </div>
            <button class="text-link" @click="goTo('reservations')">
              View all <span>→</span>
            </button>
          </div>

          <div v-if="reservationsLoading" class="notice-card">
            Loading your reservations…
          </div>

          <div v-else-if="reservationsError" class="notice-card">
            <p>{{ reservationsError }}</p>
            <button class="small-action" @click="fetchReservations">
              Try Again
            </button>
          </div>

          <div v-else-if="!reservations.length" class="notice-card empty-notice">
            <div class="empty-symbol">▤</div>
            <h3>Your next getaway starts here.</h3>
            <p>You haven't made a reservation yet.</p>
            <button class="primary-action" @click="goTo('rooms')">
              Browse Available Rooms
            </button>
          </div>

          <div v-else class="recent-table-wrap">
            <table class="recent-table">
              <thead>
                <tr>
                  <th>ROOM</th>
                  <th>CHECK-IN</th>
                  <th>CHECK-OUT</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="reservation in reservations.slice(0, 4)"
                  :key="reservation.id"
                >
                  <td>
                    <strong>Room {{ reservation.room_number }}</strong>
                    <small>{{ reservation.room_type }}</small>
                  </td>
                  <td>{{ formatDate(reservation.check_in) }}</td>
                  <td>{{ formatDate(reservation.check_out) }}</td>
                  <td class="table-amount">
                    ₱{{ formatAmount(reservation.total_amount) }}
                  </td>
                  <td>
                    <span
                      class="status-pill"
                      :class="statusClass(reservation.status)"
                    >
                      {{ reservation.status || "Pending" }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <footer class="page-footer">
          <span>VERDE HAVEN BOUTIQUE HOTEL</span>
          <span>Made for moments of comfort.</span>
        </footer>
      </main>

      <!-- ROOMS -->
      <main v-else-if="activePage === 'rooms'" class="page-content">
        <section class="subpage-heading">
          <span class="eyebrow">FIND YOUR PERFECT STAY</span>
          <h2>Browse Our Rooms</h2>
          <p>
            Explore our available accommodations and choose the room
            that suits your visit.
          </p>
        </section>

        <section class="room-page-banner">
          <div>
            <span class="hero-eyebrow">YOUR COMFORT COMES FIRST</span>
            <h3>Make yourself at home.</h3>
            <p>Discover a room where you can relax and recharge.</p>
          </div>
        </section>

        <div class="rooms-shell">
          <Rooms />
        </div>

        <footer class="page-footer">
          <span>VERDE HAVEN BOUTIQUE HOTEL</span>
          <span>Stay. Relax. Discover.</span>
        </footer>
      </main>

        <!-- 3D HOTEL TOUR: ILAGAY DITO -->
      <main v-else-if="activePage === '3d-tour'" class="page-content">
        <Hotel3DTour @book-room="handle3DRoomBooking" />
      </main>


      <!-- MY RESERVATIONS -->
      <main
        v-else-if="activePage === 'reservations'"
        class="page-content reservation-page"
      >
        <section class="reservation-welcome">
          <div>
            <span class="eyebrow">YOUR JOURNEY WITH US</span>
            <h2>My Reservations</h2>
            <p>View your bookings, stay details, and reservation status.</p>
          </div>

          <button class="reservation-browse-btn" @click="goTo('rooms')">
            <span>+</span> Book a Room
          </button>
        </section>

        <section class="reservation-summary-grid">
          <article class="reservation-summary-card">
            <div class="reservation-summary-icon">▤</div>
            <div>
              <span>Total Bookings</span>
              <strong>{{ reservations.length }}</strong>
              <small>All your reservations</small>
            </div>
          </article>

          <article class="reservation-summary-card">
            <div class="reservation-summary-icon pending-summary-icon">◷</div>
            <div>
              <span>Pending</span>
              <strong>{{ pendingCount }}</strong>
              <small>Awaiting confirmation</small>
            </div>
          </article>

          <article class="reservation-summary-card">
            <div class="reservation-summary-icon confirmed-summary-icon">✓</div>
            <div>
              <span>Confirmed</span>
              <strong>{{ confirmedCount }}</strong>
              <small>Ready for your stay</small>
            </div>
          </article>
        </section>

        <section class="reservation-workspace">
          <div class="reservation-list-column">
            <div class="reservation-records-heading">
              <h3>Your Reservations</h3>
              <label class="reservation-sort">
                <span>Sort by:</span>
                <select v-model="reservationSort" aria-label="Sort reservations">
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="check-in">Check-in Date</option>
                </select>
              </label>
            </div>

            <div v-if="reservationsLoading" class="reservation-state">
              <div class="reservation-spinner"></div>
              <h3>Preparing your reservations</h3>
              <p>Please wait while we retrieve your booking details.</p>
            </div>

            <div v-else-if="reservationsError" class="reservation-state">
              <div class="reservation-empty-icon">!</div>
              <h3>We couldn't load your bookings</h3>
              <p>{{ reservationsError }}</p>
              <button
                class="reservation-browse-btn"
                @click="fetchReservations"
              >
                Try Again
              </button>
            </div>

            <div v-else-if="!reservations.length" class="reservation-state">
              <div class="reservation-empty-icon">⌂</div>
              <span class="eyebrow">YOUR NEXT GETAWAY AWAITS</span>
              <h3>Your story with us starts here.</h3>
              <p>
                You haven't made a reservation yet. Browse our rooms
                and find a comfortable space for your next visit.
              </p>
              <button
                class="reservation-browse-btn"
                @click="goTo('rooms')"
              >
                Explore Our Rooms →
              </button>
            </div>

            <div v-else class="reservation-record-list">
              <article
                v-for="(reservation, index) in sortedReservations"
                :key="reservation.id || index"
                class="reservation-record-card"
                :class="{ 'reservation-record-selected': selectedReservation?.id === reservation.id }"
              >
                <div class="reservation-photo">
                  <img
                    :src="getReservationImage(reservation, index)"
                    :alt="(reservation.room_type || 'Hotel') + ' room'"
                    loading="lazy"
                  />
                </div>

                <div class="reservation-record-content">
                  <div class="reservation-record-top">
                    <div class="reservation-record-title">
                      <span class="reservation-number">
                        Reservation No. #{{ reservation.id }}
                      </span>
                      <h3>{{ reservation.room_type || 'Guest Room' }}</h3>
                      <p>Room {{ reservation.room_number || '—' }}</p>
                    </div>

                    <span
                      class="reservation-status"
                      :class="'reservation-status-' + statusClass(reservation.status)"
                    >
                      <span class="reservation-status-dot"></span>
                      {{ reservation.status || 'Pending' }}
                    </span>
                  </div>

                  <div class="reservation-detail-grid">
                    <div class="reservation-detail-item">
                      <span class="reservation-detail-label">
                        <span>↘</span> Check-in
                      </span>
                      <strong>{{ formatDate(reservation.check_in) }}</strong>
                    </div>

                    <div class="reservation-detail-item">
                      <span class="reservation-detail-label">
                        <span>↗</span> Check-out
                      </span>
                      <strong>{{ formatDate(reservation.check_out) }}</strong>
                    </div>

                    <div class="reservation-detail-item">
                      <span class="reservation-detail-label">
                        <span>♙</span> Guests
                      </span>
                      <strong>
                        {{ reservation.guests_count ?? '—' }}
                        {{ reservation.guests_count === 1 ? 'Guest' : 'Guests' }}
                      </strong>
                    </div>
                  </div>

                  <div class="reservation-record-footer">
                    <div class="reservation-price">
                      <strong>₱{{ formatAmount(reservation.total_amount) }}</strong>
                      <span>Total Amount</span>
                    </div>

                    <div class="reservation-record-actions">
                      <button
                        v-if="String(reservation.status || '').toLowerCase() === 'confirmed'"
                        class="reservation-view-btn"
                        type="button"
                        @click="selectedReservation = reservation"
                      >
                        View Details
                      </button>

                      <span
                        v-else-if="String(reservation.status || '').toLowerCase() === 'cancelled'"
                        class="reservation-cancelled-label"
                      >
                        Reservation Cancelled
                      </span>

                      <button
                        v-else
                        class="reservation-pay-btn"
                        @click="openPayment(reservation)"
                      >
                        Proceed to Payment
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <aside class="reservation-payment-panel">
            <template v-if="selectedReservation">
              <button
                class="reservation-panel-close"
                type="button"
                aria-label="Clear selected reservation"
                @click="closePayment"
              >
                ×
              </button>
              <div class="reservation-panel-icon">▣</div>
              <h3>Payment Summary</h3>
              <p class="reservation-panel-description">
                Review your reservation details before continuing.
              </p>

              <div class="reservation-panel-details">
                <div>
                  <span>Reservation No.</span>
                  <strong>#{{ selectedReservation.id }}</strong>
                </div>
                <div>
                  <span>Room</span>
                  <strong>
                    {{ selectedReservation.room_type || 'Guest Room' }}
                  </strong>
                </div>
                <div>
                  <span>Check-in</span>
                  <strong>{{ formatDate(selectedReservation.check_in) }}</strong>
                </div>
                <div>
                  <span>Check-out</span>
                  <strong>{{ formatDate(selectedReservation.check_out) }}</strong>
                </div>
                <div class="reservation-panel-total">
                  <span>Total Amount</span>
                  <strong>₱{{ formatAmount(selectedReservation.total_amount) }}</strong>
                </div>
              </div>

              <p class="reservation-panel-note">
                This uses your project's existing test-payment endpoint. It is
                not a real payment gateway.
              </p>

              <div class="reservation-panel-actions">
                <button
                  class="reservation-panel-cancel"
                  type="button"
                  :disabled="paymentLoading"
                  @click="closePayment"
                >
                  Cancel
                </button>
                <button
                  v-if="!['confirmed', 'cancelled'].includes(String(selectedReservation.status || '').toLowerCase())"
                  class="reservation-panel-confirm"
                  type="button"
                  :disabled="paymentLoading"
                  @click="processPayment"
                >
                  {{ paymentLoading ? "Processing…" : "Confirm Payment →" }}
                </button>
                <span
                  v-else
                  class="reservation-panel-status"
                >
                  {{ selectedReservation.status }}
                </span>
              </div>
            </template>
            <div v-else class="reservation-panel-empty">
              <div class="reservation-panel-icon">▣</div>
              <h3>Payment Summary</h3>
              <p>Select a reservation to review its details before continuing.</p>
            </div>
          </aside>
        </section>

        <footer class="page-footer">
          <span>VERDE HAVEN BOUTIQUE HOTEL</span>
          <span>Stay. Relax. Discover.</span>
        </footer>
      </main>

      <!-- PAYMENTS -->
      <main v-else class="page-content">
        <section class="subpage-heading">
          <span class="eyebrow">SIMPLE & SECURE</span>
          <h2>Payments</h2>
          <p>Review reservation amounts and continue to payment when available.</p>
        </section>

        <div v-if="reservationsLoading" class="notice-card">
          Loading payment information…
        </div>

        <div v-else-if="reservationsError" class="notice-card">
          <p>{{ reservationsError }}</p>
          <button class="small-action" @click="fetchReservations">
            Try Again
          </button>
        </div>

        <div v-else-if="!reservations.length" class="notice-card empty-notice">
          <div class="empty-symbol">₱</div>
          <h3>No payment records to show</h3>
          <p>Make a reservation first to see its payment details here.</p>
          <button class="primary-action" @click="goTo('rooms')">
            Browse Rooms
          </button>
        </div>

        <div v-else class="payment-list">
          <article
            v-for="reservation in reservations"
            :key="reservation.id"
            class="payment-card"
          >
            <div class="payment-card-symbol">₱</div>
            <div class="payment-card-info">
              <span>RESERVATION #{{ reservation.id }}</span>
              <h3>
                Room {{ reservation.room_number }} · {{ reservation.room_type }}
              </h3>
              <p>
                {{ formatDate(reservation.check_in) }} —
                {{ formatDate(reservation.check_out) }}
              </p>
            </div>
            <div class="payment-card-right">
              <strong>₱{{ formatAmount(reservation.total_amount) }}</strong>
              <span
                class="status-pill"
                :class="statusClass(reservation.status)"
              >
                {{ reservation.status || "Pending" }}
              </span>

              <button
                v-if="
                  !['confirmed', 'cancelled'].includes(
                    String(reservation.status || '').toLowerCase()
                  )
                "
                class="small-action"
                @click="openPayment(reservation)"
              >
                Pay Now
              </button>

              <span
                v-else-if="String(reservation.status).toLowerCase() === 'confirmed'"
                class="paid-label"
              >
                ✓ Confirmed
              </span>
              <span v-else class="reservation-cancelled-label">
                Cancelled
              </span>
            </div>
          </article>
        </div>

        <footer class="page-footer">
          <span>VERDE HAVEN BOUTIQUE HOTEL</span>
          <span>Stay. Relax. Discover.</span>
        </footer>
      </main>
    </div>

    <!-- PAYMENT MODAL -->
    <div
      v-if="selectedReservation && activePage !== 'reservations'"
      class="modal-overlay"
      @click.self="closePayment"
    >
      <section class="payment-modal">
        <button
          class="modal-close"
          type="button"
          @click="closePayment"
          :disabled="paymentLoading"
          aria-label="Close payment"
        >
          ×
        </button>

        <div class="modal-icon">₱</div>
        <span class="eyebrow">VERDE HAVEN PAYMENTS</span>
        <h2>Complete Your Payment</h2>
        <p class="modal-description">
          Review your reservation details before continuing.
        </p>

        <div class="modal-summary">
          <div class="summary-row">
            <span>Reservation</span>
            <strong>#{{ selectedReservation.id }}</strong>
          </div>
          <div class="summary-row">
            <span>Room</span>
            <strong>
              {{ selectedReservation.room_number }} ·
              {{ selectedReservation.room_type }}
            </strong>
          </div>
          <div class="summary-row">
            <span>Check-in</span>
            <strong>{{ formatDate(selectedReservation.check_in) }}</strong>
          </div>
          <div class="summary-row">
            <span>Check-out</span>
            <strong>{{ formatDate(selectedReservation.check_out) }}</strong>
          </div>
          <div class="summary-row total-row">
            <span>Total amount</span>
            <strong>₱{{ formatAmount(selectedReservation.total_amount) }}</strong>
          </div>
        </div>

        <p class="test-payment-note">
          This uses your project's existing test-payment endpoint.
          It is not a real payment gateway.
        </p>

        <div class="modal-actions">
          <button
            class="modal-cancel"
            type="button"
            @click="closePayment"
            :disabled="paymentLoading"
          >
            Cancel
          </button>
          <button
            class="modal-pay"
            type="button"
            @click="processPayment"
            :disabled="paymentLoading"
          >
            {{ paymentLoading ? "Processing…" : "Continue to Payment →" }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style>
@import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap");

:root {
  --vh-forest: #10372d;
  --vh-forest-light: #1d4b3b;
  --vh-gold: #c9aa70;
  --vh-cream: #f7f5ee;
  --vh-sage: #e8eee5;
  --vh-ink: #193b30;
  --vh-muted: #7b887e;
  --vh-border: #e7e2d6;
}

* {
  box-sizing: border-box;
}

.guest-layout {
  min-height: 100vh;
  display: flex;
  background: var(--vh-cream);
  color: var(--vh-ink);
  font-family: "DM Sans", Arial, sans-serif;
  font-size: 13px;
}

.sidebar {
  width: 242px;
  min-width: 242px;
  min-height: 100vh;
  height: 100vh;
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  color: #f4f1e6;
  background:
    linear-gradient(180deg, rgba(8, 39, 30, .97), rgba(10, 47, 36, .98)),
    url("https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=700&q=80") center / cover;
  box-shadow: 5px 0 24px rgba(16, 55, 45, .08);
  z-index: 20;
}

.sidebar-brand {
  min-height: 135px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-bottom: 1px solid rgba(222, 205, 160, .2);
  padding: 20px 12px;
}

.brand-mark {
  width: 39px;
  height: 39px;
  display: grid;
  place-items: center;
  border: 1px solid var(--vh-gold);
  border-radius: 50%;
  color: var(--vh-gold);
  font: 16px "Playfair Display", Georgia, serif;
  margin-bottom: 10px;
}

.sidebar-brand h1 {
  margin: 0;
  color: #f0e5c7;
  font: 600 19px "Playfair Display", Georgia, serif;
  letter-spacing: 1.4px;
}

.sidebar-brand > span {
  margin-top: 4px;
  color: #cbb98c;
  font-size: 8px;
  letter-spacing: 2px;
}

.sidebar-label {
  padding: 27px 24px 12px;
  color: #a6b8aa;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.7px;
}

.sidebar-nav {
  padding: 0 12px;
  display: grid;
  gap: 5px;
}

.sidebar-nav button {
  width: 100%;
  min-height: 43px;
  padding: 0 13px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 0;
  border-radius: 7px;
  border-left: 3px solid transparent;
  background: transparent;
  color: #d4ded4;
  font: 500 12px "DM Sans", Arial, sans-serif;
  text-align: left;
  cursor: pointer;
  transition: .2s ease;
}

.sidebar-nav button:hover {
  background: rgba(255, 255, 255, .07);
  color: #fff;
}

.sidebar-nav button.active {
  color: #fff7df;
  border-left-color: var(--vh-gold);
  background: rgba(222, 230, 214, .12);
  font-weight: 700;
}

.nav-icon {
  width: 19px;
  flex-shrink: 0;
  text-align: center;
  color: var(--vh-gold);
  font-size: 17px;
}

.nav-badge {
  margin-left: auto;
  min-width: 19px;
  padding: 3px 5px;
  text-align: center;
  border-radius: 20px;
  color: #173c30;
  background: #e3c990;
  font-size: 10px;
  font-weight: 700;
}

.sidebar-bottom {
  margin-top: auto;
  padding: 17px 14px 20px;
  border-top: 1px solid rgba(222, 205, 160, .2);
}

.guest-profile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 4px 16px;
  min-width: 0;
}

.avatar,
.topbar-avatar {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 35px;
  height: 35px;
  border-radius: 50%;
  background: #e6eadc;
  color: var(--vh-forest);
  font-weight: 700;
}

.profile-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.profile-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #fff;
  font-size: 11px;
}

.profile-copy span {
  color: #aab9ac;
  font-size: 10px;
}

.logout-button {
  width: 100%;
  padding: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid rgba(201, 170, 112, .75);
  border-radius: 8px;
  background: transparent;
  color: #e5d4aa;
  font: 600 11px "DM Sans", Arial, sans-serif;
  cursor: pointer;
  transition: .2s;
}

.logout-button:hover {
  background: rgba(201, 170, 112, .12);
}

.main-area {
  flex: 1;
  min-width: 0;
}

.topbar {
  height: 69px;
  padding: 0 clamp(22px, 4vw, 55px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  background: rgba(255, 255, 255, .94);
  border-bottom: 1px solid var(--vh-border);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #a0a79d;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1px;
}

.breadcrumb strong {
  color: #375343;
  font-size: 11px;
  letter-spacing: 0;
}

.breadcrumb-slash {
  color: #d3cbb9;
}

.topbar-user {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #546657;
  font-size: 11px;
  font-weight: 600;
}

.topbar-status {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #8cae7d;
}

.topbar-avatar {
  width: 30px;
  height: 30px;
  font-size: 11px;
}

.page-content {
  width: 100%;
  max-width: 1500px;
  padding: 31px clamp(22px, 4vw, 55px) 30px;
  margin: 0 auto;
}

.welcome-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
  margin-bottom: 22px;
}

.eyebrow {
  display: block;
  margin-bottom: 8px;
  color: #9b8050;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.8px;
}

.welcome-heading h2,
.subpage-heading h2 {
  margin: 0;
  color: #193e31;
  font: 600 clamp(27px, 3vw, 36px)/1.2 "Playfair Display", Georgia, serif;
}

.welcome-heading p,
.subpage-heading p {
  max-width: 620px;
  margin: 9px 0 0;
  color: #7b887e;
  font-size: 12px;
  line-height: 1.8;
}

.outline-button {
  flex-shrink: 0;
  padding: 11px 14px;
  border: 1px solid #d8dfd3;
  border-radius: 7px;
  background: #fff;
  color: #315541;
  font: 700 10px "DM Sans", Arial, sans-serif;
  cursor: pointer;
}

.outline-button:hover {
  background: #edf2e9;
}

.outline-button span {
  margin-left: 7px;
}

.hero-banner {
  position: relative;
  isolation: isolate;
  min-height: 275px;
  overflow: hidden;
  display: flex;
  align-items: center;
  border-radius: 16px;
  background-image:
    linear-gradient(90deg, rgba(8, 37, 29, .94) 0%, rgba(15, 48, 37, .78) 43%, rgba(15, 48, 37, .15) 100%),
    url("https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1800&q=85");
  background-size: cover;
  background-position: center 54%;
  box-shadow: 0 13px 30px rgba(25, 60, 44, .13);
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 590px;
  padding: 34px clamp(24px, 4vw, 43px);
}

.hero-eyebrow {
  display: block;
  margin-bottom: 12px;
  color: #dfc58c;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2px;
}

.hero-content h2 {
  margin: 0;
  color: #fffdf7;
  font: 500 clamp(32px, 4vw, 46px)/1.12 "Playfair Display", Georgia, serif;
  letter-spacing: -.5px;
}

.hero-content p {
  max-width: 390px;
  margin: 13px 0 20px;
  color: #e1e8df;
  font-size: 12px;
  line-height: 1.8;
}

.gold-button {
  padding: 12px 16px;
  border: 1px solid #d9bf84;
  border-radius: 6px;
  background: #d9bf84;
  color: #173c2e;
  font: 700 11px "DM Sans", Arial, sans-serif;
  cursor: pointer;
  transition: .2s;
}

.gold-button:hover {
  background: #ead5a4;
  transform: translateY(-1px);
}

.gold-button span {
  margin-left: 8px;
}

.hero-caption {
  position: absolute;
  right: 23px;
  bottom: 20px;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 9px;
  color: rgba(255, 255, 255, .8);
  font-size: 8px;
  letter-spacing: 1.7px;
}

.caption-line {
  width: 25px;
  height: 1px;
  background: var(--vh-gold);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 13px;
  margin: 23px 0 35px;
}

.stat-card {
  position: relative;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 19px 15px;
  overflow: hidden;
  border: 1px solid var(--vh-border);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 15px rgba(34, 58, 44, .025);
}

.stat-icon {
  width: 39px;
  height: 39px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 10px;
  font-size: 18px;
}

.sage-icon {
  background: #e8efe5;
  color: #315d4b;
}

.gold-icon {
  background: #f5eedf;
  color: #a5834c;
}

.green-icon {
  background: #e3eee5;
  color: #47784e;
}

.cream-icon {
  background: #f4ecdd;
  color: #987746;
}

.stat-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-copy > span {
  color: #758277;
  font-size: 10px;
  line-height: 1.5;
}

.stat-copy strong {
  color: #234333;
  font: 600 25px "Playfair Display", Georgia, serif;
}

.stat-copy strong.amount-value {
  font: 700 16px "DM Sans", Arial, sans-serif;
  overflow-wrap: anywhere;
}

.stat-copy small {
  color: #a0a79d;
  font-size: 9px;
  line-height: 1.5;
}

.section-title-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 15px;
  margin: 0 0 17px;
}

.section-title-row .eyebrow {
  margin-bottom: 6px;
}

.section-title-row h2 {
  margin: 0;
  color: #234333;
  font: 600 25px "Playfair Display", Georgia, serif;
}

.section-title-row p {
  margin: 6px 0 0;
  color: #849084;
  font-size: 11px;
  line-height: 1.7;
}

.text-link {
  flex-shrink: 0;
  padding: 7px 0;
  border: 0;
  background: transparent;
  color: #315d49;
  font: 700 11px "DM Sans", Arial, sans-serif;
  cursor: pointer;
}

.text-link:hover {
  color: #9a7c48;
}

.text-link span {
  margin-left: 5px;
}

.rooms-shell {
  padding: 20px;
  border: 1px solid var(--vh-border);
  border-radius: 13px;
  background: #fff;
  box-shadow: 0 5px 19px rgba(34, 58, 44, .025);
}

.rooms-shell h1,
.rooms-shell h2,
.rooms-shell h3 {
  color: #234333;
  font-family: "Playfair Display", Georgia, serif;
}

.rooms-shell button {
  cursor: pointer;
}

.recent-section {
  margin-top: 36px;
}

.notice-card {
  padding: 25px;
  border: 1px solid var(--vh-border);
  border-radius: 12px;
  background: #fff;
  color: #758277;
  line-height: 1.7;
}

.notice-card p {
  margin: 0 0 12px;
}

.empty-notice {
  padding: 35px 20px;
  text-align: center;
}

.empty-symbol {
  width: 49px;
  height: 49px;
  display: grid;
  place-items: center;
  margin: 0 auto 12px;
  border-radius: 50%;
  background: #edf2e9;
  color: #45674f;
  font-size: 23px;
}

.empty-notice h3 {
  margin: 0 0 8px;
  color: #2c4938;
  font: 600 22px "Playfair Display", Georgia, serif;
}

.empty-notice p {
  color: #839084;
  font-size: 12px;
}

.recent-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--vh-border);
  border-radius: 12px;
  background: #fff;
}

.recent-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.recent-table th {
  padding: 14px 17px;
  background: #f7f7f1;
  color: #849084;
  font-size: 9px;
  letter-spacing: 1px;
  white-space: nowrap;
}

.recent-table td {
  padding: 15px 17px;
  border-top: 1px solid #f0eee6;
  color: #69786c;
  font-size: 11px;
  white-space: nowrap;
}

.recent-table td:first-child {
  white-space: normal;
}

.recent-table td strong {
  display: block;
  color: #2e4a39;
  font-size: 11px;
}

.recent-table td small {
  display: block;
  margin-top: 4px;
  color: #9aa398;
  font-size: 10px;
}

.recent-table .table-amount {
  color: #284936;
  font-weight: 700;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 9px;
  border-radius: 30px;
  background: #f5edda;
  color: #916f31;
  font-size: 9px;
  font-weight: 700;
  text-transform: capitalize;
  white-space: nowrap;
}

.status-pill.confirmed,
.status-pill.completed {
  background: #e5f1e5;
  color: #3c7046;
}

.status-pill.cancelled,
.status-pill.rejected {
  background: #f9e7e2;
  color: #a34f40;
}

.status-pill.pending {
  background: #f7efdc;
  color: #947337;
}

.primary-action,
.small-action {
  padding: 11px 15px;
  border: 1px solid var(--vh-forest);
  border-radius: 7px;
  background: var(--vh-forest);
  color: white;
  font: 700 11px "DM Sans", Arial, sans-serif;
  cursor: pointer;
  transition: .2s;
}

.primary-action:hover,
.small-action:hover {
  background: #28634e;
  border-color: #28634e;
}

.subpage-heading {
  margin-bottom: 24px;
}

.subpage-heading p {
  max-width: 620px;
}

.room-page-banner {
  min-height: 170px;
  display: flex;
  align-items: center;
  margin-bottom: 22px;
  overflow: hidden;
  border-radius: 13px;
  background-image:
    linear-gradient(90deg, rgba(10, 41, 31, .93), rgba(13, 47, 35, .52)),
    url("https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=85");
  background-position: center 52%;
  background-size: cover;
}

.room-page-banner > div {
  padding: 27px 30px;
}

.room-page-banner h3 {
  margin: 0;
  color: #fff;
  font: 500 29px "Playfair Display", Georgia, serif;
}

.room-page-banner p {
  color: #e0e8df;
  font-size: 11px;
}

/* MY RESERVATIONS ONLY */

.reservation-page {
  background: #f7f5ee;
}

.reservation-welcome {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 22px;
  margin-bottom: 25px;
}

.reservation-welcome h2 {
  margin: 0;
  color: #10372d;
  font: 600 clamp(30px, 3vw, 39px)/1.2 "Playfair Display", Georgia, serif;
}

.reservation-welcome p {
  max-width: 590px;
  margin: 10px 0 0;
  color: #788579;
  font-size: 12px;
  line-height: 1.8;
}

.reservation-browse-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 12px 17px;
  border: 1px solid #173e30;
  border-radius: 5px;
  background: #173e30;
  color: #fff;
  font: 700 11px "DM Sans", Arial, sans-serif;
  cursor: pointer;
  transition: background .2s, transform .2s;
}

.reservation-browse-btn:hover {
  background: #2c5d45;
  transform: translateY(-1px);
}

.reservation-hero {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  min-height: 245px;
  margin-bottom: 23px;
  overflow: hidden;
  border-radius: 12px;
  background-image:
    linear-gradient(90deg, rgba(8, 34, 26, .94) 0%, rgba(12, 42, 31, .82) 48%, rgba(12, 42, 31, .25) 100%),
    url("https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1600&q=85");
  background-size: cover;
  background-position: center 55%;
  box-shadow: 0 10px 28px rgba(16, 55, 45, .09);
}

.reservation-hero-content {
  position: relative;
  z-index: 1;
  max-width: 540px;
  padding: 29px 35px;
}

.reservation-hero-eyebrow {
  color: #d8bd83;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2px;
}

.reservation-hero-content h2 {
  margin: 12px 0;
  color: #fffdf7;
  font: 500 clamp(30px, 3.5vw, 40px)/1.15 "Playfair Display", Georgia, serif;
}

.reservation-hero-content p {
  max-width: 380px;
  margin: 0 0 19px;
  color: #e0e8df;
  font-size: 12px;
  line-height: 1.8;
}

.reservation-hero-content button {
  padding: 12px 15px;
  border: 1px solid #d6bb81;
  border-radius: 5px;
  background: #d6bb81;
  color: #183b2d;
  font: 700 11px "DM Sans", Arial, sans-serif;
  cursor: pointer;
  transition: background .2s;
}

.reservation-hero-content button:hover {
  background: #e8d3a3;
}

.reservation-hero-content button span {
  margin-left: 10px;
}

.reservation-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 29px;
}

.reservation-summary-card {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  padding: 20px;
  border: 1px solid #e7e2d6;
  border-radius: 9px;
  background: #fff;
  box-shadow: 0 4px 15px rgba(34, 58, 44, .025);
}

.reservation-summary-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: #e8eee5;
  color: #315b45;
  font-size: 20px;
}

.pending-summary-icon {
  background: #f6efdf;
  color: #a17d40;
}

.confirmed-summary-icon {
  background: #e3eee4;
  color: #47744d;
}

.reservation-summary-card > div:last-child {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.reservation-summary-card span {
  color: #778579;
  font-size: 10px;
}

.reservation-summary-card strong {
  color: #10372d;
  font: 600 27px "Playfair Display", Georgia, serif;
}

.reservation-summary-card small {
  color: #9ba398;
  font-size: 9px;
}

.reservation-records-section {
  padding: 24px;
  border: 1px solid #e7e2d6;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 5px 22px rgba(24, 54, 39, .035);
}

.reservation-records-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 15px;
  padding-bottom: 21px;
  border-bottom: 1px solid #eeeae0;
}

.reservation-records-heading h3 {
  margin: 0;
  color: #10372d;
  font: 600 27px "Playfair Display", Georgia, serif;
}

.reservation-records-heading p {
  margin: 7px 0 0;
  color: #7b887e;
  font-size: 11px;
  line-height: 1.7;
}

.reservation-count {
  flex-shrink: 0;
  padding: 8px 11px;
  border-radius: 30px;
  background: #e8eee5;
  color: #315b45;
  font-size: 10px;
  font-weight: 700;
}

.reservation-record-list {
  display: grid;
  gap: 18px;
  padding-top: 20px;
}

.reservation-record-card {
  display: grid;
  grid-template-columns: minmax(205px, 30%) minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid #e7e2d6;
  border-radius: 10px;
  background: #fffefa;
  transition: border-color .2s, box-shadow .2s;
}

.reservation-record-card:hover {
  border-color: #d4d9c9;
  box-shadow: 0 8px 25px rgba(16, 55, 45, .07);
}

.reservation-photo {
  position: relative;
  min-height: 285px;
  overflow: hidden;
  background: #e7e9df;
}

.reservation-photo img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  transition: transform .4s;
}

.reservation-record-card:hover .reservation-photo img {
  transform: scale(1.045);
}

.reservation-photo-overlay {
  position: absolute;
  inset: 40% 0 0;
  background: linear-gradient(transparent, rgba(8, 30, 22, .58));
  pointer-events: none;
}

.reservation-photo-label {
  position: absolute;
  left: 17px;
  bottom: 16px;
  z-index: 1;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2px;
  text-shadow: 0 1px 5px rgba(0, 0, 0, .3);
}

.reservation-record-content {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  padding: 22px;
}

.reservation-record-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.reservation-record-title {
  min-width: 0;
}

.reservation-number {
  display: block;
  margin-bottom: 7px;
  color: #a08351;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1px;
}

.reservation-record-title h3 {
  margin: 0;
  color: #10372d;
  font: 600 24px/1.25 "Playfair Display", Georgia, serif;
  overflow-wrap: anywhere;
}

.reservation-record-title p {
  margin: 6px 0 0;
  color: #7b887e;
  font-size: 11px;
}

.reservation-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 7px 10px;
  border-radius: 30px;
  background: #f6efdf;
  color: #927033;
  font-size: 9px;
  font-weight: 700;
  text-transform: capitalize;
}

.reservation-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.reservation-status-confirmed,
.reservation-status-completed {
  background: #e5f1e5;
  color: #3c7046;
}

.reservation-status-cancelled,
.reservation-status-rejected {
  background: #f9e7e2;
  color: #a34f40;
}

.reservation-status-pending {
  background: #f7efdc;
  color: #947337;
}

.reservation-detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
  margin: 23px 0;
}

.reservation-detail-item {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  min-width: 0;
  padding: 13px 11px;
  border: 1px solid #eeece3;
  border-radius: 7px;
  background: #f8f8f3;
}

.reservation-detail-label {
  color: #879184;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: .6px;
  white-space: nowrap;
}

.reservation-detail-label span {
  margin-right: 4px;
  color: #a1844d;
  font-size: 11px;
}

.reservation-detail-item strong {
  color: #304b3a;
  font-size: 11px;
  overflow-wrap: anywhere;
}

.reservation-record-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding-top: 17px;
  border-top: 1px solid #eeeae0;
}

.reservation-price {
  min-width: 0;
}

.reservation-price > span {
  display: block;
  margin-bottom: 6px;
  color: #899387;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: .8px;
}

.reservation-price > strong {
  color: #10372d;
  font: 600 23px "Playfair Display", Georgia, serif;
  overflow-wrap: anywhere;
}

.reservation-record-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.reservation-pay-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid #173e30;
  border-radius: 5px;
  background: #173e30;
  color: #fff;
  font: 700 10px "DM Sans", Arial, sans-serif;
  cursor: pointer;
  transition: background .2s, transform .2s;
}

.reservation-pay-btn:hover {
  background: #2c5d45;
  transform: translateY(-1px);
}

.reservation-confirmed-label {
  color: #46744b;
  font-size: 10px;
  font-weight: 700;
}

.reservation-cancelled-label {
  color: #a34f40;
  font-size: 10px;
  font-weight: 700;
}

.reservation-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 50px 20px;
  text-align: center;
}

.reservation-empty-icon {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  margin-bottom: 17px;
  border-radius: 50%;
  background: #eaf0e6;
  color: #315a43;
  font: 25px "Playfair Display", Georgia, serif;
}

.reservation-state h3 {
  margin: 0 0 9px;
  color: #234333;
  font: 600 25px "Playfair Display", Georgia, serif;
}

.reservation-state p {
  max-width: 430px;
  margin: 0 0 21px;
  color: #7d897e;
  font-size: 11px;
  line-height: 1.8;
}

.reservation-spinner {
  width: 29px;
  height: 29px;
  margin-bottom: 17px;
  border: 3px solid #e8eee5;
  border-top-color: #285744;
  border-radius: 50%;
  animation: reservation-spin .7s linear infinite;
}

@keyframes reservation-spin {
  to {
    transform: rotate(360deg);
  }
}

/* PAYMENTS */

.payment-list {
  display: grid;
  gap: 15px;
}

.payment-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 21px;
  border: 1px solid var(--vh-border);
  border-radius: 13px;
  background: #fff;
  box-shadow: 0 4px 15px rgba(34, 58, 44, .025);
}

.payment-card-symbol {
  width: 43px;
  height: 43px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 11px;
  background: #eaf0e7;
  color: #315c48;
  font-size: 21px;
}

.payment-card-info {
  flex: 1;
  min-width: 0;
}

.payment-card-info > span {
  color: #a08351;
  font-size: 9px;
  letter-spacing: 1px;
  font-weight: 700;
}

.payment-card-info h3 {
  margin: 6px 0;
  color: #2d4939;
  font: 600 17px "Playfair Display", Georgia, serif;
}

.payment-card-info p {
  margin: 0;
  color: #899388;
  font-size: 11px;
}

.payment-card-right {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: 8px;
}

.payment-card-right > strong {
  color: #234333;
  font-size: 16px;
}

.paid-label {
  color: #41754a;
  font-size: 11px;
  font-weight: 700;
}

/* PAYMENT MODAL */

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  overflow-y: auto;
  padding: 20px;
  background: rgba(8, 31, 23, .68);
  backdrop-filter: blur(5px);
}

.payment-modal {
  position: relative;
  width: 100%;
  max-width: 475px;
  padding: 31px;
  border: 1px solid #e8e2d4;
  border-radius: 17px;
  background: #fffefa;
  box-shadow: 0 25px 75px rgba(0, 0, 0, .23);
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 16px;
  border: 0;
  background: transparent;
  color: #7b887e;
  font-size: 27px;
  cursor: pointer;
}

.modal-close:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.modal-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  margin-bottom: 18px;
  border-radius: 13px;
  background: #e8efe5;
  color: #315d4b;
  font-size: 23px;
}

.payment-modal h2 {
  margin: 0;
  color: #234333;
  font: 600 27px "Playfair Display", Georgia, serif;
}

.modal-description {
  color: #7f8b80;
  font-size: 11px;
  line-height: 1.7;
}

.modal-summary {
  margin-top: 20px;
  padding: 13px 16px;
  border: 1px solid #e9e6dc;
  border-radius: 10px;
  background: #f8f8f3;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  padding: 10px 0;
  color: #7d897e;
  font-size: 11px;
}

.summary-row strong {
  color: #304b3a;
  text-align: right;
}

.total-row {
  margin-top: 4px;
  padding-top: 15px;
  border-top: 1px solid #e4e1d7;
}

.total-row strong {
  color: #1d4a34;
  font-size: 16px;
}

.test-payment-note {
  padding: 11px 12px;
  border-radius: 7px;
  background: #f6f0e3;
  color: #8a744a;
  font-size: 10px;
  line-height: 1.6;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  margin-top: 20px;
}

.modal-actions button {
  padding: 12px 14px;
  border-radius: 7px;
  font: 700 11px "DM Sans", Arial, sans-serif;
  cursor: pointer;
}

.modal-actions button:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.modal-cancel {
  border: 1px solid #dedfd5;
  background: #fff;
  color: #59695c;
}

.modal-pay {
  border: 1px solid #174632;
  background: #174632;
  color: #fff;
}

.modal-pay:hover:not(:disabled) {
  background: #28634e;
}

/* RESPONSIVE */

@media (min-width: 1500px) {
  .page-content {
    padding-top: 38px;
  }

  .hero-banner {
    min-height: 300px;
  }
}

@media (max-width: 1100px) {
  .sidebar {
    width: 215px;
    min-width: 215px;
  }

  .page-content {
    padding-left: 25px;
    padding-right: 25px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stat-card {
    min-height: 105px;
  }

  .welcome-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .reservation-record-card {
    grid-template-columns: minmax(175px, 29%) minmax(0, 1fr);
  }

  .reservation-record-content {
    padding: 17px;
  }

  .reservation-detail-grid {
    gap: 7px;
  }

  .reservation-detail-item {
    padding: 11px 8px;
  }
}

@media (max-width: 760px) {
  .guest-layout {
    display: block;
  }

  .sidebar {
    position: relative;
    width: 100%;
    min-width: 0;
    height: auto;
    min-height: 0;
  }

  .sidebar-brand {
    min-height: 80px;
    flex-direction: row;
    gap: 10px;
    padding: 13px;
  }

  .brand-mark {
    width: 34px;
    height: 34px;
    margin: 0;
    font-size: 13px;
  }

  .sidebar-brand h1 {
    font-size: 16px;
  }

  .sidebar-brand > span {
    margin: 4px 0 0 -5px;
    font-size: 7px;
  }

  .sidebar-label {
    display: none;
  }

  .sidebar-nav {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    padding: 9px 10px;
  }

  .sidebar-nav button {
    width: auto;
    min-width: max-content;
    min-height: 38px;
    padding: 0 10px;
    font-size: 10px;
  }

  .nav-icon {
    width: auto;
    font-size: 14px;
  }

  .sidebar-bottom {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
  }

  .guest-profile {
    flex: 1;
    padding: 0;
  }

  .logout-button {
    width: auto;
    padding: 9px 12px;
  }

  .topbar {
    height: 56px;
    padding: 0 17px;
  }

  .topbar-user {
    font-size: 10px;
  }

  .breadcrumb {
    font-size: 8px;
  }

  .page-content {
    padding: 23px 16px 25px;
  }

  .hero-banner {
    min-height: 250px;
    background-position: 62% center;
  }

  .hero-content {
    padding: 25px 22px;
  }

  .hero-content h2 {
    font-size: 34px;
  }

  .hero-caption {
    right: 13px;
    bottom: 12px;
    font-size: 7px;
  }

  .stats-grid {
    gap: 9px;
    margin: 17px 0 29px;
  }

  .stat-card {
    padding: 13px 11px;
    gap: 9px;
  }

  .stat-icon {
    width: 32px;
    height: 32px;
    font-size: 15px;
  }

  .stat-copy > span {
    font-size: 9px;
  }

  .stat-copy strong {
    font-size: 22px;
  }

  .stat-copy strong.amount-value {
    font-size: 13px;
  }

  .stat-copy small {
    font-size: 8px;
  }

  .section-title-row h2 {
    font-size: 22px;
  }

  .rooms-shell {
    padding: 12px;
  }

  .reservation-welcome {
    align-items: flex-start;
    flex-direction: column;
  }

  .reservation-hero {
    min-height: 245px;
    background-position: 60% center;
  }

  .reservation-hero-content {
    padding: 25px;
  }

  .reservation-summary-grid {
    grid-template-columns: 1fr;
  }

  .reservation-records-section {
    padding: 16px;
  }

  .reservation-record-card {
    grid-template-columns: 1fr;
  }

  .reservation-photo {
    min-height: 230px;
  }

  .reservation-record-content {
    padding: 18px;
  }

  .reservation-detail-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .reservation-record-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .reservation-record-actions,
  .reservation-pay-btn {
    width: 100%;
  }

  .reservation-record-actions {
    justify-content: flex-start;
  }

  .reservation-records-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .payment-card {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .payment-card-right {
    align-items: flex-start;
    width: 100%;
    padding-left: 57px;
  }
}

@media (max-width: 440px) {
  .topbar-user > span:not(.topbar-status) {
    display: none;
  }

  .welcome-heading h2,
  .subpage-heading h2 {
    font-size: 28px;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }

  .stat-card {
    min-height: 108px;
  }

  .section-title-row {
    align-items: flex-start;
  }

  .section-title-row .text-link {
    font-size: 10px;
  }

  .hero-content h2 {
    font-size: 30px;
  }

  .reservation-hero-content h2 {
    font-size: 30px;
  }

  .reservation-records-section {
    padding: 12px;
  }

  .reservation-record-top {
    flex-wrap: wrap;
  }

  .reservation-record-content {
    padding: 14px;
  }

  .reservation-detail-grid {
    grid-template-columns: 1fr;
    margin: 17px 0;
  }

  .reservation-detail-item {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .reservation-detail-label {
    white-space: normal;
  }

  .reservation-price > strong {
    font-size: 21px;
  }

  .payment-modal {
    padding: 26px 20px;
  }

  .modal-actions {
    flex-direction: column;
  }

  .modal-actions button {
    width: 100%;
  }

  .page-footer {
    flex-direction: column;
    gap: 7px;
  }
}

.reservation-page {
  max-width: none;
  padding: 17px clamp(16px, 2.4vw, 34px) 24px;
  background:
    linear-gradient(180deg, rgba(250, 249, 244, .84), rgba(250, 249, 244, .98)),
    url("https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1800&q=80") center top / 100% 230px no-repeat,
    #f7f5ee;
}

.reservation-welcome {
  align-items: center;
  min-height: 76px;
  margin: 0 -1px 13px;
  padding: 5px 4px;
  background:
    linear-gradient(90deg, rgba(250, 249, 244, .99) 0%, rgba(250, 249, 244, .94) 47%, rgba(250, 249, 244, .08) 100%),
    url("https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80") right 45% / auto 155px no-repeat;
}

.reservation-welcome .eyebrow {
  margin-bottom: 4px;
  font-size: 9px;
}

.reservation-welcome h2 {
  font-size: clamp(30px, 2.7vw, 36px);
}

.reservation-welcome p {
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.5;
}

.reservation-welcome .reservation-browse-btn {
  padding: 11px 14px;
  font-size: 11px;
}

.reservation-summary-grid {
  gap: 12px;
  margin-bottom: 18px;
}

.reservation-summary-card {
  min-height: 68px;
  gap: 11px;
  padding: 11px 14px;
  border-radius: 6px;
  border-left: 3px solid #3e7549;
  box-shadow: 0 3px 10px rgba(34, 58, 44, .035);
}

.reservation-summary-card:nth-child(2) {
  border-left-color: #c99b3e;
}

.reservation-summary-icon {
  width: 39px;
  height: 39px;
  border-radius: 50%;
  font-size: 17px;
}

.reservation-summary-card > div:last-child {
  gap: 2px;
}

.reservation-summary-card span {
  color: #58685b;
  font-size: 10px;
}

.reservation-summary-card strong {
  font: 600 23px/1 "Playfair Display", Georgia, serif;
}

.reservation-summary-card small {
  font-size: 9px;
}

.reservation-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(205px, .95fr);
  align-items: start;
  gap: 14px;
}

.reservation-list-column {
  min-width: 0;
}

.reservation-records-heading {
  align-items: center;
  padding: 0 2px 8px;
  border: 0;
}

.reservation-records-heading h3 {
  font: 600 20px/1.3 "Playfair Display", Georgia, serif;
}

.reservation-sort {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #59685b;
  font-size: 10px;
  white-space: nowrap;
}

.reservation-sort select {
  max-width: 130px;
  padding: 7px 20px 7px 9px;
  border: 1px solid #e3dfd4;
  border-radius: 5px;
  background: #fffefa;
  color: #304b3a;
  font: 500 10px "DM Sans", Arial, sans-serif;
}

.reservation-record-list {
  gap: 8px;
  padding-top: 0;
}

.reservation-record-card {
  grid-template-columns: minmax(86px, .36fr) minmax(0, 1.64fr);
  min-height: 96px;
  border-radius: 7px;
  box-shadow: 0 2px 7px rgba(24, 54, 39, .035);
}

.reservation-record-card:hover,
.reservation-record-card.reservation-record-selected {
  border-color: #cbd7c9;
}

.reservation-photo {
  min-height: 96px;
}

.reservation-record-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: auto auto;
  align-content: center;
  gap: 4px 8px;
  padding: 6px 9px;
}

.reservation-record-top {
  grid-column: 1 / -1;
  align-items: flex-start;
  gap: 6px;
}

.reservation-number {
  margin-bottom: 2px;
  font-size: 9px;
  line-height: 1.1;
  letter-spacing: .4px;
}

.reservation-record-title h3 {
  font-size: 16px;
  line-height: 1.1;
}

.reservation-record-title p {
  margin-top: 1px;
  font-size: 10px;
  line-height: 1.2;
}

.reservation-status {
  gap: 4px;
  padding: 5px 8px;
  font-size: 9px;
}

.reservation-status-dot {
  width: 5px;
  height: 5px;
}

.reservation-detail-grid {
  grid-column: 1;
  align-self: center;
  gap: 10px;
  margin: 0;
}

.reservation-detail-item {
  gap: 3px;
  padding: 0 5px 0 0;
  border: 0;
  border-right: 1px solid #eeece3;
  border-radius: 0;
  background: transparent;
}

.reservation-detail-item:last-child {
  border-right: 0;
}

.reservation-detail-label {
  font-size: 9px;
  letter-spacing: 0;
}

.reservation-detail-label span {
  margin-right: 2px;
  font-size: 10px;
}

.reservation-detail-item strong {
  font-size: 10px;
}

.reservation-record-footer {
  grid-column: 2;
  align-self: center;
  gap: 5px;
  padding-top: 0;
  border-top: 0;
}

.reservation-price {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.reservation-price > span {
  order: 1;
  margin: 0;
  font-size: 9px;
  letter-spacing: 0;
}

.reservation-price > strong {
  font: 600 16px/1.2 "Playfair Display", Georgia, serif;
}

.reservation-record-actions {
  flex-shrink: 0;
}

.reservation-pay-btn,
.reservation-view-btn {
  padding: 8px 10px;
  border: 1px solid #173e30;
  border-radius: 4px;
  background: #173e30;
  color: #fff;
  font: 600 10px "DM Sans", Arial, sans-serif;
  cursor: pointer;
}

.reservation-pay-btn:hover,
.reservation-view-btn:hover {
  background: #2c5d45;
}

.reservation-view-btn {
  background: #fffefa;
  color: #173e30;
}

.reservation-confirmed-label,
.reservation-cancelled-label {
  font-size: 9px;
}

.reservation-payment-panel {
  position: sticky;
  top: 14px;
  min-width: 0;
  padding: 19px 17px 16px;
  border: 1px solid #e4e0d6;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 5px 18px rgba(24, 54, 39, .08);
}

.reservation-panel-close {
  position: absolute;
  top: 8px;
  right: 9px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #8c958c;
  font: 18px/1 "DM Sans", Arial, sans-serif;
  cursor: pointer;
}

.reservation-panel-icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  margin: 0 auto 6px;
  border-radius: 50%;
  background: #e8eee5;
  color: #173e30;
  font-size: 14px;
}

.reservation-payment-panel h3 {
  margin: 0;
  color: #193b30;
  font: 600 18px "Playfair Display", Georgia, serif;
  text-align: center;
}

.reservation-panel-description,
.reservation-panel-empty p {
  margin: 4px 0 10px;
  color: #788579;
  font-size: 10px;
  line-height: 1.5;
  text-align: center;
}

.reservation-panel-details {
  display: grid;
  gap: 0;
}

.reservation-panel-details > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 2px;
  border-bottom: 1px solid #f0eee8;
  font-size: 10px;
}

.reservation-panel-details span {
  color: #748076;
}

.reservation-panel-details strong {
  color: #304b3a;
  text-align: right;
}

.reservation-panel-details .reservation-panel-total {
  padding: 9px 5px;
  border-radius: 4px;
  background: #f5f7f1;
  font-weight: 700;
}

.reservation-panel-total strong {
  font-size: 12px;
}

.reservation-panel-note {
  margin: 9px 0;
  padding: 8px;
  border: 1px solid #d9e9e6;
  border-radius: 4px;
  background: #f0f7f5;
  color: #53706d;
  font-size: 9px;
  line-height: 1.45;
}

.reservation-panel-actions {
  display: flex;
  gap: 6px;
}

.reservation-panel-actions button {
  flex: 1;
  min-height: 36px;
  padding: 7px 9px;
  border: 1px solid #bec9bf;
  border-radius: 4px;
  background: #fffefa;
  color: #31513c;
  font: 600 10px "DM Sans", Arial, sans-serif;
  cursor: pointer;
}

.reservation-panel-actions .reservation-panel-confirm {
  border-color: #173e30;
  background: #173e30;
  color: #fff;
}

.reservation-panel-actions button:disabled {
  cursor: wait;
  opacity: .65;
}

.reservation-panel-status {
  flex: 1;
  padding: 8px 4px;
  border-radius: 4px;
  background: #e8eee5;
  color: #315b45;
  font-size: 9px;
  font-weight: 700;
  text-align: center;
  text-transform: capitalize;
}

.reservation-panel-empty {
  padding: 12px 4px;
}

.reservation-panel-empty p {
  margin-bottom: 0;
}

@media (max-width: 760px) {
  .reservation-page {
    padding-top: 18px;
  }
}

@media (min-width: 761px) and (max-width: 1100px) {
    .guest-layout.reservations-active .sidebar {
      width: 130px;
      min-width: 130px;
    }

    .guest-layout.reservations-active .sidebar-brand {
      min-height: 105px;
      padding: 12px 5px;
    }

    .guest-layout.reservations-active .brand-mark {
      width: 34px;
      height: 34px;
      margin-bottom: 6px;
      font-size: 13px;
    }

    .guest-layout.reservations-active .sidebar-brand h1 {
      font-size: 12px;
      letter-spacing: .8px;
    }

    .guest-layout.reservations-active .sidebar-brand > span {
      font-size: 6px;
      letter-spacing: 1.2px;
    }

    .guest-layout.reservations-active .sidebar-label {
      padding: 18px 12px 9px;
      font-size: 7px;
    }

    .guest-layout.reservations-active .sidebar-nav {
      padding: 0 7px;
      gap: 4px;
    }

    .guest-layout.reservations-active .sidebar-nav button {
      min-height: 35px;
      padding: 0 7px;
      gap: 6px;
      font-size: 9px;
    }

    .guest-layout.reservations-active .nav-icon {
      width: 14px;
      font-size: 14px;
    }

    .guest-layout.reservations-active .sidebar-bottom {
      padding: 10px 8px;
    }

    .guest-layout.reservations-active .avatar {
      width: 28px;
      height: 28px;
    }

    .guest-layout.reservations-active .profile-copy strong,
    .guest-layout.reservations-active .profile-copy span {
      font-size: 8px;
    }

    .guest-layout.reservations-active .logout-button {
      padding: 8px;
      font-size: 9px;
    }

    .guest-layout.reservations-active .topbar {
      height: 34px;
      padding: 0 20px;
    }

    .guest-layout.reservations-active .topbar-avatar {
      width: 24px;
      height: 24px;
    }

    .guest-layout.reservations-active .page-content {
      padding: 12px 18px 20px;
    }

    .guest-layout.reservations-active .reservation-page {
      padding: 12px 18px 20px;
    }
}

@media (max-width: 760px) {
    .guest-layout.reservations-active .sidebar {
      width: 100%;
      min-width: 0;
      height: auto;
      min-height: 0;
    }

    .guest-layout.reservations-active .sidebar-brand {
      min-height: 80px;
      flex-direction: row;
      gap: 10px;
      padding: 13px;
    }

    .guest-layout.reservations-active .sidebar-brand h1 {
      font-size: 16px;
    }

    .guest-layout.reservations-active .sidebar-brand > span {
      margin: 4px 0 0 -5px;
      font-size: 7px;
    }

    .guest-layout.reservations-active .sidebar-nav {
      padding: 9px 10px;
    }

    .guest-layout.reservations-active .sidebar-nav button {
      min-height: 38px;
      padding: 0 10px;
      font-size: 10px;
    }

    .guest-layout.reservations-active .topbar {
      height: 56px;
      padding: 0 17px;
    }

    .guest-layout.reservations-active .page-content,
    .guest-layout.reservations-active .reservation-page {
      padding: 18px 16px 25px;
    }
}

@media (max-width: 760px) {
  .reservation-welcome {
    align-items: flex-start;
    flex-direction: row;
    gap: 10px;
    min-height: 84px;
    background-size: auto 120px;
  }

  .reservation-welcome h2 {
    font-size: 28px;
  }

  .reservation-summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }

  .reservation-summary-card {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
    padding: 8px;
  }

  .reservation-summary-card strong {
    font-size: 19px;
  }

  .reservation-workspace {
    grid-template-columns: 1fr;
  }

  .reservation-payment-panel {
    position: relative;
    top: auto;
  }

  .reservation-records-heading {
    align-items: center;
    flex-direction: row;
  }

  .reservation-record-card {
    grid-template-columns: minmax(84px, .34fr) minmax(0, 1.66fr);
  }

  .reservation-photo {
    min-height: 94px;
  }

  .reservation-record-content {
    padding: 9px;
  }

  .reservation-record-footer {
    align-items: center;
    flex-direction: row;
  }

  .reservation-record-actions {
    justify-content: flex-end;
    width: auto;
  }

  .reservation-pay-btn {
    width: auto;
  }
}

@media (max-width: 440px) {
  .reservation-welcome {
    flex-direction: column;
  }

  .reservation-summary-card {
    align-items: center;
    text-align: center;
  }

  .reservation-record-card {
    grid-template-columns: 78px minmax(0, 1fr);
  }

  .reservation-record-content {
    display: flex;
    gap: 7px;
    padding: 8px;
  }

  .reservation-record-top,
  .reservation-detail-grid,
  .reservation-record-footer {
    grid-column: auto;
    width: 100%;
  }

  .reservation-detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .reservation-detail-item:last-child {
    display: none;
  }

  .reservation-record-title h3 {
    font-size: 13px;
  }

  .reservation-status {
    padding: 3px 5px;
  }

  .reservation-sort {
    font-size: 8px;
  }

  .reservation-sort select {
    max-width: 105px;
    font-size: 8px;
  }
}
</style>
