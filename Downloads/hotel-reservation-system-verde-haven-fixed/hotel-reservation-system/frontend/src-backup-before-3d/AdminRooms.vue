<script setup>
import { computed, onMounted, ref } from "vue";
import axios from "axios";

const rooms = ref([]);
const loading = ref(true);
const error = ref("");
const searchQuery = ref("");
const selectedType = ref("all");
const selectedStatus = ref("all");

const roomImages = [
  "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=85"
];

const fetchRooms = async () => {
  try {
    loading.value = true;
    error.value = "";

    const response = await axios.get(
      "http://localhost:4000/api/rooms"
    );

    rooms.value = Array.isArray(response.data)
      ? response.data
      : [];
  } catch (err) {
    console.error("Rooms error:", err);
    error.value =
      err.response?.data?.message ||
      "Failed to load rooms. Please check your connection.";
  } finally {
    loading.value = false;
  }
};

const formatAmount = (amount) =>
  Number(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const getRoomImage = (room, index) => {
  const type = String(room.room_type || "").toLowerCase();

  if (type.includes("deluxe")) {
    const deluxeRooms = rooms.value.filter((r) =>
      String(r.room_type || "").toLowerCase().includes("deluxe")
    );
    const position = deluxeRooms.findIndex((r) => r.id === room.id);
    return roomImages[Math.max(0, position) % 2];
  }

  if (type.includes("standard")) {
    const standardRooms = rooms.value.filter((r) =>
      String(r.room_type || "").toLowerCase().includes("standard")
    );
    const position = standardRooms.findIndex((r) => r.id === room.id);
    return roomImages[2 + (Math.max(0, position) % 2)];
  }

  if (type.includes("family")) {
    const familyRooms = rooms.value.filter((r) =>
      String(r.room_type || "").toLowerCase().includes("family")
    );
    const position = familyRooms.findIndex((r) => r.id === room.id);
    return roomImages[4 + (Math.max(0, position) % 2)];
  }

  if (type.includes("suite")) {
    return roomImages[5];
  }

  return roomImages[index % roomImages.length];
};

const getStatus = (status) => {
  const value = String(status || "").toLowerCase();

  if (value === "available") return "available";
  if (value === "occupied" || value === "booked") return "occupied";
  if (value === "maintenance") return "maintenance";
  if (value === "unavailable") return "unavailable";

  return "other";
};

const filteredRooms = computed(() => {
  return rooms.value.filter((room) => {
    const query = searchQuery.value.trim().toLowerCase();

    const matchesSearch =
      !query ||
      String(room.room_number || "").toLowerCase().includes(query) ||
      String(room.room_type || "").toLowerCase().includes(query) ||
      String(room.status || "").toLowerCase().includes(query);

    const matchesType =
      selectedType.value === "all" ||
      String(room.room_type || "").toLowerCase() ===
        selectedType.value.toLowerCase();

    const matchesStatus =
      selectedStatus.value === "all" ||
      getStatus(room.status) === selectedStatus.value;

    return matchesSearch && matchesType && matchesStatus;
  });
});

const roomTypes = computed(() => {
  return [
    ...new Set(
      rooms.value
        .map((room) => room.room_type)
        .filter(Boolean)
    )
  ];
});

const availableCount = computed(
  () =>
    rooms.value.filter(
      (room) => getStatus(room.status) === "available"
    ).length
);

const occupiedCount = computed(
  () =>
    rooms.value.filter(
      (room) => getStatus(room.status) === "occupied"
    ).length
);

const occupancyRate = computed(() => {
  if (!rooms.value.length) return 0;
  return Math.round((occupiedCount.value / rooms.value.length) * 100);
});

onMounted(fetchRooms);
</script>

<template>
  <div class="rooms-page">
    <!-- Page heading -->
    <section class="page-heading">
      <div>
        <div class="breadcrumb">
          <span>HotelStay</span>
          <span class="slash">/</span>
          <strong>Rooms</strong>
        </div>

        <h1>Rooms</h1>
        <p>Manage hotel rooms and availability.</p>
      </div>

      <div class="heading-tagline">
        <h2>Comfort in Every Stay</h2>
        <p>PREMIUM ROOMS · MODERN AMENITIES · UNFORGETTABLE EXPERIENCE</p>
      </div>
    </section>

    <!-- Hotel banner -->
    <section class="hotel-banner">
      <div class="banner-copy">
        <span class="banner-eyebrow">WELCOME TO VERDE HAVEN</span>
        <h2>Comfort in Every Stay</h2>
        <p>Discover your perfect room for a relaxing getaway.</p>
        <div class="banner-rule"></div>
      </div>
    </section>

    <!-- Room statistics -->
    <section class="room-stats">
      <article class="summary-card">
        <div class="summary-icon green-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M3 20V9l9-6 9 6v11M2 20h20M6 20v-7h12v7M9 13v3m6-3v3"
              stroke="currentColor" stroke-width="1.8"
              stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="summary-info">
          <span>Total Rooms</span>
          <strong>{{ rooms.length }}</strong>
          <small>All registered rooms</small>
        </div>
        <span class="summary-watermark">✦</span>
      </article>

      <article class="summary-card">
        <div class="summary-icon available-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="m5 12 4 4L19 6"
              stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="summary-info">
          <span>Available</span>
          <strong>{{ availableCount }}</strong>
          <small>Ready for booking</small>
        </div>
        <span class="summary-watermark">✦</span>
      </article>

      <article class="summary-card">
        <div class="summary-icon occupied-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 14h18M5 9V6h5v3M14 9V6h5v3M3 18v2m18-2v2"
              stroke="currentColor" stroke-width="1.7"
              stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="summary-info">
          <span>Occupied</span>
          <strong>{{ occupiedCount }}</strong>
          <small>Currently booked</small>
        </div>
        <span class="summary-watermark">✦</span>
      </article>

      <article class="summary-card">
        <div class="summary-icon gold-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M19 5 5 19M7 7h.01M17 17h.01"
              stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round"/>
            <circle cx="7" cy="7" r="3" stroke="currentColor" stroke-width="1.7"/>
            <circle cx="17" cy="17" r="3" stroke="currentColor" stroke-width="1.7"/>
          </svg>
        </div>
        <div class="summary-info">
          <span>Occupancy Rate</span>
          <strong>{{ occupancyRate }}%</strong>
          <small>{{ occupiedCount }} of {{ rooms.length }} rooms</small>
        </div>
        <span class="summary-watermark">✦</span>
      </article>
    </section>

    <!-- Search and filters -->
    <section class="room-toolbar">
      <label class="search-box">
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="10.8" cy="10.8" r="6.8"
            stroke="currentColor" stroke-width="1.8"/>
          <path d="m16 16 4.5 4.5"
            stroke="currentColor" stroke-width="1.8"
            stroke-linecap="round"/>
        </svg>
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search room type, number, or status..."
        />
      </label>

      <label class="filter-box">
        <select v-model="selectedType">
          <option value="all">All Room Types</option>
          <option
            v-for="type in roomTypes"
            :key="type"
            :value="type.toLowerCase()"
          >
            {{ type }}
          </option>
        </select>
      </label>

      <label class="filter-box">
        <select v-model="selectedStatus">
          <option value="all">All Status</option>
          <option value="available">Available</option>
          <option value="occupied">Occupied</option>
          <option value="maintenance">Maintenance</option>
          <option value="unavailable">Unavailable</option>
        </select>
      </label>

      <button class="refresh-button" @click="fetchRooms">
        <span>↻</span> Refresh
      </button>
    </section>

    <!-- Loading -->
    <div v-if="loading" class="message-card">
      <div class="loading-spinner"></div>
      <p>Preparing your room collection...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="message-card error-message">
      <div class="message-symbol">!</div>
      <h3>Unable to load rooms</h3>
      <p>{{ error }}</p>
      <button class="retry-button" @click="fetchRooms">Try Again</button>
    </div>

    <!-- Empty -->
    <div
      v-else-if="filteredRooms.length === 0"
      class="message-card"
    >
      <div class="message-symbol">⌕</div>
      <h3>No rooms found</h3>
      <p>Try changing your search or filter.</p>
    </div>

    <!-- Room cards -->
    <section v-else class="rooms-grid">
      <article
        v-for="(room, index) in filteredRooms"
        :key="room.id"
        class="room-card"
      >
        <div class="room-photo">
          <img
            :src="getRoomImage(room, index)"
            :alt="`${room.room_type} room`"
            loading="lazy"
          />

          <div class="photo-shade"></div>

          <span
            class="room-status"
            :class="getStatus(room.status)"
          >
            <span class="status-dot"></span>
            {{ room.status || "Unknown" }}
          </span>

          <span class="photo-room-number">
            ROOM {{ room.room_number }}
          </span>
        </div>

        <div class="room-card-body">
          <div class="room-title-row">
            <div>
              <span class="room-kicker">VERDE HAVEN COLLECTION</span>
              <h3>{{ room.room_type || "Guest Room" }}</h3>
            </div>

            <div class="room-number-badge">
              {{ room.room_number }}
            </div>
          </div>

          <p class="room-description">
            {{ room.description || "A comfortable space designed for a relaxing and memorable stay." }}
          </p>

          <div class="room-features">
            <div class="feature-item">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 14h18M5 9V6h5v3M14 9V6h5v3M3 18v2m18-2v2"
                  stroke="currentColor" stroke-width="1.7"
                  stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>{{ room.capacity || 2 }} Guests</span>
            </div>

            <div class="feature-item">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9"
                  stroke="currentColor" stroke-width="1.7"/>
                <path d="M12 7v5l3.5 2"
                  stroke="currentColor" stroke-width="1.7"
                  stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Per Night</span>
            </div>
          </div>

          <div class="room-card-footer">
            <div class="room-price">
              <strong>₱{{ formatAmount(room.price_per_night) }}</strong>
              <span>/ night</span>
            </div>

            <div class="view-details">
              Room Details <span>↗</span>
            </div>
          </div>
        </div>
      </article>
    </section>

    <footer class="rooms-footer">
      <span></span>
      <small>VERDE HAVEN BOUTIQUE HOTEL</small>
      <span class="footer-leaf">✧</span>
      <small>EXCEPTIONAL STAYS, ALWAYS</small>
      <span></span>
    </footer>
  </div>
</template>

<style scoped>
.rooms-page {
  --forest: #10382d;
  --forest-light: #245641;
  --gold: #c9a969;
  --cream: #f7f5ed;
  --ink: #183c30;
  --muted: #778278;
  --line: #e5dfd1;

  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  padding: 25px 32px 22px;
  color: var(--ink);
  font-family: "DM Sans", Inter, "Segoe UI", sans-serif;
}

/* PAGE HEADING */

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 21px;
}

