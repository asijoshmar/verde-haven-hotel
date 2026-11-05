<script setup>
import { computed, onMounted, ref } from "vue";
import axios from "axios";

import AdminRooms from "./AdminRooms.vue";
import AdminReservations from "./AdminReservations.vue";
import AdminGuests from "./AdminGuests.vue";
import AdminPayments from "./AdminPayments.vue";
import AdminDemoPayments from "./AdminDemoPayments.vue";
import AdminReports from "./AdminReports.vue";
import AdminSettings from "./AdminSettings.vue";

import AdminHotelLayout from "./AdminHotelLayout.vue";


const activeSection = ref("dashboard");

const pageTitle = computed(() => {
  const titles = {
    dashboard: "Dashboard",
    rooms: "Rooms",
    reservations: "Reservations",
    guests: "Guests",
    payments: "Payments",
    "demo-payments": "GCash Demo Payments",
    "hotel-layout": "3D Hotel Editor",
    reports: "Reports",
    settings: "Settings"
  };

  return titles[activeSection.value] || "Dashboard";
});


const loading = ref(true);
const error = ref("");

const reservationsLoading = ref(true);
const reservationsError = ref("");

const stats = ref({
  total_rooms: 0,
  available_rooms: 0,
  total_reservations: 0,
  pending_reservations: 0,
  confirmed_reservations: 0,
  cancelled_reservations: 0,
  paid_payments: 0,
  total_revenue: 0
});

const recentReservations = ref([]);

const fetchDashboardStats = async () => {
  try {
    loading.value = true;
    error.value = "";

    const response = await axios.get(
      "http://localhost:4000/api/admin/dashboard-stats"
    );

    stats.value = response.data;
  } catch (err) {
    console.error("Dashboard statistics error:", err);
    error.value =
      err.response?.data?.message ||
      "Failed to load dashboard statistics.";
  } finally {
    loading.value = false;
  }
};

const fetchRecentReservations = async () => {
  try {
    reservationsLoading.value = true;
    reservationsError.value = "";

    const response = await axios.get(
      "http://localhost:4000/api/admin/recent-reservations"
    );

    recentReservations.value = response.data;
  } catch (err) {
    console.error("Recent reservations error:", err);
    reservationsError.value =
      err.response?.data?.message ||
      "Failed to load recent reservations.";
  } finally {
    reservationsLoading.value = false;
  }
};

const logout = () => {
  localStorage.removeItem("user");
  window.location.reload();
};

const goToSection = (section) => {
  activeSection.value = section;

  if (section === "dashboard") {
    fetchDashboardStats();
    fetchRecentReservations();
  }
};

const formatAmount = (amount) => {
  return Number(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatDate = (date) => {
  if (!date) return "";

  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
};

onMounted(() => {
  fetchDashboardStats();
  fetchRecentReservations();
});
</script>

<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-logo">🏨</div>

        <div class="brand-text">
          <h1>Verde Haven</h1>
          <span>Boutique Hotel</span>
        </div>
      </div>

      <div class="sidebar-menu">
        <p class="menu-title">MAIN MENU</p>

        <button
          class="menu-item"
          :class="{ active: activeSection === 'dashboard' }"
          @click="goToSection('dashboard')"
        >
          <span class="menu-icon">⌂</span>
          <span>Dashboard</span>
        </button>

        <button
          class="menu-item"
          :class="{ active: activeSection === 'rooms' }"
          @click="goToSection('rooms')"
        >
          <span class="menu-icon">▦</span>
          <span>Rooms</span>
        </button>

        <button
          class="menu-item"
          :class="{ active: activeSection === 'reservations' }"
          @click="goToSection('reservations')"
        >
          <span class="menu-icon">▣</span>
          <span>Reservations</span>
        </button>

        <button
          class="menu-item"
          :class="{ active: activeSection === 'guests' }"
          @click="goToSection('guests')"
        >
          <span class="menu-icon">♙</span>
          <span>Guests</span>
        </button>

        <button
          class="menu-item"
          :class="{ active: activeSection === 'payments' }"
          @click="goToSection('payments')"
        >
          <span class="menu-icon">₱</span>
          <span>Payments</span>
        </button>

        <button
          class="menu-item"
          :class="{ active: activeSection === 'demo-payments' }"
          @click="goToSection('demo-payments')"
        >
          <span class="menu-icon">?</span>
          <span>GCash Demo Payments</span>
        </button>

        <div class="menu-divider"></div>

        <p class="menu-title">MANAGEMENT</p>


<button
  class="menu-item"
  :class="{
    active: activeSection === 'hotel-layout'
  }"
  @click="goToSection('hotel-layout')"
>
  <span class="menu-icon">▧</span>
  <span>3D Hotel Editor</span>
</button>

        <button
          class="menu-item"
          :class="{ active: activeSection === 'reports' }"
          @click="goToSection('reports')"
        >
          <span class="menu-icon">▤</span>
          <span>Reports</span>
        </button>

        <button
          class="menu-item"
          :class="{ active: activeSection === 'settings' }"
          @click="goToSection('settings')"
        >
          <span class="menu-icon">⚙</span>
          <span>Settings</span>
        </button>
      </div>

      <div class="sidebar-bottom">
        <div class="admin-profile">
          <div class="profile-avatar">A</div>

          <div class="profile-info">
            <strong>Administrator</strong>
            <span>Hotel Admin</span>
          </div>
        </div>

        <button class="sidebar-logout" @click="logout">
          <span>⇥</span>
          Logout
        </button>
      </div>
    </aside>

    <main class="main-area">
      <header class="topbar">
        <div class="topbar-left">
          <div class="breadcrumb">
            <span>HotelStay</span>
            <b>/</b>
            <strong>{{ pageTitle }}</strong>
          </div>

          <h2>{{ pageTitle }}</h2>
        </div>

        <div class="topbar-right">
          <div class="today">
            <span class="today-icon">◷</span>
            <span>
              {{
                new Date().toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })
              }}
            </span>
          </div>

          <div class="top-avatar">A</div>
        </div>
      </header>

      
<AdminHotelLayout
  v-if="activeSection === 'hotel-layout'"
/>

<AdminRooms
  v-else-if="activeSection === 'rooms'"
