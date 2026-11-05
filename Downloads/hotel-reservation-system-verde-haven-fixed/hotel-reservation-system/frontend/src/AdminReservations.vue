
<script setup>
import { onMounted, ref, computed } from "vue";
import axios from "axios";

const reservations = ref([]);
const loading = ref(true);
const error = ref("");
const searchQuery = ref("");
const selectedStatus = ref("all");
const selectedPayment = ref("all");
const showDetails = ref(false);
const selectedReservation = ref(null);
const showNewReservation = ref(false);

const fetchReservations = async () => {
  try {
    loading.value = true;
    error.value = "";

    const response = await axios.get(
      "http://localhost:4000/api/admin/recent-reservations"
    );

    reservations.value = Array.isArray(response.data)
      ? response.data
      : [];
  } catch (err) {
    console.error("Reservations error:", err);
    error.value =
      err.response?.data?.message ||
      "Failed to load reservations.";
  } finally {
    loading.value = false;
  }
};

const formatAmount = (amount) =>
  Number(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const formatDate = (date) => {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
};

const normalize = (value) =>
  String(value || "").trim().toLowerCase().replaceAll("_", " ");

const statusClass = (status) => {
  const value = normalize(status);

  if (["confirmed", "approved"].includes(value)) return "confirmed";
  if (["completed", "checked out"].includes(value)) return "completed";
  if (["occupied", "checked in"].includes(value)) return "occupied";
  if (["cancelled", "canceled", "rejected"].includes(value)) return "cancelled";

  return "pending";
};

const paymentStatus = (reservation) => {
  const value = normalize(
    reservation.payment_status ||
    reservation.paymentStatus ||
    reservation.payment?.status ||
    ""
  );

  if (value.includes("refund")) return "refunded";
  if (["paid", "completed", "success", "successful"].includes(value)) return "paid";
  if (["unpaid", "failed", "declined"].includes(value)) return "unpaid";
  if (["pending", "processing"].includes(value)) return "pending";

  return "unknown";
};

const paymentLabel = (reservation) => {
  const status = paymentStatus(reservation);

  if (status === "unknown") return "Not provided";

  return status.charAt(0).toUpperCase() + status.slice(1);
};

const stats = computed(() => [
  {
    label: "Total Reservations",
    value: reservations.value.length,
    note: "All booking records",
    icon: "▤",
    theme: "green"
  },
  {
    label: "Pending",
    value: reservations.value.filter(
      r => statusClass(r.status) === "pending"
    ).length,
    note: "Awaiting confirmation",
    icon: "◷",
    theme: "gold"
  },
  {
    label: "Confirmed",
    value: reservations.value.filter(
      r => ["confirmed", "approved"].includes(normalize(r.status))
    ).length,
    note: "Approved bookings",
    icon: "✓",
    theme: "blue"
  },
  {
    label: "Cancelled",
    value: reservations.value.filter(
      r => ["cancelled", "canceled", "rejected"].includes(normalize(r.status))
    ).length,
    note: "Cancelled or rejected",
    icon: "×",
    theme: "rose"
  }
]);

const filteredReservations = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  return reservations.value.filter((r) => {
    const matchesSearch = [
      r.id,
      r.guest_name,
      r.room_number,
      r.room_type
    ].some(value =>
      String(value ?? "").toLowerCase().includes(query)
    );

    const matchesStatus =
      selectedStatus.value === "all" ||
      normalize(r.status) === selectedStatus.value;

    const matchesPayment =
      selectedPayment.value === "all" ||
      paymentStatus(r) === selectedPayment.value;

    return matchesSearch && matchesStatus && matchesPayment;
  });
});

const openDetails = (reservation) => {
  selectedReservation.value = reservation;
  showDetails.value = true;
};

const closeDetails = () => {
  showDetails.value = false;
  selectedReservation.value = null;
};

const openNewReservation = () => {
  showNewReservation.value = true;
};

onMounted(fetchReservations);
</script>

