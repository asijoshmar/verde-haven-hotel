
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import pool from "./db.js";
import bcrypt from "bcrypt";

import {
  hotelLayoutRouter,
  initializeHotelLayout,
  hotelLayoutUploadsDirectory
} from "./hotelLayout.routes.js";
import {
  demoPaymentRouter,
  initializeDemoPayments,
  makeDemoToken
} from "./demoPayment.routes.js";


dotenv.config({ path: fileURLToPath(new URL("./.env", import.meta.url)) });

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
// GCash demo routes.
app.use("/api/demo-payment", demoPaymentRouter(pool));

// DEMO MODE: prevent the old payment endpoint
// from recording real paid transactions.
app.use("/api/payments", (req, res, next) => {
  if (
    process.env.DEMO_MODE === "true" &&
    req.method === "POST"
  ) {
    return res.status(403).json({
      message:
        "Real payment recording is disabled in demo mode."
    });
  }

  next();
});

app.use(
  "/uploads/hotel-layouts",
  express.static(hotelLayoutUploadsDirectory)
);

app.use("/api", hotelLayoutRouter(pool));


// =========================
// TEST API
// =========================

app.get("/", (req, res) => {
  res.json({
    message: "Hotel Reservation System API is running!",
  });
});

// =========================
// GET ALL ROOMS
// =========================

app.get("/api/rooms", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        rooms.id,
        rooms.room_number,
        rooms.status,
        room_types.name AS room_type,
        room_types.description,
        room_types.price_per_night,
        room_types.capacity
      FROM rooms
      JOIN room_types
        ON rooms.room_type_id = room_types.id
      ORDER BY rooms.room_number
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Rooms error:", error.message);
    res.status(500).json({
      message: "Failed to retrieve rooms.",
    });
  }
});

// =========================
// CREATE RESERVATION
// =========================

app.post("/api/reservations", async (req, res) => {
  try {
    const {
      user_id,
      room_id,
      check_in,
      check_out,
      guests_count,
    } = req.body;

    if (
      !user_id ||
      !room_id ||
      !check_in ||
      !check_out ||
      !Number.isInteger(Number(guests_count)) ||
      Number(guests_count) < 1
    ) {
      return res.status(400).json({
        message: "All reservation fields are required.",
      });
    }

    const datesValid =
      /^\d{4}-\d{2}-\d{2}$/.test(check_in) &&
      /^\d{4}-\d{2}-\d{2}$/.test(check_out) &&
      check_out > check_in;

    if (!datesValid) {
      return res.status(400).json({
        message: "Check-out date must be after check-in date.",
      });
    }

    const roomResult = await pool.query(
      `
      SELECT
        rooms.id,
        rooms.status,
        room_types.price_per_night,
        room_types.capacity
      FROM rooms
      JOIN room_types
        ON rooms.room_type_id = room_types.id
      WHERE rooms.id = $1
      `,
      [room_id]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({
        message: "Room not found.",
      });
    }

    const room = roomResult.rows[0];

    if (room.status !== "available") {
      return res.status(400).json({
        message: "Room is not available.",
      });
    }

    if (Number(guests_count) > room.capacity) {
      return res.status(400).json({
        message: "Number of guests exceeds room capacity.",
      });
    }

    const guestResult = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND role = 'guest'",
      [user_id]
    );

    if (guestResult.rows.length === 0) {
      return res.status(404).json({
        message: "Guest account not found.",
      });
    }

    const nights =
      (Date.parse(`${check_out}T00:00:00Z`) -
        Date.parse(`${check_in}T00:00:00Z`)) /
      86400000;

    const totalAmount =
      nights * Number(room.price_per_night);

    // Check overlapping reservations for this room.
    const conflict = await pool.query(
      `
      SELECT id
      FROM reservations
      WHERE room_id = $1
        AND LOWER(status) <> 'cancelled'
        AND check_in < $3::date
        AND check_out > $2::date
      LIMIT 1
      `,
      [room_id, check_in, check_out]
    );

    if (conflict.rows.length > 0) {
      return res.status(409).json({
        message: "Room already has a reservation for those dates.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO reservations (
        user_id,
        room_id,
        check_in,
        check_out,
        guests_count,
        total_amount
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        user_id,
        room_id,
        check_in,
        check_out,
        Number(guests_count),
        totalAmount,
      ]
    );

    res.status(201).json({
  message: "Reservation created successfully.",
  reservation: result.rows[0],
  demo_payment_token: makeDemoToken(result.rows[0])
});
  } catch (error) {
    console.error("Reservation error:", error);
    res.status(500).json({
      message: "Failed to create reservation.",
    });
  }
});

