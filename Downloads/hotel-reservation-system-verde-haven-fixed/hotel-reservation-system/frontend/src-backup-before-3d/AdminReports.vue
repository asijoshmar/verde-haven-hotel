
<script setup>
import { computed, onMounted, ref } from "vue";
import axios from "axios";

const loading = ref(false);
const refreshing = ref(false);
const error = ref("");
const startDate = ref("");
const endDate = ref("");
const search = ref("");
const statusFilter = ref("all");
const paymentFilter = ref("all");

const report = ref({
  summary: {
    total_reservations: 0,
    pending_reservations: 0,
    confirmed_reservations: 0,
    cancelled_reservations: 0,
    paid_payments: 0,
    total_revenue: 0,
    average_payment: 0
  },
  trend: [],
  reservation_status: [],
  payment_methods: [],
  room_performance: [],
  transactions: []
});

const money = (value) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const shortMoney = (value) => {
  const amount = Number(value || 0);
  if (amount >= 1000000) return `₱${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `₱${(amount / 1000).toFixed(1)}K`;
  return `₱${amount.toLocaleString("en-PH")}`;
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
};

const formatLabelDate = (value) => {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric"
      });
};

const fetchReports = async (isRefresh = false) => {
  try {
    if (isRefresh) refreshing.value = true;
    else loading.value = true;

    error.value = "";

    const response = await axios.get(
      "http://localhost:4000/api/admin/reports",
      {
        params: {
          ...(startDate.value ? { startDate: startDate.value } : {}),
          ...(endDate.value ? { endDate: endDate.value } : {})
        }
      }
    );

    report.value = {
      ...report.value,
      ...response.data,
      summary: {
        ...report.value.summary,
        ...(response.data.summary || {})
      }
    };
  } catch (err) {
    console.error("Reports loading error:", err);
    error.value =
      err.response?.data?.message ||
      "Unable to load reports. Please check that the backend server is running.";
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
};

const applyDates = () => {
  if (startDate.value && endDate.value && startDate.value > endDate.value) {
    error.value = "The start date must not be later than the end date.";
    return;
  }

  fetchReports();
};

const clearDates = () => {
  startDate.value = "";
  endDate.value = "";
  search.value = "";
  statusFilter.value = "all";
  paymentFilter.value = "all";
  fetchReports();
};

const filteredTransactions = computed(() => {
  const query = search.value.trim().toLowerCase();

  return (report.value.transactions || []).filter((item) => {
    const status = String(item.reservation_status || "").toLowerCase();
    const paymentStatus = String(
      item.payment_status || "unpaid"
    ).toLowerCase();

    const haystack = [
      item.reservation_id,
      item.guest_name,
      item.room_number,
      item.room_type,
      item.transaction_reference,
      item.payment_method,
      item.reservation_status,
      item.payment_status
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!query || haystack.includes(query)) &&
      (statusFilter.value === "all" ||
        status === statusFilter.value) &&
      (paymentFilter.value === "all" ||
        paymentStatus === paymentFilter.value)
    );
  });
});

const maxRevenue = computed(() =>
  Math.max(
    1,
    ...(report.value.trend || []).map((d) =>
      Number(d.revenue || 0)
    )
  )
);

const maxReservations = computed(() =>
  Math.max(
    1,
    ...(report.value.trend || []).map((d) =>
      Number(d.reservations || 0)
    )
  )
);

const maxMethodRevenue = computed(() =>
  Math.max(
    1,
    ...(report.value.payment_methods || []).map((d) =>
      Number(d.revenue || 0)
    )
  )
);

const maxRoomBookings = computed(() =>
  Math.max(
    1,
    ...(report.value.room_performance || []).map((d) =>
      Number(d.reservations || 0)
    )
  )
);

const totalStatusCount = computed(() =>
  (report.value.reservation_status || []).reduce(
    (sum, item) => sum + Number(item.value || 0),
    0
  )
);

const statusRingStyle = computed(() => {
  const colors = [
    "#245239",
    "#d1ad68",
    "#8dbb91",
    "#d58d78",
    "#8297b5"
  ];

  const items = report.value.reservation_status || [];
  const total = totalStatusCount.value || 1;
  let position = 0;

  const segments = items.map((item, index) => {
    const start = position;
    position += (Number(item.value || 0) / total) * 100;
    return `${colors[index % colors.length]} ${start}% ${position}%`;
  });

  return {
    background: segments.length
      ? `conic-gradient(${segments.join(", ")})`
      : "#e8eee5"
  };
});

const statusTone = (value) => {
  const status = String(value || "").toLowerCase();

  if (status === "confirmed" || status === "paid") return "success";
  if (status === "pending") return "warning";
  if (status === "cancelled" || status === "failed") return "danger";

  return "neutral";
};

const exportCsv = () => {
  const rows = filteredTransactions.value;

  const headers = [
    "Reservation ID",
    "Guest",
    "Room",
    "Room Type",
    "Check-in",
    "Check-out",
    "Reservation Date",
    "Reservation Status",
    "Payment Status",
    "Payment Method",
    "Transaction Reference",
    "Payment Amount"
  ];

  const values = rows.map((item) => [
    item.reservation_id,
    item.guest_name,
    item.room_number,
    item.room_type,
    item.check_in,
    item.check_out,
    item.created_at,
    item.reservation_status,
    item.payment_status || "unpaid",
    item.payment_method || "",
    item.transaction_reference || "",
    item.payment_amount ?? ""
  ]);

  const escapeCsv = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const csv = [headers, ...values]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `verde-haven-report-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

onMounted(() => fetchReports());
</script>

<template>
  <div class="reports-page">
    <!-- HEADER -->
    <section class="reports-heading">
      <div class="heading-copy">
        <div class="eyebrow">
          <span class="live-dot"></span>
          HOTEL PERFORMANCE CENTER
        </div>

        <h1>Reports &amp; Analytics</h1>
        <p>
          A complete view of your reservations, revenue, payments,
          and room performance.
        </p>
      </div>

      <div class="heading-actions">
        <button
          class="btn btn-glass"
          type="button"
          :disabled="refreshing"
          @click="fetchReports(true)"
        >
          <span :class="{ spin: refreshing }">↻</span>
          {{ refreshing ? "Refreshing..." : "Refresh data" }}
        </button>

        <button class="btn btn-gold" type="button" @click="exportCsv">
          ↓ Export CSV
        </button>
      </div>

      <div class="header-decoration">V</div>
    </section>

    <!-- DATE FILTERS -->
    <section class="filter-panel">
      <div class="filter-title">
        <div class="filter-symbol">▦</div>
        <div>
          <strong>Reporting period</strong>
          <small>Choose a date range to update your reports.</small>
        </div>
      </div>

      <div class="filter-controls">
        <label>
          <span>FROM DATE</span>
          <input
            v-model="startDate"
            type="date"
            :max="endDate || undefined"
          />
        </label>

        <span class="date-dash">—</span>

        <label>
          <span>TO DATE</span>
          <input
            v-model="endDate"
            type="date"
            :min="startDate || undefined"
          />
        </label>

        <button class="btn btn-primary apply-btn" @click="applyDates">
          Apply filters
        </button>

        <button class="btn btn-reset" @click="clearDates">
          Reset
        </button>
      </div>
    </section>

    <!-- ERROR -->
    <div v-if="error" class="report-error">
      <span class="error-symbol">!</span>
      <div class="error-copy">
        <strong>Reports could not be loaded</strong>
        <p>{{ error }}</p>
      </div>
      <button class="btn btn-light" @click="fetchReports()">
        Try again
      </button>
    </div>

    <!-- LOADING -->
    <div v-if="loading" class="report-loading">
      <span class="loader"></span>
      Loading hotel reports...
    </div>

    <template v-else>
      <!-- SUMMARY CARDS -->
      <section class="metric-grid">
        <article class="metric-card revenue-card">
          <div class="metric-top">
            <span class="metric-icon">₱</span>
            <span class="metric-caption">TOTAL REVENUE</span>
            <span class="metric-arrow">↗</span>
          </div>

          <div class="metric-value">
            {{ money(report.summary.total_revenue) }}
          </div>

          <div class="metric-foot">
            <span class="mini-dot"></span>
            Paid payments in selected period
          </div>

          <div class="metric-decoration">₱</div>
        </article>

        <article class="metric-card booking-card">
          <div class="metric-top">
            <span class="metric-icon">▣</span>
            <span class="metric-caption">RESERVATIONS</span>
          </div>

          <div class="metric-value">
            {{ Number(report.summary.total_reservations || 0).toLocaleString() }}
          </div>

          <div class="metric-foot">
            <span class="mini-dot"></span>
            All recorded bookings
          </div>

          <div class="metric-decoration">▣</div>
        </article>

        <article class="metric-card confirmed-card">
          <div class="metric-top">
            <span class="metric-icon">✓</span>
            <span class="metric-caption">CONFIRMED BOOKINGS</span>
          </div>

          <div class="metric-value">
            {{ Number(report.summary.confirmed_reservations || 0).toLocaleString() }}
          </div>

          <div class="metric-foot">
            <span class="mini-dot"></span>
            Successfully confirmed
          </div>

          <div class="metric-decoration">✓</div>
        </article>

        <article class="metric-card payment-card">
          <div class="metric-top">
            <span class="metric-icon">◈</span>
            <span class="metric-caption">PAID TRANSACTIONS</span>
          </div>

          <div class="metric-value">
            {{ Number(report.summary.paid_payments || 0).toLocaleString() }}
          </div>

          <div class="metric-foot">
            <span class="mini-dot"></span>
            Average {{ money(report.summary.average_payment) }}
          </div>

          <div class="metric-decoration">◈</div>
        </article>
      </section>

      <!-- REVENUE CHART + STATUS -->
      <section class="charts-grid">
        <article class="panel revenue-panel">
          <div class="panel-heading">
            <div>
              <span class="panel-kicker">FINANCIAL OVERVIEW</span>
              <h2>Revenue &amp; Reservations</h2>
              <p>Daily revenue and booking activity</p>
            </div>
            <span class="panel-tag">REPORT DATA</span>
          </div>

          <div v-if="!report.trend.length" class="empty-chart">
            <span class="empty-icon">▥</span>
            <strong>No activity found</strong>
            <small>No chart data is available for this period.</small>
          </div>

          <div v-else class="trend-chart">
            <div class="chart-legend">
              <span><i class="legend-revenue"></i> Revenue</span>
              <span><i class="legend-booking"></i> Reservations</span>
            </div>

            <div class="chart-plot">
              <div class="y-labels">
                <span>{{ shortMoney(maxRevenue) }}</span>
                <span>{{ shortMoney(maxRevenue * 0.66) }}</span>
                <span>{{ shortMoney(maxRevenue * 0.33) }}</span>
                <span>₱0</span>
              </div>

              <div class="plot-area">
                <div class="grid-line line-one"></div>
                <div class="grid-line line-two"></div>
                <div class="grid-line line-three"></div>
                <div class="grid-line line-four"></div>

                <div class="bar-series">
                  <div
                    v-for="day in report.trend"
                    :key="day.report_date"
                    class="bar-group"
                    :title="`${formatLabelDate(day.report_date)} · ${money(day.revenue)} · ${day.reservations} reservations`"
                  >
                    <div class="bars">
                      <div
                        class="bar revenue-bar"
                        :style="{
                          height: `${Math.max(
                            Number(day.revenue) ? 4 : 0,
                            Number(day.revenue || 0) / maxRevenue * 100
                          )}%`
                        }"
                      ></div>

                      <div
                        class="bar reservation-bar"
                        :style="{
                          height: `${Math.max(
                            Number(day.reservations) ? 4 : 0,
                            Number(day.reservations || 0) / maxReservations * 100
                          )}%`
                        }"
                      ></div>
                    </div>

                    <small>{{ formatLabelDate(day.report_date) }}</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article class="panel status-panel">
          <div class="panel-heading">
            <div>
              <span class="panel-kicker">BOOKING BREAKDOWN</span>
              <h2>Reservation Status</h2>
              <p>Reservations by current status</p>
            </div>
            <span class="panel-icon">◉</span>
          </div>

          <div
            v-if="!report.reservation_status.length"
            class="empty-chart"
          >
            <span class="empty-icon">◉</span>
            <strong>No reservations yet</strong>
            <small>Status breakdown will appear here.</small>
          </div>

          <div v-else class="status-content">
            <div class="status-ring" :style="statusRingStyle">
              <div class="ring-center">
                <strong>{{ totalStatusCount }}</strong>
                <small>Bookings</small>
              </div>
            </div>

            <div class="status-legend">
              <div
                v-for="(item, index) in report.reservation_status"
                :key="item.label"
                class="legend-row"
              >
                <span
                  class="legend-dot"
                  :class="`legend-color-${index % 5}`"
                ></span>
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </div>
        </article>
      </section>

      <!-- PAYMENT METHODS + ROOM PERFORMANCE -->
      <section class="detail-grid">
        <article class="panel payment-method-panel">
          <div class="panel-heading">
            <div>
              <span class="panel-kicker">PAYMENT INSIGHTS</span>
              <h2>Payment Methods</h2>
              <p>Revenue collected by payment type</p>
            </div>
            <span class="panel-icon gold-icon">₱</span>
          </div>

          <div v-if="!report.payment_methods.length" class="empty-inline">
            No payment records found.
          </div>

          <div v-else class="horizontal-list">
            <div
              v-for="(method, index) in report.payment_methods"
              :key="method.label"
              class="horizontal-item"
            >
              <div class="horizontal-meta">
                <span>
                  <i :class="`method-dot method-${index % 4}`"></i>
                  {{ method.label }}
                </span>
                <strong>{{ money(method.revenue) }}</strong>
              </div>

              <div class="progress-track">
                <div
                  class="progress-fill"
                  :class="`payment-fill-${index % 4}`"
                  :style="{
                    width: `${Number(method.revenue || 0) / maxMethodRevenue * 100}%`
                  }"
                ></div>
              </div>

              <small>
                {{ method.transactions }} transaction{{ Number(method.transactions) === 1 ? "" : "s" }}
              </small>
            </div>
          </div>
        </article>

        <article class="panel room-panel">
          <div class="panel-heading">
            <div>
              <span class="panel-kicker">ROOM PERFORMANCE</span>
              <h2>Room Type Summary</h2>
              <p>Booking activity across room categories</p>
            </div>
            <span class="panel-icon">⌂</span>
          </div>

          <div v-if="!report.room_performance.length" class="empty-inline">
            No room types found.
          </div>

          <div v-else class="room-list">
            <div
              v-for="(room, index) in report.room_performance"
              :key="room.room_type"
              class="room-performance"
            >
              <div class="room-type-mark" :class="`room-mark-${index % 4}`">
                ⌂
              </div>

              <div class="room-performance-main">
                <strong>{{ room.room_type }}</strong>
                <small>
                  {{ room.room_count }} room{{ Number(room.room_count) === 1 ? "" : "s" }}
                  · {{ room.reservations }} reservations
                </small>

                <div class="progress-track">
                  <div
                    class="progress-fill green-fill"
                    :style="{
                      width: `${Number(room.reservations || 0) / maxRoomBookings * 100}%`
                    }"
                  ></div>
                </div>
              </div>

              <strong class="room-value">
                {{ money(room.booking_value) }}
              </strong>
            </div>
          </div>
        </article>
      </section>

      <!-- TRANSACTIONS -->
      <section class="panel transactions-panel">
        <div class="transactions-heading">
          <div>
            <span class="panel-kicker">DETAILED RECORDS</span>
            <h2>Reservation &amp; Transaction Report</h2>
            <p>Search, filter, and export records from the selected period.</p>
          </div>

          <span class="record-count">
            {{ filteredTransactions.length }} records
          </span>
        </div>

        <div class="table-tools">
          <label class="search-box">
            <span>⌕</span>
            <input
              v-model="search"
              type="search"
              placeholder="Search guest, room, transaction..."
            />
          </label>

          <select v-model="statusFilter" aria-label="Filter reservation status">
            <option value="all">All reservations</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select v-model="paymentFilter" aria-label="Filter payment status">
            <option value="all">All payments</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="unpaid">Unpaid</option>
          </select>

          <button class="btn btn-light table-export" @click="exportCsv">
            ↓ Export
          </button>
        </div>

        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>RESERVATION</th>
                <th>GUEST / ROOM</th>
                <th>STAY DATES</th>
                <th>BOOKING VALUE</th>
                <th>PAYMENT</th>
                <th>STATUS</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="item in filteredTransactions"
                :key="item.reservation_id"
              >
                <td>
                  <strong class="reservation-number">
                    #{{ item.reservation_id }}
                  </strong>
                  <small>{{ formatDate(item.created_at) }}</small>
                </td>

                <td>
                  <div class="guest-name">
                    {{ item.guest_name || "Guest" }}
                  </div>
                  <small>
                    Room {{ item.room_number }} · {{ item.room_type }}
                  </small>
                </td>

                <td>
                  <span class="stay-date">
                    {{ formatDate(item.check_in) }}
                  </span>
                  <small>to {{ formatDate(item.check_out) }}</small>
                </td>

                <td>
                  <strong class="amount">
                    {{ money(item.total_amount) }}
                  </strong>
                </td>

                <td>
                  <strong class="amount">
                    {{ item.payment_amount == null ? "—" : money(item.payment_amount) }}
                  </strong>
                  <small>{{ item.payment_method || "No payment" }}</small>
                </td>

                <td>
                  <span
                    class="status-pill"
                    :class="`tone-${statusTone(item.reservation_status)}`"
                  >
                    {{ item.reservation_status || "Unknown" }}
                  </span>
                  <small>{{ item.payment_status || "Unpaid" }} payment</small>
                </td>
              </tr>

              <tr v-if="filteredTransactions.length === 0">
                <td colspan="6" class="no-results">
                  <span class="empty-icon">⌕</span>
                  <strong>No matching records</strong>
                  <small>Try changing your search or filters.</small>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="table-footer">
          <span>
            Showing {{ filteredTransactions.length }} of
            {{ report.transactions.length }} report records
          </span>
          <span>Verde Haven Boutique Hotel <b>•</b> Internal report</span>
        </div>
      </section>
    </template>

    <footer class="reports-footer">
      <span>VERDE HAVEN <b>·</b> REPORTS &amp; ANALYTICS</span>
      <span>Figures are based on recorded system transactions.</span>
    </footer>
  </div>