<template>
  <div class="reservations-page">

    <header class="page-header">
      <div>
        <p class="eyebrow">VERDE HAVEN · ADMINISTRATION</p>
        <h1>Manage Reservations<span>.</span></h1>
        <p class="page-subtitle">
          Every stay begins with a thoughtful reservation.
        </p>
      </div>

      <div class="header-actions">
        <button
          class="refresh-button"
          :disabled="loading"
          @click="fetchReservations"
        >
          <span class="refresh-icon">↻</span>
          Refresh
        </button>

        <button class="new-button" @click="openNewReservation">
          <span class="plus-icon">＋</span>
          New Reservation
        </button>
      </div>
    </header>

    <section class="hero-banner">
      <img
        class="hero-image"
        src="https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1800&q=90"
        alt="Elegant boutique hotel bedroom"
      />
      <div class="hero-overlay"></div>

      <div class="hero-content">
        <span class="hero-kicker">YOUR GUESTS, YOUR HOSPITALITY</span>
        <h2>Every reservation.<br />A memorable stay.</h2>
        <p>Thoughtfully manage every guest's journey at Verde Haven.</p>
      </div>

      <div class="hero-mark">
        <span>V</span>
        <small>VERDE HAVEN</small>
      </div>
    </section>

    <section class="stats-grid">
      <article
        v-for="stat in stats"
        :key="stat.label"
        class="stat-card"
        :class="'stat-' + stat.theme"
      >
        <div class="stat-top">
          <span class="stat-label">{{ stat.label }}</span>
          <span class="stat-icon">{{ stat.icon }}</span>
        </div>
        <strong class="stat-value">{{ stat.value }}</strong>
        <span class="stat-note">{{ stat.note }}</span>
        <div class="stat-decoration"></div>
      </article>
    </section>

    <section class="reservations-panel">
      <div class="panel-heading">
        <div>
          <span class="section-kicker">BOOKING MANAGEMENT</span>
          <h2>Guest Reservations</h2>
          <p>Review guest bookings, stay dates, and payment status.</p>
        </div>

        <div class="record-count">
          <span class="count-dot"></span>
          {{ filteredReservations.length }} records
        </div>
      </div>

      <div class="toolbar">
        <label class="search-box">
          <span class="search-icon">⌕</span>
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Search guest, room, or reservation ID..."
            aria-label="Search reservations"
          />
          <button
            v-if="searchQuery"
            class="clear-search"
            type="button"
            aria-label="Clear search"
            @click="searchQuery = ''"
          >×</button>
        </label>

        <label class="filter-box">
          <span class="filter-label">BOOKING STATUS</span>
          <select v-model="selectedStatus">
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="occupied">Occupied / Checked in</option>
            <option value="cancelled">Cancelled</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>

        <label class="filter-box payment-filter">
          <span class="filter-label">PAYMENT STATUS</span>
          <select v-model="selectedPayment">
            <option value="all">All payments</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="unpaid">Unpaid</option>
            <option value="refunded">Refunded</option>
            <option value="unknown">Not provided</option>
          </select>
        </label>

        <button
          class="reset-button"
          @click="searchQuery = ''; selectedStatus = 'all'; selectedPayment = 'all'"
        >
          Reset
        </button>
      </div>

      <div v-if="loading" class="state-card">
        <div class="loading-spinner"></div>
        <h3>Preparing your reservations</h3>
        <p>Please wait while the latest booking records load.</p>
      </div>

      <div v-else-if="error" class="state-card">
        <div class="state-symbol">!</div>
        <h3>Unable to load reservations</h3>
        <p>{{ error }}</p>
        <button class="retry-button" @click="fetchReservations">Try Again</button>
      </div>

      <div v-else-if="reservations.length === 0" class="state-card">
        <div class="state-symbol">▤</div>
        <h3>No reservations yet</h3>
        <p>New guest reservations will appear here.</p>
      </div>

      <div
        v-else-if="filteredReservations.length === 0"
        class="state-card"
      >
        <div class="state-symbol">⌕</div>
        <h3>No matching reservations</h3>
        <p>Try another search term or reset your filters.</p>
        <button
          class="retry-button"
          @click="searchQuery = ''; selectedStatus = 'all'; selectedPayment = 'all'"
        >Clear Filters</button>
      </div>

      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Guest Name</th>
              <th>Room</th>
              <th>Room Type</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Total Amount</th>
              <th>Booking Status</th>
              <th>Payment Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="reservation in filteredReservations"
              :key="reservation.id"
            >
              <td>
                <span class="reservation-id">
                  #RES-{{ String(reservation.id).padStart(3, "0") }}
                </span>
              </td>

              <td>
                <div class="guest-cell">
                  <div class="guest-avatar">
                    {{
                      String(reservation.guest_name || "G")
                        .trim().charAt(0).toUpperCase()
                    }}
                  </div>
                  <div class="guest-info">
                    <strong>{{ reservation.guest_name || "Guest" }}</strong>
                    <span>Hotel Guest</span>
                  </div>
                </div>
              </td>

              <td>
                <span class="room-number">
                  {{ reservation.room_number || "—" }}
                </span>
              </td>

              <td>{{ reservation.room_type || "—" }}</td>

              <td>{{ formatDate(reservation.check_in) }}</td>

              <td>{{ formatDate(reservation.check_out) }}</td>

              <td>
                <strong class="amount">
                  ₱{{ formatAmount(reservation.total_amount) }}
                </strong>
              </td>

              <td>
                <span
                  class="status-badge"
                  :class="statusClass(reservation.status)"
                >
                  <span class="status-dot"></span>
                  {{ reservation.status || "Pending" }}
                </span>
              </td>

              <td>
                <span
                  class="payment-badge"
                  :class="'payment-' + paymentStatus(reservation)"
                >
                  <span class="status-dot"></span>
                  {{ paymentLabel(reservation) }}
                </span>
              </td>

              <td>
                <div class="action-group">
                  <button
                    class="action-button view-action"
                    title="View reservation"
                    aria-label="View reservation"
                    @click="openDetails(reservation)"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>

                  <button
                    class="action-button edit-action"
                    title="Edit reservation — setup pending"
                    aria-label="Edit reservation"
                    @click="openDetails(reservation)"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m15 5 4 4M4 20l4.2-.9L20 7.3 16.7 4 4.9 15.8 4 20Z"/>
                    </svg>
                  </button>

                  <button
                    class="action-button delete-action"
                    title="Delete reservation — setup pending"
                    aria-label="Delete reservation"
                    @click="openDetails(reservation)"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="!loading && !error && reservations.length"
        class="table-footer"
      >
        <p>
          Showing <strong>{{ filteredReservations.length }}</strong>
          of <strong>{{ reservations.length }}</strong> reservations
        </p>
        <span class="footer-note">
          <span class="footer-leaf">✦</span>
          Exceptional stays, always.
        </span>
      </div>
    </section>

    <footer class="page-footer">
      <span>VERDE HAVEN BOUTIQUE HOTEL</span>
      <span>HOSPITALITY ROOTED IN NATURE</span>
    </footer>

    <!-- View details modal -->
    <div
      v-if="showDetails && selectedReservation"
      class="modal-backdrop"
      @click.self="closeDetails"
      @keydown.esc="closeDetails"
    >
      <section class="details-modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <div>
            <span class="section-kicker">RESERVATION DETAILS</span>
            <h2>Guest Booking</h2>
          </div>
          <button class="modal-close" @click="closeDetails" aria-label="Close">×</button>
        </div>

        <div class="modal-reservation-id">
          #RES-{{ String(selectedReservation.id).padStart(3, "0") }}
        </div>

        <div class="details-grid">
          <div class="detail-item">
            <span>Guest Name</span>
            <strong>{{ selectedReservation.guest_name || "—" }}</strong>
          </div>
          <div class="detail-item">
            <span>Room Number</span>
            <strong>{{ selectedReservation.room_number || "—" }}</strong>
          </div>
          <div class="detail-item">
            <span>Room Type</span>
            <strong>{{ selectedReservation.room_type || "—" }}</strong>
          </div>
          <div class="detail-item">
            <span>Booking Status</span>
            <strong>{{ selectedReservation.status || "Pending" }}</strong>
          </div>
          <div class="detail-item">
            <span>Check-in</span>
            <strong>{{ formatDate(selectedReservation.check_in) }}</strong>
          </div>
          <div class="detail-item">
            <span>Check-out</span>
            <strong>{{ formatDate(selectedReservation.check_out) }}</strong>
          </div>
          <div class="detail-item">
            <span>Payment Status</span>
            <strong>{{ paymentLabel(selectedReservation) }}</strong>
          </div>
          <div class="detail-item">
            <span>Total Amount</span>
            <strong class="detail-amount">
              ₱{{ formatAmount(selectedReservation.total_amount) }}
            </strong>
          </div>
        </div>

        <div class="modal-footer">
          <button class="modal-secondary" @click="closeDetails">Close</button>
          <button
            class="modal-primary"
            @click="closeDetails"
            title="Edit function will be connected to the backend next"
          >
            Edit Later
          </button>
        </div>
      </section>
    </div>

    <!-- New reservation placeholder -->
    <div
      v-if="showNewReservation"
      class="modal-backdrop"
      @click.self="showNewReservation = false"
    >
      <section class="details-modal new-modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <div>
            <span class="section-kicker">VERDE HAVEN BOUTIQUE HOTEL</span>
            <h2>New Reservation</h2>
          </div>
          <button
            class="modal-close"
            @click="showNewReservation = false"
            aria-label="Close"
          >×</button>
        </div>

        <div class="new-reservation-notice">
          <span class="notice-icon">＋</span>
          <div>
            <strong>Reservation form coming next</strong>
            <p>
              The interface is ready. We'll connect the guest, room,
              check-in, and check-out fields to your backend next.
            </p>
          </div>
        </div>

        <div class="modal-footer">
          <button class="modal-secondary" @click="showNewReservation = false">
            Close
          </button>
        </div>
      </section>
    </div>

  </div>
