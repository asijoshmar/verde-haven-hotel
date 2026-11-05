
<script setup>
import { ref, computed, onMounted } from "vue";
import axios from "axios";
import originalHotelImage from "./assets/hotel-overview.jpg";

const API = "http://localhost:4000";

const adminKey = ref(
  sessionStorage.getItem("verde_layout_admin_key") || ""
);

const unlocked = ref(false);
const loading = ref(false);
const creating = ref(false);
const saving = ref(false);

const error = ref("");
const message = ref("");

const rooms = ref([]);
const roomTypes = ref([]);
const pins = ref([]);
const imageUrl = ref(null);

const selectedKey = ref("deluxe");
const placing = ref(false);

const roomNumberInput = ref("");
const roomTypeInput = ref("");

const headers = () => ({
  "x-layout-key": adminKey.value
});

const hotelImage = computed(() =>
  imageUrl.value
    ? API + imageUrl.value
    : originalHotelImage
);

const selectedPin = computed(() =>
  pins.value.find(
    pin => pin.key === selectedKey.value
  )
);

function requestError(e) {
  return (
    e?.response?.data?.message ||
    e?.message ||
    "Request failed."
  );
}

function sameType(room, type) {
  return String(
    room?.room_type || ""
  ).toLowerCase().includes(type);
}

// GET ROOM NUMBERS FROM REAL DATABASE RECORDS
function numbersFor(pin) {
  if (pin.area || !pin.match) return "";

  const nums = rooms.value
    .filter(room => sameType(room, pin.match))
    .map(room => String(room.room_number))
    .sort((a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true
      })
    );

  return nums.join(", ");
}

// Example: Deluxe Room (101, 102, 103)
function markerText(pin) {
  const numbers = numbersFor(pin);

  return numbers
    ? `${pin.label} (${numbers})`
    : pin.label;
}

const counts = computed(() => ({
  deluxe: rooms.value.filter(
    r => sameType(r, "deluxe")
  ).length,

  standard: rooms.value.filter(
    r => sameType(r, "standard")
  ).length,

  family: rooms.value.filter(
    r => sameType(r, "family")
  ).length,

  suite: rooms.value.filter(
    r => sameType(r, "suite")
  ).length
}));

// LOAD EVERYTHING FROM POSTGRESQL
async function load() {
  loading.value = true;
  error.value = "";

  try {
    const [
      layoutRes,
      roomsRes,
      typesRes
    ] = await Promise.all([
      axios.get(
        `${API}/api/admin/hotel-tour/layout`,
        { headers: headers() }
      ),

      axios.get(`${API}/api/rooms`),

      axios.get(
        `${API}/api/admin/hotel-tour/room-types`,
        { headers: headers() }
      )
    ]);

    // Only grouped room markers and facilities.
    pins.value = layoutRes.data.pins;

    imageUrl.value = layoutRes.data.image_url;

    rooms.value = Array.isArray(roomsRes.data)
      ? roomsRes.data
      : roomsRes.data?.rooms || [];

    roomTypes.value = typesRes.data;

    unlocked.value = true;

    sessionStorage.setItem(
      "verde_layout_admin_key",
      adminKey.value
    );

  } catch (e) {
    unlocked.value = false;
    error.value = requestError(e);
  } finally {
    loading.value = false;
  }
}

// CREATE ROOM IN POSTGRESQL ONLY
async function createRoom() {
  const roomNumber = roomNumberInput.value.trim();

  if (!roomNumber || !roomTypeInput.value) {
    error.value =
      "Enter a room number and select a room type.";
    return;
  }

  creating.value = true;
  error.value = "";
  message.value = "";

  try {
    const { data } = await axios.post(
      `${API}/api/admin/hotel-tour/rooms`,
      {
        room_number: roomNumber,
        room_type_id: Number(roomTypeInput.value)
      },
      {
        headers: headers()
      }
    );

    // Refresh room numbers from database.
    const { data: latestRooms } =
      await axios.get(`${API}/api/rooms`);

    rooms.value = Array.isArray(latestRooms)
      ? latestRooms
      : latestRooms?.rooms || [];

    roomNumberInput.value = "";

    message.value =
      `Room ${data.room_number} saved in PostgreSQL! ` +
      `Its number now appears in the existing ` +
      `room-type label. No new marker was added.`;

  } catch (e) {
    error.value = requestError(e);
  } finally {
    creating.value = false;
  }
}

