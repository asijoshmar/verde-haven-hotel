
<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// FICTIONAL HOTEL LOCATION
const hotel = {
  id: "hotel",
  name: "Verde Haven Boutique Hotel",
  latitude: 13.3241,
  longitude: 121.1407,
  address:
    "Brgy. Balingayan, Calapan City, Oriental Mindoro, Philippines",
  description:
    "Sample hotel location for the Verde Haven reservation system."
};

// REAL REFERENCE LANDMARKS
const landmarks = [
  {
    id: "balingayan-school",
    name: "Balingayan Elementary School",
    latitude: 13.332196,
    longitude: 121.139765,
    description: "Public elementary school in Balingayan"
  },
  {
    id: "malamig-school",
    name: "Malamig Elementary School",
    latitude: 13.341595,
    longitude: 121.144381,
    description: "Public elementary school in Malamig"
  },
  {
    id: "personas-school",
    name: "Personas Elementary School",
    latitude: 13.3117664,
    longitude: 121.1436278,
    description: "Public elementary school in Personas"
  }
];

const mapContainer = ref(null);

let map = null;
const markerReferences = new Map();

// GOOGLE MAPS LINKS
const directionsUrl =
  "https://www.google.com/maps/dir/?api=1&destination=" +
  `${hotel.latitude},${hotel.longitude}` +
  "&travelmode=driving";

const googleMapsUrl =
  "https://www.google.com/maps/search/?api=1&query=" +
  `${hotel.latitude},${hotel.longitude}`;

// CUSTOM HOTEL PIN
function createHotelIcon() {
  return L.divIcon({
    className: "vh-custom-marker",
    html: `
      <div class="vh-hotel-pin">
        <span>🏨</span>
      </div>
    `,
    iconSize: [44, 50],
    iconAnchor: [22, 45],
    popupAnchor: [0, -45]
  });
}

// LANDMARK PIN
function createLandmarkIcon() {
  return L.divIcon({
    className: "vh-custom-marker",
    html: `
      <div class="vh-landmark-pin">
        <span>🎓</span>
      </div>
    `,
    iconSize: [32, 38],
    iconAnchor: [16, 34],
    popupAnchor: [0, -34]
  });
}

// GO TO SELECTED LOCATION
function focusLocation(id) {
  if (!map) return;

  const location =
    id === "hotel"
      ? hotel
      : landmarks.find(item => item.id === id);

  if (!location) return;

  map.flyTo(
    [location.latitude, location.longitude],
    16,
    { duration: 0.7 }
  );

  const marker = markerReferences.get(id);

  if (marker) {
    marker.openPopup();
  }
}

// RESET TO SHOW HOTEL AND LANDMARKS
function showAllLocations() {
  if (!map) return;

  const locations = [hotel, ...landmarks];

  const bounds = L.latLngBounds(
    locations.map(item => [
      item.latitude,
      item.longitude
    ])
  );

  map.fitBounds(bounds, {
    padding: [65, 65],
    maxZoom: 14
  });
}

onMounted(() => {
  if (!mapContainer.value) return;

  // INITIALIZE MAP
  map = L.map(mapContainer.value, {
    center: [hotel.latitude, hotel.longitude],
    zoom: 14,
    zoomControl: true,
    scrollWheelZoom: false
  });

  // REAL OPENSTREETMAP TILES
  L.tileLayer(
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }
  ).addTo(map);

  // ADD HOTEL PIN WITH VISIBLE HOTEL NAME
  const hotelMarker = L.marker(
    [hotel.latitude, hotel.longitude],
    {
      icon: createHotelIcon(),
      zIndexOffset: 1000
    }
  ).addTo(map);

  // PERMANENT HOTEL LABEL
  hotelMarker.bindTooltip(
    "Verde Haven Boutique Hotel",
    {
      permanent: true,
      direction: "top",
      offset: [0, -39],
      className: "vh-hotel-tooltip"
    }
  );

  hotelMarker.bindPopup(`
    <div class="vh-popup">
      <strong>🏨 Verde Haven Boutique Hotel</strong>
      <p>${hotel.address}</p>
      <small>Demo location — not an actual hotel</small>
    </div>
  `);

  markerReferences.set("hotel", hotelMarker);

  // ADD NEARBY LANDMARKS
  landmarks.forEach(landmark => {
    const marker = L.marker(
      [landmark.latitude, landmark.longitude],
      {
        icon: createLandmarkIcon()
      }
    ).addTo(map);

    marker.bindTooltip(landmark.name, {
      permanent: true,
      direction: "right",
      offset: [13, -17],
      className: "vh-landmark-tooltip"
    });

    marker.bindPopup(`
      <div class="vh-popup">
        <strong>📍 ${landmark.name}</strong>
        <p>${landmark.description}</p>
        <small>Reference landmark</small>
      </div>
    `);

    markerReferences.set(landmark.id, marker);
  });

  // AUTOMATICALLY SHOW ALL PINS
  showAllLocations();

  requestAnimationFrame(() => {
    map?.invalidateSize();
  });
});

