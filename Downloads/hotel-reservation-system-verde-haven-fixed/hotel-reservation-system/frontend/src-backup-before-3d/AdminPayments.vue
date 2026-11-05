<script setup>

import { computed, onMounted, ref } from "vue";

import axios from "axios";

const payments = ref([]);

const loading = ref(true);

const error = ref("");

const searchQuery = ref("");

const statusFilter = ref("all");

const methodFilter = ref("all");

const startDate = ref("");

const endDate = ref("");

const selectedPayment = ref(null);

const dateError = ref("");

const refreshedAt = ref("");

const fetchPayments = async () => {

  try {

    loading.value = true;

    error.value = "";

    const response = await axios.get(

      "http://localhost:4000/api/admin/payments"

    );

    payments.value = Array.isArray(response.data)

      ? response.data

      : [];

    refreshedAt.value = new Date().toLocaleTimeString("en-PH", {

      hour: "numeric",

      minute: "2-digit"

    });

  } catch (err) {

    console.error("Payments error:", err);

    error.value =

      err.response?.data?.message ||

      "Failed to load payments. Please check your server.";

  } finally {

    loading.value = false;

  }

};

const normalizeStatus = (status) =>

  String(status || "unknown").trim().toLowerCase();

const statusLabel = (status) => {

  const value = normalizeStatus(status);

  return value.charAt(0).toUpperCase() + value.slice(1);

};

const formatAmount = (amount) =>

  Number(amount || 0).toLocaleString("en-PH", {

    minimumFractionDigits: 2,

    maximumFractionDigits: 2

  });

const formatDate = (value) => {

  if (!value) return "—";

  const raw = String(value).slice(0, 10);

  const parts = raw.split("-");

  if (parts.length === 3 && parts.every((part) => /^\d+$/.test(part))) {

    const [year, month, day] = parts.map(Number);

    const date = new Date(year, month - 1, day);

    if (!Number.isNaN(date.getTime())) {

      return date.toLocaleDateString("en-PH", {

        year: "numeric",

        month: "short",

        day: "numeric"

      });

    }

  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())

    ? "—"

    : date.toLocaleDateString("en-PH");

};

const formatDateTime = (value) => {

  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())

    ? "—"

    : date.toLocaleString("en-PH", {

        year: "numeric",

        month: "short",

        day: "numeric",

        hour: "numeric",

        minute: "2-digit"

      });

};

const methods = computed(() => [

  ...new Set(

    payments.value

      .map((payment) => payment.payment_method)

      .filter(Boolean)

  )

]);

const filteredPayments = computed(() => {
  if (dateError.value) return [];

  const query = searchQuery.value.trim().toLowerCase();

  return payments.value.filter((payment) => {

    const searchable = [

      payment.guest_name,

      payment.reservation_id,

      payment.room_number,

      payment.transaction_reference,

      payment.payment_method,

      payment.id

    ].join(" ").toLowerCase();

    const matchesSearch = !query || searchable.includes(query);

    const status = normalizeStatus(payment.status);

    const matchesStatus =

      statusFilter.value === "all" ||

      status === statusFilter.value;

    const method = String(payment.payment_method || "").toLowerCase();

    const matchesMethod =

      methodFilter.value === "all" ||

      method === methodFilter.value.toLowerCase();

    const rawDate = payment.paid_at

      ? String(payment.paid_at).slice(0, 10)

      : "";

    const matchesStart = !startDate.value ||

      (rawDate && rawDate >= startDate.value);

    const matchesEnd = !endDate.value ||

      (rawDate && rawDate <= endDate.value);

    return matchesSearch &&

      matchesStatus &&

      matchesMethod &&

      matchesStart &&

      matchesEnd;

  });

});

const paidPayments = computed(() =>

  payments.value.filter((p) => normalizeStatus(p.status) === "paid")

);

const pendingPayments = computed(() =>

  payments.value.filter((p) => normalizeStatus(p.status) === "pending")

);

const failedPayments = computed(() =>

  payments.value.filter((p) => normalizeStatus(p.status) === "failed")

);