// REPOSITION EXISTING GROUP MARKER
function startPlacing() {
  if (!selectedPin.value) {
    error.value = "Select a group marker first.";
    return;
  }

  placing.value = true;

  message.value =
    "Click on the hotel image to reposition the selected group marker.";
}

function setPosition(event) {
  if (!placing.value || !selectedPin.value) {
    return;
  }

  const rect =
    event.currentTarget.getBoundingClientRect();

  const x = Math.max(
    0,
    Math.min(
      100,
      ((event.clientX - rect.left) / rect.width) * 100
    )
  );

  const y = Math.max(
    0,
    Math.min(
      100,
      ((event.clientY - rect.top) / rect.height) * 100
    )
  );

  selectedPin.value.x = Number(x.toFixed(1));
  selectedPin.value.y = Number(y.toFixed(1));

  placing.value = false;

  message.value =
    "Group marker moved. Click Save & Publish.";
}

function setCoordinate(axis, value) {
  if (!selectedPin.value) return;

  const n = Number(value);

  if (Number.isFinite(n)) {
    selectedPin.value[axis] = Math.max(
      0,
      Math.min(100, n)
    );
  }
}

// HOTEL IMAGE UPLOAD
async function uploadImage(e) {
  const file = e.target.files?.[0];

  if (!file) return;

  const form = new FormData();
  form.append("image", file);

  error.value = "";

  try {
    const { data } = await axios.post(
      `${API}/api/admin/hotel-tour/upload`,
      form,
      {
        headers: headers()
      }
    );

    imageUrl.value = data.image_url;

    message.value =
      "New image uploaded. Adjust group markers, then Save & Publish.";

  } catch (err) {
    error.value = requestError(err);
  } finally {
    e.target.value = "";
  }
}

// SAVE AND PUBLISH
async function save(publish = false) {
  saving.value = true;
  error.value = "";
  message.value = "";

  try {
    await axios.put(
      `${API}/api/admin/hotel-tour/layout`,
      {
        image_url: imageUrl.value,
        pins: pins.value
      },
      {
        headers: headers()
      }
    );

    if (publish) {
      await axios.post(
        `${API}/api/admin/hotel-tour/publish`,
        {},
        {
          headers: headers()
        }
      );

      message.value =
        "Published! Guest 3D Tour will show only one pin per room type. Refresh the guest page.";

    } else {
      message.value =
        "Draft saved to PostgreSQL.";
    }

  } catch (e) {
    error.value = requestError(e);
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  if (adminKey.value) load();
});
</script>

