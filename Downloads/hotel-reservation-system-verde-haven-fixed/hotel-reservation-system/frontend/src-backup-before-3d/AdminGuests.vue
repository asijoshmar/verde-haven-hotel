
<script setup>
import { computed, onMounted, ref } from "vue";
import axios from "axios";

const API = "http://localhost:4000/api/admin/guests";

const guests = ref([]);
const loading = ref(false);
const error = ref("");
const searchQuery = ref("");
const roleFilter = ref("all");
const selectedGuest = ref(null);

const startDate = ref("");
const endDate = ref("");
const dateError = ref("");
const successMessage = ref("");

const showAddGuest = ref(false);
const savingGuest = ref(false);
const addGuestError = ref("");

const guestForm = ref({
  full_name: "",
  email: "",
  phone: "",
  password: "",
});

const fetchGuests = async () => {
  loading.value = true;
  error.value = "";

  try {
    const response = await axios.get(API, {
      params: {
        startDate: startDate.value || undefined,
        endDate: endDate.value || undefined,
      },
    });

    guests.value = Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    console.error("Guests error:", err);
    error.value =
      err.response?.data?.message ||
      "Unable to load guest information. Please try again.";
  } finally {
    loading.value = false;
  }
};

const applyDateRange = async () => {
  dateError.value = "";

  if (
    startDate.value &&
    endDate.value &&
    startDate.value > endDate.value
  ) {
    dateError.value = "Start date cannot be later than end date.";
    return;
  }

  await fetchGuests();
};

const clearDateRange = async () => {
  startDate.value = "";
  endDate.value = "";
  dateError.value = "";
  await fetchGuests();
};

const formatDate = (value) => {
  if (!value) return "Not available";

  const dateString = String(value);
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(dateString)
    ? new Date(`${dateString}T12:00:00`)
    : new Date(dateString);

  if (Number.isNaN(parsedDate.getTime())) return "Not available";

  return parsedDate.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") {
    return "Not available";
  }

  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Not available";

  return amount.toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getInitials = (guest) =>
  String(guest?.full_name || "Guest")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

const getRole = (guest) =>
  String(guest?.role || "guest").toLowerCase();

const getStayStatus = (guest) =>
  guest?.stay_status || "Not Staying";

const getStatusClass = (guest) => {
  const status = getStayStatus(guest).toLowerCase();

  if (status.includes("currently staying") || status === "checked in") {
    return "staying";
  }
  if (status.includes("checked out")) return "checked-out";
  if (status.includes("upcoming")) return "upcoming";
  if (status.includes("pending")) return "pending";
  if (status.includes("cancel")) return "cancelled";

  return "not-staying";
};

const filteredGuests = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();

  return guests.value.filter((guest) => {
    const values = [
      guest.id,
      guest.full_name,
      guest.email,
      guest.phone,
      guest.room_number,
      guest.room_type,
      guest.reservation_id,
      guest.stay_status,
    ];

    const matchesSearch = values.some((value) =>
      String(value ?? "").toLowerCase().includes(query)
    );

    const matchesRole =
      roleFilter.value === "all" ||
      getRole(guest) === roleFilter.value;

    return matchesSearch && matchesRole;
  });
});

const totalGuests = computed(() => guests.value.length);

const registeredGuests = computed(
  () => guests.value.filter((guest) => getRole(guest) === "guest").length
);

const adminCount = computed(
  () => guests.value.filter((guest) => getRole(guest) === "admin").length
);

const recentGuests = computed(() => {
  const now = new Date();

  return guests.value.filter((guest) => {
    if (!guest.created_at) return false;

    const created = new Date(guest.created_at);
    if (Number.isNaN(created.getTime())) return false;

    const ageInDays = (now.getTime() - created.getTime()) / 86400000;
    return ageInDays >= 0 && ageInDays <= 30;
  }).length;
});

const resetGuestForm = () => {
  guestForm.value = {
    full_name: "",
    email: "",
    phone: "",
    password: "",
  };
  addGuestError.value = "";
};

const openAddGuest = () => {
  successMessage.value = "";
  resetGuestForm();
  showAddGuest.value = true;
};

const closeAddGuest = () => {
  if (savingGuest.value) return;
  showAddGuest.value = false;
  resetGuestForm();
};

const addGuest = async () => {
  addGuestError.value = "";
  successMessage.value = "";

  const full_name = guestForm.value.full_name.trim();
  const email = guestForm.value.email.trim().toLowerCase();
  const phone = guestForm.value.phone.trim();
  const password = guestForm.value.password;

  if (!full_name || !email || !password) {
    addGuestError.value = "Name, email, and password are required.";
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    addGuestError.value = "Please enter a valid email address.";
    return;
  }

  if (password.length < 8) {
    addGuestError.value = "Password must contain at least 8 characters.";
    return;
  }

  try {
    savingGuest.value = true;

    const response = await axios.post(API, {
      full_name,
      email,
      phone,
      password,
    });

    showAddGuest.value = false;
    resetGuestForm();

    successMessage.value =
      response.data?.message || "Guest added successfully.";

    await fetchGuests();
  } catch (err) {
    console.error("Add guest error:", err);
    addGuestError.value =
      err.response?.data?.message ||
      "Unable to add guest. Please try again.";
  } finally {
    savingGuest.value = false;
  }
};

const closeDetails = () => {
  selectedGuest.value = null;
};

onMounted(fetchGuests);
</script>

