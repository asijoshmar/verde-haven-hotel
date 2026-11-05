
<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";

const API = "http://localhost:4000/api/demo-payment";

const adminKey = ref(
  sessionStorage.getItem("verde_layout_admin_key") || ""
);

const records = ref([]);
const loading = ref(false);
const error = ref("");
const message = ref("");

const headers = () => ({
  "x-layout-key": adminKey.value
});

const money = value =>
  Number(value || 0).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP"
  });

async function loadPayments() {
  if (!adminKey.value.trim()) {
    error.value = "Enter the admin layout key.";
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    const { data } = await axios.get(
      `${API}/admin/list`,
      { headers: headers() }
    );

    records.value = data;

    sessionStorage.setItem(
      "verde_layout_admin_key",
      adminKey.value
    );

  } catch (err) {
    error.value =
      err.response?.data?.message ||
      "Unable to load demo payments.";

  } finally {
    loading.value = false;
  }
}

async function reviewPayment(item, decision) {
  if (loading.value) return;

  const question = decision === "approve"
    ? "Approve this SIMULATED payment and confirm booking?"
    : "Reject this simulated payment?";

  if (!window.confirm(question)) return;

  loading.value = true;
  error.value = "";
  message.value = "";

  try {
    const { data } = await axios.post(
      `${API}/admin/review/${item.id}`,
      { decision },
      { headers: headers() }
    );

    message.value = data.message;
    await loadPayments();

  } catch (err) {
    error.value =
      err.response?.data?.message ||
      "Unable to review payment.";

  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (adminKey.value) loadPayments();
});
</script>

<template>
  <section class="admin-demo">

    <p class="eyebrow">
      VERDE HAVEN · MANAGEMENT
    </p>

    <h2>GCash Demo Payments</h2>

    <p class="subtitle">
      Manage simulated GCash payments.
      These records are not actual transactions
      or real hotel revenue.
    </p>

    <div class="admin-toolbar">
      <input
        v-model="adminKey"
        type="password"
        placeholder="Admin Layout Key"
      />

      <button @click="loadPayments">
        {{
          loading
            ? "Loading..."
            : "Refresh Payments"
        }}
      </button>
    </div>

    <p v-if="error" class="error">
      {{ error }}
    </p>

    <p v-if="message" class="success">
      {{ message }}
    </p>

    <p
      v-if="!records.length && !loading && !error"
      class="empty"
    >
      No simulated payments submitted yet.
    </p>

    <div class="payment-list">

      <article
        v-for="item in records"
        :key="item.id"
        class="payment-item"
      >
        <div class="payment-heading">
          <div>
            <h3>
              {{ item.guest_name }}
            </h3>

            <small>
              Reservation #{{ item.reservation_id }}
              · Room {{ item.room_number }}
            </small>
          </div>

          <span class="status">
            {{
              item.status
                .replaceAll("_", " ")
                .toUpperCase()
            }}
          </span>
        </div>

        <div class="detail">
          <span>Payment Method</span>
          <strong>GCash Demo</strong>
        </div>

        <div class="detail">
          <span>Amount</span>
          <strong>{{ money(item.amount) }}</strong>
        </div>

        <div class="detail">
          <span>Demo Reference</span>
          <strong class="reference">
            {{ item.demo_reference }}
          </strong>
        </div>

        <div class="detail">
          <span>Reservation Status</span>
          <strong>
            {{ item.reservation_status }}
          </strong>
        </div>

        <div
          v-if="item.status === 'demo_pending'"
          class="actions"
        >
          <button
            class="approve"
            :disabled="loading"
            @click="reviewPayment(item, 'approve')"
          >
            Approve Demo Payment
          </button>

          <button
            class="reject"
            :disabled="loading"
            @click="reviewPayment(item, 'reject')"
          >
            Reject
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.admin-demo {
  min-height: 100%;
  padding: 26px;
  background: #f7f5ef;
  color: #193e30;
  font-family: Arial, sans-serif;
}

.eyebrow {
  font-size: 10px;
  color: #a68b59;
  letter-spacing: 2px;
  font-weight: 800;
}

h2,
h3 {
  font-family: Georgia, serif;
}

h2 {
  margin: 8px 0;
  font-size: 30px;
}

.subtitle {
  color: #778478;
  line-height: 1.7;
  font-size: 13px;
}

.admin-toolbar {
  display: flex;
  gap: 10px;
  margin: 20px 0;
}

.admin-toolbar input {
  flex: 1;
  min-width: 0;
  padding: 12px;
  border: 1px solid #d8d8ca;
  border-radius: 8px;
}

button {
  border: 0;
  padding: 12px 15px;
  border-radius: 8px;
  background: #174630;
  color: white;
  font-weight: 800;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.payment-list {
  display: grid;
  gap: 14px;
}

.payment-item {
  background: white;
  border: 1px solid #e7e2d8;
  border-radius: 12px;
  padding: 20px;
}

.payment-heading {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 15px;
}

.payment-heading h3 {
  margin: 0 0 6px;
}

.payment-heading small {
  color: #809083;
  font-size: 11px;
}

.status {
  align-self: start;
  background: #fff2d8;
  color: #85622c;
  padding: 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 800;
}

.detail {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid #edeae2;
  font-size: 12px;
}

.detail strong {
  text-align: right;
}

.reference {
  overflow-wrap: anywhere;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 15px;
}

.reject {
  color: #993e30;
  background: #fbe9e2;
}

.error,
.success,
.empty {
  padding: 12px;
  border-radius: 8px;
  font-size: 12px;
}

.error {
  background: #fce8e2;
  color: #943c2f;
}

.success {
  background: #e2f1e3;
  color: #28673e;
}

.empty {
  color: #768276;
}

@media (max-width: 540px) {
  .admin-toolbar,
  .payment-heading {
    flex-direction: column;
  }
}
</style>
