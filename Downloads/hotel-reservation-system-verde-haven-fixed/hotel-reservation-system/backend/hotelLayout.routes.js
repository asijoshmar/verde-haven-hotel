
import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const router = Router();
const uploadDirectory = path.resolve(
  process.cwd(),
  "uploads",
  "hotel-layouts"
);

fs.mkdirSync(uploadDirectory, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, done) =>
      done(null, uploadDirectory),

    filename: (_req, file, done) => {
      const ext =
        file.mimetype === "image/png"
          ? ".png"
          : file.mimetype === "image/webp"
          ? ".webp"
          : ".jpg";

      done(null, `${crypto.randomUUID()}${ext}`);
    }
  }),

  limits: { fileSize: 8 * 1024 * 1024 },

  fileFilter: (_req, file, done) => {
    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp"
      ].includes(file.mimetype)
    ) {
      return done(
        new Error(
          "Only JPG, PNG, or WEBP images are allowed."
        )
      );
    }

    done(null, true);
  }
});

// Four room groups plus Lobby and Pool.
const BASE_MARKERS = [
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

function position(value, fallback) {
  const number = Number(value);

  return (
    Number.isFinite(number) &&
    number >= 0 &&
    number <= 100
  )
    ? number
    : fallback;
}

// Remove old individual markers.
// Keep coordinates of existing group markers.
function normalizePins(saved) {
  const source = Array.isArray(saved) ? saved : [];

  return BASE_MARKERS.map(base => {
    const current = source.find(pin => {
      if (!pin || pin.room_id) return false;

      if (pin.key === base.key) return true;

      return (
        !base.area &&
        !pin.area &&
        String(pin.match || "").toLowerCase() ===
          base.match
      );
    });

    return {
      ...base,
      x: position(current?.x, base.x),
      y: position(current?.y, base.y)
    };
  });
}

// Initialize PostgreSQL hotel layout storage.
export async function initializeHotelLayout(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hotel_tour_layouts (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      draft_image_url TEXT,
      draft_pins JSONB NOT NULL DEFAULT '[]'::jsonb,
      published_image_url TEXT,
      published_pins JSONB,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      published_at TIMESTAMPTZ
    );

    INSERT INTO hotel_tour_layouts (id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING;
  `);
}

// Existing local admin key protection.
function adminGuard(req, res, next) {
  const secret = process.env.ADMIN_LAYOUT_KEY || "";

  if (secret.length < 16) {
    return res.status(503).json({
      message:
        "Configure ADMIN_LAYOUT_KEY (16+ characters) in backend .env."
    });
  }

  const given = req.get("x-layout-key") || "";

  const a = Buffer.from(given);
  const b = Buffer.from(secret);

  if (
    a.length !== b.length ||
    !crypto.timingSafeEqual(a, b)
  ) {
    return res.status(403).json({
      message: "Invalid Admin Layout Key."
    });
  }

  next();
}

export function hotelLayoutRouter(pool) {

  // Public guest tour.
  // Old individual markers are automatically hidden.
  router.get("/hotel-tour/layout", async (_req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT
          published_image_url AS image_url,
          published_pins AS pins
        FROM hotel_tour_layouts
        WHERE id = 1
      `);

      const record = rows[0];

      res.json({
        image_url: record?.image_url || null,

        pins:
          record?.pins === null ||
          record?.pins === undefined
            ? null
            : normalizePins(record.pins)
      });
    } catch (error) {
      console.error("Public layout:", error);

      res.status(500).json({
        message: "Cannot load public hotel tour."
      });
    }
  });

  // Admin layout.
  router.get(
    "/admin/hotel-tour/layout",
    adminGuard,
    async (_req, res) => {
      try {
        const { rows } = await pool.query(`
          SELECT
            draft_image_url AS image_url,
            draft_pins AS pins,
            published_at
          FROM hotel_tour_layouts
          WHERE id = 1
        `);

        const record = rows[0];

        res.json({
          image_url: record?.image_url || null,
          pins: normalizePins(record?.pins),
          published_at: record?.published_at || null
        });
      } catch (error) {
        console.error("Admin layout:", error);

        res.status(500).json({
          message: "Cannot load hotel editor."
        });
      }
    }
  );

  // Room types from PostgreSQL.
  router.get(
    "/admin/hotel-tour/room-types",
    adminGuard,
    async (_req, res) => {
      try {
        const { rows } = await pool.query(`
          SELECT
            id,
            name,
            price_per_night,
            capacity
          FROM room_types
          ORDER BY name
        `);

        res.json(rows);
      } catch (error) {
        console.error("Room types:", error);

        res.status(500).json({
          message: "Cannot load room types."
        });
      }
    }
  );

  // Create a REAL room in PostgreSQL.
  // NO NEW MARKER IS CREATED.
  router.post(
    "/admin/hotel-tour/rooms",
    adminGuard,
    async (req, res) => {
      const roomNumber = String(
        req.body?.room_number ?? ""
      ).trim();

      const roomTypeId = Number(
        req.body?.room_type_id
      );

      if (
        !roomNumber ||
        roomNumber.length > 30 ||
        !Number.isInteger(roomTypeId) ||
        roomTypeId <= 0
      ) {
        return res.status(400).json({
          message:
            "Enter a valid room number and room type."
        });
      }

      try {
        const { rows } = await pool.query(
          `
          INSERT INTO rooms (
            room_number,
            room_type_id,
            status
          )
          VALUES ($1, $2, 'available')
          RETURNING
            id,
            room_number,
            room_type_id,
            status
          `,
          [roomNumber, roomTypeId]
        );

        res.status(201).json({
          ...rows[0],
          message:
            "Room created in PostgreSQL. No individual marker was added."
        });

      } catch (error) {
        if (error.code === "23505") {
          return res.status(409).json({
            message: "Room number already exists."
          });
        }

        if (error.code === "23503") {
          return res.status(400).json({
            message: "Room type does not exist."
          });
        }

        console.error("Create room:", error);

        res.status(500).json({
          message:
            "Cannot create room. Check your rooms table schema."
        });
      }
    }
  );

  // Upload a new hotel overview image.
  router.post(
    "/admin/hotel-tour/upload",
    adminGuard,
    (req, res) => {
      upload.single("image")(req, res, error => {
        if (error) {
          return res.status(400).json({
            message: error.message
          });
        }

        if (!req.file) {
          return res.status(400).json({
            message: "Select an image."
          });
        }

        res.status(201).json({
          image_url:
            `/uploads/hotel-layouts/${req.file.filename}`
        });
      });
    }
  );

  // Save layout draft.
  router.put(
    "/admin/hotel-tour/layout",
    adminGuard,
    async (req, res) => {
      const {
        image_url = null,
        pins
      } = req.body || {};

      const imageValid =
        image_url === null ||
        (
          typeof image_url === "string" &&
          /^\/uploads\/hotel-layouts\/[a-zA-Z0-9-]+\.(jpg|png|webp)$/
            .test(image_url)
        );

      if (!imageValid || !Array.isArray(pins)) {
        return res.status(400).json({
          message: "Invalid layout data."
        });
      }

      try {
        await pool.query(
          `
          UPDATE hotel_tour_layouts
          SET
            draft_image_url = $1,
            draft_pins = $2::jsonb,
            updated_at = NOW()
          WHERE id = 1
          `,
          [
            image_url,
            JSON.stringify(normalizePins(pins))
          ]
        );

        res.json({
          message:
            "Clean layout draft saved to PostgreSQL."
        });
      } catch (error) {
        console.error("Save layout:", error);

        res.status(500).json({
          message: "Cannot save layout."
        });
      }
    }
  );

  // Publish only the six original group/facility pins.
  router.post(
    "/admin/hotel-tour/publish",
    adminGuard,
    async (_req, res) => {
      const client = await pool
        .connect()
        .catch(() => null);

      if (!client) {
        return res.status(500).json({
          message: "Database unavailable."
        });
      }

      try {
        await client.query("BEGIN");

        const { rows } = await client.query(`
          SELECT
            draft_pins,
            draft_image_url
          FROM hotel_tour_layouts
          WHERE id = 1
          FOR UPDATE
        `);

        if (!rows.length) {
          throw new Error(
            "Hotel layout not initialized."
          );
        }

        const clean = JSON.stringify(
          normalizePins(rows[0].draft_pins)
        );

        await client.query(
          `
          UPDATE hotel_tour_layouts
          SET
            draft_pins = $1::jsonb,
            published_pins = $1::jsonb,
            published_image_url = $2,
            published_at = NOW(),
            updated_at = NOW()
          WHERE id = 1
          `,
          [clean, rows[0].draft_image_url]
        );

        await client.query("COMMIT");

        res.json({
          message:
            "Published only the four room-type markers and two facility markers."
        });

      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});

        console.error("Publish:", error);

        res.status(500).json({
          message: "Cannot publish hotel tour."
        });

      } finally {
        client.release();
      }
    }
  );

  return router;
}

export const hotelLayoutUploadsDirectory =
  uploadDirectory;
