
<script setup>
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount
} from "vue";

import axios from "axios";

import {
  getRoomImages,
  getRoomName
} from "./utils/roomImages.js";

import overviewImage from "./assets/hotel-overview.jpg";
import HotelLocation from "./HotelLocation.vue";

const emit = defineEmits(["book-room"]);

const API = "http://localhost:4000/api";
const BASE_URL = "http://localhost:4000";

// ONLY FOUR ROOM-TYPE MARKERS + FACILITIES
const DEFAULT_PINS = [
  {
    key: "deluxe",
    label: "Deluxe Room",
    match: "deluxe",
    x: 18.9,
    y: 14.9
  },
  {
    key: "standard",
    label: "Standard Room",
    match: "standard",
    x: 40.6,
    y: 8.9
  },
  {
    key: "family",
    label: "Family Room",
    match: "family",
    x: 70.6,
    y: 5.7
  },
  {
    key: "suite",
    label: "Suite",
    match: "suite",
    x: 84.8,
    y: 23
  },
  {
    key: "lobby",
    label: "Lobby",
    area: true,
    x: 45,
    y: 54.3,
    zoom: "40% 55%"
  },
  {
    key: "pool",
    label: "Pool Area",
    area: true,
    x: 89.7,
    y: 53.5,
    zoom: "90% 52%"
  }
];

const rooms = ref([]);
const publishedPins = ref([]);
const imageUrl = ref(null);
const loading = ref(true);
const error = ref("");

const active = ref(null);
const photoIndex = ref(0);

const debug = new URLSearchParams(
  window.location.search
).has("pins");

const debugPoint = ref(null);

const stageImage = computed(() =>
  imageUrl.value
    ? BASE_URL + imageUrl.value
    : overviewImage
);

const roomType = room =>
  String(
    getRoomName(room) ||
    room?.room_type ||
    ""
  ).toLowerCase();

const number = (room, index = 0) =>
  String(
    room?.room_number ??
    room?.roomNumber ??
    room?.number ??
    room?.id ??
    101 + index
  );

const price = room =>
  Number(
    room?.price_per_night ??
    room?.price ??
    room?.rate ??
    0
  ).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const available = room =>
  ["available", "vacant", "active"].includes(
    String(
      room?.status ?? "available"
    ).toLowerCase()
  );

const capacity = room =>
  Math.max(1, Number(room?.capacity) || 1);

const roomsOf = pin =>
  rooms.value.filter(room =>
    pin.match &&
    roomType(room).includes(pin.match)
  );

// EXACTLY SIX GROUP MARKERS.
// ROOM NUMBERS ARE DYNAMIC FROM POSTGRESQL.
const pins = computed(() =>
  DEFAULT_PINS.map(base => {
    const stored = publishedPins.value.find(
      p =>
        !p.room_id &&
        (
          p.key === base.key ||
          (
            !base.area &&
            p.match === base.match
          )
        )
    );

    const pin = {
      ...base,

      x: Number.isFinite(Number(stored?.x))
        ? Number(stored.x)
        : base.x,

      y: Number.isFinite(Number(stored?.y))
        ? Number(stored.y)
        : base.y
    };

    const numbers = pin.area
      ? []
      : roomsOf(pin)
          .map(room => number(room))
          .sort((a, b) =>
            a.localeCompare(
              b,
              undefined,
              { numeric: true }
            )
          );

    return {
      ...pin,
      sub: numbers.join(", ")
    };
  })
);

const activeRoom = computed(() =>
  active.value?.kind === "room"
    ? active.value.room
    : null
);

const roomPhotos = computed(() =>
  activeRoom.value
    ? getRoomImages(activeRoom.value)
    : []
);

const sameType = computed(() =>
  activeRoom.value
    ? rooms.value.filter(
        room =>
          roomType(room) === roomType(activeRoom.value)
      )
    : []
);