const totalRevenue = computed(() =>

  paidPayments.value.reduce((sum, p) => sum + Number(p.amount || 0), 0)

);

const paidTotal = computed(() =>

  paidPayments.value.reduce((sum, p) => sum + Number(p.amount || 0), 0)

);

const pendingTotal = computed(() =>

  pendingPayments.value.reduce((sum, p) => sum + Number(p.amount || 0), 0)

);

const failedTotal = computed(() =>

  failedPayments.value.reduce((sum, p) => sum + Number(p.amount || 0), 0)

);

const resetFilters = () => {

  searchQuery.value = "";

  statusFilter.value = "all";

  methodFilter.value = "all";

  startDate.value = "";

  endDate.value = "";

  dateError.value = "";

};

const validateDates = () => {

  dateError.value = "";

  if (startDate.value && endDate.value &&

      startDate.value > endDate.value) {

    dateError.value = "The start date must be before the end date.";

    return false;

  }

  return true;

};

const openDetails = (payment) => {

  selectedPayment.value = payment;

};

const closeDetails = () => {

  selectedPayment.value = null;

};

onMounted(fetchPayments);

</script>

<template>

  <div class="payments-page">

    <!-- Page heading -->

    <header class="page-heading">

      <div>

        <p class="eyebrow">VERDE HAVEN · ADMINISTRATION</p>

        <h1>Payments Dashboard</h1>

        <p class="subtitle">

          Monitor transactions and reservation payments.

        </p>

      </div>

      <button class="refresh-button" @click="fetchPayments" :disabled="loading">

        <span class="refresh-icon">↻</span>

        {{ loading ? "Refreshing..." : "Refresh Data" }}

      </button>

    </header>

    <!-- Summary cards -->

    <section class="stats-grid">

      <article class="stat-card revenue-card">

        <div class="stat-top">

          <span class="stat-icon">₱</span>

          <span class="stat-caption">PAID REVENUE</span>

        </div>

        <p class="stat-label">Total Revenue</p>

        <h2>₱{{ formatAmount(totalRevenue) }}</h2>

        <p class="stat-foot">{{ paidPayments.length }} paid transaction(s)</p>

      </article>

      <article class="stat-card">

        <div class="stat-top">

          <span class="stat-icon green-icon">✓</span>

          <span class="stat-caption">COMPLETED</span>

        </div>

        <p class="stat-label">Paid Payments</p>

        <h2>₱{{ formatAmount(paidTotal) }}</h2>

        <p class="stat-foot">{{ paidPayments.length }} payment(s)</p>

      </article>

      <article class="stat-card">

        <div class="stat-top">

          <span class="stat-icon gold-icon">◷</span>

          <span class="stat-caption">AWAITING</span>

        </div>

        <p class="stat-label">Pending Payments</p>

        <h2>₱{{ formatAmount(pendingTotal) }}</h2>

        <p class="stat-foot">{{ pendingPayments.length }} payment(s)</p>

      </article>

      <article class="stat-card">

        <div class="stat-top">

          <span class="stat-icon red-icon">!</span>

          <span class="stat-caption">UNSUCCESSFUL</span>

        </div>

        <p class="stat-label">Failed Payments</p>

        <h2>₱{{ formatAmount(failedTotal) }}</h2>

        <p class="stat-foot">{{ failedPayments.length }} payment(s)</p>

      </article>

    </section>

    <!-- Search and filters -->

    <section class="filter-card">

      <div class="search-wrap">

        <span class="search-icon">⌕</span>

        <input

          v-model="searchQuery"

          type="search"

          placeholder="Search guest, reservation, room, or reference..."

          aria-label="Search payment records"

        />

      </div>

      <select v-model="statusFilter" aria-label="Filter by status">

        <option value="all">All statuses</option>

        <option value="paid">Paid</option>

        <option value="pending">Pending</option>

        <option value="failed">Failed</option>

        <option value="refunded">Refunded</option>

      </select>

      <select v-model="methodFilter" aria-label="Filter by payment method">

        <option value="all">All methods</option>

        <option v-for="method in methods" :key="method" :value="method">

          {{ method }}

        </option>

      </select>

      <button class="clear-button" @click="resetFilters">

        Clear

      </button>

      <div class="date-filters">

        <label>

          <span>From date</span>

          <input v-model="startDate" type="date" @change="validateDates" />

        </label>

        <label>

          <span>To date</span>

          <input v-model="endDate" type="date" @change="validateDates" />

        </label>

      </div>

      <p v-if="dateError" class="date-error">{{ dateError }}</p>

    </section>

    <!-- Loading state -->

    <section v-if="loading" class="message-card">

      <span class="loading-mark">↻</span>

      <h3>Loading payment records</h3>

      <p>Please wait while we retrieve the latest transactions.</p>

    </section>

    <!-- Error state -->

    <section v-else-if="error" class="message-card error-card">

      <span class="message-icon">!</span>

      <h3>Unable to load payments</h3>

      <p>{{ error }}</p>

      <button class="primary-button" @click="fetchPayments">Try Again</button>

    </section>

    <!-- Payment table -->

    <section v-else class="table-card">

      <div class="table-heading">

        <div>

          <p class="eyebrow">TRANSACTION HISTORY</p>

          <h2>Payment Records</h2>

          <p class="table-subtitle">

            {{ filteredPayments.length }} matching record(s)

            <span v-if="refreshedAt"> · Updated {{ refreshedAt }}</span>

          </p>

        </div>

        <span class="record-count">{{ filteredPayments.length }} records</span>

      </div>

      <div v-if="filteredPayments.length" class="table-scroll">

        <table>

          <thead>

            <tr>

              <th>TRANSACTION</th>

              <th>GUEST</th>

              <th>RESERVATION</th>

              <th>ROOM</th>

              <th>AMOUNT</th>

              <th>METHOD</th>

              <th>STATUS</th>

              <th>PAID AT</th>

              <th></th>

            </tr>

          </thead>

          <tbody>

            <tr v-for="payment in filteredPayments" :key="payment.id">

              <td>

                <span class="transaction-id">PAY-{{ payment.id }}</span>

                <span class="cell-muted">

                  {{ payment.transaction_reference || "No reference" }}

                </span>

              </td>

              <td>

                <strong class="guest-name">

                  {{ payment.guest_name || "Guest" }}

                </strong>

              </td>

              <td>

                <span class="reservation-id">

                  #{{ payment.reservation_id ?? "—" }}

                </span>

              </td>

              <td>Room {{ payment.room_number || "—" }}</td>

              <td>

                <strong class="amount">₱{{ formatAmount(payment.amount) }}</strong>

              </td>

              <td>{{ payment.payment_method || "—" }}</td>

              <td>

                <span

                  class="status-badge"

                  :class="'status-' + normalizeStatus(payment.status).replace(/[^a-z0-9-]/g, '-')"

                >

                  <span class="status-dot"></span>

                  {{ statusLabel(payment.status) }}

                </span>

              </td>

              <td>{{ formatDateTime(payment.paid_at) }}</td>

              <td>

                <button class="details-button" @click="openDetails(payment)">

                  Details

                  <span>↗</span>

                </button>

              </td>

            </tr>

          </tbody>

        </table>

      </div>

      <div v-else class="empty-state">

        <span class="empty-icon">₱</span>

        <h3>No matching payment records</h3>

        <p>Try changing your search or filters.</p>

        <button class="clear-button" @click="resetFilters">Clear filters</button>

      </div>

      <footer class="table-footer">

        <span>Showing {{ filteredPayments.length }} of {{ payments.length }} records</span>

        <span class="footer-note">Verde Haven · Payment Management</span>

      </footer>

    </section>

    <!-- Payment details modal -->

    <div

      v-if="selectedPayment"

      class="modal-backdrop"

      @click.self="closeDetails"

      @keydown.esc="closeDetails"

    >

      <section class="details-modal" role="dialog" aria-modal="true" aria-labelledby="details-title">

        <header class="modal-header">

          <div>

            <p class="eyebrow">TRANSACTION DETAILS</p>

            <h2 id="details-title">Payment Information</h2>

          </div>

          <button class="close-button" @click="closeDetails" aria-label="Close details">×</button>

        </header>

        <div class="modal-amount">

          <span>Payment amount</span>

          <strong>₱{{ formatAmount(selectedPayment.amount) }}</strong>

          <span

            class="status-badge"

            :class="'status-' + normalizeStatus(selectedPayment.status).replace(/[^a-z0-9-]/g, '-')"

          >

            <span class="status-dot"></span>

            {{ statusLabel(selectedPayment.status) }}

          </span>

        </div>

        <div class="details-grid">

          <div class="detail-item">

            <span>Payment ID</span>

            <strong>PAY-{{ selectedPayment.id }}</strong>

          </div>

          <div class="detail-item">

            <span>Reservation ID</span>

            <strong>#{{ selectedPayment.reservation_id ?? "—" }}</strong>

          </div>

          <div class="detail-item">

            <span>Guest Name</span>

            <strong>{{ selectedPayment.guest_name || "—" }}</strong>

          </div>

          <div class="detail-item">

            <span>Room Number</span>

            <strong>{{ selectedPayment.room_number || "—" }}</strong>

          </div>

          <div class="detail-item">

            <span>Payment Method</span>

            <strong>{{ selectedPayment.payment_method || "—" }}</strong>

          </div>

          <div class="detail-item">

            <span>Transaction Reference</span>

            <strong class="break-value">

              {{ selectedPayment.transaction_reference || "—" }}

            </strong>

          </div>

          <div class="detail-item">

            <span>Paid At</span>

            <strong>{{ formatDateTime(selectedPayment.paid_at) }}</strong>

          </div>

          <div class="detail-item">

            <span>Status</span>

            <strong>{{ statusLabel(selectedPayment.status) }}</strong>

          </div>

        </div>

        <footer class="modal-footer">

          <button class="primary-button" @click="closeDetails">Close Details</button>

        </footer>

      </section>

    </div>

  </div>