// =========================
// GET RESERVATIONS BY GUEST
// =========================

app.get("/api/reservations/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `
      SELECT
        reservations.id,
        reservations.user_id,
        reservations.room_id,
        reservations.check_in,
        reservations.check_out,
        reservations.guests_count,
        reservations.total_amount,
        reservations.status,
        reservations.created_at,
        rooms.room_number,
        room_types.name AS room_type,
        room_types.description,
        room_types.price_per_night
      FROM reservations
      JOIN rooms
        ON reservations.room_id = rooms.id
      JOIN room_types
        ON rooms.room_type_id = room_types.id
      WHERE reservations.user_id = $1
      ORDER BY reservations.created_at DESC
      `,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Get reservations error:", error.message);
    res.status(500).json({
      message: "Failed to retrieve reservations.",
    });
  }
});

// =========================
// GUEST REGISTRATION
// =========================

app.post("/api/auth/register", async (req, res) => {
  try {
    const fullName = String(req.body.full_name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const phone = String(req.body.phone || "").trim();

    if (!fullName || !email || !password) {
      return res.status(400).json({
        message: "Full name, email, and password are required.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters.",
      });
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "Email is already registered.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (
        full_name, email, password_hash, phone, role
      )
      VALUES ($1, $2, $3, $4, 'guest')
      RETURNING id, full_name, email, phone, role
      `,
      [fullName, email, passwordHash, phone || null]
    );

    res.status(201).json({
      message: "Registration successful.",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Email is already registered.",
      });
    }

    res.status(500).json({
      message: "Registration failed.",
    });
  }
});

// =========================
// GUEST LOGIN
// =========================

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const result = await pool.query(
      `
      SELECT id, full_name, email, password_hash, phone, role
      FROM users
      WHERE LOWER(email) = LOWER($1)
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    res.json({
      message: "Login successful.",
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({
      message: "Login failed.",
    });
  }
});

// =========================
// PAYMENTS
// =========================

app.post("/api/payments", async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      reservation_id,
      amount,
      payment_method,
    } = req.body;

    if (
      !reservation_id ||
      amount === undefined ||
      amount === null ||
      !payment_method
    ) {
      return res.status(400).json({
        message: "Payment fields are required.",
      });
    }

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({
        message: "Payment amount must be greater than zero.",
      });
    }

    await client.query("BEGIN");

    const reservationResult = await client.query(
      `
      SELECT id, total_amount, status
      FROM reservations
      WHERE id = $1
      FOR UPDATE
      `,
      [reservation_id]
    );

    if (reservationResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Reservation not found.",
      });
    }

    const reservation = reservationResult.rows[0];

    if (Number(amount) !== Number(reservation.total_amount)) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Payment amount does not match reservation total.",
      });
    }

    const existingPayment = await client.query(
      `
      SELECT id
      FROM payments
      WHERE reservation_id = $1
        AND status = 'paid'
      LIMIT 1
      `,
      [reservation_id]
    );

    if (existingPayment.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        message: "Reservation has already been paid.",
      });
    }

    const transactionReference =
      `PAY-${Date.now()}-${reservation_id}`;

    const paymentResult = await client.query(
      `
      INSERT INTO payments (
        reservation_id,
        amount,
        payment_method,
        transaction_reference,
        status,
        paid_at
      )
      VALUES ($1, $2, $3, $4, 'paid', CURRENT_TIMESTAMP)
      RETURNING *
      `,
      [
        reservation_id,
        amount,
        payment_method,
        transactionReference,
      ]
    );

    await client.query(
      "UPDATE reservations SET status = 'confirmed' WHERE id = $1",
      [reservation_id]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Payment recorded successfully.",
      payment: paymentResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Payment error:", error.message);
    res.status(500).json({
      message: "Failed to process payment.",
    });
  } finally {
    client.release();
  }
});

// =========================
// ADMIN DASHBOARD STATISTICS
// =========================

app.get("/api/admin/dashboard-stats", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM rooms) AS total_rooms,
        (SELECT COUNT(*) FROM rooms
          WHERE status = 'available') AS available_rooms,
        (SELECT COUNT(*) FROM reservations) AS total_reservations,
        (SELECT COUNT(*) FROM reservations
          WHERE status = 'pending') AS pending_reservations,
        (SELECT COUNT(*) FROM reservations
          WHERE status = 'confirmed') AS confirmed_reservations,
        (SELECT COUNT(*) FROM reservations
          WHERE status = 'cancelled') AS cancelled_reservations,
        (SELECT COUNT(*) FROM payments
          WHERE status = 'paid') AS paid_payments,
        (SELECT COALESCE(SUM(amount), 0) FROM payments
          WHERE status = 'paid') AS total_revenue
    `);

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Dashboard statistics error:", error.message);
    res.status(500).json({
      message: "Failed to retrieve dashboard statistics.",
    });
  }
});