// LOAD ROOMS FROM POSTGRESQL
async function loadData() {
  loading.value = true;
  error.value = "";

  try {
    const result = await axios.get(`${API}/rooms`);

    rooms.value = Array.isArray(result.data)
      ? result.data
      : Array.isArray(result.data?.rooms)
      ? result.data.rooms
      : [];

  } catch (e) {
    console.error("Hotel rooms:", e);

    error.value =
      "Cannot load rooms. Make sure the backend is running on port 4000.";

  } finally {
    loading.value = false;
  }

  // LOAD PUBLISHED HOTEL LAYOUT
  try {
    const { data } = await axios.get(
      `${API}/hotel-tour/layout`
    );

    publishedPins.value = Array.isArray(data?.pins)
      ? data.pins
      : [];

    imageUrl.value = data?.image_url || null;

  } catch (e) {
    console.warn(
      "Using default hotel layout:",
      e
    );
  }
}

// OPEN ROOM DETAILS
function openRoom(room) {
  active.value = {
    kind: "room",
    room
  };

  photoIndex.value = 0;
}

// OPEN ROOM TYPE OR HOTEL AREA
function openPin(pin) {
  if (pin.area) {
    active.value = {
      kind: "area",
      pin
    };

    return;
  }

  const matches = roomsOf(pin);

  if (!matches.length) {
    active.value = {
      kind: "empty",
      pin
    };

    return;
  }

  openRoom(
    matches.find(available) || matches[0]
  );
}

function closePopup() {
  active.value = null;
}

// PHOTO NAVIGATION
function stepPhoto(direction) {
  if (roomPhotos.value.length > 1) {
    photoIndex.value =
      (
        photoIndex.value +
        direction +
        roomPhotos.value.length
      ) % roomPhotos.value.length;
  }
}

// EXISTING RESERVATION EVENT
function bookRoom() {
  if (
    activeRoom.value &&
    available(activeRoom.value)
  ) {
    emit("book-room", activeRoom.value);
    closePopup();
  }
}

// OPTIONAL MARKER DEBUG
function debugClick(event) {
  if (!debug) return;

  const rect =
    event.currentTarget.getBoundingClientRect();

  debugPoint.value = `${
    (
      (event.clientX - rect.left) /
      rect.width *
      100
    ).toFixed(1)
  }%, ${
    (
      (event.clientY - rect.top) /
      rect.height *
      100
    ).toFixed(1)
  }%`;
}

function onKey(event) {
  if (event.key === "Escape") {
    closePopup();
  }
}

onMounted(() => {
  loadData();

  window.addEventListener(
    "keydown",
    onKey
  );
});

onBeforeUnmount(() => {
  window.removeEventListener(
    "keydown",
    onKey
  );
});
</script>