/>


      <AdminReservations
        v-else-if="activeSection === 'reservations'"
      />

      <AdminGuests v-else-if="activeSection === 'guests'" />

      <AdminPayments v-else-if="activeSection === 'payments'" />

      <AdminDemoPayments
        v-else-if="activeSection === 'demo-payments'"
      />

      <AdminReports v-else-if="activeSection === 'reports'" />

      <AdminSettings v-else-if="activeSection === 'settings'" />

      <div v-else class="dashboard-content">
        <section class="welcome-banner">
          <div class="welcome-content">
            <span class="welcome-label">ADMINISTRATOR PANEL</span>
            <h1>Welcome back, Administrator!</h1>
            <p>Here's what's happening with your hotel today.</p>
          </div>

          <div class="welcome-icon">🏨</div>
        </section>

        <section class="dashboard-section">
          <div class="section-heading">
            <h2>Overview</h2>
            <p>Quick summary of your hotel.</p>
          </div>

          <div v-if="loading" class="loading-box">
            Loading dashboard statistics...
          </div>

          <div v-else-if="error" class="error-box">
            <span>{{ error }}</span>
            <button @click="fetchDashboardStats">Try Again</button>
          </div>

          <div v-else class="stats-grid">
            <div class="stat-card">
              <div class="stat-top">
                <div class="stat-icon blue">🏨</div>
                <span class="stat-label">Total Rooms</span>
              </div>
              <div class="stat-value">{{ stats.total_rooms }}</div>
              <p>Registered hotel rooms</p>
            </div>

            <div class="stat-card">
              <div class="stat-top">
                <div class="stat-icon green">✓</div>
                <span class="stat-label">Available Rooms</span>
              </div>
              <div class="stat-value">{{ stats.available_rooms }}</div>
              <p>Rooms currently available</p>
            </div>

            <div class="stat-card">
              <div class="stat-top">
                <div class="stat-icon orange">▣</div>
                <span class="stat-label">Reservations</span>
              </div>
              <div class="stat-value">{{ stats.total_reservations }}</div>
              <p>Total guest reservations</p>
            </div>

            <div class="stat-card">
              <div class="stat-top">
                <div class="stat-icon emerald">₱</div>
                <span class="stat-label">Total Revenue</span>
              </div>
              <div class="stat-value revenue">
                ₱{{ formatAmount(stats.total_revenue) }}
              </div>
              <p>Paid reservation revenue</p>
            </div>
          </div>
        </section>

        <section class="dashboard-section">
          <div class="section-heading">
            <h2>Reservation Overview</h2>
            <p>Current reservation and payment status.</p>
          </div>

          
<div class="overview-grid">
  <!-- Pending -->
  <div class="overview-card pending-card">
    <div class="overview-top">
      <span class="overview-label">Pending</span>
      <div class="overview-icon">
        <img
          src="https://img.icons8.com/fluency/96/time.png"
          alt="Pending"
        />
      </div>
    </div>
    <strong>{{ stats.pending_reservations }}</strong>
    <p>Reservations awaiting confirmation</p>
    <div class="overview-line"></div>
  </div>

  <!-- Confirmed -->
  <div class="overview-card confirmed-card">
    <div class="overview-top">
      <span class="overview-label">Confirmed</span>
      <div class="overview-icon">
        <img
          src="https://img.icons8.com/fluency/96/checked.png"
          alt="Confirmed"
        />
      </div>
    </div>
    <strong>{{ stats.confirmed_reservations }}</strong>
    <p>Successfully confirmed reservations</p>
    <div class="overview-line"></div>
  </div>

  <!-- Cancelled -->
  <div class="overview-card cancelled-card">
    <div class="overview-top">
      <span class="overview-label">Cancelled</span>
      <div class="overview-icon">
        <img
          src="https://img.icons8.com/fluency/96/cancel.png"
          alt="Cancelled"
        />
      </div>
    </div>
    <strong>{{ stats.cancelled_reservations }}</strong>
    <p>Cancelled reservations</p>
    <div class="overview-line"></div>
  </div>

  <!-- Paid Payments -->
  <div class="overview-card paid-card">
    <div class="overview-top">
      <span class="overview-label">Paid Payments</span>
      <div class="overview-icon">
        <img
          src="https://img.icons8.com/fluency/96/bank-card-back-side.png"
          alt="Paid payments"
        />
      </div>
    </div>
    <strong>{{ stats.paid_payments }}</strong>
    <p>Payments successfully recorded</p>
    <div class="overview-line"></div>
  </div>
</div>

        </section>

        <section class="dashboard-section">
          <div class="section-heading">
            <h2>Quick Access</h2>
            <p>Open a management section.</p>
          </div>

          <div class="quick-grid">
            <button class="quick-card" @click="goToSection('rooms')">
              <div class="quick-icon blue">🏨</div>
              <div class="quick-content">
                <h3>Manage Rooms</h3>
                <p>Manage hotel rooms and availability.</p>
              </div>
              <span class="quick-arrow">→</span>
            </button>

            <button
              class="quick-card"
              @click="goToSection('reservations')"
            >
              <div class="quick-icon orange">▣</div>
              <div class="quick-content">
                <h3>Reservations</h3>
                <p>View and manage guest reservations.</p>
              </div>
              <span class="quick-arrow">→</span>
            </button>

            <button class="quick-card" @click="goToSection('guests')">
              <div class="quick-icon purple">♙</div>
              <div class="quick-content">
                <h3>Guests</h3>
                <p>View registered guest accounts.</p>
              </div>
              <span class="quick-arrow">→</span>
            </button>

            <button
              class="quick-card"
              @click="goToSection('payments')"
            >
              <div class="quick-icon green">💳</div>
              <div class="quick-content">
                <h3>Payments</h3>
                <p>View reservation payment records.</p>
              </div>
              <span class="quick-arrow">→</span>
            </button>
          </div>
        </section>

        <section class="dashboard-section recent-section">
          <div class="section-heading recent-heading">
            <div>
              <h2>Recent Reservations</h2>
              <p>Latest guest reservations.</p>
            </div>

            <button
              class="view-all-button"
              @click="goToSection('reservations')"
            >
              View All →
            </button>
          </div>

          <div v-if="reservationsLoading" class="table-message">
            Loading recent reservations...
          </div>

          <div
            v-else-if="reservationsError"
            class="table-message error-text"
          >
            {{ reservationsError }}
          </div>

          <div
            v-else-if="recentReservations.length === 0"
            class="table-message"
          >
            No reservations found.
          </div>

          <div v-else class="table-card">
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Guest</th>
                    <th>Room</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="reservation in recentReservations"
                    :key="reservation.id"
                  >
                    <td>
                      <div class="guest-cell">
                        <div class="guest-avatar">
                          {{ reservation.guest_name?.charAt(0) || "G" }}
                        </div>

                        <div>
                          <strong>{{ reservation.guest_name }}</strong>
                          <small>Reservation #{{ reservation.id }}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <strong>Room {{ reservation.room_number }}</strong>
                      <small>{{ reservation.room_type }}</small>
                    </td>

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
                        :class="reservation.status"
                      >
                        {{ reservation.status }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>


<style scoped>
:global(*) {
  box-sizing: border-box;
}

:global(html),
:global(body),
:global(#app) {
  margin: 0;
  min-height: 100%;
  width: 100%;
  max-width: none !important;
}

:global(body) {
  overflow-x: hidden;
  background: #f7f5ee;
}

.admin-layout {
  --forest: #10372d;
  --forest-light: #1b4c3c;
  --gold: #c9aa70;
  --cream: #f7f5ee;
  --ink: #193b30;
  --muted: #77837b;
  --border: #e7e2d6;

  display: flex;
  width: 100%;
  min-height: 100vh;
  color: var(--ink);
  background: var(--cream);
  font-family: "DM Sans", Inter, "Segoe UI", sans-serif;
}

/* SIDEBAR */

.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  width: 252px;
  min-height: 100vh;
  color: #f7f5ed;
  background:
    linear-gradient(180deg, rgba(10, 43, 34, .97), rgba(17, 57, 45, .98)),
    url("https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=700&q=80") center/cover;
  border-right: 1px solid rgba(215, 193, 143, .2);
}