</template>

<style scoped>
.reservations-page {
  --forest: #173f30;
  --forest-deep: #102f24;
  --cream: #faf8f2;
  --gold: #b99553;
  --ink: #20372d;
  --line: #eae7de;

  width: 100%;
  max-width: 1600px;
  min-width: 0;
  margin: 0 auto;
  padding: 30px;
  box-sizing: border-box;
  color: var(--ink);
  background: var(--cream);
  font-family: Inter, "Segoe UI", sans-serif;
}

.reservations-page *,
.reservations-page *::before,
.reservations-page *::after {
  box-sizing: border-box;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 25px;
}

.eyebrow,
.section-kicker {
  color: var(--gold);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 2px;
}

.eyebrow { margin: 0 0 10px; }

.page-header h1 {
  margin: 0;
  color: var(--forest-deep);
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(27px, 3vw, 38px);
  font-weight: 500;
  letter-spacing: -1px;
}

.page-header h1 span { color: var(--gold); }

.page-subtitle {
  margin: 9px 0 0;
  color: #778279;
  font-size: 13px;
  line-height: 1.6;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.refresh-button,
.new-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 11px 15px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: .2s;
}

.refresh-button {
  border: 1px solid #dce4d8;
  background: #fffefa;
  color: var(--forest);
}

