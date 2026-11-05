
<script setup>
import {
  computed,
  ref,
  watch,
  onMounted,
  onBeforeUnmount
} from "vue";

import axios from "axios";

const props = defineProps({
  reservation: {
    type: Object,
    required: true
  },
  demoToken: {
    type: String,
    required: true
  }
});

const API = "http://localhost:4000/api/demo-payment";

const qrAvailable = ref(false);
const payment = ref(null);
const amount = ref(0);
const reservationStatus = ref("pending");

const stage = ref("scan");
const scanned = ref(false);
const loading = ref(false);
const error = ref("");
const notice = ref("");

let refreshTimer = null;

const money = value =>
  Number(value || 0).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP"
  });

const paymentStatus = computed(() =>
  payment.value?.status || "not_submitted"
);

const isPending = computed(() =>
  paymentStatus.value === "demo_pending"
);

const isPaid = computed(() =>
  paymentStatus.value === "demo_paid"
);

const canSimulate = computed(() =>
  qrAvailable.value &&
  scanned.value &&
  stage.value === "confirm" &&
  !loading.value &&
  !isPending.value &&
  !isPaid.value &&
  reservationStatus.value === "pending"
);

const headers = () => ({
  "x-demo-payment-token": props.demoToken
});

// Load QR configuration and PostgreSQL status.
async function refresh(showError = true) {
  if (!props.reservation?.id || !props.demoToken) {
    return;
  }

  try {
    const [config, status] = await Promise.all([
      axios.get(`${API}/gcash-qr-info`),

      axios.get(
        `${API}/status/${props.reservation.id}`,
        { headers: headers() }
      )
    ]);

    qrAvailable.value = !!config.data.available;
    payment.value = status.data.demo_payment || null;
    amount.value = Number(status.data.amount || 0);
    reservationStatus.value =
      status.data.reservation_status || "pending";

    if (showError) error.value = "";

  } catch (err) {
    if (showError) {
      error.value =
        err.response?.data?.message ||
        "Unable to load payment status.";
    }
  }
}

// Customer confirms scanning for demonstration.
function continueAfterScan() {
  if (!qrAvailable.value || isPending.value || isPaid.value) {
    return;
  }

  // Self-confirmation only, not actual GCash scan detection.
  scanned.value = true;
  stage.value = "confirm";
}

// Save demo transaction to PostgreSQL.
async function simulatePayment() {
  if (!canSimulate.value) return;

  loading.value = true;
  error.value = "";
  notice.value = "";

  try {
    const { data } = await axios.post(
      `${API}/simulate`,
      {
        reservation_id: props.reservation.id
      },
      {
        headers: headers()
      }
    );

    notice.value = data.message ||
      "Demo payment submitted for approval.";

    await refresh();

  } catch (err) {
    error.value =
      err.response?.data?.message ||
      "Unable to simulate payment.";

  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.reservation?.id, props.demoToken],
  () => {
    payment.value = null;
    scanned.value = false;
    stage.value = "scan";
    notice.value = "";
    refresh();
  },
  { immediate: true }
);

onMounted(() => {
  // Refresh every five seconds to show admin approval.
  refreshTimer = setInterval(() => refresh(false), 5000);
});

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});
</script>