<template>
  <section class="editor">

    <header class="heading">
      <p class="eyebrow">
        VERDE HAVEN · MANAGEMENT
      </p>

      <h1>3D Hotel Editor</h1>

      <p>
        One marker per room type.
        Room numbers are synced from your booking database.
      </p>
    </header>

    <!-- LOGIN -->
    <div v-if="!unlocked" class="unlock card">
      <h2>Unlock Hotel Editor</h2>

      <p>
        Enter the Admin Layout Key from backend .env.
      </p>

      <input
        v-model="adminKey"
        type="password"
        placeholder="Admin Layout Key"
        @keyup.enter="load"
      />

      <button
        class="primary"
        :disabled="loading"
        @click="load"
      >
        {{ loading ? "Checking..." : "Unlock Editor" }}
      </button>
    </div>

    <template v-else>

      <!-- TOOLBAR -->
      <div class="toolbar">
        <label class="secondary upload">
          Upload Hotel Image

          <input
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp"
            @change="uploadImage"
          />
        </label>

        <button
          class="secondary"
          @click="imageUrl = null"
        >
          Use Original Image
        </button>

        <button
          class="secondary"
          :disabled="saving"
          @click="save(false)"
        >
          Save Draft
        </button>

        <button
          class="primary"
          :disabled="saving"
          @click="save(true)"
        >
          {{ saving ? "Saving..." : "Save & Publish" }}
        </button>
      </div>

      <div class="main-grid">

        <!-- HOTEL IMAGE -->
        <div class="preview card">
          <div
            class="image-stage"
            :class="{ placing }"
            @click="setPosition"
          >
            <img
              :src="hotelImage"
              alt="3D overview of Verde Haven"
              draggable="false"
            />

            <button
              v-for="pin in pins"
              :key="pin.key"
              type="button"
              class="marker"
              :class="{
                selected: selectedKey === pin.key
              }"
              :style="{
                left: pin.x + '%',
                top: pin.y + '%'
              }"
              :title="markerText(pin)"
              @click.stop="selectedKey = pin.key"
            >
              <span class="marker-dot"></span>

              <span class="marker-text">
                {{ markerText(pin) }}
              </span>
            </button>
          </div>

          <p class="hint">
            {{
              placing
                ? "Click on the image to move the selected GROUP marker."
                : "Select any group label to adjust its location. No individual room markers are added."
            }}
          </p>
        </div>

        <!-- SIDEBAR -->
        <aside class="sidebar card">

          <!-- CREATE ROOM -->
          <section class="section">
            <h2>1. Create Database Room</h2>

            <p>
              The room is bookable, but it will
              not create a new map pin.
            </p>

            <input
              v-model="roomNumberInput"
              placeholder="Room number (e.g. 510)"
            />

            <select v-model="roomTypeInput">
              <option value="">
                Select Room Type
              </option>

              <option
                v-for="type in roomTypes"
                :key="type.id"
                :value="type.id"
              >
                {{ type.name }}
              </option>
            </select>

            <button
              class="primary full"
              :disabled="
                creating ||
                !roomNumberInput.trim() ||
                !roomTypeInput
              "
              @click="createRoom"
            >
              {{
                creating
                  ? "Creating..."
                  : "+ Create Room"
              }}
            </button>
          </section>

          <!-- ROOM TYPE COUNTS -->
          <section class="section">
            <h2>2. Room Type Groups</h2>

            <p>
              These counts and numbers come
              directly from PostgreSQL.
            </p>

            <div class="type-row">
              <span>Deluxe Room</span>
              <strong>{{ counts.deluxe }}</strong>
            </div>

            <div class="type-row">
              <span>Standard Room</span>
              <strong>{{ counts.standard }}</strong>
            </div>

            <div class="type-row">
              <span>Family Room</span>
              <strong>{{ counts.family }}</strong>
            </div>

            <div class="type-row">
              <span>Suite</span>
              <strong>{{ counts.suite }}</strong>
            </div>
          </section>

          <!-- EDIT GROUP MARKER -->
          <section class="section">
            <h2>3. Edit Existing Group Marker</h2>

            <select v-model="selectedKey">
              <option
                v-for="pin in pins"
                :key="pin.key"
                :value="pin.key"
              >
                {{ pin.label }}
              </option>
            </select>

            <template v-if="selectedPin">
              <div class="coordinates">

                <label>
                  X position (%)

                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    :value="selectedPin.x"
                    @change="
                      setCoordinate(
                        'x',
                        $event.target.value
                      )
                    "
                  />
                </label>

                <label>
                  Y position (%)

                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    :value="selectedPin.y"
                    @change="
                      setCoordinate(
                        'y',
                        $event.target.value
                      )
                    "
                  />
                </label>
              </div>

              <button
                class="secondary full"
                @click="startPlacing"
              >
                Reposition on Image
              </button>
            </template>
          </section>

          <!-- EXISTING MARKERS -->
          <section class="section">
            <h2>
              Existing Markers ({{ pins.length }})
            </h2>

            <div class="marker-list">
              <button
                v-for="pin in pins"
                :key="pin.key"
                :class="{
                  active: selectedKey === pin.key
                }"
                @click="selectedKey = pin.key"
              >
                {{ pin.label }}
              </button>
            </div>
          </section>

        </aside>
      </div>
    </template>

    <p v-if="error" class="feedback error">
      {{ error }}
    </p>

    <p v-if="message" class="feedback success">
      {{ message }}
    </p>
  </section>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.editor {
  min-height: 100%;
  padding: 24px;
  background: #f7f5ee;
  color: #193b30;
  font-family: "DM Sans", Arial, sans-serif;
}