.refresh-button:hover { background: #edf3e9; }

.refresh-button:disabled {
  opacity: .6;
  cursor: wait;
}

.refresh-icon { font-size: 19px; line-height: 12px; }

.new-button {
  border: 1px solid var(--forest);
  background: var(--forest);
  color: white;
  box-shadow: 0 4px 10px #173f3015;
}

.new-button:hover {
  background: #245b43;
  transform: translateY(-1px);
}

.plus-icon { font-size: 21px; line-height: 12px; }

/* Hero banner */
.hero-banner {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 190px;
  overflow: hidden;
  border-radius: 9px;
  background: var(--forest);
  isolation: isolate;
}

.hero-image,
.hero-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.hero-image {
  z-index: -2;
  object-fit: cover;
  object-position: center 56%;
}

.hero-overlay {
  z-index: -1;
  background: linear-gradient(90deg, #0e2b1ff5 0%, #123627d9 43%, #13302450 100%);
}

.hero-content {
  max-width: 580px;
  padding: 28px 35px;
  color: white;
}

.hero-kicker {
  color: #e4c78e;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 2px;
}

.hero-content h2 {
  margin: 12px 0 9px;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(27px, 3.3vw, 39px);
  font-weight: 400;
  line-height: 1.12;
}

.hero-content p {
  margin: 0;
  color: #ffffffc7;
  font-size: 12px;
  line-height: 1.7;
}

.hero-mark {
  position: absolute;
  right: 35px;
  bottom: 23px;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #e8d2a5;
  opacity: .9;
}

.hero-mark span {
  font-family: Georgia, serif;
  font-size: 49px;
  line-height: 1;
}

.hero-mark small {
  margin-top: 5px;
  font-size: 8px;
  letter-spacing: 2px;
}

/* Statistics */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 15px;
  margin: 22px 0;
}

.stat-card {
  position: relative;
  min-width: 0;
  min-height: 135px;
  overflow: hidden;
  padding: 18px 19px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: white;
  box-shadow: 0 4px 15px #1a302208;
}

.stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.stat-label {
  color: #637269;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .8px;
  text-transform: uppercase;
}

.stat-icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 50%;
  font-size: 20px;
  font-weight: 600;
}