.sidebar-brand {
  min-height: 120px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  border-bottom: 1px solid rgba(221, 199, 151, .25);
}

.brand-logo {
  width: 43px;
  height: 43px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  color: var(--gold);
  background: rgba(214, 192, 142, .12);
  border: 1px solid rgba(214, 192, 142, .5);
  border-radius: 50%;
  font-size: 22px;
}

.brand-text {
  min-width: 0;
}

.brand-text h1 {
  margin: 0;
  color: #fff9e9;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 21px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: .1px;
}

.brand-text span {
  display: block;
  margin-top: 4px;
  color: #c7d4c9;
  font-size: 10px;
  letter-spacing: 1.1px;
}

.sidebar-menu {
  flex: 1;
  overflow-y: auto;
  padding: 27px 15px;
}

.menu-title {
  margin: 0 0 14px;
  padding: 0 12px;
  color: #b4c3b7;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.8px;
}

.menu-item {
  width: 100%;
  min-height: 43px;
  display: flex;
  align-items: center;
  gap: 13px;
  margin-bottom: 5px;
  padding: 0 13px;
  color: #e0e8df;
  background: transparent;
  border: 0;
  border-radius: 8px;
  text-align: left;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: .2s ease;
}

.menu-item:hover {
  color: white;
  background: rgba(255, 255, 255, .09);
}

.menu-item.active {
  color: #fffdf5;
  background: rgba(210, 193, 150, .2);
  box-shadow: inset 3px 0 var(--gold);
}

.menu-item.active .menu-icon {
  color: #e4c98f;
}

.menu-icon {
  width: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #d4c69f;
  font-size: 16px;
}

.menu-divider {
  height: 1px;
  margin: 22px 8px;
  background: rgba(222, 205, 166, .23);
}

.disabled-item {
  opacity: .55;
  cursor: default;
}

.disabled-item small {
  margin-left: auto;
  padding: 4px 7px;
  color: #e0d2ad;
  background: rgba(255, 255, 255, .1);
  border-radius: 20px;
  font-size: 8px;
  letter-spacing: .5px;
}

.sidebar-bottom {
  padding: 17px 17px 20px;
  border-top: 1px solid rgba(221, 199, 151, .25);
}

.admin-profile {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 4px 3px 17px;
}

.profile-avatar,
.top-avatar {
  display: grid;
  place-items: center;
  width: 37px;
  height: 37px;
  flex-shrink: 0;
  color: var(--forest);
  background: #e1e7d9;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 700;
}

.profile-info strong {
  display: block;
  color: #fffdf5;
  font-size: 12px;
}

.profile-info span {
  display: block;
  margin-top: 4px;
  color: #b8c9bd;
  font-size: 10px;
}

.sidebar-logout {
  width: 100%;
  min-height: 39px;
  color: #f0d5a0;
  background: transparent;
  border: 1px solid rgba(216, 192, 141, .65);
  border-radius: 9px;
  font-size: 12px;
  cursor: pointer;
  transition: .2s ease;
}

.sidebar-logout:hover {
  color: white;
  background: rgba(213, 190, 142, .13);
}

/* MAIN AREA AND HEADER */

.main-area {
  width: calc(100% - 252px);
  min-width: 0;
  min-height: 100vh;
  margin-left: 252px;
  background: var(--cream);
}

.topbar {
  min-height: 82px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 13px 34px;
  background: rgba(255, 254, 249, .94);
  border-bottom: 1px solid var(--border);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
  font-size: 11px;
}

.breadcrumb span {
  color: #8b968d;
}

.breadcrumb b {
  color: #c3bdaE;
  font-weight: 400;
}

.breadcrumb strong {
  color: #456653;
  font-size: 11px;
  font-weight: 600;
}

.topbar h2 {
  margin: 0;
  color: var(--ink);
  font-family: "Playfair Display", Georgia, serif;
  font-size: 27px;
  font-weight: 600;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 17px;
}

.today {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #7a867c;
  font-size: 11px;
  white-space: nowrap;
}

.today-icon {
  color: #b69458;
  font-size: 15px;
}

.top-avatar {
  width: 37px;
  height: 37px;
}

/* DASHBOARD */

.dashboard-content {
  width: 100%;
  max-width: 1750px;
  margin: 0 auto;
  padding: 24px 34px 42px;
}

.welcome-banner {
  position: relative;
  isolation: isolate;
  min-height: 158px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  overflow: hidden;
  padding: 28px 30px;
  margin-bottom: 23px;
  color: white;
  background:
    linear-gradient(90deg, rgba(10, 47, 36, .97) 0%, rgba(15, 54, 41, .87) 46%, rgba(12, 43, 33, .14) 100%),
    url("https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1800&q=85") center 54%/cover;
  border: 1px solid rgba(213, 192, 143, .35);
  border-radius: 13px;
  box-shadow: 0 10px 26px rgba(32, 58, 43, .1);
}