<template>
  <main class="guests-page">
    <!-- HOTEL HEADER -->
    <section class="welcome-banner">
      <div class="banner-overlay"></div>

      <div class="banner-content">
        <div class="eyebrow">
          <span class="eyebrow-line"></span>
          VERDE HAVEN BOUTIQUE HOTEL
        </div>

        <h1>Our <em>Guests</em></h1>

        <p>
          Get to know your guests and manage their account and
          reservation information in one elegant workspace.
        </p>

        <div class="banner-bottom">
          <span class="banner-caption">
            <span class="live-dot"></span>
            GUEST MANAGEMENT
          </span>

          <button
            class="banner-refresh"
            type="button"
            :disabled="loading"
            @click="fetchGuests"
          >
            <svg
              :class="{ spinning: loading }"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              aria-hidden="true"
            >
              <path
                d="M20 7v5h-5M4 17v-5h5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M5.5 9A7 7 0 0 1 17 5l3 7M4 12l3 7a7 7 0 0 0 11.5-4"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            {{ loading ? "Loading..." : "Refresh data" }}
          </button>
        </div>
      </div>

      <div class="banner-decoration" aria-hidden="true">
        <span>V</span>
        <span class="decoration-leaf">✳</span>
      </div>
    </section>

    <!-- PAGE TITLE -->
    <section class="section-intro">
      <div>
        <div class="section-kicker">OVERVIEW</div>
        <h2>Guest Directory</h2>
        <p>Guest accounts, reservations, and stay information.</p>
      </div>

      <div class="directory-label">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1.6" aria-hidden="true">
          <path
            d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6M23 11h-6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        Guest accounts
      </div>
    </section>

    <!-- SUCCESS MESSAGE -->
    <div v-if="successMessage" class="feedback-message success-message">
      <span>✓</span>
      {{ successMessage }}
      <button
        type="button"
        aria-label="Dismiss message"
        @click="successMessage = ''"
      >
        ×
      </button>
    </div>

    <!-- SUMMARY CARDS -->
    <section class="stats-grid">
      <article class="stat-card stat-primary">
        <div class="stat-top">
          <span class="stat-label">TOTAL GUESTS</span>
          <span class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.7" aria-hidden="true">
              <path
                d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6M23 11h-6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        </div>
        <div class="stat-number">{{ loading ? "—" : totalGuests }}</div>
        <div class="stat-bottom">
          <span>Guest records in current view</span>
          <span class="stat-mini-icon">↗</span>
        </div>
      </article>

      <article class="stat-card">
        <div class="stat-top">
          <span class="stat-label">GUEST ACCOUNTS</span>
          <span class="stat-icon sage-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.7" aria-hidden="true">
              <circle cx="9" cy="8" r="4" />
              <path
                d="M2 21v-2a7 7 0 0 1 14 0v2M19 8a4 4 0 0 1 0 8M19 17a5 5 0 0 1 3 4"
                stroke-linecap="round"
              />
            </svg>
          </span>
        </div>
        <div class="stat-number">{{ loading ? "—" : registeredGuests }}</div>
        <div class="stat-bottom">
          <span>Accounts with guest role</span>
          <span class="stat-accent">Guest</span>
        </div>
      </article>

      <article class="stat-card">
        <div class="stat-top">
          <span class="stat-label">ADMIN ACCOUNTS</span>
          <span class="stat-icon gold-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.7" aria-hidden="true">
              <path
                d="M12 3 20 6v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-3Z"
                stroke-linejoin="round"
              />
              <path d="m9 12 2 2 4-4" stroke-linecap="round"
                stroke-linejoin="round" />
            </svg>
          </span>
        </div>
        <div class="stat-number">{{ loading ? "—" : adminCount }}</div>
        <div class="stat-bottom">
          <span>Accounts with admin role</span>
          <span class="stat-accent gold-text">Admin</span>
        </div>
      </article>

      <article class="stat-card">
        <div class="stat-top">
          <span class="stat-label">NEW THIS MONTH</span>
          <span class="stat-icon blue-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.7" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path
                d="M16 3v4M8 3v4M3 10h18M12 13v5M9.5 15.5h5"
                stroke-linecap="round"
              />
            </svg>
          </span>
        </div>
        <div class="stat-number">{{ loading ? "—" : recentGuests }}</div>
        <div class="stat-bottom">
          <span>Registered in the last 30 days</span>
          <span class="stat-accent blue-text">Recent</span>
        </div>
      </article>
    </section>

    <!-- ERROR STATE -->
    <section v-if="error" class="state-card error-state">
      <div class="state-icon">!</div>
      <h3>Unable to load guests</h3>
      <p>{{ error }}</p>
      <button class="primary-button" type="button" @click="fetchGuests">
        Try again
      </button>
    </section>

    <!-- GUEST DIRECTORY -->
    <section v-else class="directory-card">
      <div class="directory-heading">
        <div>
          <div class="section-kicker">GUEST INFORMATION</div>
          <h3>Registered Guests</h3>
          <p>Review account details, rooms, and stay status.</p>
        </div>

        <div class="directory-actions">
          <button
            type="button"
            class="add-guest-button"
            @click="openAddGuest"
          >
            <span>＋</span> Add Guest
          </button>

          <div class="directory-total">
            <span class="total-dot"></span>
            {{ loading ? "Loading records" : `${filteredGuests.length} records` }}
          </div>
        </div>
      </div>

      <!-- SEARCH, ROLE, AND DATE FILTERS -->
      <div class="toolbar">
        <label class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.8" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m16 16 4 4" stroke-linecap="round" />
          </svg>

          <input
            v-model="searchQuery"
            type="search"
            placeholder="Search name, email, phone, room or ID..."
            aria-label="Search guests"
          />

          <button
            v-if="searchQuery"
            type="button"
            class="clear-search"
            aria-label="Clear search"
            @click="searchQuery = ''"
          >
            ×
          </button>
        </label>

        <label class="filter-box">
          <span>ROLE</span>
          <select v-model="roleFilter" aria-label="Filter by role">
            <option value="all">All roles</option>
            <option value="guest">Guests</option>
            <option value="admin">Admins</option>
          </select>
          <span class="filter-chevron">⌄</span>
        </label>

        <div class="date-range-filter">
          <label>
            <span>START DATE</span>
            <input v-model="startDate" type="date" aria-label="Start date" />
          </label>

          <label>
            <span>END DATE</span>
            <input
              v-model="endDate"
              type="date"
              :min="startDate || undefined"
              aria-label="End date"
            />
          </label>

          <button
            type="button"
            class="apply-date-button"
            :disabled="loading"
            @click="applyDateRange"
          >
            Apply
          </button>

          <button
            type="button"
            class="clear-date-button"
            :disabled="loading || (!startDate && !endDate)"
            @click="clearDateRange"
          >
            Clear
          </button>
        </div>
      </div>

      <div v-if="dateError" class="date-error">{{ dateError }}</div>

      <!-- LOADING -->
      <div v-if="loading" class="state-card loading-state">
        <div class="loader"></div>
        <h3>Preparing your guest directory</h3>
        <p>Please wait while we retrieve the latest records.</p>
      </div>

      <!-- EMPTY -->
      <div v-else-if="filteredGuests.length === 0" class="state-card empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.5" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m16 16 4 4M8 11h6" stroke-linecap="round" />
          </svg>
        </div>

        <h3>{{ guests.length ? "No matching guests" : "No guests yet" }}</h3>
        <p>
          {{
            guests.length
              ? "Try a different search, role, or date range."
              : "Guest accounts will appear here when available."
          }}
        </p>

        <button
          v-if="searchQuery || roleFilter !== 'all' || startDate || endDate"
          type="button"
          class="secondary-button"
          @click="
            searchQuery = '';
            roleFilter = 'all';
            clearDateRange()
          "
        >
          Clear filters
        </button>
      </div>

      <!-- TABLE -->
      <div v-else class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>GUEST ID</th>
              <th>GUEST PROFILE</th>
              <th>CONTACT INFORMATION</th>
              <th>ROOM</th>
              <th>STAY DATES</th>
              <th>STAY STATUS</th>
              <th>ACCOUNT ROLE</th>
              <th>DATE REGISTERED</th>
              <th>ACTION</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(guest, index) in filteredGuests" :key="guest.id">
              <td class="id-cell">#{{ guest.id }}</td>

              <td>
                <div class="guest-profile">
                  <div class="guest-avatar" :class="`avatar-${index % 6}`">
                    {{ getInitials(guest) }}
                  </div>
                  <div class="guest-profile-text">
                    <strong>{{ guest.full_name || "Unnamed Guest" }}</strong>
                    <span>Guest account</span>
                  </div>
                </div>
              </td>

              <td>
                <div class="contact-cell">
                  <div class="contact-line">
                    <span class="contact-symbol">@</span>
                    <span>{{ guest.email || "No email provided" }}</span>
                  </div>
                  <div class="contact-line muted-contact">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="1.6" aria-hidden="true">
                      <path
                        d="M5 3h4l2 5-3 2a15 15 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z"
                        stroke-linejoin="round"
                      />
                    </svg>
                    <span>{{ guest.phone || "No phone provided" }}</span>
                  </div>
                </div>
              </td>

              <td>
                <div class="room-cell">
                  <strong v-if="guest.room_number">
                    Room {{ guest.room_number }}
                  </strong>
                  <strong v-else class="no-room">No room assigned</strong>
                  <span>{{ guest.room_type || "No reservation" }}</span>
                </div>
              </td>

              <td>
                <div class="stay-dates-cell">
                  <span>
                    <small>IN</small>
                    {{ formatDate(guest.check_in) }}
                  </span>
                  <span>
                    <small>OUT</small>
                    {{ formatDate(guest.check_out) }}
                  </span>
                </div>
              </td>

              <td>
                <span class="stay-status" :class="getStatusClass(guest)">
                  <span class="status-dot"></span>
                  {{ getStayStatus(guest) }}
                </span>
              </td>

              <td>
                <span class="role-badge" :class="getRole(guest)">
                  <span class="role-dot"></span>
                  {{ getRole(guest) }}
                </span>
              </td>

              <td>
                <div class="registered-cell">
                  <span class="calendar-symbol">▦</span>
                  {{ formatDate(guest.created_at) }}
                </div>
              </td>

              <td>
                <button
                  type="button"
                  class="view-button"
                  :aria-label="`View ${guest.full_name || 'guest'} details`"
                  @click="selectedGuest = guest"
                >
                  View details <span>↗</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer v-if="!loading && filteredGuests.length" class="table-footer">
        <span>
          Showing <strong>{{ filteredGuests.length }}</strong> of
          <strong>{{ guests.length }}</strong> records
        </span>

        <button
          v-if="searchQuery || roleFilter !== 'all' || startDate || endDate"
          type="button"
          class="reset-button"
          @click="
            searchQuery = '';
            roleFilter = 'all';
            clearDateRange()
          "
        >
          Reset filters
        </button>
      </footer>
    </section>

    <!-- MODALS -->
    <Teleport to="body">
      <!-- ADD GUEST MODAL -->
      <div
        v-if="showAddGuest"
        class="modal-backdrop"
        @click.self="closeAddGuest"
      >
        <section
          class="guest-modal add-guest-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-guest-title"
        >
          <div class="modal-cover add-modal-cover">
            <button
              type="button"
              class="modal-close"
              aria-label="Close add guest form"
              :disabled="savingGuest"
              @click="closeAddGuest"
            >
              ×
            </button>
            <div class="modal-monogram">V</div>
            <span>VERDE HAVEN · NEW GUEST</span>
          </div>

          <form class="modal-body" @submit.prevent="addGuest">
            <div class="section-kicker">GUEST MANAGEMENT</div>
            <h2 id="add-guest-title" class="add-form-title">Add a Guest</h2>
            <p class="add-form-description">
              Create a new guest account for the hotel directory.
            </p>

            <div v-if="addGuestError" class="feedback-message form-error">
              {{ addGuestError }}
            </div>

            <label class="form-field">
              <span>FULL NAME *</span>
              <input
                v-model="guestForm.full_name"
                type="text"
                placeholder="Enter guest's full name"
                autocomplete="name"
                maxlength="150"
                required
              />
            </label>

            <label class="form-field">
              <span>EMAIL ADDRESS *</span>
              <input
                v-model="guestForm.email"
                type="email"
                placeholder="guest@example.com"
                autocomplete="email"
                maxlength="254"
                required
              />
            </label>

            <label class="form-field">
              <span>PHONE NUMBER</span>
              <input
                v-model="guestForm.phone"
                type="tel"
                placeholder="Enter phone number"
                autocomplete="tel"
                maxlength="30"
              />
            </label>

            <label class="form-field">
              <span>PASSWORD *</span>
              <input
                v-model="guestForm.password"
                type="password"
                placeholder="At least 8 characters"
                autocomplete="new-password"
                minlength="8"
                required
              />
            </label>

            <p class="form-hint">
              Adding a guest creates an account only. Room information and
              stay dates come from a separate reservation.
            </p>

            <div class="form-actions">
              <button
                type="button"
                class="cancel-form-button"
                :disabled="savingGuest"
                @click="closeAddGuest"
              >
                Cancel
              </button>

              <button
                type="submit"
                class="modal-done"
                :disabled="savingGuest"
              >
                {{ savingGuest ? "Saving guest..." : "Create guest account" }}
              </button>
            </div>
          </form>
        </section>
      </div>

      <!-- GUEST DETAILS MODAL -->
      <div
        v-if="selectedGuest"
        class="modal-backdrop"
        @click.self="closeDetails"
        @keydown.esc="closeDetails"
      >
        <section
          class="guest-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="guest-modal-title"
        >
          <div class="modal-cover">
            <button
              type="button"
              class="modal-close"
              aria-label="Close guest details"
              @click="closeDetails"
            >
              ×
            </button>
            <div class="modal-monogram">V</div>
            <span>VERDE HAVEN · GUEST PROFILE</span>
          </div>

          <div class="modal-body">
            <div class="modal-profile">
              <div class="modal-avatar">{{ getInitials(selectedGuest) }}</div>
              <div>
                <h2 id="guest-modal-title">
                  {{ selectedGuest.full_name || "Unnamed Guest" }}
                </h2>
                <span class="role-badge" :class="getRole(selectedGuest)">
                  <span class="role-dot"></span>
                  {{ getRole(selectedGuest) }}
                </span>
              </div>
            </div>

            <div class="modal-divider"></div>

            <div class="detail-section-title">ACCOUNT INFORMATION</div>
            <div class="detail-grid">
              <div class="detail-item">
                <span>GUEST ID</span>
                <strong>#{{ selectedGuest.id }}</strong>
              </div>

              <div class="detail-item">
                <span>REGISTRATION DATE</span>
                <strong>{{ formatDate(selectedGuest.created_at) }}</strong>
              </div>

              <div class="detail-item full-detail">
                <span>EMAIL ADDRESS</span>
                <strong>{{ selectedGuest.email || "Not provided" }}</strong>
              </div>

              <div class="detail-item full-detail">
                <span>PHONE NUMBER</span>
                <strong>{{ selectedGuest.phone || "Not provided" }}</strong>
              </div>
            </div>

            <div class="modal-divider"></div>

            <div class="detail-section-title">RESERVATION INFORMATION</div>
            <div class="detail-grid">
              <div class="detail-item full-detail">
                <span>RESERVATION ID</span>
                <strong>
                  {{
                    selectedGuest.reservation_id
                      ? `#${selectedGuest.reservation_id}`
                      : "No reservation"
                  }}
                </strong>
              </div>

              <div class="detail-item">
                <span>ROOM NUMBER</span>
                <strong>
                  {{
                    selectedGuest.room_number
                      ? `Room ${selectedGuest.room_number}`
                      : "No room assigned"
                  }}
                </strong>
              </div>

              <div class="detail-item">
                <span>ROOM TYPE</span>
                <strong>{{ selectedGuest.room_type || "Not available" }}</strong>
              </div>

              <div class="detail-item">
                <span>CHECK-IN</span>
                <strong>{{ formatDate(selectedGuest.check_in) }}</strong>
              </div>

              <div class="detail-item">
                <span>CHECK-OUT</span>
                <strong>{{ formatDate(selectedGuest.check_out) }}</strong>
              </div>

              <div class="detail-item">
                <span>NUMBER OF GUESTS</span>
                <strong>{{ selectedGuest.guests_count ?? "Not available" }}</strong>
              </div>

              <div class="detail-item">
                <span>RESERVATION AMOUNT</span>
                <strong>{{ formatCurrency(selectedGuest.total_amount) }}</strong>
              </div>

              <div class="detail-item full-detail">
                <span>STAY STATUS</span>
                <strong>
                  <span class="stay-status" :class="getStatusClass(selectedGuest)">
                    <span class="status-dot"></span>
                    {{ getStayStatus(selectedGuest) }}
                  </span>
                </strong>
              </div>
            </div>

            <p class="modal-note">
              Reservation details are shown when a matching reservation exists.
              An account without a reservation will not have assigned room or
              stay dates.
            </p>

            <button type="button" class="modal-done" @click="closeDetails">
              Close details
            </button>
          </div>
        </section>
      </div>
    </Teleport>
  </main>