.breadcrumb {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 7px;
  color: #7d887d;
  font-size: 11px;
}

.breadcrumb .slash {
  color: #c4bda9;
}

.breadcrumb strong {
  color: var(--forest);
}

.page-heading h1 {
  margin: 0;
  color: #123b2e;
  font-family: "Playfair Display", Georgia, serif;
  font-size: clamp(29px, 3vw, 38px);
  font-weight: 600;
  letter-spacing: -.6px;
}

.page-heading > div:first-child > p {
  margin: 5px 0 0;
  color: #788278;
  font-size: 12px;
}

.heading-tagline {
  text-align: right;
}

.heading-tagline h2 {
  margin: 0 0 7px;
  color: #234c3a;
  font-family: "Playfair Display", Georgia, serif;
  font-size: clamp(18px, 2vw, 27px);
  font-style: italic;
  font-weight: 500;
}

.heading-tagline p {
  margin: 0;
  color: #7d897d;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1px;
}

/* HOTEL BANNER */

.hotel-banner {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 180px;
  overflow: hidden;
  padding: 28px 35px;
  margin-bottom: 20px;
  isolation: isolate;
  background:
    linear-gradient(
      90deg,
      rgba(9, 43, 33, .97) 0%,
      rgba(12, 47, 36, .89) 40%,
      rgba(12, 43, 33, .2) 100%
    ),
    url("https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1800&q=90")
      center 52% / cover no-repeat;
  border: 1px solid #c6a66975;
  border-radius: 13px;
  box-shadow: 0 8px 24px rgba(22, 52, 37, .09);
}