.welcome-content {
  position: relative;
  z-index: 1;
}

.welcome-label {
  display: block;
  margin-bottom: 11px;
  color: #e5ca92;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
}

.welcome-content h1 {
  margin: 0 0 9px;
  color: #fffdf7;
  font-family: "Playfair Display", Georgia, serif;
  font-size: clamp(25px, 2.5vw, 36px);
  font-weight: 500;
  line-height: 1.2;
}

.welcome-content p {
  margin: 0;
  color: #e0e8df;
  font-size: 12px;
}

.welcome-icon {
  position: relative;
  z-index: 1;
  width: 65px;
  height: 65px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  color: #e6cc98;
  background: rgba(255, 255, 255, .08);
  border: 1px solid rgba(226, 203, 151, .65);
  border-radius: 16px;
  font-size: 30px;
}

/* SECTION HEADINGS */

.dashboard-section {
  margin-bottom: 23px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 13px;
}

.section-heading.centered {
  display: block;
  text-align: left;
}

.section-heading h2 {
  margin: 0 0 4px;
  color: #193e30;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 22px;
  font-weight: 600;
}

.section-heading p {
  margin: 0;
  color: #7e8980;
  font-size: 11px;
}

/* STAT CARDS */

.stats-grid,
.overview-grid,
.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 13px;
}

/* FIX: CLEAR IMAGES ON DASHBOARD CARDS */
.stat-card {
  position: relative;
  isolation: isolate;
  overflow: hidden;
}

.stat-card::after {
  position: absolute;
  content: "";
  top: 0;
  right: 0;
  bottom: 0;
  left: 42%;
  z-index: 0;

  opacity: 1 !important;
  background-size: cover !important;
  background-position: center !important;
  background-repeat: no-repeat !important;

  filter: none !important;
  mask-image: none !important;
  -webkit-mask-image: none !important;
}

/* Alisin ang overlay na nagpapapusyaw sa larawan */
.stat-card::before {
  content: none !important;
}

/* Panatilihing nasa ibabaw ang text at icons */
.stat-card > * {
  position: relative;
  z-index: 2;
}

.stat-card:nth-child(1)::after {
  background-image: url("https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=100");
}

.stat-card:nth-child(2)::after {
  background-image: url("https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=1200&q=100");
}

.stat-card:nth-child(3)::after {
  background-image: url("https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=100");
}

.stat-card:nth-child(4)::after {
  background-image: url("https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=100");
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 9px 22px rgba(37, 60, 43, .09);
}

.stat-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-icon,
.quick-icon {
  width: 37px;
  height: 37px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 12px;
  font-size: 16px;
}

.stat-icon.blue,
.quick-icon.blue {
  color: #254b3b;
  background: #e7e9d9;
}

.stat-icon.green,
.quick-icon.green {
  color: #2f6a4d;
  background: #e1ebdf;
}

.stat-icon.orange,
.quick-icon.orange {
  color: #9a7439;
  background: #f1e7d1;
}

.stat-icon.emerald,
.quick-icon.purple {
  color: #315b4b;
  background: #e4eae0;
}

.stat-label {
  color: #66756a;
  font-size: 11px;
  font-weight: 500;
}

.stat-value {
  margin-top: 12px;
  color: #153f30;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 29px;
  font-weight: 600;
  line-height: 1.1;
}

.stat-value.revenue {
  font-family: "DM Sans", Inter, sans-serif;
  font-size: clamp(17px, 1.7vw, 25px);
  letter-spacing: -.6px;
  overflow-wrap: anywhere;
}

.stat-card p {
  margin: 6px 0 0;
  color: #839087;
  font-size: 10px;
}

/* RESERVATION STATUS */

.overview-card {
  min-width: 0;
  min-height: 76px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 13px 16px;
  background: #fffefa;
  border: 1px solid var(--border);
  border-radius: 9px;
  box-shadow: 0 4px 13px rgba(45, 58, 42, .025);
}

.overview-card span {
  display: block;
  color: #6f7c72;
  font-size: 11px;
}

.overview-card strong {
  display: block;
  margin-top: 6px;
  color: #173e30;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 23px;
  font-weight: 600;
}

.overview-line {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
}

.overview-line.orange {
  background: #d5ac5c;
}

.overview-line.green {
  background: #429477;
}

.overview-line.red {
  background: #df7974;
}

.overview-line.blue {
  background: #91aaa1;
}



/* QUICK ACCESS — DISTINCT IMAGES + READABLE TEXT */

.quick-card {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: #fffefa !important;
}

/* Photo panel on the right */
.quick-card::after {
  content: "";
  position: absolute;
  inset: 0 0 0 46%;
  z-index: 0;
  opacity: 1 !important;
  background-size: cover !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
  filter: none !important;
  mask-image: none !important;
  -webkit-mask-image: none !important;
  pointer-events: none;
}

/* Different image for each Quick Access card */
.quick-card:nth-child(1)::after {
  background-image: url(
    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1000&q=90"
  ) !important;
}

.quick-card:nth-child(2)::after {
  background-image: url(
    "https://images.unsplash.com/photo-1434626881859-194d67b2b86f?auto=format&fit=crop&w=1000&q=90"
  ) !important;
}

.quick-card:nth-child(3)::after {
  background-image: url(
    "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1000&q=90"
  ) !important;
}

.quick-card:nth-child(4)::after {
  background-image: url(
    "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1000&q=90"
  ) !important;
}

/* Gentle fade at the edge of the photos */
.quick-card::before {
  content: "";
  position: absolute;
  inset: 0 25% 0 38%;
  z-index: 1;
  background: linear-gradient(
    90deg,
    #fffefa 0%,
    rgba(255, 254, 250, 0.75) 40%,
    transparent 100%
  ) !important;
  pointer-events: none;
}

/* Keep icons, text and arrows readable */
.quick-card > * {
  position: relative;
  z-index: 2;
}

.quick-content {
  flex: 1;
  min-width: 0;
}

.quick-content h3 {
  color: #214433 !important;
}

.quick-content p {
  color: #52685a !important;
  max-width: 175px;
  line-height: 1.5;
}