<template>
  <section class="demo-checkout">

    <header class="checkout-heading">
      <p class="eyebrow">
        VERDE HAVEN · GCASH DEMO CHECKOUT
      </p>

      <h2>GCash Demo Payment</h2>

      <p>
        Scan the admin's real GCash QR,
        then simulate the payment on this website.
      </p>
    </header>

    <div class="checkout-grid">

      <!-- QR PAYMENT -->
      <div class="payment-card">
        <div class="card-heading">
          <strong>Admin's GCash QR</strong>
          <span class="demo-tag">
            DEMO MODE
          </span>
        </div>

        <div v-if="qrAvailable" class="qr-area">
          <img
            :src="`${API}/gcash-qr`"
            alt="Admin's original GCash QR code"
          />
        </div>

        <div v-else class="qr-missing">
          Admin GCash QR not yet configured.
          Place the original PNG file in
          <strong>
            backend/demo-payment-assets/gcash.png
          </strong>
        </div>

        <div class="warning">
          <strong>Important:</strong>
          This is a real GCash QR. You may scan it
          in GCash to demonstrate the recipient account,
          but do not tap Pay, Send, or Confirm inside GCash.
          No actual payment is required.
        </div>

        <!-- FIRST STEP -->
        <div
          v-if="!isPending && !isPaid && stage === 'scan'"
          class="payment-step"
        >
          <span class="step-number">1</span>

          <div class="step-content">
            <h3>Scan the QR</h3>

            <p>
              Open the GCash app, scan the QR,
              and return to this website without
              sending real money.
            </p>

            <button
              type="button"
              class="primary-button"
              :disabled="!qrAvailable"
              @click="continueAfterScan"
            >
              I've Scanned — Continue Demo
            </button>
          </div>
        </div>

        <!-- SECOND STEP -->
        <div
          v-if="!isPending && !isPaid && stage === 'confirm'"
          class="payment-step"
        >
          <span class="step-number">2</span>

          <div class="step-content">
            <h3>Simulate Payment</h3>

            <p>
              The scan was confirmed by you, not
              automatically verified by GCash.
              Clicking this button creates a demo record.
            </p>

            <button
              type="button"
              class="primary-button"
              :disabled="!canSimulate"
              @click="simulatePayment"
            >
              {{
                loading
                  ? "Processing Demo..."
                  : "Pay (Demo) — ₱0 Sent"
              }}
            </button>

            <button
              type="button"
              class="secondary-button"
              :disabled="loading"
              @click="stage = 'scan'; scanned = false"
            >
              Back to QR
            </button>
          </div>
        </div>

        <!-- WAITING -->
        <div v-if="isPending" class="feedback pending">
          <strong>Demo Payment Submitted!</strong>

          <p>
            Waiting for admin approval.
            No real money has been transferred.
          </p>
        </div>

        <!-- APPROVED -->
        <div v-if="isPaid" class="feedback approved">
          <strong>Demo Payment Approved!</strong>

          <p>
            Your reservation is confirmed in the demo
            system. Actual money transferred: ₱0.00.
          </p>
        </div>

        <!-- REJECTED -->
        <div
          v-if="paymentStatus === 'demo_rejected'"
          class="feedback pending"
        >
          <strong>Demo Payment Rejected</strong>

          <p>
            You can repeat the demonstration.
          </p>
        </div>
      </div>

      <!-- SUMMARY -->
      <aside class="summary-card">
        <p class="eyebrow">
          RESERVATION SUMMARY
        </p>

        <h3>
          Reservation #{{ reservation.id }}
        </h3>

        <p>
          Room {{
            reservation.room_number ||
            reservation.room_id
          }}
        </p>

        <div class="summary-line">
          <span>Check-in</span>

          <strong>
            {{ String(reservation.check_in || "").slice(0, 10) }}
          </strong>
        </div>

        <div class="summary-line">
          <span>Check-out</span>

          <strong>
            {{ String(reservation.check_out || "").slice(0, 10) }}
          </strong>
        </div>

        <div class="summary-line">
          <span>Total amount</span>

          <strong>
            {{ money(amount || reservation.total_amount) }}
          </strong>
        </div>

        <div class="summary-line">
          <span>Demo payment status</span>

          <strong>
            {{
              paymentStatus
                .replaceAll("_", " ")
                .toUpperCase()
            }}
          </strong>
        </div>

        <div class="summary-line">
          <span>Actual money sent</span>
          <strong>₱0.00</strong>
        </div>

        <div
          v-if="payment?.demo_reference"
          class="reference-box"
        >
          <small>DEMO REFERENCE</small>

          <strong>
            {{ payment.demo_reference }}
          </strong>
        </div>

        <button
          type="button"
          class="refresh-button"
          @click="refresh()"
        >
          Refresh Payment Status
        </button>

        <p class="disclaimer">
          This is a simulated payment, not an
          actual GCash transaction.
        </p>
      </aside>
    </div>

    <p v-if="error" class="error-box">
      {{ error }}
    </p>

    <p v-if="notice" class="notice-box">
      {{ notice }}
    </p>
  </section>