</template>

<style scoped>

.payments-page {

  min-height: 100%;

  padding: 32px;

  color: #193b30;

  background: #f7f5ee;

  font-family: "DM Sans", "Segoe UI", sans-serif;

}

.page-heading {

  display: flex;

  justify-content: space-between;

  align-items: center;

  gap: 20px;

  margin: 0 auto 28px;

  max-width: 1500px;

}

.eyebrow {

  margin: 0 0 8px;

  color: #a18750;

  font-size: 10px;

  font-weight: 800;

  letter-spacing: 1.8px;

}

.page-heading h1,

.table-heading h2,

.modal-header h2 {

  margin: 0;

  color: #10372d;

  font-family: "Playfair Display", Georgia, serif;

  font-weight: 600;

}

.page-heading h1 {

  font-size: clamp(27px, 3vw, 36px);

}

.subtitle {

  margin: 8px 0 0;

  color: #7a857d;

  font-size: 14px;

}

button,

input,

select {

  font: inherit;

}

button {

  cursor: pointer;

  transition: background 0.2s, transform 0.2s, border-color 0.2s;

}

button:disabled {

  cursor: not-allowed;

  opacity: 0.65;

}

.refresh-button,

.primary-button {

  border: 1px solid #10372d;

  border-radius: 9px;

  padding: 11px 16px;

  color: #fff;

  background: #10372d;

  font-size: 12px;

  font-weight: 700;

}