// =========================
// RECENT RESERVATIONS
// =========================

app.get("/api/admin/recent-reservations", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        reservations.id,
        users.full_name AS guest_name,
        rooms.room_number,
        room_types.name AS room_type,
        reservations.check_in,
        reservations.check_out,
        reservations.total_amount,
        reservations.status,
        reservations.created_at
      FROM reservations
      JOIN users
        ON reservations.user_id = users.id
      JOIN rooms
        ON reservations.room_id = rooms.id
      JOIN room_types
        ON rooms.room_type_id = room_types.id
      ORDER BY reservations.created_at DESC
      LIMIT 5
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Recent reservations error:", error.message);
    res.status(500).json({
      message: "Failed to retrieve recent reservations.",
    });
  }
});

// =========================
// ADMIN GUESTS - GET
// =========================

app.get("/api/admin/guests", async (req, res) => {
  try {
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;

    const isValidDate = (value) => {
      if (!value) return true;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

      const date = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value;
    };

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return res.status(400).json({
        message: "Please provide valid dates in YYYY-MM-DD format.",
      });
    }

    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json({
        message: "Start date must not be after end date.",
      });
    }

    const result = await pool.query(
      `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.role,
        u.created_at,

        booking.id AS reservation_id,
        booking.room_number,
        booking.room_type,
        booking.check_in,
        booking.check_out,
        booking.reservation_status,
        booking.guests_count,
        booking.total_amount,

        CASE
          WHEN booking.id IS NULL THEN 'Not Staying'
          WHEN LOWER(booking.reservation_status) = 'cancelled'
            THEN 'Cancelled'
          WHEN LOWER(booking.reservation_status) = 'pending'
            THEN 'Pending'
          WHEN LOWER(booking.reservation_status)
            IN ('completed', 'checked_out')
            THEN 'Checked Out'
          WHEN booking.check_out <= CURRENT_DATE
            THEN 'Checked Out'
          WHEN booking.check_in > CURRENT_DATE
            THEN 'Upcoming'
          WHEN LOWER(booking.reservation_status)
            IN ('confirmed', 'checked_in')
            AND booking.check_in <= CURRENT_DATE
            AND booking.check_out > CURRENT_DATE
            THEN 'Currently Staying'
          ELSE INITCAP(booking.reservation_status)
        END AS stay_status

      FROM users u

      LEFT JOIN LATERAL (
        SELECT
          r.id,
          r.check_in,
          r.check_out,
          r.status AS reservation_status,
          r.guests_count,
          r.total_amount,
          rm.room_number,
          rt.name AS room_type
        FROM reservations r
        JOIN rooms rm ON rm.id = r.room_id
        JOIN room_types rt ON rt.id = rm.room_type_id
        WHERE r.user_id = u.id
          AND ($1::date IS NULL OR r.check_out >= $1::date)
          AND ($2::date IS NULL OR r.check_in <= $2::date)
        ORDER BY r.check_in DESC, r.created_at DESC, r.id DESC
        LIMIT 1
      ) booking ON TRUE

      WHERE u.role = 'guest'
        AND (
          ($1::date IS NULL AND $2::date IS NULL)
          OR booking.id IS NOT NULL
        )

      ORDER BY u.created_at DESC NULLS LAST, u.id DESC
      `,
      [startDate, endDate]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Admin guests error:", error.message);
    res.status(500).json({
      message: "Failed to retrieve guests.",
    });
  }
});

// =========================
// ADMIN GUESTS - ADD
// =========================