.quick-arrow {
  flex-shrink: 0;
  color: #b49359;
  font-size: 18px;
}

/* RECENT RESERVATIONS */

.recent-section {
  margin-bottom: 0;
}

.view-all-button {
  padding: 8px 13px;
  color: #244d3b;
  background: #fffefa;
  border: 1px solid #d6d9c9;
  border-radius: 9px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: .2s ease;
}

.view-all-button:hover {
  color: white;
  background: var(--forest);
  border-color: var(--forest);
}

.table-card {
  width: 100%;
  overflow: hidden;
  background: #fffefa;
  border: 1px solid var(--border);
  border-radius: 11px;
  box-shadow: 0 4px 15px rgba(45, 58, 42, .035);
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
}

.table-card table {
  width: 100%;
  min-width: 730px;
  border-collapse: collapse;
}

.table-card thead {
  background: #f6f4ec;
}

.table-card th {
  padding: 12px 15px;
  color: #65776b;
  border-bottom: 1px solid #eae6da;
  text-align: left;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.table-card td {
  padding: 11px 15px;
  color: #52685b;
  border-bottom: 1px solid #efede5;
  font-size: 10px;
}

.table-card tbody tr:last-child td {
  border-bottom: 0;
}

.table-card tbody tr {
  transition: background .2s ease;
}

.table-card tbody tr:hover {
  background: #f7f7ef;
}

.guest-cell {
  display: flex;
  align-items: center;
  gap: 9px;
}

.guest-avatar {
  width: 29px;
  height: 29px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  color: #254c3b;
  background: #e4e8da;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
}

.guest-cell strong,
.table-card td strong {
  display: block;
  color: #284637;
  font-size: 10px;
  font-weight: 600;
}

.guest-cell small,
.table-card td small {
  display: block;
  margin-top: 3px;
  color: #8b978d;
  font-size: 9px;
}

.amount {
  color: #275940 !important;
  white-space: nowrap;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 9px;
  color: #426d50;
  background: #e2eee0;
  border-radius: 20px;
  font-size: 9px;
  font-weight: 700;
  text-transform: capitalize;
  white-space: nowrap;
}

.status-badge.pending {
  color: #9a7438;
  background: #faedcf;
}

.status-badge.confirmed {
  color: #326b4c;
  background: #dfeddf;
}

.status-badge.cancelled {
  color: #a4534e;
  background: #f5e3df;
}

.status-badge.completed {
  color: #3e635b;
  background: #e3ece8;
}

/* LOADING AND ERROR STATES */

.loading-box,
.table-message {
  padding: 25px;
  color: #78877b;
  background: #fffefa;
  border: 1px dashed #d8dfd2;
  border-radius: 10px;
  text-align: center;
  font-size: 12px;
}

.error-box {
  padding: 20px;
  color: #a14f47;
  background: #fff8f5;
  border: 1px solid #efd9d2;
  border-radius: 10px;
  text-align: center;
  font-size: 12px;
}

.error-box button {
  margin-left: 10px;
  padding: 8px 12px;
  color: white;
  background: var(--forest);
  border: 0;
  border-radius: 7px;
  cursor: pointer;
}

.error-text {
  color: #a14f47;
}

/* RESPONSIVE */

@media (min-width: 1500px) {
  .dashboard-content {
    padding-right: 38px;
    padding-left: 38px;
  }

  .stats-grid,
  .overview-grid,
  .quick-grid {
    gap: 16px;
  }
}

@media (max-width: 1200px) {
  .sidebar {
    width: 225px;
  }

  .main-area {
    width: calc(100% - 225px);
    margin-left: 225px;
  }

  .dashboard-content {
    padding: 22px;
  }

  .topbar {
    padding-right: 24px;
    padding-left: 24px;
  }

  .stats-grid,
  .overview-grid,
  .quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 800px) {
  .admin-layout {
    display: block;
  }

  .sidebar {
    position: relative;
    inset: auto;
    width: 100%;
    min-height: 0;
  }

  .sidebar-brand {
    min-height: 75px;
  }

  .sidebar-menu {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    padding: 12px;
  }

  .menu-title,
  .menu-divider,
  .disabled-item,
  .sidebar-bottom {
    display: none;
  }

  .menu-item {
    width: auto;
    flex: 1 1 105px;
    justify-content: center;
    margin: 0;
    padding: 0 8px;
  }

  .main-area {
    width: 100%;
    margin-left: 0;
  }

  .topbar {
    min-height: 72px;
    padding: 13px 20px;
  }

  .dashboard-content {
    padding: 20px;
  }

  .welcome-banner {
    min-height: 145px;
    background-position: center;
  }
}

@media (max-width: 560px) {
  .topbar {
    align-items: flex-start;
    gap: 10px;
    padding: 13px 15px;
  }

  .topbar h2 {
    font-size: 23px;
  }

  .topbar-right {
    gap: 8px;
  }

  .today {
    display: none;
  }

  .dashboard-content {
    padding: 15px 12px 28px;
  }

  .welcome-banner {
    min-height: 145px;
    padding: 20px 17px;
    border-radius: 11px;
  }

  .welcome-content h1 {
    font-size: 24px;
  }

  .welcome-content p {
    max-width: 260px;
    font-size: 11px;
    line-height: 1.5;
  }

  .welcome-label {
    font-size: 8px;
  }

  .welcome-icon {
    width: 43px;
    height: 43px;
    font-size: 22px;
  }

  .stats-grid,
  .overview-grid,
  .quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
  }

  .stat-card {
    min-height: 124px;
    padding: 12px;
  }

  .stat-icon,
  .quick-icon {
    width: 32px;
    height: 32px;
    border-radius: 10px;
  }

  .stat-top {
    gap: 7px;
  }

  .stat-label {
    font-size: 10px;
  }

  .stat-value {
    font-size: 25px;
  }

  .stat-value.revenue {
    font-size: 17px;
  }

  .stat-card p {
    font-size: 9px;
  }

  .overview-card {
    min-height: 69px;
    padding: 11px;
  }

  .overview-card span {
    font-size: 10px;
  }

  .overview-card strong {
    font-size: 21px;
  }

  .quick-card {
    min-height: 78px;
    gap: 8px;
    padding: 10px;
  }

  .quick-content h3 {
    font-size: 10px;
  }

  .quick-content p {
    font-size: 9px;
  }

  .quick-arrow {
    font-size: 15px;
  }

  .section-heading h2 {
    font-size: 19px;
  }

  .section-heading p {
    font-size: 10px;
  }

  .view-all-button {
    padding: 7px 9px;
  }

  .table-card th,
  .table-card td {
    padding: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: .01ms !important;
  }
}