.heading h1 {
  font: 500 34px Georgia, serif;
  margin: 5px 0;
}

.heading p {
  color: #68776d;
  font-size: 13px;
}

.heading .eyebrow {
  color: #a48756;
  letter-spacing: 2px;
  font: 800 10px Arial, sans-serif;
}

.toolbar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin: 22px 0 18px;
}

button,
.upload {
  cursor: pointer;
  border: 0;
  border-radius: 9px;
  padding: 11px 13px;
  font-weight: 700;
  font-size: 12px;
}

.primary {
  background: #143e30;
  color: white;
}

.secondary,
.upload {
  background: #e9ede3;
  color: #254732;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 18px;
  align-items: start;
}

.card {
  border: 1px solid #e8e2d7;
  border-radius: 14px;
  overflow: hidden;
  background: #fffdf8;
}

.image-stage {
  position: relative;
  line-height: 0;
  background: #103a2d;
}

.image-stage.placing {
  cursor: crosshair;
}

.image-stage > img {
  display: block;
  width: 100%;
  height: auto;
}

.marker {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  z-index: 2;
}

.marker-dot {
  flex: none;
  width: 12px;
  height: 12px;
  border: 2px solid #0f382b;
  border-radius: 50%;
  background: #d1af56;
  box-shadow: 0 0 0 2px #d1af56;
}

.marker-text {
  max-width: 230px;
  padding: 5px 8px;
  background: #10362d;
  color: #f4e6c4;
  border: 1px solid #c9a24d;
  border-radius: 7px;
  font: 600 11px/1.35 Georgia, serif;
  white-space: normal;
  overflow-wrap: anywhere;
  text-align: left;
}

.marker.selected .marker-text {
  color: #13392c;
  background: #d2b263;
}

.hint {
  padding: 12px 15px;
  margin: 0;
  font-size: 12px;
  color: #758074;
  line-height: 1.5;
}

.sidebar {
  padding: 16px;
  display: grid;
  gap: 16px;
}

.section {
  display: grid;
  gap: 9px;
  border-bottom: 1px solid #ebe6da;
  padding-bottom: 15px;
}

.section:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.section h2 {
  margin: 0;
  font: 600 17px Georgia, serif;
}

.section p {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  color: #748176;
}

.section input,
.section select,
.unlock input {
  padding: 11px;
  border: 1px solid #d9d9cb;
  border-radius: 8px;
  background: white;
  width: 100%;
  font-size: 12px;
  color: #183a2c;
}

.full {
  width: 100%;
}

.type-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 8px 10px;
  background: #f4f5ee;
  border-radius: 6px;
}

.type-row strong {
  color: #28543d;
}

.coordinates {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
}

.coordinates label {
  font-size: 11px;
  color: #68776d;
}

.coordinates input {
  margin-top: 4px;
}

.marker-list {
  max-height: 240px;
  overflow: auto;
  display: grid;
  gap: 5px;
}

.marker-list button {
  text-align: left;
  background: #f4f5ef;
  color: #314f39;
  font-weight: 500;
}

.marker-list button.active {
  background: #dce8d8;
}

.unlock {
  max-width: 450px;
  display: grid;
  gap: 12px;
  padding: 24px;
  margin-top: 20px;
}

.unlock h2 {
  margin: 0;
  font: 600 20px Georgia, serif;
}

.unlock p {
  font-size: 13px;
  margin: 0;
  color: #68776d;
}

.feedback {
  margin: 16px 0;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 12px;
}

.feedback.error {
  color: #9b3024;
  background: #fce6df;
}

.feedback.success {
  color: #25613a;
  background: #e5f2df;
}

@media (max-width: 950px) {
  .main-grid {
    grid-template-columns: 1fr;
  }

  .editor {
    padding: 15px;
  }
}
</style>