</template>

<style scoped>
.guests-page {
  --forest: #234735;
  --forest-dark: #193729;
  --forest-light: #365f49;
  --sage: #e8eee5;
  --cream: #f8f6f0;
  --gold: #b99b62;
  --ink: #26362c;
  --muted: #879087;
  --line: #e8e9e1;

  width: 100%;
  max-width: 1500px;
  min-width: 0;
  margin: 0 auto;
  padding: 30px;
  color: var(--ink);
  font-family: "DM Sans", "Segoe UI", sans-serif;
  box-sizing: border-box;
}

.guests-page *,
.guests-page *::before,
.guests-page *::after {
  box-sizing: border-box;
}

.welcome-banner {
  min-height: 258px;
  position: relative;
  display: flex;
  overflow: hidden;
  border-radius: 19px;
  color: #fff;
  background-color: var(--forest);
  background-image: url("https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1800&q=85");
  background-size: cover;
  background-position: center 55%;
  box-shadow: 0 12px 30px rgba(27, 53, 38, 0.13);
}

.banner-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(19, 48, 33, .96), rgba(24, 55, 38, .84) 45%, rgba(24, 55, 38, .35)),
    linear-gradient(0deg, rgba(17, 39, 27, .38), transparent);
}

.banner-content {
  z-index: 1;
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 29px 34px 22px;
}