app.post("/api/admin/guests", async (req, res) => {
  try {
    const fullName = String(req.body.full_name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const phone = String(req.body.phone || "").trim();

    if (!fullName || !email || !password) {
      return res.status(400).json({
        message: "Full name, email, and password are required.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters.",
      });
    }

    const existing = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (
        full_name,
        email,
        password_hash,
        phone,
        role
      )
      VALUES ($1, $2, $3, $4, 'guest')
      RETURNING id, full_name, email, phone, role, created_at
      `,
      [fullName, email, passwordHash, phone || null]
    );

    res.status(201).json({
      message: "Guest account created successfully.",
      guest: result.rows[0],
    });
  } catch (error) {
    console.error("Add guest error:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    res.status(500).json({
      message: "Failed to create guest account.",
    });
  }
});

// =========================
// ADMIN PAYMENTS
// =========================

app.get("/api/admin/payments", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        payments.id,
        users.full_name AS guest_name,
        rooms.room_number,
        payments.reservation_id,
        payments.amount,
        payments.payment_method,
        payments.transaction_reference,
        payments.status,
        payments.paid_at,
        payments.created_at
      FROM payments
      JOIN reservations
        ON payments.reservation_id = reservations.id
      JOIN users
        ON reservations.user_id = users.id
      JOIN rooms
        ON reservations.room_id = rooms.id
      ORDER BY payments.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Admin payments error:", error.message);
    res.status(500).json({
      message: "Failed to retrieve payments.",
    });
  }
});

/* =========================================
   ADMIN REPORTS API
   GET /api/admin/reports
   Optional: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
========================================= */

app.get("/api/admin/reports", async (req, res) => {
  try {
    const { startDate = null, endDate = null } = req.query;

    const validDate = (value) => {
      if (!value) return true;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

      const date = new Date(`${value}T00:00:00.000Z`);
      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    };

    if (!validDate(startDate) || !validDate(endDate)) {
      return res.status(400).json({
        message: "Invalid date. Use YYYY-MM-DD."
      });
    }

    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json({
        message: "Start date cannot be after end date."
      });
    }

    const params = [startDate, endDate];

    const [
      summaryResult,
      trendResult,
      statusResult,
      paymentMethodResult,
      roomResult,
      transactionResult
    ] = await Promise.all([
      // SUMMARY CARDS
      pool.query(`
        SELECT
          COUNT(DISTINCT r.id)::int AS total_reservations,
          COUNT(DISTINCT r.id)
            FILTER (WHERE LOWER(r.status) = 'pending')::int
            AS pending_reservations,
          COUNT(DISTINCT r.id)
            FILTER (WHERE LOWER(r.status) = 'confirmed')::int
            AS confirmed_reservations,
          COUNT(DISTINCT r.id)
            FILTER (WHERE LOWER(r.status) = 'cancelled')::int
            AS cancelled_reservations,
          COUNT(DISTINCT p.id)
            FILTER (WHERE LOWER(p.status) = 'paid')::int
            AS paid_payments,
          COALESCE(
            SUM(p.amount) FILTER (WHERE LOWER(p.status) = 'paid'),
            0
          )::numeric AS total_revenue,
          COALESCE(
            AVG(p.amount) FILTER (WHERE LOWER(p.status) = 'paid'),
            0
          )::numeric AS average_payment
        FROM reservations r
        LEFT JOIN payments p ON p.reservation_id = r.id
        WHERE ($1::date IS NULL OR r.created_at::date >= $1::date)
          AND ($2::date IS NULL OR r.created_at::date <= $2::date)
      `, params),

      // DAILY REVENUE AND RESERVATIONS
      pool.query(`
        SELECT
          TO_CHAR(d.day, 'YYYY-MM-DD') AS report_date,
          COALESCE(r.reservation_count, 0)::int AS reservations,
          COALESCE(p.revenue, 0)::numeric AS revenue
        FROM generate_series(
          COALESCE($1::date, CURRENT_DATE - INTERVAL '6 days'),
          COALESCE($2::date, CURRENT_DATE),
          INTERVAL '1 day'
        ) AS d(day)
        LEFT JOIN (
          SELECT
            created_at::date AS day,
            COUNT(*)::int AS reservation_count
          FROM reservations
          WHERE ($1::date IS NULL OR created_at::date >= $1::date)
            AND ($2::date IS NULL OR created_at::date <= $2::date)
          GROUP BY created_at::date
        ) r ON r.day = d.day::date
        LEFT JOIN (
          SELECT
            paid_at::date AS day,
            SUM(amount)::numeric AS revenue
          FROM payments
          WHERE LOWER(status) = 'paid'
            AND paid_at IS NOT NULL
            AND ($1::date IS NULL OR paid_at::date >= $1::date)
            AND ($2::date IS NULL OR paid_at::date <= $2::date)
          GROUP BY paid_at::date
        ) p ON p.day = d.day::date
        ORDER BY d.day
      `, params),

      // RESERVATION STATUS
      pool.query(`
        SELECT
          INITCAP(COALESCE(NULLIF(status, ''), 'Unknown')) AS label,
          COUNT(*)::int AS value
        FROM reservations
        WHERE ($1::date IS NULL OR created_at::date >= $1::date)
          AND ($2::date IS NULL OR created_at::date <= $2::date)
        GROUP BY LOWER(status), status
        ORDER BY value DESC
      `, params),

      // PAYMENT METHODS
      pool.query(`
        SELECT
          INITCAP(
            COALESCE(NULLIF(payment_method, ''), 'Unspecified')
          ) AS label,
          COUNT(*)::int AS transactions,
          COALESCE(
            SUM(amount) FILTER (WHERE LOWER(status) = 'paid'),
            0
          )::numeric AS revenue
        FROM payments
        WHERE ($1::date IS NULL
               OR COALESCE(paid_at, created_at)::date >= $1::date)
          AND ($2::date IS NULL
               OR COALESCE(paid_at, created_at)::date <= $2::date)
        GROUP BY LOWER(payment_method), payment_method
        ORDER BY revenue DESC
      `, params),

      // ROOM PERFORMANCE
      pool.query(`
        SELECT
          rt.name AS room_type,
          COUNT(DISTINCT rm.id)::int AS room_count,
          COUNT(DISTINCT r.id)::int AS reservations,
          COALESCE(
            SUM(r.total_amount)
              FILTER (
                WHERE LOWER(COALESCE(r.status, '')) <> 'cancelled'
              ),
            0
          )::numeric AS booking_value
        FROM room_types rt
        JOIN rooms rm ON rm.room_type_id = rt.id
        LEFT JOIN reservations r
          ON r.room_id = rm.id
          AND ($1::date IS NULL OR r.check_out >= $1::date)
          AND ($2::date IS NULL OR r.check_in <= $2::date)
        GROUP BY rt.id, rt.name
        ORDER BY reservations DESC, rt.name
      `, params),

      // RECENT TRANSACTIONS
      pool.query(`
        SELECT
          r.id AS reservation_id,
          u.full_name AS guest_name,
          rm.room_number,
          rt.name AS room_type,
          r.check_in,
          r.check_out,
          r.created_at,
          r.total_amount,
          r.status AS reservation_status,
          p.id AS payment_id,
          p.amount AS payment_amount,
          p.payment_method,
          p.transaction_reference,
          p.status AS payment_status,
          p.paid_at
        FROM reservations r
        JOIN users u ON u.id = r.user_id
        JOIN rooms rm ON rm.id = r.room_id
        JOIN room_types rt ON rt.id = rm.room_type_id
        LEFT JOIN LATERAL (
          SELECT
            pay.id,
            pay.amount,
            pay.payment_method,
            pay.transaction_reference,
            pay.status,
            pay.paid_at
          FROM payments pay
          WHERE pay.reservation_id = r.id
          ORDER BY pay.created_at DESC, pay.id DESC
          LIMIT 1
        ) p ON TRUE
        WHERE ($1::date IS NULL OR r.created_at::date >= $1::date)
          AND ($2::date IS NULL OR r.created_at::date <= $2::date)
        ORDER BY r.created_at DESC, r.id DESC
        LIMIT 500
      `, params)
    ]);

    const s = summaryResult.rows[0] || {};

    return res.json({
      summary: {
        total_reservations: Number(s.total_reservations || 0),
        pending_reservations: Number(s.pending_reservations || 0),
        confirmed_reservations: Number(s.confirmed_reservations || 0),
        cancelled_reservations: Number(s.cancelled_reservations || 0),
        paid_payments: Number(s.paid_payments || 0),
        total_revenue: Number(s.total_revenue || 0),
        average_payment: Number(s.average_payment || 0)
      },
      trend: trendResult.rows,
      reservation_status: statusResult.rows,
      payment_methods: paymentMethodResult.rows,
      room_performance: roomResult.rows,
      transactions: transactionResult.rows
    });
  } catch (error) {
    console.error("Admin reports error:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve reports.",
      error: error.message
    });
  }
});

/* =========================================
   ADMIN SETTINGS API
========================================= */

// Create the settings table if it does not exist.
async function initializeHotelSettings() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hotel_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      hotel_name VARCHAR(150) NOT NULL
        DEFAULT 'Verde Haven Boutique Hotel',
      tagline VARCHAR(200) NOT NULL
        DEFAULT 'Stay. Relax. Discover.',
      email VARCHAR(254) NOT NULL
        DEFAULT 'verdehavenhotel@gmail.com',
      phone VARCHAR(30) NOT NULL
        DEFAULT '09915975630',
      location VARCHAR(255) NOT NULL
        DEFAULT 'Calapan City, Oriental Mindoro, Philippines',
      check_in_time TIME NOT NULL DEFAULT '14:00',
      check_out_time TIME NOT NULL DEFAULT '12:00',
      currency VARCHAR(3) NOT NULL DEFAULT 'PHP',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    INSERT INTO hotel_settings (id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING
  `);
}

// GET /api/admin/settings
app.get("/api/admin/settings", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        hotel_name,
        tagline,
        email,
        phone,
        location,
        TO_CHAR(check_in_time, 'HH24:MI') AS check_in_time,
        TO_CHAR(check_out_time, 'HH24:MI') AS check_out_time,
        currency,
        updated_at
      FROM hotel_settings
      WHERE id = 1
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Hotel settings not found.",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Get settings error:", error.message);
    res.status(500).json({
      message: "Failed to load hotel settings.",
    });
  }
});