/* VERDE HAVEN — PREMIUM DASHBOARD REDESIGN */
.admin-layout {
  --forest: #123b2e;
  --forest-light: #1b4d3b;
  --gold: #c8a66b;
  --cream: #f6f4ec;
  --ink: #1c382c;
  --border: #e6e1d5;

  background: var(--cream) !important;
  color: var(--ink) !important;
}

.sidebar {
  width: 235px !important;
  background: linear-gradient(165deg, #102f26, #1c4b39) !important;
  border-right: 1px solid #c8a66b55 !important;
  box-shadow: 5px 0 24px #173b2b12;
}

.main-area {
  width: calc(100% - 235px) !important;
  margin-left: 235px !important;
  background: #f6f4ec !important;
}

.sidebar-brand {
  min-height: 105px;
  border-bottom-color: #c8a66b45;
}

.brand-logo {
  color: #d9bc82;
  background: #ffffff0b;
  border-color: #c8a66b;
}

.brand-text h1,
.topbar h2,
.welcome-content h1,
.section-heading h2 {
  font-family: "Playfair Display", Georgia, serif !important;
}

.topbar {
  min-height: 88px;
  padding: 18px 32px;
  background: #fffef9 !important;
  border-bottom: 1px solid #e7e2d6;
}

.dashboard-content {
  max-width: 1600px;
  padding: 28px 32px 40px !important;
}

.welcome-banner {
  min-height: 190px !important;
  padding: 34px !important;
  background:
    linear-gradient(90deg, #10372df5 0%, #10372dc9 45%, #10372d20 100%),
    url("https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1800&q=85")
    center 55% / cover !important;
  border: 1px solid #c8a66b80 !important;
  border-radius: 15px !important;
  box-shadow: 0 12px 30px #173b2b14 !important;
}

.welcome-content h1 {
  font-size: clamp(28px, 2.5vw, 38px) !important;
  letter-spacing: -.5px;
}

.welcome-content p {
  font-size: 13px;
}

.stats-grid,
.overview-grid,
.quick-grid {
  gap: 16px !important;
}

.stat-card,
.overview-card,
.quick-card,
.table-card {
  background-color: #fffefb !important;
  border: 1px solid #e5e0d3 !important;
  border-radius: 13px !important;
  box-shadow: 0 5px 18px #203d2b0a !important;
}

.stat-card {
  min-height: 140px;
  padding: 19px !important;
}

.stat-card:hover,
.quick-card:hover {
  transform: translateY(-3px);
  border-color: #c8a66b !important;
  box-shadow: 0 12px 25px #203d2b12 !important;
}

.stat-value,
.overview-card strong {
  color: #153f30 !important;
}

.stat-icon,
.quick-icon {
  border-radius: 11px !important;
}

.section-heading {
  margin-bottom: 16px;
}

.section-heading h2 {
  font-size: 23px;
}

.quick-card {
  min-height: 92px;
  padding: 16px !important;
}

.table-card {
  overflow: hidden;
}

.table-card thead {
  background: #edf0e7 !important;
}

.table-card th {
  color: #365846 !important;
  padding: 15px !important;
}

.table-card td {
  padding: 14px 15px !important;
}

.status-badge {
  border-radius: 6px !important;
  padding: 6px 10px !important;
}

.menu-item.active {
  background: #ffffff14 !important;
  box-shadow: inset 3px 0 #c8a66b !important;
}

.view-all-button {
  color: #173f30 !important;
  border-color: #c8a66b !important;
  border-radius: 8px;
}

@media (max-width: 1200px) {
  .sidebar {
    width: 220px !important;
  }

  .main-area {
    width: calc(100% - 220px) !important;
    margin-left: 220px !important;
  }

  .dashboard-content {
    padding: 22px !important;
  }
}

@media (max-width: 800px) {
  .sidebar {
    width: 100% !important;
  }

  .main-area {
    width: 100% !important;
    margin-left: 0 !important;
  }

  .dashboard-content {
    padding: 18px 14px !important;
  }

  .welcome-banner {
    min-height: 155px !important;
    padding: 22px !important;
  }
}

/* === VERDE HAVEN — PREMIUM REFERENCE DESIGN === */

.admin-layout {
  --forest: #0b3027;
  --forest-light: #173f33;
  --gold: #c7a568;
  --cream: #f7f5ed;
  --ink: #123a30;
  --muted: #758078;
  --border: #e7e2d6;

  background: var(--cream) !important;
  color: var(--ink);
  font-family: "DM Sans", "Segoe UI", sans-serif;
}

/* SIDEBAR */
.sidebar {
  width: 252px !important;
  background:
    linear-gradient(180deg, rgba(7, 43, 34, .97), rgba(10, 39, 31, .94)),
    url("https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=700&q=80") center/cover !important;
  border-right: 1px solid rgba(199, 165, 104, .3);
}

.sidebar-brand {
  min-height: 120px;
  justify-content: center;
  text-align: center;
  flex-direction: column;
  gap: 5px;
  padding: 15px;
  border-bottom: 1px solid rgba(199, 165, 104, .35);
}

.brand-logo {
  width: 40px;
  height: 40px;
  color: #e6c887;
  background: transparent;
  border: 1px solid #c7a568;
  border-radius: 50%;
}

.brand-text h1 {
  color: #f5e6bf;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 20px;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.brand-text span {
  color: #d9c69e;
  font-size: 9px;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.menu-title {
  color: #c0c8bb;
  letter-spacing: 2px;
}

.menu-item {
  min-height: 43px;
  border-radius: 7px;
}

.menu-item.active {
  color: #fffdf5;
  background: rgba(198, 177, 124, .24);
  box-shadow: inset 3px 0 #d8bd81;
}

.menu-icon {
  color: #dfc58e;
}

.sidebar-logout {
  border-color: #c7a568;
  color: #ead5a8;
}

/* MAIN CONTENT */
.main-area {
  width: calc(100% - 252px);
  margin-left: 252px;
  background:
    radial-gradient(ellipse at 80% 15%, rgba(255,255,255,.8), transparent 55%),
    var(--cream);
}

.topbar {
  min-height: 82px;
  padding: 13px 34px;
  background: rgba(250, 248, 240, .96);
  border-bottom: 1px solid #e5dece;
}

.topbar h2,
.section-heading h2 {
  color: #103b30;
  font-family: "Playfair Display", Georgia, serif;
}

.topbar h2 {
  font-size: 30px;
}

/* WIDE HOTEL PHOTO BANNER */
.welcome-banner {
  min-height: 158px;
  background:
    linear-gradient(90deg,
      rgba(5, 43, 33, .97) 0%,
      rgba(7, 45, 34, .84) 42%,
      rgba(8, 37, 29, .08) 100%),
    url("https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1800&q=85")
    center 52% / cover no-repeat !important;
  border: 1px solid rgba(199, 165, 104, .35);
  border-radius: 12px;
  box-shadow: 0 8px 22px rgba(30, 48, 36, .09);
}

.welcome-content h1 {
  font-family: "Playfair Display", Georgia, serif;
  font-size: clamp(27px, 2.5vw, 37px);
  color: #fffdf7;
}

.welcome-label {
  color: #e6c887;
  letter-spacing: 3px;
}

.welcome-icon {
  color: #e6c887;
  background: rgba(10, 44, 34, .3);
  border: 1px solid #c7a568;
  border-radius: 14px;
}

/* CREAM CARDS */
.stat-card,
.overview-card,
.quick-card,
.table-card {
  background-color: #fffdf7;
  border: 1px solid #e6e0d3;
  border-radius: 10px;
  box-shadow: 0 4px 14px rgba(39, 54, 40, .045);
}

.stat-card {
  min-height: 128px;
}

.stat-value,
.overview-card strong {
  color: #123d30;
  font-family: "Playfair Display", Georgia, serif;
}

.stat-icon,
.quick-icon {
  border-radius: 50%;
}

.stat-icon.blue,
.quick-icon.blue {
  color: #183e31;
  background: #e8e2cc;
}

.stat-icon.green,
.quick-icon.green {
  color: #194b39;
  background: #e1e9dd;
}

.stat-icon.orange,
.quick-icon.orange {
  color: #8f6b31;
  background: #f1e5c9;
}

.stat-icon.emerald,
.quick-icon.purple {
  color: #214b3b;
  background: #e6e8d9;
}

/* DISTINCT ROOM / HOTEL PHOTO ACCENTS */
.stat-card::after,
.quick-card::after {
  opacity: .2;
}

.stat-card:nth-child(1)::after {
  background-image: url("https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=600&q=80");
}

.stat-card:nth-child(2)::after {
  background-image: url("https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=600&q=80");
}

.stat-card:nth-child(3)::after {
  background-image: url("https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=600&q=80");
}

.stat-card:nth-child(4)::after {
  background-image: url("https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80");
}

.quick-card::after {
  background-image: url("https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80");
}

.quick-card:hover,
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(30, 56, 39, .09);
}

/* SECTION SPACING */
.dashboard-content {
  max-width: 1750px;
  padding: 18px 34px 35px;
}

.dashboard-section {
  margin-bottom: 19px;
}

.section-heading {
  margin-bottom: 12px;
}

.section-heading h2 {
  font-size: 22px;
}

.section-heading p {
  color: #78847b;
}

/* RESERVATION TABLE */
.table-card {
  overflow: hidden;
}

.table-card thead {
  background: #f0f0e7;
}

.table-card th {
  color: #526b5c;
  font-size: 9px;
  letter-spacing: 1px;
}

.table-card td {
  padding-top: 12px;
  padding-bottom: 12px;
}

.table-card tbody tr:hover {
  background: #f6f5ec;
}

.guest-avatar {
  color: #173e31;
  background: #e5e7d9;
}

.status-badge.confirmed {
  color: #24583d;
  background: #dcebdc;
}

.status-badge.pending {
  color: #916c2e;
  background: #f9edcf;
}

/* RESPONSIVE — KEEP EXISTING NAVIGATION USABLE */
@media (max-width: 1200px) {
  .dashboard-content {
    padding: 20px;
  }
}

@media (max-width: 800px) {
  .sidebar-brand {
    flex-direction: row;
    justify-content: flex-start;
    text-align: left;
  }

  .brand-text h1 {
    font-size: 18px;
  }
}

@media (max-width: 560px) {
  .dashboard-content {
    padding: 15px 12px 25px;
  }

  .welcome-banner {
    background-position: center;
  }
}
/* QUICK ACCESS — COMPACT CARDS, KEEP CLEAR IMAGES */

.quick-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 13px !important;
}

.quick-card {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  min-width: 0;
  min-height: 76px !important;
  display: flex;
  align-items: center;
  gap: 10px !important;
  padding: 11px 12px !important;
  background: #fffdf7 !important;
  border: 1px solid #e6e0d3 !important;
  border-radius: 10px !important;
}

.quick-card::after {
  content: "";
  position: absolute;
  inset: 0 0 0 46%;
  z-index: 0;
  opacity: 1 !important;
  filter: none !important;
  background-size: cover !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
  mask-image: none !important;
  -webkit-mask-image: none !important;
  pointer-events: none;
}

.quick-card:nth-child(1)::after {
  background-image: url("https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1000&q=90") !important;
}

.quick-card:nth-child(2)::after {
  background-image: url("https://images.unsplash.com/photo-1434626881859-194d67b2b86f?auto=format&fit=crop&w=1000&q=90") !important;
}

.quick-card:nth-child(3)::after {
  background-image: url("https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1000&q=90") !important;
}

.quick-card:nth-child(4)::after {
  background-image: url("https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1000&q=90") !important;
}

.quick-card::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(
    90deg,
    #fffdf7 0%,
    #fffdf7 34%,
    rgba(255, 253, 247, 0.94) 48%,
    rgba(255, 253, 247, 0.42) 72%,
    rgba(255, 253, 247, 0.08) 100%
  ) !important;
  pointer-events: none;
}