.hotel-banner::after {
  content: "";
  position: absolute;
  z-index: -1;
  top: -80px;
  right: 60px;
  width: 260px;
  height: 260px;
  border: 1px solid rgba(226, 202, 151, .22);
  border-radius: 50%;
  box-shadow:
    0 0 0 24px rgba(226, 202, 151, .05),
    0 0 0 48px rgba(226, 202, 151, .035);
}

.banner-copy {
  max-width: 580px;
}

.banner-eyebrow {
  display: block;
  margin-bottom: 10px;
  color: #dfc48b;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2.3px;
}

.banner-copy h2 {
  margin: 0;
  color: #fff9e9;
  font-family: "Playfair Display", Georgia, serif;
  font-size: clamp(25px, 3vw, 36px);
  font-style: italic;
  font-weight: 500;
  line-height: 1.2;
}

.banner-copy p {
  margin: 10px 0 0;
  color: #e1e8de;
  font-size: 12px;
}

.banner-rule {
  width: 65px;
  height: 2px;
  margin-top: 17px;
  background: var(--gold);
}

/* SUMMARY CARDS */

.room-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}

.summary-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 0;
  min-height: 103px;
  overflow: hidden;
  padding: 17px;
  background:
    linear-gradient(135deg, #fffef9 0%, #faf8f0 100%);
  border: 1px solid var(--line);
  border-radius: 11px;
  box-shadow: 0 4px 14px rgba(39, 54, 40, .035);
}