</template>

<style scoped>
.demo-checkout {
  width: 100%;
  max-width: 1100px;
  margin: auto;
  padding: 24px;
  background: #f7f5ef;
  color: #173e2d;
  border-radius: 14px;
  font-family: "DM Sans", Arial, sans-serif;
}

.demo-checkout * {
  box-sizing: border-box;
}

.checkout-heading {
  padding-right: 35px;
}

.eyebrow {
  color: #a48752;
  letter-spacing: 1.5px;
  font-size: 10px;
  font-weight: 800;
}

.checkout-heading h2 {
  margin: 8px 0;
  color: #184631;
  font-family: Georgia, serif;
  font-size: 29px;
}

.checkout-heading > p:last-child {
  color: #748174;
  font-size: 12px;
  line-height: 1.6;
}

.checkout-grid {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 16px;
  margin-top: 19px;
}

.payment-card,
.summary-card {
  min-width: 0;
  padding: 20px;
  background: #fffdf8;
  border: 1px solid #e7e1d5;
  border-radius: 12px;
}

.card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.card-heading strong {
  font-size: 14px;
}

.demo-tag {
  color: #80652f;
  background: #fff1d6;
  padding: 6px 8px;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 800;
}

.qr-area {
  display: flex;
  justify-content: center;
  padding: 18px 0;
}

.qr-area img {
  display: block;
  width: 265px;
  max-width: 100%;
  height: auto;
  object-fit: contain;
  border: 1px solid #ece8df;
  border-radius: 8px;
}

.qr-missing {
  padding: 24px;
  margin: 15px 0;
  background: #fff5df;
  border: 1px dashed #d5b876;
  border-radius: 8px;
  color: #89672b;
  font-size: 12px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.warning {
  padding: 13px;
  border-radius: 8px;
  background: #fff4df;
  color: #725b2b;
  font-size: 12px;
  line-height: 1.6;
}

.payment-step {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  margin-top: 20px;
}

.step-number {
  flex: 0 0 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #174b36;
  color: white;
  font-weight: 800;
}

.step-content {
  flex: 1;
  min-width: 0;
}

.step-content h3 {
  margin: 0 0 8px;
  font-family: Georgia, serif;
  font-size: 18px;
}

.step-content p {
  color: #718071;
  font-size: 12px;
  line-height: 1.6;
}

button {
  border: none;
  border-radius: 8px;
  padding: 12px;
  font-weight: 800;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.primary-button {
  width: 100%;
  margin-top: 10px;
  color: white;
  background: #184b35;
}

.secondary-button,
.refresh-button {
  width: 100%;
  margin-top: 9px;
  color: #184b35;
  background: #e9f0e4;
}

.summary-card h3 {
  font-family: Georgia, serif;
  margin: 10px 0;
  font-size: 22px;
}

.summary-card > p {
  color: #7c8879;
  font-size: 12px;
}

.summary-line {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid #edeae2;
  font-size: 12px;
}

.summary-line strong {
  text-align: right;
}

.reference-box {
  padding: 12px;
  margin: 15px 0;
  border: 1px solid #e8d6a8;
  border-radius: 7px;
  overflow-wrap: anywhere;
}

.reference-box small {
  color: #a07c42;
  font-size: 9px;
}

.reference-box strong {
  display: block;
  margin-top: 5px;
  font-size: 12px;
}

.disclaimer {
  line-height: 1.7;
}

.feedback,
.error-box,
.notice-box {
  padding: 13px;
  margin-top: 12px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.6;
}

.feedback p {
  margin: 7px 0 0;
}

.pending {
  background: #fff2da;
  color: #84632c;
}

.approved,
.notice-box {
  background: #e3f1e1;
  color: #2d683b;
}

.error-box {
  background: #fce8e1;
  color: #a23d2e;
}

@media (max-width: 720px) {
  .demo-checkout {
    padding: 14px;
  }

  .checkout-grid {
    grid-template-columns: 1fr;
  }

  .card-heading {
    flex-wrap: wrap;
  }
}
</style>