.stat-value {
  display: block;
  margin-top: 10px;
  color: var(--forest-deep);
  font-family: Georgia, serif;
  font-size: 32px;
  font-weight: 500;
  line-height: 1;
}

.stat-note {
  display: block;
  margin-top: 8px;
  color: #849087;
  font-size: 10px;
}

.stat-green { background: linear-gradient(135deg, white, #eff5ef); border-color: #dce9dd; }
.stat-green .stat-icon { color: #24563d; background: #e2eee2; }
.stat-gold { background: linear-gradient(135deg, white, #fcf3e4); border-color: #f0e1c6; }
.stat-gold .stat-icon { color: #a47727; background: #f6e9cb; }
.stat-blue { background: linear-gradient(135deg, white, #edf4f8); border-color: #d9e6ec; }
.stat-blue .stat-icon { color: #3d7183; background: #deedf3; }
.stat-rose { background: linear-gradient(135deg, white, #fbefed); border-color: #efdeda; }
.stat-rose .stat-icon { color: #a54d43; background: #f7e2df; }

.stat-decoration {
  position: absolute;
  right: -17px;
  bottom: -36px;
  width: 95px;
  height: 95px;
  border: 1px solid currentColor;
  border-radius: 50%;
  opacity: .07;
}

.stat-decoration::after {
  position: absolute;
  inset: 12px;
  border: 1px solid currentColor;
  border-radius: 50%;
  content: "";
}

/* Reservation panel */
.reservations-panel {
  overflow: hidden;
  border: 1px solid #e8e5dc;
  border-radius: 10px;
  background: #fffefa;
  box-shadow: 0 5px 24px #1b302308;
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding: 23px 23px 19px;
}

.panel-heading h2 {
  margin: 7px 0 5px;
  color: var(--forest-deep);
  font-family: Georgia, "Times New Roman", serif;
  font-size: 25px;
  font-weight: 500;
}

.panel-heading p {
  margin: 0;
  color: #879087;
  font-size: 11px;
}

.record-count {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 12px;
  border: 1px solid #e5eade;
  border-radius: 20px;
  background: #f3f6ef;
  color: #526e5a;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.count-dot,
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #65936b;
}

/* Search and filters */
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 23px 19px;
}

.search-box {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 150px;
  height: 42px;
  padding: 0 12px;
  border: 1px solid #e5e6de;
  border-radius: 6px;
  background: white;
}

.search-box:focus-within {
  border-color: #78957e;
  box-shadow: 0 0 0 3px #36674812;
}

.search-icon {
  margin-right: 9px;
  color: #7b897d;
  font-size: 23px;
  line-height: 1;
}

.search-box input {
  width: 100%;
  min-width: 0;
  padding: 0;
  outline: none;
  border: none;
  background: transparent;
  color: var(--ink);
  font: inherit;
  font-size: 11px;
}

.search-box input::placeholder { color: #a1a8a1; }

.clear-search {
  border: none;
  background: none;
  color: #748176;
  font-size: 20px;
  cursor: pointer;
}

.filter-box {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  width: 155px;
  height: 42px;
  padding: 4px 10px;
  border: 1px solid #e5e6de;
  border-radius: 6px;
  background: white;
}

.filter-label {
  color: #9a9f96;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 1px;
}

.filter-box select {
  width: 100%;
  outline: none;
  border: none;
  background: transparent;
  color: #425347;
  font-size: 10px;
  cursor: pointer;
}

.reset-button {
  height: 42px;
  padding: 0 12px;
  border: 1px solid #dfe5dc;
  border-radius: 6px;
  background: #f7f8f3;
  color: var(--forest);
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}

.reset-button:hover { background: #eaf0e8; }

/* Table */
.table-wrapper {
  width: 100%;
  overflow-x: auto;
  padding: 0 23px;
}

table {
  width: 100%;
  min-width: 1160px;
  border-spacing: 0;
  border-collapse: separate;
  text-align: left;
}

thead { background: var(--forest); }

th {
  padding: 15px 12px;
  color: #f7f5eb;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .5px;
  text-transform: uppercase;
  white-space: nowrap;
}

th:first-child { border-radius: 6px 0 0 6px; }
th:last-child { border-radius: 0 6px 6px 0; }

td {
  padding: 13px 12px;
  border-bottom: 1px solid #efeee8;
  color: #667168;
  font-size: 10px;
  white-space: nowrap;
}

tbody tr { transition: background .18s; }
tbody tr:hover { background: #f5f7f0; }
tbody tr:last-child td { border-bottom: none; }

.reservation-id {
  color: #718075;
  font-size: 10px;
  font-weight: 700;
}

.guest-cell {
  display: flex;
  align-items: center;
  gap: 9px;
}

.guest-avatar {
  display: grid;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  place-items: center;
  border: 1px solid #d9e3d7;
  border-radius: 50%;
  background: linear-gradient(145deg, #eaf0e3, #d9e4d5);
  color: var(--forest);
  font-family: Georgia, serif;
  font-size: 14px;
  font-weight: 700;
}

.guest-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.guest-info strong {
  color: #30463a;
  font-size: 10px;
  font-weight: 700;
}

.guest-info span {
  color: #98a096;
  font-size: 9px;
}

.room-number {
  color: #304b39;
  font-weight: 700;
}

.amount {
  color: #304b39;
  font-size: 10px;
  font-weight: 800;
}

.status-badge,
.payment-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 9px;
  border-radius: 20px;
  font-size: 9px;
  font-weight: 700;
  text-transform: capitalize;
}

.status-badge .status-dot,
.payment-badge .status-dot {
  width: 6px;
  height: 6px;
  background: currentColor;
}

.status-badge.confirmed,
.status-badge.occupied,
.payment-paid {
  background: #e2efe2;
  color: #2f7044;
}

.status-badge.pending,
.payment-pending {
  background: #fbefd7;
  color: #9a6a1d;
}

.status-badge.completed {
  background: #e3eef8;
  color: #32658c;
}

.status-badge.cancelled,
.payment-unpaid {
  background: #fae6e2;
  color: #a8463d;
}

.payment-refunded {
  background: #eee7fb;
  color: #7353a5;
}

.payment-unknown {
  background: #efefeb;
  color: #777d74;
}

/* Action icons */
.action-group {
  display: flex;
  align-items: center;
  gap: 5px;
}

.action-button {
  display: grid;
  width: 31px;
  height: 31px;
  flex-shrink: 0;
  place-items: center;
  border: 1px solid #e9e8df;
  border-radius: 6px;
  background: #fffefa;
  cursor: pointer;
  transition: .18s;
}

.action-button svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.view-action { color: #476d55; }
.view-action:hover { background: #e8f1e6; border-color: #cbdcc9; }

.edit-action { color: #a17a36; }
.edit-action:hover { background: #fbf1dc; border-color: #e9d8ad; }

.delete-action { color: #b25d51; }
.delete-action:hover { background: #fae9e5; border-color: #e9c9c3; }

/* Loading, error, empty states */
.state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 260px;
  padding: 30px 20px;
  text-align: center;
}

.state-symbol {
  display: grid;
  width: 50px;
  height: 50px;
  margin-bottom: 12px;
  place-items: center;
  border: 1px solid #dfe9dc;
  border-radius: 50%;
  background: #eff4ec;
  color: var(--forest);
  font-family: Georgia, serif;
  font-size: 25px;
}

.state-card h3 {
  margin: 0 0 7px;
  color: var(--forest-deep);
  font-family: Georgia, serif;
  font-size: 20px;
  font-weight: 500;
}

.state-card p {
  margin: 0;
  color: #879087;
  font-size: 12px;
  line-height: 1.6;
}

.loading-spinner {
  width: 35px;
  height: 35px;
  margin-bottom: 15px;
  border: 3px solid #e1e9de;
  border-top-color: var(--forest);
  border-radius: 50%;
  animation: spin .8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.retry-button {
  margin-top: 16px;
  padding: 10px 17px;
  border: none;
  border-radius: 6px;
  background: var(--forest);
  color: white;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 15px 23px 18px;
  border-top: 1px solid #efeee8;
}

.table-footer p {
  margin: 0;
  color: #879087;
  font-size: 10px;
}

.table-footer strong { color: #405747; }

.footer-note {
  color: #7e8c7d;
  font-family: Georgia, serif;
  font-size: 11px;
  font-style: italic;
}

.footer-leaf { margin-right: 5px; color: var(--gold); }

.page-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding: 21px 2px 3px;
  color: #93988d;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1.5px;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  padding: 20px;
  background: #0d211bd1;
  backdrop-filter: blur(5px);
}

.details-modal {
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 25px;
  border: 1px solid #e8e2d3;
  border-radius: 12px;
  background: #fffdf7;
  box-shadow: 0 24px 80px #0003;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 15px;
  padding-bottom: 18px;
  border-bottom: 1px solid #e9e6dd;
}

.modal-header h2 {
  margin: 8px 0 0;
  color: var(--forest-deep);
  font-family: Georgia, serif;
  font-size: 27px;
  font-weight: 500;
}

.modal-close {
  display: grid;
  width: 35px;
  height: 35px;
  place-items: center;
  border: 1px solid #e5e2d8;
  border-radius: 50%;
  background: white;
  color: #5d6c60;
  font-size: 24px;
  cursor: pointer;
}

.modal-close:hover { background: #f1f3ec; }

.modal-reservation-id {
  display: inline-block;
  margin: 18px 0;
  padding: 8px 12px;
  border-radius: 5px;
  background: #eaf1e8;
  color: var(--forest);
  font-size: 11px;
  font-weight: 800;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 18px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 14px 0;
  border-bottom: 1px solid #eeece4;
}

.detail-item span {
  color: #92998e;
  font-size: 10px;
}

.detail-item strong {
  color: #344c3b;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.detail-item .detail-amount {
  color: #987333;
  font-size: 16px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}

.modal-secondary,
.modal-primary {
  min-height: 40px;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.modal-secondary {
  border: 1px solid #dfe4da;
  background: white;
  color: var(--forest);
}

.modal-primary {
  border: 1px solid var(--forest);
  background: var(--forest);
  color: white;
}

.new-reservation-notice {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-top: 22px;
  padding: 18px;
  border: 1px solid #e4e8dc;
  border-radius: 8px;
  background: #f3f6ee;
}

.notice-icon {
  display: grid;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 50%;
  background: var(--forest);
  color: white;
  font-size: 22px;
}

.new-reservation-notice strong {
  display: block;
  margin-bottom: 6px;
  color: var(--forest);
  font-family: Georgia, serif;
  font-size: 17px;
  font-weight: 500;
}

.new-reservation-notice p {
  margin: 0;
  color: #788579;
  font-size: 12px;
  line-height: 1.7;
}

/* Responsive */
@media (min-width: 1450px) {
  .reservations-page { padding: 35px 38px; }
  .hero-banner { min-height: 210px; }
  .stat-card { min-height: 145px; padding: 21px 23px; }
}

@media (max-width: 1150px) {
  .reservations-page { padding: 24px 20px; }
  .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .toolbar { flex-wrap: wrap; }
  .search-box { flex-basis: 100%; }
  .filter-box { flex: 1; min-width: 135px; }
}

@media (max-width: 650px) {
  .reservations-page { padding: 20px 13px; }

  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .header-actions { width: 100%; }
  .header-actions button { flex: 1; }

  .hero-banner { min-height: 185px; }
  .hero-content { padding: 25px 20px; }

  .hero-mark {
    right: 13px;
    bottom: 13px;
    opacity: .5;
  }

  .hero-mark span { font-size: 32px; }
  .hero-mark small { font-size: 6px; }

  .stats-grid { gap: 10px; margin: 15px 0; }

  .stat-card { min-height: 125px; padding: 13px; }
  .stat-label { font-size: 9px; letter-spacing: .3px; }
  .stat-icon { width: 28px; height: 28px; }
  .stat-value { font-size: 28px; }

  .panel-heading { align-items: flex-start; padding: 19px 15px; }
  .panel-heading h2 { font-size: 22px; }
  .record-count { padding: 8px; font-size: 9px; }

  .toolbar { padding: 0 15px 15px; gap: 8px; }
  .search-box { flex-basis: 100%; }
  .filter-box { flex: 1; width: auto; min-width: 0; }
  .filter-box select { font-size: 9px; }
  .reset-button { padding: 0 10px; }

  .table-wrapper { padding: 0 12px; }

  .table-footer {
    align-items: flex-start;
    flex-direction: column;
    padding: 14px 15px;
  }

  .page-footer {
    align-items: flex-start;
    flex-direction: column;
    gap: 7px;
    line-height: 1.6;
  }

  .details-modal { padding: 19px; }
  .details-grid { gap: 0 12px; }
}
</style>