.summary-icon {
  z-index: 1;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 50%;
}

.summary-icon svg {
  width: 24px;
  height: 24px;
}

.green-icon {
  color: white;
  background: #42795b;
}

.available-icon {
  color: white;
  background: #4d8966;
}

.occupied-icon {
  color: white;
  background: #d85c59;
}

.gold-icon {
  color: white;
  background: #c7a35f;
}

.summary-info {
  z-index: 1;
  min-width: 0;
}

.summary-info > span {
  display: block;
  margin-bottom: 4px;
  color: #52685a;
  font-size: 11px;
}

.summary-info strong {
  display: block;
  color: #143e30;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 27px;
  line-height: 1.1;
}

.summary-info small {
  display: block;
  margin-top: 5px;
  color: #899187;
  font-size: 9px;
}

.summary-watermark {
  position: absolute;
  right: 9px;
  bottom: -15px;
  color: #d5d7c4;
  font-size: 65px;
  opacity: .23;
}

/* SEARCH TOOLBAR */

.room-toolbar {
  display: grid;
  grid-template-columns: minmax(200px, 1.7fr) minmax(135px, .9fr) minmax(130px, .9fr) auto;
  gap: 12px;
  margin-bottom: 20px;
}

.search-box,
.filter-box {
  display: flex;
  align-items: center;
  min-width: 0;
  height: 43px;
  padding: 0 12px;
  background: #fffef9;
  border: 1px solid #deded1;
  border-radius: 8px;
}

.search-box {
  gap: 9px;
}

.search-box svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: #7e897e;
}

.search-box input,
.filter-box select {
  width: 100%;
  min-width: 0;
  color: #42594a;
  background: transparent;
  border: 0;
  outline: none;
  font: inherit;
  font-size: 10px;
}

.search-box input::placeholder {
  color: #8a9187;
}

.filter-box select {
  cursor: pointer;
}

.refresh-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 43px;
  padding: 0 17px;
  color: #fffdf5;
  background: #24563f;
  border: 1px solid #24563f;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background .2s, transform .2s;
}

.refresh-button:hover {
  background: #143d2e;
  transform: translateY(-1px);
}

.refresh-button span {
  font-size: 17px;
}

/* ROOM IMAGE CARDS */

.rooms-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: stretch;
  gap: 17px;
}

.room-card {
  min-width: 0;
  overflow: hidden;
  background: #fffef9;
  border: 1px solid #e2ddcf;
  border-radius: 11px;
  box-shadow: 0 4px 15px rgba(35, 51, 38, .045);
  transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
}

.room-card:hover {
  transform: translateY(-4px);
  border-color: #c7aa72;
  box-shadow: 0 12px 25px rgba(28, 57, 39, .12);
}

.room-photo {
  position: relative;
  height: 190px;
  overflow: hidden;
  margin: 5px 5px 0;
  background: #e7e4d9;
  border-radius: 7px;
}

.room-photo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: transform .5s ease;
}

.room-card:hover .room-photo img {
  transform: scale(1.045);
}

.photo-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(5, 25, 17, .2),
    transparent 35%,
    transparent 70%,
    rgba(5, 25, 17, .24)
  );
  pointer-events: none;
}

.room-status {
  position: absolute;
  top: 10px;
  right: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 11px;
  color: #fff;
  background: #43855d;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 700;
  text-transform: capitalize;
  box-shadow: 0 3px 9px #00000015;
}

.status-dot {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  background: currentColor;
  border-radius: 50%;
}

.room-status.occupied {
  background: #d95753;
}

.room-status.maintenance,
.room-status.unavailable {
  color: #4e3816;
  background: #f0d28d;
}

.room-status.other {
  background: #718078;
}

.photo-room-number {
  position: absolute;
  bottom: 10px;
  left: 11px;
  color: white;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.4px;
  text-shadow: 0 1px 5px #000;
}

.room-card-body {
  padding: 15px 15px 13px;
}

.room-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
}

.room-kicker {
  display: block;
  margin-bottom: 5px;
  color: #9b895f;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 1px;
}

.room-title-row h3 {
  margin: 0;
  color: #153d30;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 19px;
  font-weight: 600;
  line-height: 1.25;
}