.quick-card > * {
  position: relative;
  z-index: 2;
}

.quick-icon {
  width: 34px !important;
  height: 34px !important;
  flex-shrink: 0;
}

.quick-content {
  flex: 1;
  min-width: 0;
}

.quick-content h3 {
  margin: 0 0 4px !important;
  color: #214433 !important;
  font-size: 11px !important;
  line-height: 1.25;
}

.quick-content p {
  max-width: 155px;
  margin: 0 !important;
  color: #52685a !important;
  font-size: 9px !important;
  line-height: 1.35 !important;
}

.quick-arrow {
  flex-shrink: 0;
  color: #b49359 !important;
  font-size: 16px !important;
}

@media (max-width: 1200px) {
  .quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}

@media (max-width: 560px) {
  .quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 9px !important;
  }

  .quick-card {
    min-height: 76px !important;
    gap: 8px !important;
    padding: 10px !important;
  }

  .quick-icon {
    width: 32px !important;
    height: 32px !important;
  }

  .quick-content h3 {
    font-size: 10px !important;
  }

  .quick-content p {
    font-size: 9px !important;
  }

  .quick-arrow {
    font-size: 15px !important;
  }
}
/* RESERVATION OVERVIEW — PREMIUM STATUS CARDS */

/* RESERVATION OVERVIEW — IMAGE ICONS */


