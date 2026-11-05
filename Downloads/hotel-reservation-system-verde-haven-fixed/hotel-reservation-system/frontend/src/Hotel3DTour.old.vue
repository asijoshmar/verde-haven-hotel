
<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import axios from "axios";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const emit = defineEmits(["book-room"]);

const API = "http://localhost:4000/api";

const mountPoint = ref(null);
const rooms = ref([]);
const selectedRoom = ref(null);
const showRoomPhoto = ref(false);
const loading = ref(true);
const errorMessage = ref("");
const viewMode = ref("exterior");

const statusMessage = ref(
  "Welcome to Verde Haven. Open the main entrance to explore."
);


// Same room image mapping used in Browse Rooms.
const roomPhotos = [
  "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1000&q=85"
];

let scene;
let camera;
let renderer;
let controls;
let animationId;
let resizeObserver;
let architecture;
let raycaster;
let pointer;
let entranceDoorLeft;
let entranceDoorRight;
let isOpening = false;
let clickTargets = [];

const COLORS = {
  forest: 0x173b2d,
  forestLight: 0x28533e,
  gold: 0xc6a365,
  cream: 0xf5efe2,
  wall: 0xe9e1d2,
  wood: 0x805737,
  darkWood: 0x493326,
  floor: 0xbda58a,
  glass: 0x91c4c3,
  white: 0xffffff
};

function roomNumber(room, index = 0) {
  const value =
    room?.room_number ??
    room?.roomNumber ??
    room?.number ??
    room?.id;

  return value != null ? String(value) : String(101 + index);
}

function roomType(room) {
  return (
    room?.room_type ||
    room?.name ||
    room?.type_name ||
    room?.roomType ||
    room?.type ||
    "Guest Room"
  );
}

function getRoomImage(room) {
  const type = roomType(room).toLowerCase();

  if (type.includes("suite")) return roomPhotos[4];
  if (type.includes("deluxe")) return roomPhotos[1];
  if (type.includes("family")) return roomPhotos[3];
  if (type.includes("standard")) return roomPhotos[0];

  return roomPhotos[Math.abs(Number(room?.id) || 0) % roomPhotos.length];
}

function roomPrice(room) {
  const price =
    room?.price_per_night ??
    room?.price ??
    room?.rate ??
    room?.pricePerNight;

  return Number(price || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function roomCapacity(room) {
  return Math.max(1, Number(room?.capacity) || 1);
}

function isAvailable(room) {
  const status = String(room?.status ?? "available").toLowerCase();
  return ["available", "vacant", "active"].includes(status);
}

async function fetchRooms() {
  try {
    const response = await axios.get(`${API}/rooms`);
    const data = response.data;

    const list = Array.isArray(data)
      ? data
      : Array.isArray(data?.rooms)
        ? data.rooms
        : [];

    rooms.value = list;

    if (list.length) {
      selectedRoom.value = list[0];
    }
  } catch (error) {
    console.error("Unable to fetch rooms:", error);
    errorMessage.value =
      "Could not load room data. Check that the backend is running on port 4000.";
  }
}

function makeMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.78,
    metalness: 0.02,
    ...options
  });
}

function addBox(parent, name, position, size, material, options = {}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size[0], size[1], size[2]),
    material
  );

  mesh.name = name;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  if (options.action) {
    mesh.userData.action = options.action;
    clickTargets.push(mesh);
  }

  if (options.room) {
    mesh.userData.room = options.room;
  }

  parent.add(mesh);
  return mesh;
}