onBeforeUnmount(() => {
  if (map) {
    map.remove();
    map = null;
  }

  markerReferences.clear();
});
</script>

<template>
  <section class="hotel-location">

    <!-- HEADER -->
    <div class="location-header">
      <span class="eyebrow">
        VERDE HAVEN · LOCATION
      </span>

      <h2>Find Your Way to Verde Haven</h2>

      <p>
        Discover our sample hotel location and
        explore the nearby landmarks in
        Calapan City, Oriental Mindoro.
      </p>
    </div>

    <div class="location-layout">

      <!-- INTERACTIVE MAP -->
      <div class="map-panel">

        <div class="map-toolbar">
          <div class="map-title">
            <span class="location-dot"></span>
            INTERACTIVE HOTEL MAP
          </div>

          <button
            class="reset-btn"
            @click="showAllLocations"
          >
            Show All Locations
          </button>
        </div>

        <div
          ref="mapContainer"
          class="map-display"
          aria-label="Interactive map of the sample hotel location and landmarks"
        ></div>

        <div class="map-legend">
          <div>
            <span class="legend-hotel">●</span>
            Hotel (Demo)
          </div>

          <div>
            <span class="legend-landmark">●</span>
            Nearby Landmark
          </div>
        </div>

      </div>

      <!-- DETAILS -->
      <aside class="details-panel">

        <div class="hotel-heading">
          <div class="hotel-logo">🏨</div>

          <span class="eyebrow">
            HOTEL LOCATION
          </span>

          <h3>{{ hotel.name }}</h3>

          <span class="demo-tag">
            SAMPLE LOCATION
          </span>
        </div>

        <div class="address-section">
          <span class="info-label">
            📍 SAMPLE ADDRESS
          </span>

          <p>{{ hotel.address }}</p>
        </div>

        <div class="coordinates">
          <span class="info-label">
            MAP COORDINATES
          </span>

          <strong>
            {{ hotel.latitude }},
            {{ hotel.longitude }}
          </strong>
        </div>

        <!-- HOTEL LOCATION BUTTON -->
        <button
          class="find-hotel-btn"
          @click="focusLocation('hotel')"
        >
          📍 Show Hotel on Map
        </button>

        <!-- NEARBY LANDMARKS -->
        <div class="landmarks-section">
          <div class="section-heading">
            <h4>Nearby Landmarks</h4>
            <span>{{ landmarks.length }} Places</span>
          </div>

          <p class="landmark-description">
            Click a landmark to locate it on the map.
          </p>

          <button
            v-for="landmark in landmarks"
            :key="landmark.id"
            class="landmark-card"
            @click="focusLocation(landmark.id)"
          >
            <div class="landmark-icon">
              🎓
            </div>

            <div class="landmark-info">
              <strong>{{ landmark.name }}</strong>
              <span>{{ landmark.description }}</span>
            </div>

            <span class="landmark-arrow">
              ↗
            </span>
          </button>
        </div>

        <!-- GOOGLE MAPS -->
        <div class="map-actions">
          <a
            :href="directionsUrl"
            class="directions-btn"
            target="_blank"
            rel="noopener noreferrer"
          >
            ➤ Get Directions
          </a>

          <a
            :href="googleMapsUrl"
            class="google-btn"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in Google Maps ↗
          </a>
        </div>

        <p class="demo-notice">
          This hotel location is fictional and
          intended for demonstration only.
          Directions lead to a sample point,
          not an existing hotel property.
        </p>

      </aside>

    </div>

  </section>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.hotel-location {
  background: #f7f5ef;
  padding: 45px 25px 55px;
  color: #193e30;
  font-family: "DM Sans", "Segoe UI", sans-serif;
}