<template>
  <section class="tour-page">

    <!-- HOTEL 3D TOUR -->
    <header class="tour-heading">
      <p class="eyebrow">
        VERDE HAVEN BOUTIQUE HOTEL
      </p>

      <h1>Explore Your Stay</h1>

      <p>
        Click a room type on the hotel to see
        available rooms, photos, and booking details.
      </p>
    </header>

    <div class="tour-layout">

      <!-- HOTEL OVERVIEW -->
      <main class="visual-panel">
        <div
          class="stage"
          @click="debugClick"
        >
          <img
            class="stage-img"
            :src="stageImage"
            alt="3D overview of Verde Haven"
            draggable="false"
          />

          <button
            v-for="pin in pins"
            :key="pin.key"
            type="button"
            class="pin"
            :class="{ area: pin.area }"
            :style="{
              left: pin.x + '%',
              top: pin.y + '%'
            }"
            :aria-label="`View ${pin.label}`"
            @click.stop="openPin(pin)"
          >
            <span class="pin-dot"></span>

            <span class="pin-label">
              {{ pin.label }}

              <small v-if="pin.sub">
                ({{ pin.sub }})
              </small>
            </span>
          </button>

          <p v-if="loading" class="stage-msg">
            Loading room data...
          </p>

          <p
            v-if="debug && debugPoint"
            class="stage-debug"
          >
            {{ debugPoint }}
          </p>
        </div>

        <div class="scene-caption">
          <strong>Welcome to Verde Haven</strong>

          <p>
            Select a room type or facility
            to explore the hotel.
          </p>
        </div>
      </main>

      <!-- ROOMS FROM DATABASE -->
      <aside class="room-panel">

        <div class="panel-heading">
          <div>
            <p class="eyebrow">
              ACCOMMODATIONS
            </p>

            <h2>Our Rooms</h2>
          </div>

          <span class="room-count">
            {{ rooms.length }}
          </span>
        </div>

        <p class="panel-description">
          Rooms are synced with the reservation database.
        </p>

        <p v-if="error" class="error-message">
          {{ error }}
        </p>

        <p
          v-else-if="!loading && !rooms.length"
          class="empty-state"
        >
          No rooms found.
        </p>

        <div v-else class="room-list">
          <button
            v-for="(room, i) in rooms"
            :key="room.id ?? i"
            type="button"
            class="room-card"
            :class="{
              selected: activeRoom?.id === room.id
            }"
            @click="openRoom(room)"
          >
            <img
              class="room-card-image"
              :src="getRoomImages(room)[0]"
              :alt="getRoomName(room)"
              loading="lazy"
            />

            <div class="room-card-top">
              <span class="room-number">
                ROOM {{ number(room, i) }}
              </span>

              <span
                class="availability"
                :class="{
                  unavailable: !available(room)
                }"
              >
                {{
                  available(room)
                    ? "Available"
                    : "Unavailable"
                }}
              </span>
            </div>

            <h3>{{ getRoomName(room) }}</h3>

            <span class="room-price">
              ₱{{ price(room) }}
              <small>/ night</small>
            </span>
          </button>
        </div>
      </aside>
    </div>

    <!-- NEW HOTEL MAP WITH HOTEL PIN + LANDMARKS -->
    <HotelLocation />

    <!-- EXISTING ROOM BOOKING POPUP -->
    <div
      v-if="active"
      class="popup-overlay"
      @click.self="closePopup"
    >
      <div
        class="popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="popup-title"
      >
        <button
          type="button"
          class="popup-close"
          aria-label="Close popup"
          @click="closePopup"
        >
          ✕
        </button>

        <div class="popup-media-col">
          <div class="popup-media">

            <template v-if="activeRoom">
              <img
                v-if="roomPhotos.length"
                :src="roomPhotos[photoIndex]"
                :alt="getRoomName(activeRoom)"
              />

              <button
                v-if="roomPhotos.length > 1"
                type="button"
                class="nav prev"
                @click="stepPhoto(-1)"
              >
                ‹
              </button>

              <button
                v-if="roomPhotos.length > 1"
                type="button"
                class="nav next"
                @click="stepPhoto(1)"
              >
                ›
              </button>
            </template>

            <div
              v-else
              class="popup-zoom"
              :style="{
                backgroundImage: `url(${stageImage})`,
                backgroundPosition:
                  active.pin.zoom || 'center'
              }"
            ></div>
          </div>

          <div
            v-if="roomPhotos.length > 1"
            class="thumbs"
          >
            <button
              v-for="(src, i) in roomPhotos"
              :key="i"
              type="button"
              class="thumb"
              :class="{ on: photoIndex === i }"
              @click="photoIndex = i"
            >
              <img
                :src="src"
                alt="Room photo"
              />
            </button>
          </div>
        </div>

        <div class="popup-info">
          <p class="eyebrow">
            VERDE HAVEN BOUTIQUE HOTEL
          </p>

          <template v-if="activeRoom">
            <h2 id="popup-title">
              {{ getRoomName(activeRoom) }}
            </h2>

            <div
              v-if="sameType.length > 1"
              class="chips"
            >
              <button
                v-for="room in sameType"
                :key="room.id"
                type="button"
                class="chip"
                :class="{
                  on: room.id === activeRoom.id,
                  off: !available(room)
                }"
                @click="openRoom(room)"
              >
                Room {{ number(room) }}
              </button>
            </div>

            <p v-else>
              Room {{ number(activeRoom) }}
            </p>

            <p class="popup-desc">
              {{
                activeRoom.description ||
                "A welcoming space designed for a relaxing stay."
              }}
            </p>

            <div class="detail-line">
              <span>Capacity</span>

              <strong>
                {{ capacity(activeRoom) }} guests
              </strong>
            </div>

            <div class="detail-line">
              <span>Status</span>

              <strong>
                {{
                  available(activeRoom)
                    ? "Available"
                    : "Unavailable"
                }}
              </strong>
            </div>

            <div class="popup-book">
              <span class="popup-price">
                ₱{{ price(activeRoom) }}
                <small>/ night</small>
              </span>

              <button
                type="button"
                class="book-btn"
                :disabled="!available(activeRoom)"
                @click="bookRoom"
              >
                {{
                  available(activeRoom)
                    ? "Book This Room"
                    : "Unavailable"
                }}
              </button>
            </div>
          </template>

          <template v-else>
            <h2 id="popup-title">
              {{ active.pin.label }}
            </h2>

            <p class="popup-desc">
              {{
                active.kind === 'empty'
                  ? "No rooms in this category yet."
                  : "Explore this area of Verde Haven Boutique Hotel."
              }}
            </p>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.tour-page {
  min-height: 100%;
  padding: 28px;
  background: #f5f3ed;
  color: #213a2e;
  font-family: "DM Sans", "Segoe UI", sans-serif;
}