function addSphere(parent, name, position, radius, material) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 16, 12),
    material
  );

  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function addLabel(parent, text, position, options = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = options.background || "#173b2d";
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 144, 24);
  ctx.fill();

  ctx.strokeStyle = "#c6a365";
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.fillStyle = "#fff8e9";
  ctx.font = `bold ${options.fontSize || 43}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 82, 460);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    })
  );

  sprite.name = `LABEL_${text}`;
  sprite.position.set(...position);
  sprite.scale.set(options.width || 2.4, options.height || 0.75, 1);
  sprite.renderOrder = 10;
  parent.add(sprite);

  return sprite;
}

function clearArchitecture() {
  if (!architecture || !scene) return;

  scene.remove(architecture);

  architecture.traverse((object) => {
    if (object.geometry) object.geometry.dispose();

    if (object.material) {
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      materials.forEach((material) => {
        if (material.map) material.map.dispose();
        material.dispose();
      });
    }
  });

  architecture = null;
  clickTargets = [];
  entranceDoorLeft = null;
  entranceDoorRight = null;
}

function newArchitecture() {
  clearArchitecture();

  architecture = new THREE.Group();
  architecture.name = `VERDE_HAVEN_${viewMode.value.toUpperCase()}`;
  scene.add(architecture);

  return architecture;
}

function addPlant(parent, x, z, scale = 1) {
  const pot = makeMaterial(0x8b6547);
  const leaf = makeMaterial(0x386d42);

  addBox(
    parent,
    "Plant pot",
    [x, 0.28 * scale, z],
    [0.42 * scale, 0.55 * scale, 0.42 * scale],
    pot
  );

  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;

    const leafMesh = addSphere(
      parent,
      "Tropical leaf",
      [
        x + Math.cos(angle) * 0.2 * scale,
        0.75 * scale + (i % 2) * 0.2 * scale,
        z + Math.sin(angle) * 0.2 * scale
      ],
      0.19 * scale,
      leaf
    );

    leafMesh.scale.set(0.7, 1.5, 0.65);
  }
}

function buildExterior() {
  viewMode.value = "exterior";
  const root = newArchitecture();

  const ground = makeMaterial(0x819176);
  const wall = makeMaterial(COLORS.cream);
  const green = makeMaterial(COLORS.forest);
  const trim = makeMaterial(COLORS.gold);
  const glass = makeMaterial(COLORS.glass, {
    transparent: true,
    opacity: 0.58,
    metalness: 0.12,
    roughness: 0.2
  });
  const wood = makeMaterial(COLORS.darkWood);

  addBox(root, "Garden ground", [0, -0.22, 0], [32, 0.4, 28], ground);

  addBox(
    root,
    "Stone entrance path",
    [0, 0.005, 7],
    [3.6, 0.06, 12],
    makeMaterial(0xcbbda5)
  );

  addBox(root, "Hotel main body", [0, 2.4, 0], [16, 4.8, 10], wall);

  addBox(root, "Roof fascia", [0, 4.95, 0], [16.8, 0.32, 10.7], green);
  addBox(root, "Front gold fascia", [0, 4.7, 5.04], [16, 0.12, 0.16], trim);
  addBox(root, "Entrance canopy", [0, 3.65, 6.0], [5.5, 0.25, 2.4], green);
  addBox(root, "Canopy gold edge", [0, 3.5, 7.15], [5.5, 0.08, 0.12], trim);

  // Leave an opening in the center for the entrance.
  addBox(root, "Front left wall", [-5.25, 2.35, 5], [5.5, 4.7, 0.24], wall);
  addBox(root, "Front right wall", [5.25, 2.35, 5], [5.5, 4.7, 0.24], wall);
  addBox(root, "Front upper wall", [0, 4.35, 5], [5, 0.7, 0.24], wall);

  [-5.2, -3.1, 3.1, 5.2].forEach((x) => {
    addBox(root, "Window glass", [x, 2.35, 5.15], [1.45, 2.25, 0.06], glass);
    addBox(root, "Window frame top", [x, 3.51, 5.2], [1.6, 0.09, 0.1], green);
    addBox(root, "Window frame bottom", [x, 1.19, 5.2], [1.6, 0.09, 0.1], green);
    addBox(root, "Window vertical frame", [x, 2.35, 5.2], [0.08, 2.4, 0.1], green);
  });

  entranceDoorLeft = addBox(
    root,
    "MAIN_ENTRANCE_LEFT",
    [-0.58, 1.65, 5.17],
    [1.12, 3.1, 0.16],
    wood,
    { action: "open-entrance" }
  );

  entranceDoorRight = addBox(
    root,
    "MAIN_ENTRANCE_RIGHT",
    [0.58, 1.65, 5.17],
    [1.12, 3.1, 0.16],
    wood,
    { action: "open-entrance" }
  );

  addBox(root, "Left entrance handle", [-0.12, 1.55, 5.28], [0.07, 0.42, 0.06], trim);
  addBox(root, "Right entrance handle", [0.12, 1.55, 5.28], [0.07, 0.42, 0.06], trim);

  addLabel(root, "VERDE HAVEN", [0, 4.05, 5.25], {
    width: 3.5,
    height: 0.9,
    fontSize: 47
  });

  addLabel(root, "OPEN ENTRANCE", [0, 0.95, 7.25], {
    width: 3.1,
    height: 0.7,
    fontSize: 36
  });

  [-7.5, 7.5].forEach((x) => {
    for (let z = -3; z <= 2; z += 2.5) {
      addBox(root, "Side window", [x, 2.5, z], [0.08, 1.4, 1.7], glass);
    }
  });

  addPlant(root, -7.8, 7.3, 1.5);
  addPlant(root, 7.8, 7.3, 1.5);
  addPlant(root, -6.4, 6.5, 1.1);
  addPlant(root, 6.4, 6.5, 1.1);

  addBox(root, "Left porch column", [-2.65, 1.8, 6.2], [0.22, 3.5, 0.22], trim);
  addBox(root, "Right porch column", [2.65, 1.8, 6.2], [0.22, 3.5, 0.22], trim);

  setCamera([14, 10, 18], [0, 2, 2]);
  statusMessage.value = "Welcome to Verde Haven. Click the main entrance to enter.";
}

function buildHallway() {
  viewMode.value = "hallway";
  const root = newArchitecture();

  const floor = makeMaterial(0xb8a186);
  const walls = makeMaterial(0xf0e8d9);
  const green = makeMaterial(COLORS.forest);
  const gold = makeMaterial(COLORS.gold);

  addBox(root, "Hallway floor", [0, -0.12, 0], [12, 0.24, 22], floor);
  addBox(root, "Hallway left wall", [-6, 1.7, 0], [0.25, 3.4, 22], walls);
  addBox(root, "Hallway right wall", [6, 1.7, 0], [0.25, 3.4, 22], walls);
  addBox(root, "Hallway back wall", [0, 1.7, -11], [12, 3.4, 0.25], walls);

  for (let z = -8; z <= 8; z += 4) {
    addBox(root, "Ceiling beam", [0, 3.3, z], [12, 0.12, 0.22], green);

    addBox(
      root,
      "Ceiling light",
      [0, 3.17, z + 1],
      [1.3, 0.07, 0.36],
      makeMaterial(0xffe4a5, {
        emissive: 0xffd27b,
        emissiveIntensity: 0.65
      })
    );
  }

  for (let z = -7; z <= 7; z += 4) {
    addBox(root, "Left wall accent", [-5.82, 1.7, z], [0.06, 2.5, 1.8], green);
    addBox(root, "Right wall accent", [5.82, 1.7, z], [0.06, 2.5, 1.8], green);
  }

  addPlant(root, -4.8, 9, 0.8);
  addPlant(root, 4.8, 9, 0.8);

  const roomList = rooms.value.length
    ? rooms.value
    : [
        { id: 101, room_number: "101", name: "Standard Room", status: "available" },
        { id: 102, room_number: "102", name: "Standard Room", status: "available" },
        { id: 103, room_number: "103", name: "Deluxe Room", status: "available" },
        { id: 104, room_number: "104", name: "Deluxe Room", status: "available" },
        { id: 105, room_number: "105", name: "Family Room", status: "available" },
        { id: 106, room_number: "106", name: "Suite", status: "available" }
      ];

  roomList.forEach((room, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    const row = Math.floor(index / 2);
    const z = 7.2 - row * 4.2;
    const x = side * 5.82;
    const doorWidth = 1.55;
    const doorHeight = 2.45;
    const available = isAvailable(room);
    const doorMaterial = makeMaterial(available ? 0x765039 : 0x777777);

    const door = addBox(
      root,
      `ROOM_DOOR_${roomNumber(room, index)}`,
      [x, doorHeight / 2, z],
      [0.14, doorHeight, doorWidth],
      doorMaterial,
      { action: "open-room", room }
    );

    addBox(
      root,
      "Room door plate",
      [x + side * -0.11, 2.15, z],
      [0.08, 0.42, 0.75],
      gold
    );

    addLabel(
      root,
      `ROOM ${roomNumber(room, index)}`,
      [x + side * 0.22, 2.75, z],
      { width: 2.1, height: 0.62, fontSize: 37 }
    );

    addBox(
      root,
      "Room door handle",
      [x + side * 0.12, 1.1, z + side * 0.42],
      [0.08, 0.3, 0.08],
      gold
    );

    door.userData.roomIndex = index;
  });

  addLabel(root, "GUEST ROOM HALLWAY", [0, 2.8, 10], {
    width: 4.2,
    height: 0.85,
    fontSize: 37
  });

  setCamera([0, 2.3, 14], [0, 1.5, 0]);
  statusMessage.value = "You are inside. Click any numbered room door to enter.";
}

function buildRoomInterior(room) {
  if (!room) return;

  selectedRoom.value = room;
  viewMode.value = "room";

  const root = newArchitecture();
  const type = roomType(room).toLowerCase();

  const isSuite = type.includes("suite");
  const isFamily = type.includes("family");
  const isDeluxe = type.includes("deluxe") || type.includes("premium");
  const isStandard = type.includes("standard");

  // Different room layouts and furniture styles.
  const theme = isSuite
    ? {
        accent: 0x183d2c,
        floor: 0x8b6949,
        wood: 0x503b2b,
        fabric: 0xf4e8d2,
        runner: 0xb99a60,
        wall: 0xeee5d5
      }
    : isFamily
      ? {
          accent: 0x527454,
          floor: 0xb9a184,
          wood: 0x785638,
          fabric: 0xfff8e9,
          runner: 0x678467,
          wall: 0xf2eadc
        }
      : isDeluxe
        ? {
            accent: 0x284d3a,
            floor: 0x9c7958,
            wood: 0x60442e,
            fabric: 0xf8f0df,
            runner: 0xc5a365,
            wall: 0xf1e8d8
          }
        : {
            accent: 0x667c5b,
            floor: 0xbda78c,
            wood: 0x805b3c,
            fabric: 0xfffbf1,
            runner: 0x718568,
            wall: 0xf4ecdf
          };

  const floorMat = makeMaterial(theme.floor);
  const wallMat = makeMaterial(theme.wall);
  const accentMat = makeMaterial(theme.accent);
  const woodMat = makeMaterial(theme.wood);
  const fabricMat = makeMaterial(theme.fabric);
  const runnerMat = makeMaterial(theme.runner);
  const goldMat = makeMaterial(COLORS.gold);
  const darkMat = makeMaterial(0x292b27);
  const glassMat = makeMaterial(0x8fc5c7, {
    transparent: true,
    opacity: 0.65,
    roughness: 0.2
  });

  const lampMat = makeMaterial(0xffdf9e, {
    emissive: 0xffbf63,
    emissiveIntensity: 0.7
  });

  // --------------------------------------------------
  // ROOM STRUCTURE
  // --------------------------------------------------

  addBox(root, "Room floor", [0, -0.12, 0], [9, 0.24, 8], floorMat);

  addBox(root, "Back wall", [0, 1.7, -4], [9, 3.4, 0.2], wallMat);
  addBox(root, "Left wall", [-4.5, 1.7, 0], [0.2, 3.4, 8], wallMat);
  addBox(root, "Right wall", [4.5, 1.7, 0], [0.2, 3.4, 8], wallMat);

  // Accent wall with decorative panels.
  addBox(
    root,
    "Decorative headboard wall",
    [0, 1.95, -3.86],
    [7.3, 2.7, 0.1],
    accentMat
  );

  for (let x = -3; x <= 3; x += 1.5) {
    addBox(
      root,
      "Wall decorative gold panel",
      [x, 2.0, -3.77],
      [0.035, 2.15, 0.035],
      goldMat
    );
  }

  addBox(
    root,
    "Gold upper wall trim",
    [0, 3.28, -3.74],
    [7.4, 0.07, 0.07],
    goldMat
  );

  // Window on the right wall.
  addBox(
    root,
    "Bedroom window",
    [4.36, 2.0, -0.15],
    [0.07, 1.55, 2.25],
    glassMat
  );

  addBox(
    root,
    "Window upper frame",
    [4.29, 2.8, -0.15],
    [0.13, 0.09, 2.4],
    woodMat
  );

  addBox(
    root,
    "Window lower frame",
    [4.29, 1.2, -0.15],
    [0.13, 0.09, 2.4],
    woodMat
  );

  addBox(
    root,
    "Window center frame",
    [4.28, 2.0, -0.15],
    [0.13, 1.65, 0.08],
    woodMat
  );

  // --------------------------------------------------
  // REUSABLE 3D FURNITURE
  // --------------------------------------------------

  function makeBed(label, x, z, width, length, options = {}) {
    const bedDepth = length;
    const headZ = z - bedDepth / 2 + 0.16;
    const mattressY = 0.65;

    // Legs and frame.
    addBox(
      root,
      `${label} bed frame`,
      [x, 0.34, z],
      [width + 0.22, 0.42, bedDepth + 0.18],
      woodMat
    );

    addBox(
      root,
      `${label} mattress`,
      [x, mattressY, z],
      [width, 0.25, bedDepth],
      fabricMat
    );

    // Main blanket.
    addBox(
      root,
      `${label} duvet`,
      [x, 0.81, z + 0.25],
      [width - 0.08, 0.1, bedDepth * 0.61],
      fabricMat
    );

    // Decorative bed runner.
    addBox(
      root,
      `${label} bed runner`,
      [x, 0.88, z + bedDepth * 0.29],
      [width - 0.12, 0.07, 0.43],
      runnerMat
    );

    // Headboard.
    addBox(
      root,
      `${label} headboard`,
      [x, 1.12, headZ],
      [width + 0.28, options.deluxe ? 1.35 : 1.12, 0.18],
      woodMat
    );

    // Cushioned headboard insert.
    addBox(
      root,
      `${label} upholstered headboard`,
      [x, 1.18, headZ + 0.105],
      [width - 0.18, 0.72, 0.035],
      accentMat
    );

    // Pillows at the head of the bed.
    const pillowWidth = Math.min(0.76, width * 0.37);

    addBox(
      root,
      `${label} left pillow`,
      [x - width * 0.23, 0.84, z - bedDepth * 0.34],
      [pillowWidth, 0.16, 0.48],
      fabricMat
    );

    addBox(
      root,
      `${label} right pillow`,
      [x + width * 0.23, 0.84, z - bedDepth * 0.34],
      [pillowWidth, 0.16, 0.48],
      fabricMat
    );

    // Small gold accent cushions.
    if (options.decorativePillows) {
      addBox(
        root,
        `${label} decorative cushion`,
        [x, 0.91, z - bedDepth * 0.23],
        [0.45, 0.13, 0.34],
        goldMat
      );
    }
  }

  function makeBedsideTable(x, z, label) {
    addBox(
      root,
      `${label} bedside cabinet`,
      [x, 0.42, z],
      [0.7, 0.78, 0.68],
      woodMat
    );

    addBox(
      root,
      `${label} cabinet drawer`,
      [x, 0.55, z + 0.35],
      [0.57, 0.18, 0.035],
      goldMat
    );

    addBox(
      root,
      `${label} lamp base`,
      [x, 0.86, z],
      [0.24, 0.07, 0.24],
      goldMat
    );

    addBox(
      root,
      `${label} lamp shade`,
      [x, 1.12, z],
      [0.34, 0.43, 0.34],
      lampMat
    );

    addSphere(
      root,
      `${label} lamp glow`,
      [x, 1.39, z],
      0.08,
      lampMat
    );
  }

  function makeWardrobe(x, z) {
    addBox(
      root,
      "Full height wardrobe",
      [x, 1.28, z],
      [1.15, 2.55, 1.0],
      woodMat
    );

    addBox(
      root,
      "Wardrobe left door",
      [x - 0.28, 1.28, z + 0.515],
      [0.53, 2.43, 0.035],
      woodMat
    );

    addBox(
      root,
      "Wardrobe right door",
      [x + 0.28, 1.28, z + 0.515],
      [0.53, 2.43, 0.035],
      woodMat
    );

    addBox(
      root,
      "Wardrobe gold handle left",
      [x - 0.06, 1.25, z + 0.55],
      [0.035, 0.35, 0.035],
      goldMat
    );

    addBox(
      root,
      "Wardrobe gold handle right",
      [x + 0.06, 1.25, z + 0.55],
      [0.035, 0.35, 0.035],
      goldMat
    );
  }

  function makeDesk(x, z) {
    addBox(
      root,
      "Writing desk top",
      [x, 0.88, z],
      [1.7, 0.13, 0.72],
      woodMat
    );

    [-0.68, 0.68].forEach((offset) => {
      addBox(
        root,
        "Writing desk leg",
        [x + offset, 0.43, z],
        [0.1, 0.83, 0.62],
        woodMat
      );
    });

    addBox(
      root,
      "Desk chair seat",
      [x, 0.53, z + 0.72],
      [0.66, 0.15, 0.62],
      accentMat
    );

    addBox(
      root,
      "Desk chair back",
      [x, 0.92, z + 1.0],
      [0.66, 0.75, 0.13],
      accentMat
    );

    addBox(
      root,
      "Desk decorative book",
      [x - 0.35, 0.99, z],
      [0.36, 0.08, 0.25],
      runnerMat
    );
  }

  function makeTV() {
    // TV and console are placed on the right wall.
    addBox(
      root,
      "TV wall mount",
      [4.28, 2.05, 2.05],
      [0.12, 1.05, 1.65],
      darkMat
    );

    addBox(
      root,
      "TV screen",
      [4.19, 2.05, 2.05],
      [0.035, 0.88, 1.48],
      makeMaterial(0x243b3b, {
        metalness: 0.2,
        roughness: 0.25,
        emissive: 0x102322,
        emissiveIntensity: 0.25
      })
    );

    addBox(
      root,
      "TV console",
      [3.75, 0.46, 2.05],
      [0.95, 0.65, 1.9],
      woodMat
    );

    addBox(
      root,
      "TV console gold trim",
      [3.24, 0.75, 2.05],
      [0.035, 0.06, 1.75],
      goldMat
    );
  }

  function makeRug(x, z, width, length) {
    addBox(
      root,
      "Decorative area rug",
      [x, 0.025, z],
      [width, 0.045, length],
      runnerMat
    );

    addBox(
      root,
      "Rug gold border",
      [x, 0.052, z],
      [width - 0.18, 0.025, length - 0.18],
      goldMat
    );

    addBox(
      root,
      "Rug center",
      [x, 0.069, z],
      [width - 0.35, 0.025, length - 0.35],
      runnerMat
    );
  }

  function makeWallArtwork(x, y, z, width = 1.05) {
    addBox(
      root,
      "Wall artwork frame",
      [x, y, z],
      [width, 0.78, 0.08],
      goldMat
    );

    addBox(
      root,
      "Wall artwork canvas",
      [x, y, z + 0.055],
      [width - 0.12, 0.66, 0.035],
      makeMaterial(0xd7dfc9)
    );

    addBox(
      root,
      "Wall artwork botanical detail",
      [x, y, z + 0.08],
      [0.13, 0.48, 0.025],
      accentMat
    );
  }

  // --------------------------------------------------
  // STANDARD ROOM
  // --------------------------------------------------

  if (isStandard) {
    makeBed("Standard", 0, -1.35, 2.25, 3.05);

    makeBedsideTable(-1.65, -2.75, "Standard left");
    makeBedsideTable(1.65, -2.75, "Standard right");

    makeWardrobe(-3.45, -1.65);
    makeDesk(2.65, 2.15);
    makeTV();
    makeRug(0, 1.15, 3.4, 1.7);

    makeWallArtwork(-2.8, 2.55, -3.73, 0.9);
  }

  // --------------------------------------------------
  // DELUXE ROOM
  // --------------------------------------------------

  else if (isDeluxe) {
    makeBed("Deluxe king", -0.25, -1.35, 2.75, 3.2, {
      deluxe: true,
      decorativePillows: true
    });

    makeBedsideTable(-2.05, -2.8, "Deluxe left");
    makeBedsideTable(1.65, -2.8, "Deluxe right");

    makeWardrobe(-3.45, -1.7);
    makeTV();

    // Deluxe reading chair and side table.
    addBox(
      root,
      "Deluxe lounge chair seat",
      [-2.25, 0.52, 1.5],
      [1.0, 0.28, 0.9],
      accentMat
    );

    addBox(
      root,
      "Deluxe lounge chair back",
      [-2.25, 1.0, 1.9],
      [1.0, 0.95, 0.18],
      accentMat
    );

    addBox(
      root,
      "Deluxe lounge chair arm left",
      [-2.77, 0.77, 1.5],
      [0.14, 0.48, 0.9],
      woodMat
    );

    addBox(
      root,
      "Deluxe lounge chair arm right",
      [-1.73, 0.77, 1.5],
      [0.14, 0.48, 0.9],
      woodMat
    );

    addBox(
      root,
      "Deluxe side table",
      [-3.0, 0.4, 2.7],
      [0.58, 0.72, 0.58],
      woodMat
    );

    makeRug(0, 1.25, 3.8, 1.9);
    makeWallArtwork(-2.9, 2.55, -3.73, 0.95);
  }

  // --------------------------------------------------
  // FAMILY ROOM
  // --------------------------------------------------

  else if (isFamily) {
    // Two separate beds make the family layout visually different.
    makeBed("Family left", -1.45, -1.35, 1.65, 2.9);
    makeBed("Family right", 1.4, -1.35, 1.65, 2.9);

    makeBedsideTable(0, -2.8, "Family shared");
    makeWardrobe(-3.5, -1.6);
    makeTV();

    // Shared seating area.
    addBox(
      root,
      "Family sofa base",
      [0, 0.38, 2.1],
      [2.3, 0.5, 0.85],
      accentMat
    );

    addBox(
      root,
      "Family sofa back",
      [0, 0.83, 2.48],
      [2.3, 0.85, 0.18],
      accentMat
    );

    addBox(
      root,
      "Family sofa cushion left",
      [-0.62, 0.7, 2.0],
      [0.9, 0.25, 0.7],
      fabricMat
    );

    addBox(
      root,
      "Family sofa cushion right",
      [0.62, 0.7, 2.0],
      [0.9, 0.25, 0.7],
      fabricMat
    );

    addBox(
      root,
      "Family coffee table",
      [0, 0.36, 3.15],
      [1.35, 0.12, 0.65],
      woodMat
    );

    addBox(
      root,
      "Family coffee table base",
      [0, 0.18, 3.15],
      [0.85, 0.25, 0.12],
      woodMat
    );

    makeRug(0, 1.65, 4.3, 2.2);
    makeWallArtwork(-2.9, 2.55, -3.73, 0.95);
  }

  // --------------------------------------------------
  // SUITE
  // --------------------------------------------------

  else if (isSuite) {
    makeBed("Suite king", 0, -1.5, 3.0, 3.25, {
      deluxe: true,
      decorativePillows: true
    });

    makeBedsideTable(-2.0, -2.85, "Suite left");
    makeBedsideTable(2.0, -2.85, "Suite right");

    makeWardrobe(-3.45, -1.7);
    makeTV();

    // Suite sitting area with a sofa and coffee table.
    addBox(
      root,
      "Suite sofa base",
      [-1.15, 0.4, 2.1],
      [2.4, 0.5, 0.85],
      accentMat
    );

    addBox(
      root,
      "Suite sofa back",
      [-1.15, 0.86, 2.48],
      [2.4, 0.85, 0.18],
      accentMat
    );

    addBox(
      root,
      "Suite sofa seat cushion",
      [-1.15, 0.69, 2.0],
      [2.12, 0.2, 0.65],
      fabricMat
    );

    addBox(
      root,
      "Suite coffee table",
      [-1.15, 0.42, 3.25],
      [1.45, 0.12, 0.72],
      woodMat
    );

    addBox(
      root,
      "Suite coffee table gold base",
      [-1.15, 0.22, 3.25],
      [1.0, 0.08, 0.12],
      goldMat
    );

    // Decorative suite bench at the foot of the bed.
    addBox(
      root,
      "Suite end of bed bench",
      [1.8, 0.45, 1.0],
      [1.3, 0.3, 0.52],
      woodMat
    );

    addBox(
      root,
      "Suite bench cushion",
      [1.8, 0.63, 1.0],
      [1.28, 0.12, 0.49],
      fabricMat
    );

    makeRug(0, 1.25, 4.6, 2.0);
    makeWallArtwork(-3.0, 2.55, -3.73, 1.05);
  }

  // --------------------------------------------------
  // FALLBACK FOR OTHER ROOM TYPES
  // --------------------------------------------------

  else {
    makeBed("Guest", 0, -1.35, 2.45, 3.1, {
      decorativePillows: true
    });

    makeBedsideTable(-1.8, -2.8, "Guest left");
    makeBedsideTable(1.8, -2.8, "Guest right");

    makeWardrobe(-3.45, -1.7);
    makeDesk(2.6, 2.15);
    makeTV();
    makeRug(0, 1.15, 3.5, 1.8);
    makeWallArtwork(-2.8, 2.55, -3.73, 0.9);
  }

  // Additional premium room details.
  if (isDeluxe || isSuite) {
    addBox(
      root,
      "Premium ceiling feature",
      [0, 3.32, -0.2],
      [3.1, 0.06, 1.25],
      goldMat
    );

    addBox(
      root,
      "Premium ceiling inset",
      [0, 3.36, -0.2],
      [2.8, 0.035, 1.0],
      accentMat
    );
  }

  // Entry area: clear view when looking into the room.
  addBox(
    root,
    "Entrance threshold",
    [0, 0.035, 3.65],
    [2.1, 0.07, 0.35],
    woodMat
  );

  addPlant(root, -3.5, 2.8, 0.72);

  addLabel(root, `ROOM ${roomNumber(room)}`, [0, 2.75, 3.4], {
    width: 2.5,
    height: 0.72,
    fontSize: 40
  });

  addLabel(root, roomType(room).toUpperCase(), [0, 3.02, -3.67], {
    width: 3.6,
    height: 0.62,
    fontSize: 29
  });

  setCamera([0, 2.8, 10.5], [0, 1.35, -0.5]);

  statusMessage.value =
    `Room ${roomNumber(room)} opened. Explore the ${roomType(room)} interior.`;
}


function setCamera(position, target) {
  if (!camera || !controls) return;

  camera.position.set(...position);
  controls.target.set(...target);
  controls.update();
}

function openEntrance() {
  if (viewMode.value !== "exterior" || isOpening) return;

  isOpening = true;
  statusMessage.value = "Opening the main entrance...";

  const start = performance.now();
  const duration = 650;

  function animateDoors(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = progress * (2 - progress);

    if (entranceDoorLeft) entranceDoorLeft.rotation.y = eased * 0.75;
    if (entranceDoorRight) entranceDoorRight.rotation.y = -eased * 0.75;

    if (progress < 1) {
      requestAnimationFrame(animateDoors);
    } else {
      isOpening = false;
      buildHallway();
    }
  }

  requestAnimationFrame(animateDoors);
}

function enterRoom(room) {
  if (!room) return;

  selectedRoom.value = room;
  showRoomPhoto.value = true;

  statusMessage.value =
    `Room ${roomNumber(room)} selected. Previewing room photo.`;
}

function backToHallway() {
  buildHallway();
}

function backToEntrance() {
  buildExterior();
}

function selectRoomFromList(room) {
  selectedRoom.value = room;

  if (viewMode.value === "room") {
    buildRoomInterior(room);
  }

  statusMessage.value = `Room ${roomNumber(room)} selected.`;
}

function bookSelectedRoom() {
  if (!selectedRoom.value) {
    statusMessage.value = "Please select a room first.";
    return;
  }

  if (!isAvailable(selectedRoom.value)) {
    statusMessage.value = "This room is not currently available.";
    return;
  }

  // Preserve the existing GuestDashboard booking integration.
  emit("book-room", selectedRoom.value);

  statusMessage.value =
    `Room ${roomNumber(selectedRoom.value)} selected for booking.`;
}

function handleCanvasClick(event) {
  if (!renderer || !camera || !mountPoint.value) return;

  const rect = renderer.domElement.getBoundingClientRect();

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObjects(clickTargets, false);
  if (!hits.length) return;

  const hit = hits[0].object;
  const action = hit.userData.action;

  if (action === "open-entrance") {
    openEntrance();
    return;
  }

  if (action === "open-room") {
    enterRoom(hit.userData.room);
  }
}

function initThree() {
  if (!mountPoint.value) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe8eee5);
  scene.fog = new THREE.Fog(0xe8eee5, 30, 80);

  camera = new THREE.PerspectiveCamera(
    45,
    mountPoint.value.clientWidth / mountPoint.value.clientHeight,
    0.1,
    200
  );

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(mountPoint.value.clientWidth, mountPoint.value.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  mountPoint.value.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xfff5df, 0x586b56, 2.0));

  const sunlight = new THREE.DirectionalLight(0xffedce, 3.0);
  sunlight.position.set(10, 18, 12);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  scene.add(sunlight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
  fillLight.position.set(-10, 8, -8);
  scene.add(fillLight);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 4;
  controls.maxDistance = 35;
  controls.maxPolarAngle = Math.PI * 0.48;

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  renderer.domElement.addEventListener("click", handleCanvasClick);

  resizeObserver = new ResizeObserver(() => {
    if (!mountPoint.value || !renderer || !camera) return;

    const width = mountPoint.value.clientWidth;
    const height = mountPoint.value.clientHeight;

    if (!width || !height) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });

  resizeObserver.observe(mountPoint.value);

  function animate() {
    animationId = requestAnimationFrame(animate);

    controls?.update();

    if (scene && camera && renderer) {
      renderer.render(scene, camera);
    }
  }

  animate();
}

onMounted(async () => {
  initThree();
  await fetchRooms();
  buildExterior();
  loading.value = false;
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationId);
  resizeObserver?.disconnect();

  if (renderer) {
    renderer.domElement.removeEventListener("click", handleCanvasClick);
  }

  clearArchitecture();

  controls?.dispose();
  renderer?.dispose();

  if (renderer?.domElement?.parentNode) {
    renderer.domElement.parentNode.removeChild(renderer.domElement);
  }
});
</script>

<template>
  <section class="tour-page">
    <header class="tour-heading">
      <div>
        <p class="eyebrow">VERDE HAVEN BOUTIQUE HOTEL</p>
        <h1>Explore Your Stay</h1>
        <p class="subtitle">
          Enter the hotel, explore the hallway, and preview your room.
        </p>
      </div>

      <div class="view-indicator">
        <span class="indicator-dot"></span>
        {{
          viewMode === "exterior"
            ? "Hotel Exterior"
            : viewMode === "hallway"
              ? "Inside the Hotel"
              : "Room Interior"
        }}
      </div>
    </header>

    <div class="tour-layout">
      <main class="visual-panel">
        <div class="scene-toolbar">
          <div class="breadcrumb">
            <span :class="{ active: viewMode === 'exterior' }">Exterior</span>
            <span class="crumb-arrow">›</span>
            <span :class="{ active: viewMode === 'hallway' }">Hallway</span>
            <span class="crumb-arrow">›</span>
            <span :class="{ active: viewMode === 'room' }">Room</span>
          </div>

          <button
            v-if="viewMode === 'hallway'"
            class="small-button"
            type="button"
            @click="backToEntrance"
          >
            Back to Entrance
          </button>

          <button
            v-if="viewMode === 'room'"
            class="small-button"
            type="button"
            @click="backToHallway"
          >
            ← Back to Hallway
          </button>
        </div>

        <div ref="mountPoint" class="hotel-canvas">
          <div v-if="loading" class="canvas-message">
            <div class="loader"></div>
            <p>Preparing your hotel tour...</p>
          </div>
        </div>

        <div class="scene-caption">
          <div class="caption-icon">✦</div>
          <div>
            <strong>
              {{
                viewMode === "exterior"
                  ? "Welcome to Verde Haven"
                  : viewMode === "hallway"
                    ? "Guest Room Hallway"
                    : `Room ${selectedRoom ? roomNumber(selectedRoom) : ""}`
              }}
            </strong>
            <p>{{ statusMessage }}</p>
          </div>
        </div>

        <div class="scene-actions">
          <button
            v-if="viewMode === 'exterior'"
            class="primary-button"
            type="button"
            @click="openEntrance"
          >
            Open Main Entrance <span>→</span>
          </button>

          <button
            v-if="viewMode === 'hallway' && selectedRoom"
            class="primary-button"
            type="button"
            @click="enterRoom(selectedRoom)"
          >
            Enter Room {{ roomNumber(selectedRoom) }} <span>→</span>
          </button>

          <button
            v-if="viewMode === 'room'"
            class="primary-button"
            type="button"
            @click="backToHallway"
          >
            Back to Hallway <span>→</span>
          </button>

          <button
            v-if="viewMode === 'room'"
            class="booking-button"
            type="button"
            :disabled="!selectedRoom || !isAvailable(selectedRoom)"
            @click="bookSelectedRoom"
          >
            Continue to Booking
          </button>
        </div>
      </main>

      <aside class="room-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">ACCOMMODATIONS</p>
            <h2>Our Rooms</h2>
          </div>
          <span class="room-count">{{ rooms.length }}</span>
        </div>

        <p class="panel-description">
          Select a room to view its matching Browse Rooms photo, room details,
          and 3D interior.
        </p>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <div v-if="!rooms.length && !loading" class="empty-state">
          <span>⌂</span>
          <p>No room records were returned by the server.</p>
          <small>
            The 3D hallway has sample doors for preview. Actual booking requires
            room records from your backend.
          </small>
        </div>

        <div v-else class="room-list">
          <button
            v-for="(room, index) in rooms"
            :key="room.id ?? roomNumber(room, index)"
            class="room-card"
            :class="{ selected: selectedRoom?.id === room.id }"
            type="button"
            @click="selectRoomFromList(room)"
          >
            <div class="room-card-image-wrap">
              <img
                class="room-card-image"
                :src="getRoomImage(room)"
                :alt="roomType(room)"
                loading="lazy"
              />

              <span class="photo-tag">VERDE HAVEN</span>
            </div>

            <div class="room-card-top">
              <span class="room-number">
                ROOM {{ roomNumber(room, index) }}
              </span>

              <span
                class="availability"
                :class="isAvailable(room) ? 'available' : 'unavailable'"
              >
                {{ isAvailable(room) ? "Available" : "Unavailable" }}
              </span>
            </div>

            <h3>{{ roomType(room) }}</h3>

            <div class="room-card-bottom">
              <span class="room-price">
                ₱{{ roomPrice(room) }}
                <small>/ night</small>
              </span>
              <span class="card-arrow">↗</span>
            </div>
          </button>
        </div>

        <div v-if="selectedRoom" class="selected-details">
          <p class="eyebrow">SELECTED ACCOMMODATION</p>

          <img
            class="selected-room-image"
            :src="getRoomImage(selectedRoom)"
            :alt="roomType(selectedRoom)"
          />

          <div class="selected-photo-caption">
            <span>ROOM {{ roomNumber(selectedRoom) }}</span>
            <span>ROOM PHOTO</span>
          </div>

          <h3>Room {{ roomNumber(selectedRoom) }}</h3>
          <p class="selected-type">{{ roomType(selectedRoom) }}</p>

          <p class="room-description">
            {{
              selectedRoom.description ||
              "A welcoming space designed for a comfortable and relaxing stay."
            }}
          </p>

          <div class="detail-line">
            <span>Rate per night</span>
            <strong>₱{{ roomPrice(selectedRoom) }}</strong>
          </div>

          <div class="detail-line">
            <span>Capacity</span>
            <strong>{{ roomCapacity(selectedRoom) }} guests</strong>
          </div>

          <div class="detail-line">
            <span>Status</span>
            <strong>
              {{ isAvailable(selectedRoom) ? "Available" : "Unavailable" }}
            </strong>
          </div>

          <button
            class="outline-button"
            type="button"
            :disabled="!isAvailable(selectedRoom)"
            @click="enterRoom(selectedRoom)"
          >
            Preview This Room in 3D
          </button>
        </div>
      </aside>
    </div>
<!-- ROOM PHOTO POPUP -->
<div
  v-if="showRoomPhoto && selectedRoom"
  class="room-photo-overlay"
  @click.self="showRoomPhoto = false"
>
  <div class="room-photo-modal">
    <button
      type="button"
      class="room-photo-close"
      @click="showRoomPhoto = false"
    >
      ✕
    </button>

    <p class="room-photo-label">VERDE HAVEN BOUTIQUE HOTEL</p>

    <h2>Room {{ roomNumber(selectedRoom) }}</h2>

    <p class="room-photo-type">
      {{ roomType(selectedRoom) }}
    </p>

    <img
      class="room-photo-large"
      :src="getRoomImage(selectedRoom)"
      :alt="roomType(selectedRoom)"
    />

    <p class="room-photo-price">
      ₱{{ roomPrice(selectedRoom) }} / night
    </p>

    <button
      type="button"
      class="room-photo-back"
      @click="showRoomPhoto = false"
    >
      ← Back to Hallway
    </button>

    <button
      type="button"
      class="room-photo-book"
      :disabled="!isAvailable(selectedRoom)"
      @click="showRoomPhoto = false; bookSelectedRoom()"
    >
      Book This Room
    </button>
  </div>
</div>
    <footer class="tour-footer">
      <span>VERDE HAVEN</span>
      <span>Stay. Relax. Discover.</span>
    </footer>
  </section>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.tour-page {
  min-height: 100%;
  padding: 28px;
  color: #213a2e;
  background: #f5f3ed;
  font-family: "DM Sans", "Segoe UI", sans-serif;
}

.tour-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  max-width: 1600px;
  margin: 0 auto 24px;
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
  font-family: "Playfair Display", Georgia, "Times New Roman", serif;
  font-size: clamp(28px, 3vw, 42px);
  font-weight: 500;
}

.subtitle {
  margin: 9px 0 0;
  color: #778176;
  font-size: 13px;
  line-height: 1.7;
}

.view-indicator {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 15px;
  border: 1px solid #e3dfd3;
  border-radius: 30px;
  background: #fffdf8;
  color: #4b604f;
  font-size: 12px;
  white-space: nowrap;
}

.indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6e9568;
  box-shadow: 0 0 0 4px #e8efe4;
}

.tour-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 350px;
  align-items: start;
  gap: 22px;
  max-width: 1600px;
  margin: 0 auto;
}

.visual-panel,
.room-panel {
  min-width: 0;
  overflow: hidden;
  border: 1px solid #e6e1d6;
  border-radius: 16px;
  background: #fffdf8;
  box-shadow: 0 8px 30px rgb(30 52 38 / 5%);
}

.scene-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 15px 18px;
  border-bottom: 1px solid #ece8de;
}

.breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 9px;
  color: #9a9d91;
  font-size: 11px;
}

.breadcrumb span.active {
  color: #254d38;
  font-weight: 800;
}

.crumb-arrow {
  color: #c2b49a;
}

.small-button {
  padding: 8px 12px;
  border: 1px solid #d9dfd4;
  border-radius: 7px;
  background: #f7f7f1;
  color: #345440;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
}

.hotel-canvas {
  position: relative;
  width: 100%;
  height: clamp(390px, 55vw, 640px);
  min-height: 390px;
  overflow: hidden;
  background: #e8eee5;
}

.hotel-canvas canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
  outline: none;
}

.hotel-canvas canvas:active {
  cursor: grabbing;
}

.canvas-message {
  position: absolute;
  z-index: 3;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 12px;
  background: #e8eee5;
  color: #345440;
  font-size: 13px;
}

.loader {
  width: 28px;
  height: 28px;
  border: 3px solid #d4ddcf;
  border-top-color: #28533e;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.scene-caption {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 17px 20px;
  border-top: 1px solid #e9e5db;
}

.caption-icon {
  display: grid;
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 9px;
  background: #e9eee4;
  color: #9c7b42;
}

.scene-caption strong {
  display: block;
  color: #244432;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 16px;
  font-weight: 600;
}

.scene-caption p {
  margin: 5px 0 0;
  color: #7b8278;
  font-size: 12px;
  line-height: 1.6;
}

.scene-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 0 20px 20px;
}

.primary-button,
.booking-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-height: 44px;
  padding: 12px 18px;
  border: 0;
  border-radius: 8px;
  background: #1b4432;
  color: #fff9eb;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 800;
  transition: background 0.2s, transform 0.2s;
}

.primary-button:hover,
.booking-button:hover:not(:disabled) {
  background: #2d5b41;
  transform: translateY(-1px);
}

.primary-button span {
  color: #e1c38a;
  font-size: 18px;
}

.booking-button {
  border: 1px solid #c5a367;
  background: #c5a367;
  color: #1c3528;
}

.booking-button:disabled,
.outline-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.room-panel {
  padding: 20px;
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-heading h2 {
  margin: 0;
  color: #1c3d2c;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 26px;
  font-weight: 500;
}

.room-count {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 50%;
  background: #e8eee5;
  color: #28533e;
  font-size: 12px;
  font-weight: 800;
}

.panel-description {
  margin: 12px 0 18px;
  color: #7d8579;
  font-size: 12px;
  line-height: 1.7;
}

.room-list {
  display: grid;
  gap: 12px;
  max-height: 550px;
  overflow-y: auto;
  padding-right: 3px;
}

.room-card {
  width: 100%;
  overflow: hidden;
  padding: 10px;
  border: 1px solid #e8e4d9;
  border-radius: 11px;
  background: #fffefa;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, transform 0.2s;
}

.room-card:hover {
  transform: translateY(-2px);
  border-color: #b8c6b3;
}

.room-card.selected {
  border-color: #50775a;
  background: #f0f4eb;
  box-shadow: inset 3px 0 #28533e;
}

.room-card-image-wrap {
  position: relative;
  height: 145px;
  overflow: hidden;
  margin-bottom: 13px;
  border-radius: 7px;
  background: #e8eee5;
}

.room-card-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s ease;
}

.room-card:hover .room-card-image {
  transform: scale(1.04);
}

.photo-tag {
  position: absolute;
  bottom: 9px;
  left: 9px;
  padding: 6px 8px;
  border: 1px solid rgb(255 255 255 / 25%);
  border-radius: 4px;
  background: rgb(23 59 45 / 88%);
  color: #fff8e9;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 1.4px;
}

.room-card-top,
.room-card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.room-number {
  color: #987c4b;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1px;
}

.availability {
  padding: 4px 7px;
  border-radius: 5px;
  font-size: 9px;
  font-weight: 800;
}

.availability.available {
  background: #e3eee0;
  color: #3b7042;
}

.availability.unavailable {
  background: #f4e5de;
  color: #9a5140;
}

.room-card h3 {
  margin: 12px 0;
  color: #284331;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 18px;
  font-weight: 500;
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

.card-arrow {
  color: #a68a57;
  font-size: 17px;
}

.selected-details {
  margin-top: 20px;
  padding: 16px;
  border: 1px solid #e7e0d2;
  border-radius: 10px;
  background: #f8f6ef;
}

.selected-room-image {
  display: block;
  width: 100%;
  height: 190px;
  margin: 14px 0 0;
  border-radius: 8px 8px 0 0;
  object-fit: cover;
  background: #e8eee5;
}

.selected-photo-caption {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 0 0 7px 7px;
  background: #e9eee4;
  color: #58705b;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 1px;
}

.selected-details h3 {
  margin: 16px 0 0;
  color: #1d402d;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 22px;
}

.selected-type {
  margin: 5px 0 10px;
  color: #7c8278;
  font-size: 12px;
}

.room-description {
  color: #778176;
  font-size: 11px;
  line-height: 1.7;
}

.detail-line {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid #e8e2d6;
  color: #7b8176;
  font-size: 11px;
}

.detail-line strong {
  color: #2a4734;
  text-align: right;
}

.outline-button {
  width: 100%;
  margin-top: 12px;
  padding: 12px;
  border: 1px solid #315640;
  border-radius: 7px;
  background: transparent;
  color: #254632;
  cursor: pointer;
  font-family: inherit;
  font-size: 11px;
  font-weight: 800;
}

.outline-button:hover:not(:disabled) {
  background: #e9eee5;
}

.empty-state {
  padding: 20px 10px;
  border: 1px dashed #d9d9cb;
  border-radius: 9px;
  color: #7d8579;
  text-align: center;
  font-size: 12px;
  line-height: 1.6;
}

.empty-state span {
  color: #9a8359;
  font-size: 28px;
}

.empty-state small {
  display: block;
  margin-top: 8px;
}

.error-message {
  margin: 12px 0;
  padding: 12px;
  border-radius: 8px;
  background: #f7e8e2;
  color: #944b3c;
  font-size: 11px;
  line-height: 1.6;
}

.tour-footer {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  max-width: 1600px;
  margin: 20px auto 0;
  color: #8b9084;
  font-size: 10px;
  letter-spacing: 1px;
}

.tour-footer span:first-child {
  color: #33543d;
  font-weight: 900;
  letter-spacing: 2px;
}

@media (max-width: 1050px) {
  .tour-layout {
    grid-template-columns: minmax(0, 1fr) 310px;
    gap: 14px;
  }

  .tour-page {
    padding: 18px;
  }

  .room-panel {
    padding: 15px;
  }
}

@media (max-width: 760px) {
  .tour-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .tour-layout {
    grid-template-columns: 1fr;
  }

  .hotel-canvas {
    height: 440px;
    min-height: 360px;
  }

  .room-list {
    max-height: 460px;
  }

  .room-card-image-wrap {
    height: 190px;
  }

  .selected-room-image {
    height: 230px;
  }
}

@media (max-width: 480px) {
  .tour-page {
    padding: 10px;
  }

  .hotel-canvas {
    height: 350px;
    min-height: 320px;
  }

  .scene-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .scene-actions {
    flex-direction: column;
  }

  .scene-actions button {
    width: 100%;
  }

  .tour-footer {
    font-size: 9px;
  }

  .room-card-image-wrap {
    height: 180px;
  }

  .selected-room-image {
    height: 210px;
  }
}
/* ROOM PHOTO POPUP */
.room-photo-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(10, 27, 19, 0.85);
  backdrop-filter: blur(6px);
}

.room-photo-modal {
  position: relative;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 28px;
  border: 1px solid #d5bd8c;
  border-radius: 16px;
  background: #fffdf7;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}

.room-photo-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 50%;
  background: #e8eee5;
  color: #173b2d;
  font-size: 20px;
  cursor: pointer;
}

.room-photo-label {
  margin: 0 45px 10px 0;
  color: #8b7549;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 2px;
}

.room-photo-modal h2 {
  margin: 0;
  color: #173b2d;
  font-family: "Playfair Display", Georgia, serif;
  font-size: 30px;
}

.room-photo-type {
  margin: 8px 0 18px;
  color: #788176;
  font-size: 13px;
}

.room-photo-large {
  display: block;
  width: 100%;
  height: 300px;
  border-radius: 10px;
  background: #e8eee5;
  object-fit: cover;
}

.room-photo-price {
  margin: 16px 0;
  color: #244b38;
  font-size: 16px;
  font-weight: 800;
}

.room-photo-back,
.room-photo-book {
  display: block;
  width: 100%;
  min-height: 44px;
  margin-top: 10px;
  padding: 12px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.room-photo-back {
  border: 1px solid #315640;
  background: transparent;
  color: #244b38;
}

.room-photo-book {
  border: 1px solid #c5a367;
  background: #c5a367;
  color: #193b30;
}

.room-photo-book:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .room-photo-modal {
    padding: 22px 16px;
  }

  .room-photo-large {
    height: 220px;
  }
} 
</style>