.eyebrow,
.section-kicker {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--gold);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 2px;
}

.eyebrow-line {
  width: 25px;
  height: 1px;
  background: var(--gold);
}

.banner-content h1 {
  margin: 17px 0 9px;
  color: #fff;
  font-family: "Playfair Display", Georgia, serif;
  font-size: clamp(36px, 4vw, 50px);
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: -1px;
}

.banner-content h1 em {
  color: #d5bd8b;
  font-weight: 400;
}

.banner-content > p {
  max-width: 450px;
  margin: 0;
  color: rgba(255, 255, 255, .77);
  font-size: 13px;
  line-height: 1.9;
}

.banner-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: auto;
  padding-top: 23px;
}

.banner-caption {
  display: flex;
  align-items: center;
  gap: 9px;
  color: rgba(255, 255, 255, .82);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.7px;
}

.live-dot,
.total-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #a9c49e;
}

.banner-refresh {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 10px 15px;
  border: 1px solid rgba(255, 255, 255, .38);
  border-radius: 7px;
  background: rgba(255, 255, 255, .09);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background .2s;
}

.banner-refresh:hover {
  background: rgba(255, 255, 255, .19);
}

.banner-refresh:disabled {
  cursor: wait;
  opacity: .75;
}

.banner-refresh svg {
  width: 15px;
  height: 15px;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.banner-decoration {
  position: absolute;
  top: 50%;
  right: 8%;
  display: flex;
  align-items: center;
  gap: 3px;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, .13);
  pointer-events: none;
}