</template>

<style scoped>
.reports-page {
  --forest: #123d2c;
  --forest-dark: #0c2d22;
  --forest-light: #285b40;
  --gold: #d4b576;
  --cream: #f8f6ef;
  --ink: #203d2d;
  --muted: #78877b;
  --border: #e2e7dc;

  max-width: 1750px;
  margin: auto;
  padding: 28px 30px 22px;
  color: var(--ink);
  font-family: "DM Sans", Inter, "Segoe UI", sans-serif;
}

.reports-page * {
  box-sizing: border-box;
}

.reports-heading {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 22px;
  overflow: hidden;
  padding: 29px 30px;
  margin-bottom: 20px;
  border: 1px solid #315d45;
  border-radius: 17px;
  background:
    radial-gradient(ellipse at 85% 0%, #477a57 0%, transparent 42%),
    linear-gradient(120deg, #0c3023, #174b34 65%, #245a3e);
  box-shadow: 0 12px 28px #10372d20;
}

.heading-copy,
.heading-actions {
  position: relative;
  z-index: 2;
}

.heading-copy {
  max-width: 670px;
}

.header-decoration {
  position: absolute;
  right: 30px;
  bottom: -110px;
  color: #ffffff09;
  font-family: Georgia, serif;
  font-size: 280px;
  font-weight: bold;
  pointer-events: none;
}

.eyebrow,
.panel-kicker {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.6px;
  color: #a4864d;
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 10px;
  color: #e7ce99;
}

.live-dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #dfc486;
  box-shadow: 0 0 10px #dfc48680;
}

.reports-heading h1 {
  margin: 0 0 8px;
  color: #fffdf6;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 34px;
  font-weight: 600;
  letter-spacing: -0.5px;
}

.reports-heading p {
  margin: 0;
  color: #d2e0d4;
  font-size: 12px;
  line-height: 1.6;
}

.heading-actions {
  display: flex;
  align-items: center;
  gap: 9px;
}

.btn {
  padding: 10px 14px;
  border: 1px solid transparent;
  border-radius: 8px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.2s;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.65;
  cursor: wait;
}

.btn-primary {
  color: white;
  background: var(--forest);
  border-color: var(--forest);
}

.btn-primary:hover {
  background: #24583d;
  transform: translateY(-1px);
}

.btn-gold {
  color: #173c2b;
  background: #d9bc7e;
  border-color: #d9bc7e;
  box-shadow: 0 4px 12px #00000015;
}

.btn-gold:hover {
  background: #ead5a7;
  transform: translateY(-1px);
}

.btn-glass {
  color: #fffdf5;
  background: #ffffff12;
  border-color: #ffffff45;
}

.btn-glass:hover {
  background: #ffffff24;
  border-color: #e4c991;
}

.btn-light {
  color: #3b5947;
  background: #fffefa;
  border-color: #dfe5d9;
}

.btn-light:hover {
  border-color: #c9aa70;
  background: white;
}

.btn-reset {
  color: #69796c;
  background: transparent;
}

.filter-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 16px 18px;
  margin-bottom: 18px;
  border: 1px solid #dce7d8;
  border-radius: 13px;
  background: linear-gradient(110deg, #eef5eb, #fffaf0);
  box-shadow: 0 5px 16px #254b3510;
}

.filter-title {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 190px;
}

.filter-symbol {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border: 1px solid #cbdcc8;
  border-radius: 10px;
  background: #dcebdc;
  color: #244b38;
  font-size: 20px;
}

.filter-title strong,
.filter-title small {
  display: block;
}

.filter-title strong {
  font-size: 12px;
}

.filter-title small {
  margin-top: 4px;
  color: var(--muted);
  font-size: 10px;
}

.filter-controls {
  display: flex;
  align-items: flex-end;
  gap: 9px;
}

.filter-controls label {
  display: grid;
  gap: 5px;
  color: #718174;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.8px;
}

.filter-controls input {
  width: 145px;
  height: 36px;
  padding: 0 9px;
  border: 1px solid #d8e1d4;
  border-radius: 7px;
  outline: none;
  background: white;
  color: var(--ink);
  font-family: inherit;
  font-size: 11px;
}

.filter-controls input:focus,
.table-tools select:focus {
  border-color: #8ba98c;
  box-shadow: 0 0 0 3px #6d927122;
}

.date-dash {
  padding-bottom: 11px;
  color: #a7b0a4;
}

.apply-btn,
.filter-controls .btn-reset {
  height: 36px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 17px;
}

.metric-card {
  position: relative;
  isolation: isolate;
  min-width: 0;
  min-height: 158px;
  overflow: hidden;
  padding: 18px;
  border: 1px solid transparent;
  border-radius: 14px;
  box-shadow: 0 6px 18px #193b300a;
  transition: transform 0.2s, box-shadow 0.2s;
}

.metric-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px #193b3014;
}