.tour-heading,
.tour-layout {
  max-width: 1600px;
  margin-left: auto;
  margin-right: auto;
}

.tour-heading {
  margin-bottom: 24px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #a1814b;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 2px;
}

.tour-heading h1 {
  margin: 0;
  color: #173b2d;
  font: 500 clamp(28px, 3vw, 42px) Georgia, serif;
}

.tour-heading > p:last-child {
  color: #778176;
  font-size: 13px;
  line-height: 1.7;
}

.tour-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 350px;
  align-items: start;
  gap: 22px;
}

.visual-panel,
.room-panel {
  min-width: 0;
  overflow: hidden;
  border: 1px solid #e6e1d6;
  border-radius: 16px;
  background: #fffdf8;
  box-shadow: 0 8px 30px #1e34260d;
}

.stage {
  position: relative;
  background: #0f2a21;
  line-height: 0;
}

.stage-img {
  display: block;
  width: 100%;
  height: auto;
}

.pin {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 8px;
  transform: translate(-50%, -50%);
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  line-height: 1.2;
}

.pin-dot {
  flex: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #c9a24d;
  box-shadow: 0 0 0 3px #0f2a21dd;
}

.pin.area .pin-dot {
  background: #fff;
}

.pin-label {
  max-width: 240px;
  padding: 5px 9px;
  border: 1px solid #c9a24d;
  border-radius: 8px;
  background: #0f2a21ed;
  color: #f5efe2;
  font: 600 12px/1.35 Georgia, serif;
  text-align: left;
  overflow-wrap: anywhere;
}

.pin-label small {
  font-size: 10px;
  font-weight: 400;
}

.pin:hover .pin-label,
.pin:focus-visible .pin-label {
  background: #c9a24d;
  color: #0f2a21;
}

.stage-msg,
.stage-debug {
  position: absolute;
  bottom: 12px;
  left: 12px;
  padding: 7px 10px;
  border-radius: 7px;
  background: #0f2a21;
  color: #fff;
  line-height: 1.2;
  font-size: 12px;
}

.stage-debug {
  left: auto;
  right: 12px;
  background: #c9a24d;
  color: #0f2a21;
}

.scene-caption {
  padding: 16px 20px;
  border-top: 1px solid #e9e5db;
}

.scene-caption strong {
  display: block;
  font: 600 16px Georgia, serif;
  color: #244432;
}

.scene-caption p {
  margin: 5px 0 0;
  color: #7b8278;
  font-size: 12px;
}

.room-panel {
  padding: 20px;
}

.panel-heading,
.room-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.panel-heading h2 {
  margin: 0;
  font: 500 26px Georgia, serif;
}

.room-count {
  display: grid;
  place-items: center;
  border-radius: 50%;
  width: 34px;
  height: 34px;
  background: #e8eee5;
  font-weight: 800;
  font-size: 12px;
}

.panel-description {
  color: #7d8579;
  font-size: 12px;
}

.room-list {
  display: grid;
  gap: 12px;
  max-height: 640px;
  overflow-y: auto;
}

