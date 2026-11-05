// frontend/src/utils/roomImages.js
// ISANG source ng room photo at room name para sa Rooms.vue at Hotel3DTour.vue.

const API_ORIGIN = "http://localhost:4000"; // para sa mga path na galing sa backend uploads

// Fallback photos kung wala pang sariling larawan ang room sa database.
const FALLBACK_PHOTOS = {
  standard: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1000&q=85",
  deluxe: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1000&q=85",
  family: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1000&q=85",
  suite: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1000&q=85",
  other: [
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=85",
    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1000&q=85",
  ],
};

export function getRoomName(room) {
  return (
    room?.room_type ||
    room?.name ||
    room?.type_name ||
    room?.roomType ||
    room?.type ||
    "Guest Room"
  );
}

function resolveUrl(url) {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

// Lahat ng larawan ng room (para sa gallery)
export function getRoomImages(room) {
  const own = [
    room?.image_url,
    room?.image,
    room?.photo_url,
    room?.photo,
    ...(Array.isArray(room?.images) ? room.images : []),
  ]
    .filter(Boolean)
    .map(resolveUrl);

  return own.length ? own : [fallbackByType(room)];
}

// Pangunahing larawan: ito ang gagamitin ng Browse Rooms AT ng 3D hotel
export function getRoomImage(room) {
  return getRoomImages(room)[0];
}

function fallbackByType(room) {
  const type = getRoomName(room).toLowerCase();

  if (type.includes("suite")) return FALLBACK_PHOTOS.suite;
  if (type.includes("deluxe")) return FALLBACK_PHOTOS.deluxe;
  if (type.includes("family")) return FALLBACK_PHOTOS.family;
  if (type.includes("standard")) return FALLBACK_PHOTOS.standard;

  const pool = FALLBACK_PHOTOS.other;
  return pool[Math.abs(Number(room?.id) || 0) % pool.length];
}