.room-number-badge {
  display: grid;
  place-items: center;
  min-width: 35px;
  height: 32px;
  padding: 0 8px;
  color: #2a6247;
  background: #e8eee3;
  border-radius: 7px;
  font-size: 11px;
  font-weight: 700;
}

.room-description {
  display: -webkit-box;
  min-height: 34px;
  overflow: hidden;
  margin: 8px 0 13px;
  color: #7b857b;
  font-size: 10px;
  line-height: 1.65;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.room-features {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding-bottom: 13px;
  border-bottom: 1px solid #eae6da;
}

.feature-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #627368;
  font-size: 9px;
}

.feature-item svg {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
  color: #315d46;
}

.room-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 13px;
}

.room-price {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px;
}

.room-price strong {
  color: #153e30;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 19px;
  font-weight: 700;
}

.room-price span {
  color: #7b857a;
  font-size: 10px;
}

.view-details {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  padding: 9px 11px;
  color: #fffdf5;
  background: #214c38;
  border-radius: 7px;
  font-size: 9px;
  font-weight: 600;
}

.view-details span {
  font-size: 14px;
}

/* EMPTY, LOADING AND ERROR */

.message-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  padding: 30px;
  color: #748176;
  background: #fffef9;
  border: 1px solid var(--line);
  border-radius: 12px;
  text-align: center;
}

.message-card h3 {
  margin: 12px 0 4px;
  color: var(--forest);
  font-family: "Playfair Display", Georgia, serif;
  font-size: 21px;
}

.message-card p {
  margin: 5px 0;
  font-size: 12px;
}

.message-symbol {
  display: grid;
  place-items: center;
  width: 43px;
  height: 43px;
  color: #315c44;
  background: #e6ecdf;
  border-radius: 50%;
  font-size: 24px;
}

.loading-spinner {
  width: 33px;
  height: 33px;
  border: 3px solid #e3e8dc;
  border-top-color: #2e6649;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  color: #a74d47;
}

.retry-button {
  margin-top: 12px;
  padding: 10px 16px;
  color: white;
  background: #24563f;
  border: 0;
  border-radius: 7px;
  cursor: pointer;
}

/* FOOTER */

.rooms-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 13px;
  margin: 29px auto 0;
  color: #7d887a;
}

.rooms-footer > span:first-child,
.rooms-footer > span:last-child {
  width: 65px;
  height: 1px;
  background: #d9d2bf;
}

.rooms-footer small {
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 1.4px;
  text-align: center;
}

.footer-leaf {
  color: #315d43;
  font-size: 19px;
}

/* RESPONSIVE */

@media (min-width: 1500px) {
  .room-photo {
    height: 220px;
  }

  .room-card-body {
    padding: 17px;
  }
}

@media (max-width: 1100px) {
  .rooms-page {
    padding: 23px 20px;
  }

  .room-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .rooms-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .room-toolbar {
    grid-template-columns: minmax(180px, 1fr) 1fr 1fr;
  }

  .refresh-button {
    grid-column: 1 / -1;
  }

  .room-photo {
    height: 200px;
  }
}

@media (max-width: 650px) {
  .rooms-page {
    padding: 19px 13px 22px;
  }

  .page-heading {
    align-items: flex-start;
  }

  .heading-tagline {
    display: none;
  }

  .hotel-banner {
    min-height: 155px;
    padding: 23px 19px;
    background-position: center;
  }

  .banner-copy h2 {
    font-size: 26px;
  }

  .banner-copy p {
    max-width: 245px;
    font-size: 10px;
    line-height: 1.6;
  }

  .room-stats {
    gap: 9px;
  }

  .summary-card {
    min-height: 90px;
    gap: 9px;
    padding: 11px;
  }

  .summary-icon {
    width: 36px;
    height: 36px;
  }

  .summary-icon svg {
    width: 19px;
    height: 19px;
  }

  .summary-info > span {
    font-size: 10px;
  }

  .summary-info strong {
    font-size: 23px;
  }

  .summary-info small {
    font-size: 8px;
  }

  .room-toolbar {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .search-box {
    grid-column: 1 / -1;
  }

  .refresh-button {
    grid-column: 1 / -1;
  }

  .rooms-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .room-photo {
    height: 220px;
  }

  .room-title-row h3 {
    font-size: 20px;
  }

  .room-description {
    min-height: 0;
  }

  .rooms-footer {
    flex-wrap: wrap;
    gap: 7px;
  }

  .rooms-footer > span:first-child,
  .rooms-footer > span:last-child {
    width: 25px;
  }

  .rooms-footer small {
    font-size: 6px;
  }
}
</style>