.banner-decoration > span:first-child {
  font-family: "Playfair Display", Georgia, serif;
  font-size: 190px;
  font-style: italic;
  line-height: 1;
}

.decoration-leaf {
  align-self: flex-start;
  margin-top: 12px;
  color: rgba(213, 189, 139, .6);
  font-size: 42px;
}

.section-intro {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin: 34px 0 20px;
}

.section-kicker {
  margin-bottom: 8px;
  font-size: 9px;
  letter-spacing: 1.8px;
}

.section-intro h2,
.directory-heading h3 {
  margin: 0;
  color: var(--forest-dark);
  font-family: "Playfair Display", Georgia, serif;
  font-weight: 600;
}

.section-intro h2 {
  font-size: 27px;
  letter-spacing: -.5px;
}

.section-intro p,
.directory-heading p {
  margin: 7px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.7;
}

.directory-label {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 10px 13px;
  border: 1px solid #e2e8dd;
  border-radius: 8px;
  background: #f2f5ef;
  color: var(--forest);
  font-size: 11px;
  font-weight: 700;
}

.directory-label svg {
  width: 17px;
  height: 17px;
}

.feedback-message {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 15px;
  border: 1px solid #d8e7d4;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.6;
}

.success-message {
  margin-bottom: 18px;
  background: #f0f6ec;
  color: #3e6941;
}

.success-message > span {
  font-weight: 900;
}

.success-message > button {
  margin-left: auto;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 20px;
  cursor: pointer;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.stat-card {
  min-width: 0;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(33, 54, 38, .025);
  transition: transform .2s, box-shadow .2s;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 24px rgba(33, 54, 38, .07);
}

.stat-primary {
  border-color: var(--forest);
  background: var(--forest);
  color: #fff;
}

.stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
}

.stat-label {
  color: #929a90;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.05px;
}

.stat-primary .stat-label {
  color: #d0d9cf;
}

.stat-icon {
  display: grid;
  width: 37px;
  height: 37px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 10px;
  background: #f0f3ed;
  color: var(--forest);
}

.stat-icon svg {
  width: 19px;
  height: 19px;
}

.stat-primary .stat-icon {
  background: rgba(255, 255, 255, .12);
  color: #e5d1a6;
}