// PUT /api/admin/settings
app.put("/api/admin/settings", async (req, res) => {
  try {
    const {
      hotel_name,
      tagline,
      email,
      phone,
      location,
      check_in_time,
      check_out_time,
      currency,
    } = req.body;

    const fields = {
      hotel_name,
      tagline,
      email,
      phone,
      location,
      check_in_time,
      check_out_time,
      currency,
    };

    for (const [key, value] of Object.entries(fields)) {
      if (typeof value !== "string" || !value.trim()) {
        return res.status(400).json({
          message: `Please provide a valid value for ${key}.`,
        });
      }
    }

    if (hotel_name.trim().length > 150 ||
        tagline.trim().length > 200 ||
        email.trim().length > 254 ||
        phone.trim().length > 30 ||
        location.trim().length > 255) {
      return res.status(400).json({
        message: "One or more fields exceed the allowed length.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    const validTime = /^([01]\d|2[0-3]):[0-5]\d$/;

    if (
      !validTime.test(check_in_time) ||
      !validTime.test(check_out_time)
    ) {
      return res.status(400).json({
        message: "Please enter valid check-in and check-out times.",
      });
    }

    if (!["PHP", "USD"].includes(currency)) {
      return res.status(400).json({
        message: "Currency must be PHP or USD.",
      });
    }

    const result = await pool.query(
      `
      UPDATE hotel_settings
      SET
        hotel_name = $1,
        tagline = $2,
        email = $3,
        phone = $4,
        location = $5,
        check_in_time = $6::time,
        check_out_time = $7::time,
        currency = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
      RETURNING
        hotel_name,
        tagline,
        email,
        phone,
        location,
        TO_CHAR(check_in_time, 'HH24:MI') AS check_in_time,
        TO_CHAR(check_out_time, 'HH24:MI') AS check_out_time,
        currency,
        updated_at
      `,
      [
        hotel_name.trim(),
        tagline.trim(),
        email.trim(),
        phone.trim(),
        location.trim(),
        check_in_time,
        check_out_time,
        currency,
      ]
    );

    res.json({
      message: "Hotel settings saved successfully.",
      settings: result.rows[0],
    });
  } catch (error) {
    console.error("Save settings error:", error.message);
    res.status(500).json({
      message: "Failed to save hotel settings.",
    });
  }
});



// =========================
// START SERVER
// =========================


// =========================
// START SERVER
// =========================

async function startServer() {
  try {
    await initializeHotelSettings();

    // Initialize 3D Hotel Layout database
    await initializeHotelLayout(pool);

    await initializeDemoPayments(pool);

    app.listen(PORT, () => {
      console.log(
        `Server running on http://localhost:${PORT}`
      );

      console.log("Hotel settings initialized.");
      console.log("Hotel 3D Editor ready.");
    });

  } catch (error) {
    console.error(
      "Failed to initialize server:",
      error
    );

    process.exit(1);
  }
}

startServer();