.room-card {
  width: 100%;
  padding: 10px;
  border: 1px solid #e8e4d9;
  background: #fffefa;
  border-radius: 11px;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.room-card:hover,
.room-card.selected {
  border-color: #50775a;
  background: #f0f4eb;
}

.room-card-image {
  display: block;
  width: 100%;
  height: 140px;
  object-fit: cover;
  border-radius: 7px;
  background: #e8eee5;
}

.room-card-top {
  margin-top: 12px;
}

.room-number {
  color: #987c4b;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1px;
}

.availability {
  padding: 5px 7px;
  border-radius: 5px;
  background: #e3eee0;
  color: #3b7042;
  font-size: 9px;
  font-weight: 800;
}

.availability.unavailable {
  background: #f4e5de;
  color: #9a5140;
}

.room-card h3 {
  font: 500 18px Georgia, serif;
  margin: 10px 0;
}

.room-price {
  color: #244532;
  font-size: 14px;
  font-weight: 800;
}

.room-price small {
  color: #85897e;
  font-size: 10px;
  font-weight: 400;
}

.empty-state,
.error-message {
  padding: 14px;
  border-radius: 9px;
  font-size: 12px;
}

.error-message {
  background: #f7e8e2;
  color: #944b3c;
}

/* ROOM POPUP */

.popup-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  padding: 20px;
  background: #0a1b13d9;
  backdrop-filter: blur(6px);
}

.popup {
  position: relative;
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  width: 100%;
  max-width: 920px;
  max-height: 92vh;
  overflow-y: auto;
  border: 1px solid #d5bd8c;
  border-radius: 16px;
  background: #fffdf7;
  box-shadow: 0 20px 60px #0006;
}

.popup-close {
  position: absolute;
  z-index: 2;
  top: 12px;
  right: 12px;
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 50%;
  background: #173b2d;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
}

.popup-media {
  position: relative;
  aspect-ratio: 4 / 3;
  background: #0f2a21;
  overflow: hidden;
}

.popup-media img,
.popup-zoom {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.popup-zoom {
  background-size: 320%;
  background-repeat: no-repeat;
}

.nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  border-radius: 50%;
  background: #0f2a21c9;
  color: white;
  width: 40px;
  height: 40px;
  font-size: 22px;
  cursor: pointer;
}

.nav.prev {
  left: 10px;
}

.nav.next {
  right: 10px;
}

.thumbs {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  overflow-x: auto;
}

.thumb {
  width: 72px;
  height: 54px;
  flex: none;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb.on {
  border-color: #c9a24d;
}

.popup-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px 20px;
}

.popup-info h2 {
  margin: 0;
  padding-right: 40px;
  font: 500 28px Georgia, serif;
}

.popup-desc,
.popup-info > p:not(.eyebrow) {
  color: #778176;
  font-size: 13px;
  line-height: 1.7;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  padding: 6px 12px;
  border: 1px solid #c9d3c4;
  border-radius: 20px;
  background: white;
  color: #28533e;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.chip.on {
  background: #173b2d;
  color: #fff;
}

.chip.off:not(.on) {
  opacity: 0.55;
  text-decoration: line-through;
}

.detail-line {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
  border-top: 1px solid #e8e2d6;
  color: #7b8176;
  font-size: 12px;
}

.detail-line strong {
  color: #2a4734;
}

.popup-book {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid #e8e2d6;
}

.popup-price {
  color: #173b2d;
  font: 600 24px Georgia, serif;
}

.popup-price small {
  color: #85897e;
  font-size: 12px;
}

.book-btn {
  padding: 12px 20px;
  border: 0;
  border-radius: 8px;
  background: #c5a367;
  color: #193b30;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.book-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 950px) {
  .tour-layout {
    grid-template-columns: minmax(0, 1fr) 310px;
    gap: 14px;
  }
}

@media (max-width: 760px) {
  .tour-layout,
  .popup {
    grid-template-columns: 1fr;
  }

  .pin-label {
    max-width: 145px;
    font-size: 10px;
  }

  .pin-label small {
    display: none;
  }

  .room-card-image {
    height: 190px;
  }
}

@media (max-width: 480px) {
  .tour-page {
    padding: 10px;
  }
}
</style>