.refresh-button:hover,

.primary-button:hover {

  background: #1b4c3c;

}

.refresh-icon {

  margin-right: 6px;

  font-size: 17px;

}

.stats-grid {

  display: grid;

  grid-template-columns: repeat(4, minmax(0, 1fr));

  gap: 17px;

  max-width: 1500px;

  margin: 0 auto 22px;

}

.stat-card {
  position: relative;
  overflow: hidden;
  padding: 21px;
  min-width: 0;
  background: #fff;
  border: 1px solid #e8e3d8;
  border-radius: 13px;
  box-shadow: 0 4px 15px #173d2c08;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:not(.revenue-card):hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 24px rgba(16, 55, 45, 0.10);
}

/* Paid: soft sage green */
.stat-card:nth-child(2) {
  background: linear-gradient(135deg, #ffffff 0%, #e8f2e8 100%);
  border-color: #d6e6d6;
}

/* Pending: warm cream and gold */
.stat-card:nth-child(3) {
  background: linear-gradient(135deg, #fffefa 0%, #f8efd9 100%);
  border-color: #eadcb9;
}

/* Failed: subtle muted rose */
.stat-card:nth-child(4) {
  background: linear-gradient(135deg, #fffdfb 0%, #f8e9e5 100%);
  border-color: #edd7d1;
}

.revenue-card {

  background: linear-gradient(140deg, #10372d, #1c4d3b);

  border-color: #10372d;

  color: #fff;

}

.stat-top {

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 10px;

}

.stat-icon {

  display: grid;

  place-items: center;

  width: 39px;

  height: 39px;

  border-radius: 50%;

  background: #e6eee7;

  color: #174a37;

  font-size: 20px;

  font-weight: 800;

}

.revenue-card .stat-icon {

  color: #173d2c;

  background: #e0c48a;

}

.green-icon {
  color: #267448;
  background: #d7ead9;
  border: 1px solid #c4dfc9;
}

.gold-icon {
  color: #956a18;
  background: #f5e5bd;
  border: 1px solid #ead7a5;
}

.red-icon {
  color: #a5443e;
  background: #f3d8d2;
  border: 1px solid #eac6bd;
}

.stat-caption {

  color: #a0a79f;

  font-size: 9px;

  font-weight: 800;

  letter-spacing: 1px;

}

.revenue-card .stat-caption {

  color: #d9cda9;

}

.stat-label {

  margin: 19px 0 7px;

  color: #7a857d;

  font-size: 12px;

}

.revenue-card .stat-label,

.revenue-card .stat-foot {

  color: #d4e0d8;

}

.stat-card h2 {

  margin: 0;

  overflow-wrap: anywhere;

  color: #193b30;

  font-size: clamp(19px, 1.8vw, 25px);

  font-weight: 750;

  letter-spacing: -0.6px;

}

.revenue-card h2 {

  color: #fff;

}

.stat-foot {

  margin: 10px 0 0;

  color: #929b94;

  font-size: 11px;

}

.filter-card {

  display: grid;

  grid-template-columns: minmax(200px, 1fr) 155px 160px auto;

  gap: 12px;

  align-items: center;

  max-width: 1500px;

  margin: 0 auto 20px;

  padding: 17px;

  background: #fff;

  border: 1px solid #e8e3d8;

  border-radius: 12px;

}

.search-wrap {

  display: flex;

  align-items: center;

  gap: 10px;

  min-width: 0;

  padding: 0 12px;

  border: 1px solid #e5e4dc;

  border-radius: 8px;

  background: #fdfdfb;

}

.search-icon {

  color: #426252;

  font-size: 23px;

}

.search-wrap input {

  width: 100%;

  min-width: 0;

  height: 40px;

  border: none;

  outline: none;

  color: #193b30;

  background: transparent;

  font-size: 12px;

}

.filter-card select,

.date-filters input {

  width: 100%;

  min-width: 0;

  height: 42px;

  padding: 0 10px;

  border: 1px solid #e5e4dc;

  border-radius: 8px;

  outline-color: #77947f;

  color: #344b3e;

  background: #fff;

  font-size: 12px;

}

.clear-button {

  padding: 10px 13px;

  border: 1px solid #dcded5;

  border-radius: 8px;

  color: #466052;

  background: #fff;

  font-size: 12px;

  font-weight: 700;

}

.clear-button:hover {

  border-color: #a8b9aa;

  background: #f5f7f1;

}

.date-filters {

  display: grid;

  grid-template-columns: repeat(2, minmax(130px, 1fr));

  gap: 12px;

  grid-column: 1 / -1;

  padding-top: 3px;

}

.date-filters label {

  display: grid;

  gap: 6px;

  color: #7a857d;

  font-size: 11px;

  font-weight: 700;

}

.date-error {

  grid-column: 1 / -1;

  margin: 0;

  color: #b23f3b;

  font-size: 12px;

}

.table-card {

  max-width: 1500px;

  margin: 0 auto;

  overflow: hidden;

  background: #fff;

  border: 1px solid #e8e3d8;

  border-radius: 13px;

  box-shadow: 0 4px 15px #173d2c08;

}

.table-heading {

  display: flex;

  justify-content: space-between;

  align-items: center;

  gap: 16px;

  padding: 22px 24px;

  border-bottom: 1px solid #eeeae2;

}

.table-heading h2 {

  font-size: 23px;

}

.table-subtitle {

  margin: 7px 0 0;

  color: #8a948c;

  font-size: 12px;

}

.record-count {

  flex-shrink: 0;

  padding: 7px 10px;

  border-radius: 7px;

  color: #41624d;

  background: #edf3eb;

  font-size: 11px;

  font-weight: 700;

}

.table-scroll {

  width: 100%;

  overflow-x: auto;

}

table {

  width: 100%;

  min-width: 1150px;

  border-collapse: collapse;

  text-align: left;

}

thead {

  background: #f7f7f2;

}

th {

  padding: 14px 16px;

  color: #78847a;

  font-size: 9px;

  font-weight: 800;

  letter-spacing: 0.65px;

  white-space: nowrap;

}

td {

  padding: 15px 16px;

  border-top: 1px solid #f0eee8;

  color: #536158;

  font-size: 12px;

  white-space: nowrap;

}

tbody tr {

  transition: background 0.15s;

}

tbody tr:hover {

  background: #fbfcf8;

}

.transaction-id {

  display: block;

  color: #214b37;

  font-weight: 800;

}

.cell-muted {

  display: block;

  max-width: 150px;

  margin-top: 5px;

  overflow: hidden;

  color: #9aa19b;

  font-size: 10px;

  text-overflow: ellipsis;

}

.guest-name {

  color: #263e31;

}

.reservation-id {

  color: #687a6d;

}

.amount {

  color: #183e2e;

}

.status-badge {

  display: inline-flex;

  align-items: center;

  gap: 6px;

  padding: 6px 9px;

  border-radius: 20px;

  font-size: 10px;

  font-weight: 800;

}

.status-dot {

  width: 6px;

  height: 6px;

  flex-shrink: 0;

  border-radius: 50%;

  background: currentColor;

}

.status-paid,

.status-completed,

.status-success {

  color: #267448;

  background: #e2f3e6;

}

.status-pending,

.status-processing {

  color: #956a18;

  background: #fbf0d7;

}

.status-failed,

.status-declined,

.status-cancelled {

  color: #b03f3b;

  background: #fbe7e4;

}

.status-refunded {

  color: #5d5c9b;

  background: #eeedfa;

}

.details-button {

  padding: 8px 10px;

  border: 1px solid #dbe5da;

  border-radius: 7px;

  color: #1b4a35;

  background: #f7faf5;

  font-size: 11px;

  font-weight: 800;

}

.details-button:hover {

  color: #fff;

  background: #17442f;

  border-color: #17442f;

}

.details-button span {

  margin-left: 4px;

}

.table-footer {

  display: flex;

  justify-content: space-between;

  gap: 12px;

  padding: 15px 22px;

  border-top: 1px solid #eeeae2;

  color: #89938b;

  font-size: 11px;

}

.footer-note {

  color: #a0a69f;

}

.message-card,

.empty-state {

  max-width: 1500px;

  margin: 0 auto;

  padding: 48px 20px;

  text-align: center;

  background: #fff;

  border: 1px solid #e8e3d8;

  border-radius: 13px;

}

.message-card h3,

.empty-state h3 {

  margin: 13px 0 7px;

  color: #193b30;

  font-family: "Playfair Display", Georgia, serif;

  font-size: 21px;

}

.message-card p,

.empty-state p {

  color: #859087;

  font-size: 13px;

}

.message-icon,

.empty-icon,

.loading-mark {

  display: inline-grid;

  place-items: center;

  width: 46px;

  height: 46px;

  border-radius: 50%;

  color: #315e43;

  background: #eaf1e8;

  font-size: 22px;

  font-weight: 800;

}

.error-card .message-icon {

  color: #b03f3b;

  background: #fbe7e4;

}

.error-card .primary-button {

  margin-top: 10px;

}

.loading-mark {

  animation: rotate 1.2s linear infinite;

}

@keyframes rotate {

  to { transform: rotate(360deg); }

}

\* Details modal \*

.modal-backdrop {

  position: fixed;

  z-index: 1000;

  inset: 0;

  display: grid;

  place-items: center;

  padding: 20px;

  overflow-y: auto;

  background: #10271f99;

  backdrop-filter: blur(4px);

}

.details-modal {

  width: min(600px, 100%);

  max-height: 90vh;

  overflow-y: auto;

  background: #fff;

  border: 1px solid #e8e3d8;

  border-radius: 16px;

  box-shadow: 0 25px 80px #06180f40;

}

.modal-header {

  display: flex;

  justify-content: space-between;

  align-items: flex-start;

  gap: 20px;

  padding: 24px;

  border-bottom: 1px solid #eeeae2;

}

.modal-header h2 {

  font-size: 25px;

}

.close-button {

  width: 35px;

  height: 35px;

  border: 1px solid #e6e5dd;

  border-radius: 50%;

  color: #466052;

  background: #fff;

  font-size: 24px;

}

.close-button:hover {

  background: #f0f3ec;

}

.modal-amount {

  display: flex;

  flex-direction: column;

  align-items: flex-start;

  gap: 10px;

  margin: 20px 24px;

  padding: 20px;

  border-radius: 11px;

  background: #f4f6ef;

}

.modal-amount > span:first-child {

  color: #7c887d;

  font-size: 12px;

}

.modal-amount > strong {

  color: #10372d;

  font-size: 30px;

}

.details-grid {

  display: grid;

  grid-template-columns: repeat(2, minmax(0, 1fr));

  gap: 0;

  padding: 0 24px;

}

.detail-item {

  display: flex;

  flex-direction: column;

  gap: 7px;

  min-width: 0;

  padding: 14px 10px 14px 0;

  border-bottom: 1px solid #f0eee8;

}

.detail-item span {

  color: #89938b;

  font-size: 11px;

}

.detail-item strong {

  overflow-wrap: anywhere;

  color: #294635;

  font-size: 12px;

}

.break-value {

  word-break: break-word;

}

.modal-footer {

  display: flex;

  justify-content: flex-end;

  padding: 20px 24px 24px;

}

@media (max-width: 1100px) {

  .payments-page {

    padding: 24px;

  }

  .stats-grid {

    grid-template-columns: repeat(2, minmax(0, 1fr));

  }

  .filter-card {

    grid-template-columns: minmax(200px, 1fr) 1fr;

  }

  .search-wrap {

    grid-column: 1 / -1;

  }

  .clear-button {

    justify-self: start;

  }

}

@media (max-width: 600px) {

  .payments-page {

    padding: 18px 12px;

  }

  .page-heading {

    align-items: flex-start;

    flex-direction: column;

  }

  .stats-grid {

    gap: 10px;

  }

  .stat-card {

    padding: 14px;

  }

  .stat-card h2 {

    font-size: 18px;

  }

  .stat-caption {

    font-size: 8px;

  }

  .filter-card {

    grid-template-columns: 1fr;

    padding: 12px;

  }

  .search-wrap {

    grid-column: auto;

  }

  .date-filters {

    grid-template-columns: 1fr;

  }

  .table-heading {

    padding: 18px;

  }

  .table-heading h2 {

    font-size: 20px;

  }

  .table-footer {

    flex-direction: column;

  }

  .details-grid {

    grid-template-columns: 1fr;

  }

  .modal-header {

    padding: 19px;

  }

  .modal-amount {

    margin: 16px 19px;

  }

  .details-grid {

    padding: 0 19px;

  }

}

</style>