.sage-icon { background: #e9f0e6; color: #4c7554; }
.gold-icon { background: #f5efe2; color: #a18142; }
.blue-icon { background: #eaf0f5; color: #587a96; }

.stat-number {
  margin-top: 17px;
  color: var(--forest-dark);
  font-family: "Playfair Display", Georgia, serif;
  font-size: 37px;
  font-weight: 600;
  line-height: 1.1;
}

.stat-primary .stat-number { color: #fff; }

.stat-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 12px;
  color: #959b92;
  font-size: 10px;
  line-height: 1.5;
}

.stat-mini-icon { color: #d6c18e; font-size: 17px; }
.stat-accent { color: #537758; font-size: 10px; font-weight: 800; }
.gold-text { color: #a18142; }
.blue-text { color: #587a96; }

.directory-card {
  margin-top: 26px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 13px;
  background: #fff;
  box-shadow: 0 5px 20px rgba(31, 51, 37, .035);
}

.directory-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 24px 25px 20px;
}

.directory-heading h3 {
  font-size: 22px;
}

.directory-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
}

.directory-total {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border: 1px solid #e7eae2;
  border-radius: 6px;
  background: #fafbf8;
  color: #69766b;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.directory-total .total-dot { background: #719573; }

.add-guest-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px 14px;
  border: 1px solid var(--forest);
  border-radius: 7px;
  background: var(--forest);
  color: white;
  font: inherit;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  transition: background .2s, transform .2s;
}

.add-guest-button:hover {
  background: var(--forest-light);
  transform: translateY(-1px);
}

.add-guest-button > span {
  color: #e1c895;
  font-size: 17px;
  line-height: 1;
}

.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 13px;
  padding: 15px 25px;
  border-top: 1px solid #f0f0e9;
  border-bottom: 1px solid #e9ebe4;
  background: #fbfbf8;
}

.search-box {
  display: flex;
  flex: 1 1 220px;
  align-items: center;
  gap: 10px;
  min-width: 180px;
  height: 42px;
  padding: 0 12px;
  border: 1px solid #e4e7df;
  border-radius: 7px;
  background: #fff;
}

.search-box:focus-within {
  border-color: #6e8b70;
  box-shadow: 0 0 0 3px rgba(73, 111, 78, .08);
}

.search-box > svg {
  width: 17px;
  height: 17px;
  flex: 0 0 auto;
  color: #899389;
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

.search-box input::placeholder { color: #a1a79e; }

.clear-search {
  padding: 0 3px;
  border: none;
  background: transparent;
  color: #7c877c;
  font-size: 20px;
  cursor: pointer;
}

.filter-box {
  position: relative;
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 155px;
  height: 42px;
  padding: 0 12px;
  border: 1px solid #e4e7df;
  border-radius: 7px;
  background: #fff;
}

.filter-box > span:first-child {
  color: #9a9f96;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .7px;
}

.filter-box select {
  width: 100%;
  min-width: 0;
  appearance: none;
  outline: none;
  border: none;
  background: transparent;
  color: var(--forest);
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.filter-chevron {
  color: #849084;
  pointer-events: none;
}

.date-range-filter {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 9px;
}

.date-range-filter label {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.date-range-filter label > span {
  color: #8c9589;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .8px;
}

.date-range-filter input {
  width: 140px;
  min-width: 0;
  height: 42px;
  padding: 0 9px;
  border: 1px solid #e0e5dc;
  border-radius: 7px;
  outline: none;
  background: #fff;
  color: var(--forest-dark);
  font: inherit;
  font-size: 10px;
}

.date-range-filter input:focus {
  border-color: #6e8b70;
  box-shadow: 0 0 0 3px rgba(73, 111, 78, .08);
}

.apply-date-button,
.clear-date-button {
  height: 42px;
  padding: 0 13px;
  border-radius: 7px;
  font: inherit;
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
}

.apply-date-button {
  border: 1px solid var(--forest);
  background: var(--forest);
  color: white;
}

.clear-date-button {
  border: 1px solid #dfe6da;
  background: white;
  color: var(--forest);
}

.apply-date-button:disabled,
.clear-date-button:disabled {
  cursor: not-allowed;
  opacity: .5;
}

.date-error {
  padding: 10px 25px;
  border-bottom: 1px solid #f0d9d4;
  background: #fff5f3;
  color: #a34438;
  font-size: 11px;
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
  scrollbar-color: #ccd5c9 #f6f7f3;
  scrollbar-width: thin;
}

.table-scroll table {
  width: 100%;
  min-width: 1450px;
  border-collapse: collapse;
  text-align: left;
}

.table-scroll thead { background: #f5f6f1; }

.table-scroll th {
  padding: 15px 17px;
  border-bottom: 1px solid #e8eae3;
  color: #858e82;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .9px;
  white-space: nowrap;
}

.table-scroll td {
  padding: 15px 17px;
  border-bottom: 1px solid #eff0ea;
  color: #677267;
  font-size: 11px;
  vertical-align: middle;
}

.table-scroll tbody tr { transition: background .18s; }
.table-scroll tbody tr:hover { background: #fafbf7; }
.table-scroll tbody tr:last-child td { border-bottom: none; }

.id-cell {
  color: #92998f !important;
  font-size: 10px !important;
  font-weight: 700;
}

.guest-profile {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 170px;
}

.guest-avatar,
.modal-avatar {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgba(42, 77, 52, .08);
  border-radius: 50%;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 15px;
  font-weight: 600;
}

.guest-avatar {
  width: 42px;
  height: 42px;
}

.avatar-0 { background: #e8eee1; color: #496746; }
.avatar-1 { background: #f2e9da; color: #967747; }
.avatar-2 { background: #e3ecec; color: #507577; }
.avatar-3 { background: #efe5e5; color: #986c6d; }
.avatar-4 { background: #e9e5f0; color: #75658e; }
.avatar-5 { background: #eee8de; color: #897451; }

.guest-profile-text {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.guest-profile-text strong {
  color: #2d3e31;
  font-size: 11px;
  font-weight: 800;
  overflow-wrap: anywhere;
}

.guest-profile-text span {
  color: #9aa095;
  font-size: 10px;
}

.contact-cell {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 185px;
}

.contact-line {
  display: flex;
  align-items: center;
  gap: 7px;
  overflow-wrap: anywhere;
}

.contact-symbol {
  display: inline-grid;
  width: 15px;
  height: 15px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 4px;
  background: #edf1e9;
  color: #527052;
  font-size: 10px;
  font-weight: 800;
}

.contact-line svg {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
}

.muted-contact { color: #999f96; }

.room-cell,
.stay-dates-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 125px;
}

.room-cell strong {
  color: var(--forest-dark);
  font-size: 11px;
}

.room-cell > span {
  color: #8b9589;
  font-size: 10px;
}

.room-cell .no-room {
  color: #969b92;
  font-weight: 600;
}

.stay-dates-cell > span {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #566658;
  font-size: 10px;
  white-space: nowrap;
}

.stay-dates-cell small {
  display: inline-block;
  min-width: 24px;
  color: #929b8f;
  font-size: 8px;
  font-weight: 800;
}

.stay-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  max-width: 175px;
  padding: 7px 9px;
  border: 1px solid #e2e7de;
  border-radius: 6px;
  background: #f5f7f2;
  color: #63705f;
  font-size: 9px;
  font-weight: 800;
  line-height: 1.4;
}

.status-dot {
  width: 6px;
  height: 6px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: currentColor;
}

.stay-status.staying { border-color: #cce5d0; background: #eaf6ec; color: #337346; }
.stay-status.checked-out { border-color: #dfe3dc; background: #f1f3ef; color: #6b7668; }
.stay-status.upcoming { border-color: #d4e3f2; background: #edf5fc; color: #426e9b; }
.stay-status.pending { border-color: #f0e0b9; background: #fcf5e4; color: #96712a; }
.stay-status.cancelled { border-color: #f0d3cf; background: #fff0ed; color: #a34c43; }
.stay-status.not-staying { border-color: #e2e5de; background: #f4f5f1; color: #7d8579; }

.role-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 9px;
  border: 1px solid transparent;
  border-radius: 5px;
  font-size: 9px;
  font-weight: 800;
  text-transform: capitalize;
  white-space: nowrap;
}

.role-dot {
  width: 6px;
  height: 6px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: currentColor;
}

.role-badge.guest { border-color: #dce8d8; background: #edf4e9; color: #50724d; }
.role-badge.admin { border-color: #eadfc4; background: #f7f0df; color: #997a3d; }

.registered-cell {
  display: flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
}

.calendar-symbol {
  color: #899b83;
  font-size: 15px;
}

.view-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 8px 10px;
  border: 1px solid #dfe7db;
  border-radius: 6px;
  background: #fff;
  color: #456649;
  font: inherit;
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
  cursor: pointer;
  transition: background .2s, border-color .2s;
}

.view-button:hover {
  border-color: #b7cbb1;
  background: #edf3e9;
}

.view-button span {
  color: #a18a58;
  font-size: 13px;
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 15px 24px;
  border-top: 1px solid #e9ebe4;
  background: #fbfbf8;
  color: #92998e;
  font-size: 10px;
}

.table-footer strong { color: #536553; }

.reset-button {
  border: none;
  background: transparent;
  color: #4b7150;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

.state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 230px;
  padding: 35px 20px;
  text-align: center;
}

.state-card h3 {
  margin: 13px 0 6px;
  color: var(--forest-dark);
  font-family: "Playfair Display", Georgia, serif;
  font-size: 20px;
  font-weight: 600;
}

.state-card p {
  max-width: 430px;
  margin: 0;
  color: #899187;
  font-size: 12px;
  line-height: 1.8;
}

.loading-state { min-height: 270px; }

.loader {
  width: 34px;
  height: 34px;
  border: 3px solid #e7ece3;
  border-top-color: #446c4b;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}

.empty-icon,
.state-icon {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  border-radius: 50%;
  background: #edf2e9;
  color: #587857;
}

.empty-icon svg { width: 25px; height: 25px; }

.state-icon {
  background: #fae9e5;
  color: #ad5548;
  font-size: 23px;
  font-weight: 800;
}

.error-state {
  margin-top: 20px;
  border: 1px solid #f0d9d3;
  border-radius: 12px;
  background: #fffaf9;
}

.primary-button,
.secondary-button {
  margin-top: 17px;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font: inherit;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.primary-button { background: var(--forest); color: #fff; }
.secondary-button { border: 1px solid #dfe6da; background: #f2f5ef; color: var(--forest); }

.modal-backdrop {
  position: fixed;
  z-index: 9999;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  padding: 22px;
  background: rgba(18, 34, 24, .64);
  backdrop-filter: blur(5px);
}

.guest-modal {
  width: 100%;
  max-width: 500px;
  max-height: calc(100vh - 44px);
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, .5);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 25px 80px rgba(0, 0, 0, .2);
  animation: modal-in .2s ease-out;
}

@keyframes modal-in {
  from { opacity: 0; transform: translateY(10px) scale(.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.modal-cover {
  position: relative;
  display: flex;
  min-height: 145px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  overflow: hidden;
  background:
    linear-gradient(rgba(27, 62, 42, .92), rgba(24, 53, 36, .96)),
    url("https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=80") center/cover;
  color: #d8c59a;
}

.add-modal-cover { min-height: 115px; }
.add-modal-cover .modal-monogram { font-size: 45px; }

.modal-monogram {
  font-family: "Playfair Display", Georgia, serif;
  font-size: 58px;
  font-style: italic;
  line-height: 1;
}

.modal-cover > span {
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 2px;
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 13px;
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, .24);
  border-radius: 50%;
  background: rgba(255, 255, 255, .09);
  color: #fff;
  font-size: 23px;
  cursor: pointer;
}

.modal-close:hover { background: rgba(255, 255, 255, .2); }

.modal-body { padding: 25px; }

.modal-profile {
  display: flex;
  align-items: center;
  gap: 15px;
}

.modal-avatar {
  width: 58px;
  height: 58px;
  background: #e8eee1;
  color: #496746;
  font-size: 21px;
}

.modal-profile h2 {
  margin: 0 0 9px;
  color: var(--forest-dark);
  font-family: "Playfair Display", Georgia, serif;
  font-size: 22px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.modal-divider {
  height: 1px;
  margin: 23px 0;
  background: #eceee7;
}

.detail-section-title {
  margin-bottom: 16px;
  color: var(--gold);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.4px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

.full-detail { grid-column: 1 / -1; }

.detail-item > span {
  color: #939b8f;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1px;
}

.detail-item > strong {
  color: #3d4e3f;
  font-size: 12px;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.modal-note {
  margin: 23px 0 0;
  padding: 12px;
  border-left: 3px solid #b9a06b;
  background: #faf7ef;
  color: #8d8065;
  font-size: 10px;
  line-height: 1.7;
}

.modal-done {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-top: 20px;
  padding: 12px 15px;
  border: none;
  border-radius: 7px;
  background: var(--forest);
  color: #fff;
  font: inherit;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  transition: background .2s;
}

.modal-done:hover { background: var(--forest-light); }
.modal-done:disabled { cursor: wait; opacity: .65; }

.add-form-title {
  margin: 0;
  color: var(--forest-dark);
  font-family: "Playfair Display", Georgia, serif;
  font-size: 26px;
  font-weight: 600;
}

.add-form-description {
  margin: 7px 0 20px;
  color: #899187;
  font-size: 11px;
  line-height: 1.7;
}

.form-error {
  margin-bottom: 16px;
  border-color: #efd3ce;
  background: #fff5f3;
  color: #a34438;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 15px;
}

.form-field > span {
  color: #69766b;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .8px;
}

.form-field input {
  width: 100%;
  min-width: 0;
  height: 43px;
  padding: 0 12px;
  border: 1px solid #e0e5dc;
  border-radius: 7px;
  outline: none;
  background: #fff;
  color: var(--ink);
  font: inherit;
  font-size: 12px;
}

.form-field input:focus {
  border-color: #6e8b70;
  box-shadow: 0 0 0 3px rgba(73, 111, 78, .08);
}

.form-field input::placeholder { color: #a4aaa1; }

.form-hint {
  margin: 3px 0 17px;
  padding: 11px;
  border-left: 3px solid var(--gold);
  background: #faf7ef;
  color: #85785f;
  font-size: 10px;
  line-height: 1.7;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.cancel-form-button {
  padding: 0 15px;
  border: 1px solid #dfe6da;
  border-radius: 7px;
  background: #fff;
  color: var(--forest);
  font: inherit;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.form-actions .modal-done {
  width: auto;
  margin-top: 0;
}

.form-actions button:disabled,
.modal-close:disabled {
  cursor: not-allowed;
  opacity: .6;
}

@media (max-width: 1100px) {
  .guests-page { padding: 24px; }
  .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .banner-decoration { right: 4%; }
}

@media (max-width: 900px) {
  .toolbar { align-items: stretch; }
  .date-range-filter { align-items: stretch; }
  .date-range-filter label { flex: 1 1 135px; }
  .date-range-filter input { width: 100%; }
}

@media (max-width: 700px) {
  .guests-page { padding: 15px; }

  .welcome-banner {
    min-height: 260px;
    border-radius: 13px;
    background-position: 58% center;
  }

  .banner-content { padding: 24px 20px 19px; }
  .banner-content h1 { font-size: 39px; }
  .banner-content > p { max-width: 320px; font-size: 12px; }

  .banner-decoration { top: 38%; right: -5%; }
  .banner-decoration > span:first-child { font-size: 120px; }
  .decoration-leaf { font-size: 27px; }

  .banner-bottom { align-items: flex-end; }
  .banner-caption { font-size: 8px; letter-spacing: 1px; }
  .banner-refresh { padding: 9px 10px; font-size: 10px; }

  .section-intro { align-items: flex-start; margin-top: 27px; }
  .section-intro h2 { font-size: 24px; }
  .directory-label { display: none; }

  .stats-grid { gap: 10px; }
  .stat-card { padding: 14px; border-radius: 10px; }
  .stat-label { font-size: 8px; letter-spacing: .6px; }
  .stat-icon { width: 31px; height: 31px; }
  .stat-icon svg { width: 16px; height: 16px; }
  .stat-number { margin-top: 14px; font-size: 32px; }
  .stat-bottom { align-items: flex-start; font-size: 9px; }
  .stat-accent { display: none; }

  .directory-card { margin-top: 20px; border-radius: 10px; }
  .directory-heading { align-items: flex-start; flex-direction: column; padding: 19px 16px; }
  .directory-heading h3 { font-size: 20px; }
  .directory-heading p { font-size: 11px; }
  .directory-actions { width: 100%; justify-content: space-between; }

  .toolbar { flex-direction: column; padding: 13px 15px; }
  .search-box,
  .filter-box { width: 100%; min-height: 42px; }

  .date-range-filter {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .date-range-filter label,
  .date-range-filter input {
    width: 100%;
    min-width: 0;
  }

  .apply-date-button,
  .clear-date-button { width: 100%; }

  .date-error { padding: 10px 15px; }

  .table-footer {
    align-items: flex-start;
    padding: 14px 15px;
    font-size: 9px;
  }

  .modal-backdrop { padding: 14px; }
  .modal-body { padding: 20px; }
  .add-guest-modal .modal-body { padding: 19px; }

  .form-actions { flex-direction: column-reverse; }
  .form-actions button { width: 100%; min-height: 42px; }
}

@media (max-width: 380px) {
  .stats-grid { grid-template-columns: 1fr; }
  .stat-card { padding: 17px; }
  .stat-number { font-size: 35px; }
  .directory-total { white-space: normal; }
  .banner-caption { max-width: 120px; line-height: 1.6; }
  .detail-grid { grid-template-columns: 1fr; }
  .full-detail { grid-column: auto; }
}
</style>