.revenue-card {
  background: linear-gradient(140deg, #e0efe0, #f6f8ef);
  border-color: #cfdfcc;
}

.booking-card {
  background: linear-gradient(140deg, #fff0d8, #fffaf0);
  border-color: #eeddbd;
}

.confirmed-card {
  background: linear-gradient(140deg, #e1edf8, #f7faff);
  border-color: #d1dfef;
}

.payment-card {
  background: linear-gradient(140deg, #f5e5dd, #fff8f2);
  border-color: #ead4c9;
}

.metric-top {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 9px;
}

.metric-icon {
  display: grid;
  place-items: center;
  width: 35px;
  height: 35px;
  flex-shrink: 0;
  border-radius: 10px;
  background: #cce2ca;
  color: #245638;
  font-size: 17px;
  font-weight: 800;
}

.booking-card .metric-icon {
  background: #f3dfb6;
  color: #8d6728;
}

.confirmed-card .metric-icon {
  background: #cddff1;
  color: #315c87;
}

.payment-card .metric-icon {
  background: #ebd0c2;
  color: #955d43;
}

.metric-caption {
  color: #64776a;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.8px;
}

.metric-arrow {
  margin-left: auto;
  color: #397b4a;
  font-size: 17px;
}

.metric-value {
  position: relative;
  z-index: 1;
  margin: 16px 0 12px;
  color: #174b31;
  font-family: "Playfair Display", Georgia, serif;
  font-size: clamp(22px, 2vw, 30px);
  font-weight: 600;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.booking-card .metric-value {
  color: #865d20;
}

.confirmed-card .metric-value {
  color: #285b87;
}

.payment-card .metric-value {
  color: #8d533c;
}

.metric-foot {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 7px;
  color: #6f8072;
  font-size: 9px;
  line-height: 1.5;
}

.mini-dot {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #4d8b5b;
}

.booking-card .mini-dot {
  background: #c39543;
}

.confirmed-card .mini-dot {
  background: #4f80b4;
}

.payment-card .mini-dot {
  background: #bb795d;
}

.metric-decoration {
  position: absolute;
  z-index: 0;
  right: 8px;
  bottom: -24px;
  color: #245b3515;
  font-family: Georgia, serif;
  font-size: 92px;
  font-weight: bold;
  pointer-events: none;
}

.booking-card .metric-decoration {
  color: #b8872a18;
}

.confirmed-card .metric-decoration {
  color: #386f9d16;
}

.payment-card .metric-decoration {
  color: #a55e4017;
}

.charts-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(270px, 1fr);
  gap: 14px;
  margin-bottom: 14px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}

.panel {
  min-width: 0;
  padding: 19px;
  border: 1px solid #e2e7dc;
  border-radius: 14px;
  background: #fffefa;
  box-shadow: 0 6px 18px #193b3009;
  transition: box-shadow 0.2s;
}

.panel:hover {
  box-shadow: 0 9px 22px #193b3010;
}

.revenue-panel {
  background: linear-gradient(145deg, #ffffff, #f0f6ee);
  border-color: #dce7d8;
}

.status-panel {
  background: linear-gradient(145deg, #ffffff, #f8f1e5);
  border-color: #eadfc9;
}

.payment-method-panel {
  background: linear-gradient(145deg, #fffdf8, #fbf1dc);
  border-color: #eadfc7;
}

.room-panel {
  background: linear-gradient(145deg, #ffffff, #edf5eb);
  border-color: #d8e5d5;
}

.panel-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
}

.panel-heading h2,
.transactions-heading h2 {
  margin: 5px 0 5px;
  color: #163e2d;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 19px;
  font-weight: 600;
  line-height: 1.3;
}

.panel-heading p,
.transactions-heading p {
  margin: 0;
  color: #7a897d;
  font-size: 11px;
  line-height: 1.5;
}

.panel-icon {
  display: grid;
  place-items: center;
  width: 35px;
  height: 35px;
  flex-shrink: 0;
  border-radius: 10px;
  background: #dcebd9;
  color: #28583a;
  font-size: 17px;
}

.gold-icon {
  background: #f3e2bd;
  color: #926b2c;
}

.panel-tag {
  padding: 6px 9px;
  border: 1px solid #c9dfc7;
  border-radius: 30px;
  background: #e6f2e5;
  color: #386b42;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.8px;
  white-space: nowrap;
}

.chart-legend {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-bottom: 10px;
  color: #607364;
  font-size: 9px;
}

.chart-legend span {
  display: flex;
  align-items: center;
  gap: 6px;
}

.chart-legend i {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 3px;
}

.legend-revenue {
  background: #245239;
}

.legend-booking {
  background: #d1ad68;
}

.chart-plot {
  display: flex;
  height: 180px;
}

.y-labels {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  width: 60px;
  padding: 0 10px 23px 0;
  color: #89978a;
  font-size: 9px;
}

.plot-area {
  position: relative;
  display: flex;
  flex: 1;
  min-width: 0;
}

.grid-line {
  position: absolute;
  right: 0;
  left: 0;
  border-top: 1px dashed #dfe7dc;
}

.line-one {
  top: 0;
}

.line-two {
  top: 33.33%;
}

.line-three {
  top: 66.66%;
}

.line-four {
  bottom: 21px;
}

.bar-series {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-around;
  align-items: stretch;
  gap: 3px;
  width: 100%;
  height: 100%;
  overflow-x: auto;
}

.bar-group {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 7px;
  min-width: 24px;
}

.bars {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 3px;
  width: 100%;
  height: calc(100% - 23px);
  padding: 0 3px;
}

.bar {
  width: min(13px, 40%);
  min-width: 4px;
  border-radius: 4px 4px 1px 1px;
  transition: height 0.25s;
}

.revenue-bar {
  background: linear-gradient(180deg, #6b9b70, #245239);
  box-shadow: 0 2px 5px #244b3815;
}

.reservation-bar {
  background: linear-gradient(180deg, #eed49a, #c49a50);
}

.bar-group small {
  height: 16px;
  color: #89948b;
  font-size: 8px;
  white-space: nowrap;
}

.status-content {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 22px;
  min-height: 180px;
}

.status-ring {
  display: grid;
  place-items: center;
  position: relative;
  width: 145px;
  height: 145px;
  flex-shrink: 0;
  border-radius: 50%;
  box-shadow: 0 6px 18px #193b300c;
}

.status-ring::before {
  content: "";
  position: absolute;
  inset: 15px;
  border-radius: 50%;
  background: #fffdf8;
}

.ring-center {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.ring-center strong {
  color: var(--forest);
  font-family: "Playfair Display", Georgia, serif;
  font-size: 27px;
}

.ring-center small {
  color: var(--muted);
  font-size: 9px;
}

.status-legend {
  display: grid;
  flex: 1;
  gap: 12px;
  min-width: 0;
}

.legend-row {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  color: #6c7a70;
  font-size: 10px;
}

.legend-row strong {
  color: var(--ink);
  font-size: 11px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 3px;
}

.legend-color-0 {
  background: #245239;
}

.legend-color-1 {
  background: #d1ad68;
}

.legend-color-2 {
  background: #8dbb91;
}

.legend-color-3 {
  background: #d58d78;
}

.legend-color-4 {
  background: #8297b5;
}

.horizontal-list {
  display: grid;
  gap: 18px;
}

.horizontal-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 11px;
}

.horizontal-meta > span {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #52675a;
}

.horizontal-meta strong {
  color: #244b38;
  font-size: 11px;
}

.method-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 3px;
}

.method-0 {
  background: #c49a50;
}

.method-1 {
  background: #4d8057;
}

.method-2 {
  background: #739bc0;
}

.method-3 {
  background: #c9846c;
}

.progress-track {
  height: 7px;
  overflow: hidden;
  border-radius: 20px;
  background: #e4e9df;
}

.progress-fill {
  height: 100%;
  border-radius: 20px;
  transition: width 0.25s;
}

.payment-fill-0 {
  background: linear-gradient(90deg, #bd9145, #e7c981);
}

.payment-fill-1 {
  background: linear-gradient(90deg, #245239, #79a77b);
}

.payment-fill-2 {
  background: linear-gradient(90deg, #477aa8, #9ec2e4);
}

.payment-fill-3 {
  background: linear-gradient(90deg, #bd755b, #e7b3a0);
}

.horizontal-item small {
  display: block;
  margin-top: 6px;
  color: #929c91;
  font-size: 9px;
}

.room-list {
  display: grid;
  gap: 16px;
}

.room-performance {
  display: flex;
  align-items: center;
  gap: 10px;
}

.room-type-mark {
  display: grid;
  place-items: center;
  width: 37px;
  height: 37px;
  flex-shrink: 0;
  border-radius: 10px;
  background: #dcebd9;
  color: #28583a;
  font-size: 18px;
}

.room-mark-1 {
  background: #f4e5c9;
  color: #98733a;
}

.room-mark-2 {
  background: #dce9f5;
  color: #416e9c;
}

.room-mark-3 {
  background: #f1dfd6;
  color: #a3664d;
}

.room-performance-main {
  flex: 1;
  min-width: 0;
}

.room-performance-main strong {
  display: block;
  color: #2c4938;
  font-size: 11px;
}

.room-performance-main small {
  display: block;
  margin: 4px 0 7px;
  color: #89958b;
  font-size: 9px;
}

.green-fill {
  background: linear-gradient(90deg, #1c5035, #78a87b);
}

.room-value {
  color: #244b38;
  font-size: 10px;
  white-space: nowrap;
}

.transactions-panel {
  padding: 0;
  overflow: hidden;
  border-color: #d9e3d5;
  box-shadow: 0 8px 24px #193b300b;
}

.transactions-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  padding: 20px;
  border-bottom: 1px solid #e3e8dc;
  background: linear-gradient(110deg, #eff5ec, #fffaf0);
}

.record-count {
  padding: 7px 11px;
  border-radius: 20px;
  background: #dcebd9;
  color: #28583a;
  font-size: 9px;
  font-weight: 800;
  white-space: nowrap;
}

.table-tools {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 13px 20px;
  border-top: 1px solid #efede6;
  border-bottom: 1px solid #e1e8dd;
  background: #f6f8f1;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 170px;
  max-width: 340px;
  height: 35px;
  padding: 0 10px;
  border: 1px solid #dce4d8;
  border-radius: 7px;
  background: white;
  color: #8a968c;
}

.search-box:focus-within {
  border-color: #9ab59a;
  box-shadow: 0 0 0 3px #6d927122;
}

.search-box span {
  font-size: 17px;
}

.search-box input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--ink);
  font-family: inherit;
  font-size: 11px;
}

.table-tools select {
  height: 35px;
  max-width: 155px;
  padding: 0 8px;
  border: 1px solid #dce4d8;
  border-radius: 7px;
  outline: none;
  background: white;
  color: #52675a;
  font-family: inherit;
  font-size: 10px;
}

.table-export {
  height: 35px;
  padding: 0 11px;
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap;
}

thead {
  background: #204b37;
}

th {
  padding: 13px 15px;
  border-bottom: 1px solid #315d46;
  color: #f4e8ca;
  text-align: left;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.8px;
}

td {
  padding: 14px 15px;
  border-bottom: 1px solid #e9eee5;
  color: #52675a;
  font-size: 10px;
  vertical-align: middle;
}

tbody tr:nth-child(even) {
  background: #f8faf5;
}

tbody tr:hover {
  background: #edf5e9;
}

td strong,
td small {
  display: block;
}

td small {
  margin-top: 5px;
  color: #939d93;
  font-size: 9px;
}

.reservation-number {
  color: #96743b;
  font-size: 10px;
}

.guest-name {
  color: #204b37;
  font-weight: 700;
}

.stay-date {
  font-size: 10px;
}

.amount {
  color: #1c6540;
  font-size: 10px;
}

.status-pill {
  display: inline-block;
  padding: 5px 8px;
  border-radius: 20px;
  font-size: 9px;
  font-weight: 800;
  text-transform: capitalize;
}

.tone-success {
  background: #dcefdc;
  color: #27623b;
}

.tone-warning {
  background: #fff0cf;
  color: #94681d;
}

.tone-danger {
  background: #f8e1dc;
  color: #a34f42;
}

.tone-neutral {
  background: #e9ece7;
  color: #5c6a60;
}

.table-footer {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 13px 20px;
  border-top: 1px solid #e8e8dd;
  background: #fbfaf5;
  color: #89968a;
  font-size: 9px;
}

.table-footer b {
  padding: 0 4px;
  color: #c9aa70;
}

.no-results {
  padding: 35px;
  text-align: center;
}

.no-results strong,
.no-results small {
  display: block;
}

.no-results strong {
  margin-top: 8px;
  color: #46634d;
}

.no-results small {
  margin-top: 5px;
}

.reports-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
  padding: 12px 2px 3px;
  border-top: 1px solid #e2e6dc;
  color: #78877b;
  font-size: 8px;
  letter-spacing: 0.3px;
}

.reports-footer span:first-child {
  color: #315c41;
  font-weight: 800;
  letter-spacing: 1px;
}

.reports-footer b {
  color: #c9aa70;
}

.report-error {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  margin-bottom: 15px;
  border: 1px solid #edcfc2;
  border-radius: 10px;
  background: linear-gradient(100deg, #fff1eb, #fffaf6);
  color: #945642;
}

.error-symbol {
  display: grid;
  place-items: center;
  width: 29px;
  height: 29px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #f8e3da;
  font-weight: 800;
}

.error-copy {
  min-width: 0;
}

.error-copy strong {
  font-size: 12px;
}

.error-copy p {
  margin: 4px 0 0;
  font-size: 10px;
  overflow-wrap: anywhere;
}

.report-error .btn {
  margin-left: auto;
}

.report-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 50px;
  border-radius: 12px;
  background: linear-gradient(120deg, #f0f5ed, #fffaf0);
  color: #6d7b70;
  font-size: 12px;
}

.loader {
  width: 18px;
  height: 18px;
  border: 2px solid #dce8d9;
  border-top-color: #245239;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.empty-chart,
.empty-inline {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 7px;
  min-height: 130px;
  color: #929b91;
  text-align: center;
  font-size: 11px;
}

.empty-chart strong {
  color: #526b57;
  font-size: 12px;
}

.empty-chart small {
  font-size: 10px;
}

.empty-icon {
  color: #91a78f;
  font-size: 25px;
}

.empty-inline {
  min-height: 85px;
}

.spin {
  display: inline-block;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1200px) {
  .reports-page {
    padding: 22px 20px;
  }

  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .charts-grid {
    grid-template-columns: minmax(0, 1.35fr) minmax(240px, 1fr);
  }

  .filter-panel {
    align-items: flex-start;
    flex-direction: column;
  }

  .filter-controls {
    width: 100%;
    flex-wrap: wrap;
  }
}

@media (max-width: 850px) {
  .reports-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .heading-actions {
    flex-wrap: wrap;
  }

  .charts-grid,
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .filter-controls input {
    min-width: 125px;
  }

  .table-tools {
    flex-wrap: wrap;
  }

  .search-box {
    flex-basis: 100%;
    max-width: none;
  }

  .table-tools select {
    flex: 1;
    max-width: none;
  }
}

@media (max-width: 520px) {
  .reports-page {
    padding: 16px 11px;
  }

  .reports-heading {
    padding: 23px 17px;
  }

  .reports-heading h1 {
    font-size: 27px;
  }

  .reports-heading p {
    font-size: 11px;
  }

  .header-decoration {
    right: 5px;
    bottom: -55px;
    font-size: 155px;
  }

  .heading-actions {
    width: 100%;
  }

  .heading-actions .btn {
    flex: 1;
    padding: 10px 8px;
    font-size: 10px;
  }

  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
  }

  .metric-card {
    min-height: 145px;
    padding: 13px 11px;
  }

  .metric-value {
    font-size: 21px;
  }

  .metric-caption {
    font-size: 8px;
    letter-spacing: 0.4px;
  }

  .metric-icon {
    width: 29px;
    height: 29px;
  }

  .filter-panel {
    padding: 13px;
  }

  .filter-controls {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 100%;
  }

  .filter-controls label {
    min-width: 0;
  }

  .filter-controls input {
    width: 100%;
    min-width: 0;
  }

  .date-dash {
    display: none;
  }

  .filter-controls .btn {
    width: 100%;
  }

  .panel {
    padding: 14px;
  }

  .panel-heading h2,
  .transactions-heading h2 {
    font-size: 17px;
  }

  .status-content {
    justify-content: flex-start;
    gap: 14px;
  }

  .status-ring {
    width: 120px;
    height: 120px;
  }

  .status-ring::before {
    inset: 13px;
  }

  .transactions-heading {
    align-items: flex-start;
    padding: 15px;
  }

  .table-tools {
    padding: 12px;
  }

  .table-footer,
  .reports-footer {
    flex-direction: column;
  }

  .report-error {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .report-error .btn {
    margin-left: 40px;
  }
}
</style>