.location-header {
  max-width: 650px;
  margin: 0 auto 30px;
  text-align: center;
}

.eyebrow {
  color: #a98c55;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 2px;
}

.location-header h2 {
  font: 500 clamp(28px, 3vw, 39px) Georgia, serif;
  margin: 12px 0;
}

.location-header p {
  font-size: 13px;
  color: #78837a;
  line-height: 1.8;
}

.location-layout {
  max-width: 1300px;
  margin: auto;
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(310px, 0.8fr);
  border: 1px solid #e5e2d7;
  border-radius: 16px;
  overflow: hidden;
  background: #fffefa;
  box-shadow: 0 12px 35px rgba(16, 45, 32, 0.06);
}

/* MAP PANEL */

.map-panel {
  min-width: 0;
  background: #e9eee7;
}

.map-toolbar {
  padding: 15px 20px;
  background: #133d2e;
  color: #f5e8cd;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.map-title {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.5px;
}

.location-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #d6b56a;
}

.reset-btn {
  background: transparent;
  border: 1px solid #8c9f8c;
  color: #f8eacb;
  border-radius: 7px;
  padding: 8px 11px;
  cursor: pointer;
  font-size: 11px;
}

.reset-btn:hover {
  background: #285c45;
}

.map-display {
  width: 100%;
  height: 600px;
  z-index: 0;
}

.map-legend {
  display: flex;
  gap: 22px;
  padding: 14px 20px;
  background: #f3f5ed;
  color: #536459;
  font-size: 11px;
}

.legend-hotel {
  color: #174d37;
  margin-right: 6px;
}

.legend-landmark {
  color: #c69c52;
  margin-right: 6px;
}

/* CUSTOM LEAFLET HOTEL PIN */

:deep(.vh-custom-marker) {
  background: transparent;
  border: 0;
}