/* ========================================
   VERDE HAVEN — PREMIUM RESERVATION CARDS
======================================== */

.overview-grid {
  display: grid !important;
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 18px !important;
  margin: 20px 0 28px !important;
}

.overview-card {
  --accent: #bd9655;
  --soft: #f7f0df;

  position: relative !important;
  isolation: isolate;
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  min-width: 0;
  min-height: 175px !important;
  padding: 21px !important;
  overflow: hidden !important;

  background: linear-gradient(145deg, #ffffff 0%, #fbfaf5 100%) !important;
  border: 1px solid #e9e5d9 !important;
  border-radius: 18px !important;

  box-shadow: 0 5px 18px rgba(25, 59, 43, 0.045) !important;
  transition: transform .25s ease, box-shadow .25s ease,
              border-color .25s ease !important;
}

/* Soft decorative circle */
.overview-card::before {
  content: "";
  position: absolute;
  z-index: -1;
  top: 57px;
  right: -34px;
  width: 125px;
  height: 125px;
  border-radius: 50%;
  background: var(--soft);
  opacity: .75;
  pointer-events: none;
}

.overview-card:hover {
  transform: translateY(-5px) !important;
  border-color: color-mix(in srgb, var(--accent) 40%, white) !important;
  box-shadow: 0 13px 28px rgba(25, 59, 43, .09) !important;
}

/* Individual status colors */
.pending-card {
  --accent: #d39a3e;
  --soft: #fff1d7;
}

.confirmed-card {
  --accent: #3b8961;
  --soft: #e3f2e7;
}

.cancelled-card {
  --accent: #d65d62;
  --soft: #fde9e8;
}

.paid-card {
  --accent: #477fc0;
  --soft: #e5efff;
}

/* Heading row */
.overview-top {
  position: relative;
  z-index: 1;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 12px !important;
  margin-bottom: 17px !important;
}

.overview-label {
  color: #647268 !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  letter-spacing: .35px;
}

/* Image icon container */
.overview-icon {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex: 0 0 48px !important;
  width: 48px !important;
  height: 48px !important;
  border: 1px solid color-mix(in srgb, var(--accent) 12%, white);
  border-radius: 15px !important;
  background: var(--soft) !important;
  box-shadow: 0 4px 10px rgba(25, 59, 43, .035);
}

.overview-icon img {
  display: block !important;
  width: 30px !important;
  height: 30px !important;
  object-fit: contain !important;
}

/* Big statistic */
.overview-card strong {
  position: relative;
  z-index: 1;
  display: block !important;
  margin: 0 !important;
  color: #163e30 !important;
  font-family: "DM Sans", "Segoe UI", sans-serif !important;
  font-size: 35px !important;
  font-weight: 800 !important;
  line-height: 1.1 !important;
  letter-spacing: -1px;
}

/* Description */
.overview-card p {
  position: relative;
  z-index: 1;
  max-width: 190px;
  margin: 9px 0 8px !important;
  color: #859087 !important;
  font-size: 10px !important;
  line-height: 1.55 !important;
}

/* Status-colored bottom line */
.overview-line {
  position: absolute !important;
  right: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 4px !important;
  background: var(--accent) !important;
}

/* Responsive */
@media (max-width: 1200px) {
  .overview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 14px !important;
  }
}

@media (max-width: 520px) {
  .overview-grid {
    gap: 10px !important;
    margin-top: 15px !important;
  }

  .overview-card {
    min-height: 155px !important;
    padding: 15px !important;
    border-radius: 14px !important;
  }

  .overview-top {
    gap: 7px !important;
    margin-bottom: 14px !important;
  }

  .overview-label {
    font-size: 11px !important;
  }

  .overview-icon {
    flex-basis: 38px !important;
    width: 38px !important;
    height: 38px !important;
    border-radius: 12px !important;
  }

  .overview-icon img {
    width: 25px !important;
    height: 25px !important;
  }

  .overview-card strong {
    font-size: 29px !important;
  }

  .overview-card p {
    font-size: 9px !important;
  }
}

/* RESERVATION OVERVIEW — COMPACT CARD SIZE */

.overview-grid {
  gap: 13px !important;
  margin: 14px 0 22px !important;
}

.overview-card {
  min-height: 105px !important;
  padding: 13px 15px !important;
  border-radius: 12px !important;
}

.overview-card::before {
  width: 85px !important;
  height: 85px !important;
  top: 35px !important;
  right: -28px !important;
}

.overview-top {
  margin-bottom: 9px !important;
  gap: 8px !important;
}

.overview-label {
  font-size: 11px !important;
}

.overview-icon {
  flex: 0 0 34px !important;
  width: 34px !important;
  height: 34px !important;
  border-radius: 10px !important;
}

.overview-icon img {
  width: 23px !important;
  height: 23px !important;
}

.overview-card strong {
  font-size: 26px !important;
  line-height: 1 !important;
}

.overview-card p {
  margin: 6px 0 3px !important;
  font-size: 9px !important;
  line-height: 1.35 !important;
}

.overview-line {
  height: 3px !important;
}

@media (max-width: 520px) {
  .overview-card {
    min-height: 100px !important;
    padding: 11px !important;
  }

  .overview-icon {
    flex-basis: 30px !important;
    width: 30px !important;
    height: 30px !important;
  }

  .overview-icon img {
    width: 21px !important;
    height: 21px !important;
  }

  .overview-card strong {
    font-size: 23px !important;
  }
}



</style>