:deep(.vh-hotel-pin) {
  width: 42px;
  height: 42px;
  background: #174d37;
  border: 3px solid #e2c37e;
  border-radius: 50% 50% 50% 7px;
  transform: rotate(-45deg);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

:deep(.vh-hotel-pin span) {
  transform: rotate(45deg);
  font-size: 20px;
}

:deep(.vh-landmark-pin) {
  width: 31px;
  height: 31px;
  border-radius: 50% 50% 50% 6px;
  transform: rotate(-45deg);
  background: #c9a45e;
  border: 2px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
}

:deep(.vh-landmark-pin span) {
  font-size: 16px;
  transform: rotate(45deg);
}

/* HOTEL NAME ALWAYS VISIBLE */

:deep(.vh-hotel-tooltip) {
  background: #143e2e;
  color: #fff4dc;
  border: 1px solid #d2b16e;
  border-radius: 7px;
  padding: 9px 13px;
  font-size: 13px;
  font-weight: 800;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
}

:deep(.vh-landmark-tooltip) {
  background: #fffefa;
  color: #35523f;
  border: 1px solid #dac69c;
  border-radius: 6px;
  padding: 5px 9px;
  font-size: 11px;
  font-weight: 700;
}

:deep(.vh-popup) {
  font-family: "Segoe UI", sans-serif;
  min-width: 180px;
}

:deep(.vh-popup strong) {
  display: block;
  color: #174630;
  font-size: 14px;
}

:deep(.vh-popup p) {
  line-height: 1.6;
  font-size: 12px;
  margin: 8px 0;
}

:deep(.vh-popup small) {
  color: #a08049;
}

/* DETAILS PANEL */

.details-panel {
  padding: 28px 24px;
  background: #fffefa;
}

.hotel-heading {
  border-bottom: 1px solid #e9e6d9;
  padding-bottom: 22px;
  margin-bottom: 20px;
}

.hotel-logo {
  width: 55px;
  height: 55px;
  border-radius: 50%;
  background: #e9efe4;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 25px;
  margin-bottom: 15px;
}

.hotel-heading h3 {
  font: 500 27px Georgia, serif;
  margin: 10px 0;
  line-height: 1.2;
}

.demo-tag {
  display: inline-block;
  border: 1px solid #d6ba80;
  background: #faf3e5;
  color: #927242;
  border-radius: 5px;
  padding: 5px 8px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1px;
}

.info-label {
  color: #a38a59;
  font-size: 10px;
  letter-spacing: 1.2px;
  font-weight: 800;
}

.address-section {
  margin-bottom: 18px;
}

.address-section p {
  font-size: 13px;
  line-height: 1.7;
  margin: 8px 0 0;
}

.coordinates {
  padding: 13px;
  background: #f6f6f0;
  border: 1px solid #e8e7da;
  border-radius: 8px;
  margin-bottom: 15px;
}

.coordinates strong {
  display: block;
  margin-top: 7px;
  font-size: 12px;
}

.find-hotel-btn {
  background: #e7eee4;
  color: #164b34;
  border: 1px solid #bfd1ba;
  border-radius: 8px;
  width: 100%;
  padding: 12px;
  cursor: pointer;
  font-weight: 800;
  font-size: 12px;
}

.find-hotel-btn:hover {
  background: #d9e9d3;
}

/* LANDMARKS */

.landmarks-section {
  margin-top: 27px;
}

.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.section-heading h4 {
  font: 600 20px Georgia, serif;
  margin: 0;
}

.section-heading span {
  font-size: 10px;
  color: #a0834c;
}

.landmark-description {
  font-size: 11px;
  color: #78847a;
  margin: 10px 0 14px;
}

.landmark-card {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  background: #f8f8f3;
  border: 1px solid #e9e8dd;
  border-radius: 9px;
  padding: 11px;
  margin-bottom: 9px;
  text-align: left;
  cursor: pointer;
}

.landmark-card:hover {
  background: #eff4eb;
  border-color: #b9cbb4;
}

.landmark-icon {
  background: #f0e8d7;
  border-radius: 9px;
  padding: 9px;
  font-size: 18px;
}

.landmark-info {
  min-width: 0;
  flex: 1;
}

.landmark-info strong {
  display: block;
  color: #234936;
  font-size: 12px;
}

.landmark-info span {
  display: block;
  font-size: 10px;
  color: #859087;
  margin-top: 4px;
  line-height: 1.5;
}

.landmark-arrow {
  color: #a88a53;
  font-size: 16px;
}

/* ACTION BUTTONS */

.map-actions {
  margin-top: 21px;
  display: grid;
  gap: 9px;
}

.directions-btn,
.google-btn {
  display: block;
  padding: 13px;
  border-radius: 8px;
  text-decoration: none;
  text-align: center;
  font-size: 12px;
  font-weight: 800;
}

.directions-btn {
  background: #153f2f;
  color: #fff3da;
}

.directions-btn:hover {
  background: #266249;
}

.google-btn {
  background: white;
  border: 1px solid #c9d5c6;
  color: #23583c;
}

.demo-notice {
  color: #8c938d;
  font-size: 10px;
  line-height: 1.6;
  margin-top: 15px;
}

/* MOBILE */

@media (max-width: 950px) {
  .location-layout {
    grid-template-columns: 1fr;
  }

  .map-display {
    height: 470px;
  }
}

@media (max-width: 500px) {
  .hotel-location {
    padding: 25px 12px;
  }

  .map-display {
    height: 380px;
  }

  .details-panel {
    padding: 23px 17px;
  }

  .location-header h2 {
    font-size: 28px;
  }

  :deep(.vh-hotel-tooltip) {
    font-size: 10px;
    padding: 6px 8px;
  }

  :deep(.vh-landmark-tooltip) {
    font-size: 9px;
  }
}
</style>
