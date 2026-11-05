
import { Router } from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const router = Router();

const qrPath = path.resolve(
  process.cwd(),
  "demo-payment-assets",
  "gcash.png"
);

export function makeDemoToken(reservation) {
  const secret = process.env.DEMO_PAYMENT_SECRET || "";

  if (secret.length < 32) {
    throw new Error(
      "DEMO_PAYMENT_SECRET must contain at least 32 characters."
    );
  }

  const payload =
    `${reservation.id}:${reservation.user_id}:` +
    new Date(reservation.created_at).toISOString();

  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

function validGuestToken(req, booking) {
  const token = req.get("x-demo-payment-token") || "";

  if (!/^[0-9a-f]{64}$/.test(token)) return false;

  const expected = makeDemoToken(booking);

  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(expected)
  );
}

function adminGuard(req, res, next) {
  const secret = process.env.ADMIN_LAYOUT_KEY || "";
  const supplied = req.get("x-layout-key") || "";

  if (secret.length < 16) {
    return res.status(503).json({
      message: "ADMIN_LAYOUT_KEY is not configured."
    });
  }

  if (
    Buffer.byteLength(secret) !== Buffer.byteLength(supplied) ||
    !crypto.timingSafeEqual(
      Buffer.from(secret),
      Buffer.from(supplied)
    )
  ) {
    return res.status(403).json({
      message: "Invalid admin key."
    });
  }

  next();
}

export async function initializeDemoPayments(pool) {
  if ((process.env.DEMO_PAYMENT_SECRET || "").length < 32) {
    throw new Error(
      "Configure DEMO_PAYMENT_SECRET in backend/.env."
    );
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS demo_payments (
      id BIGSERIAL PRIMARY KEY,

      reservation_id INTEGER NOT NULL UNIQUE
        REFERENCES reservations(id) ON DELETE CASCADE,

      amount NUMERIC(12,2) NOT NULL
        CHECK (amount > 0),

      payment_method TEXT NOT NULL DEFAULT 'gcash_demo',

      demo_reference TEXT NOT NULL UNIQUE,

      status TEXT NOT NULL DEFAULT 'demo_pending'
        CHECK (status IN (
          'demo_pending',
          'demo_paid',
          'demo_rejected'
        )),

      created_at TIMESTAMPTZ DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ
    );
  `);
}

export function demoPaymentRouter(pool) {

  // Show the original admin GCash QR.
  router.get("/gcash-qr-info", (_req, res) => {
    res.json({
      available: fs.existsSync(qrPath),
      qr_url: "/api/demo-payment/gcash-qr"
    });
  });

  router.get("/gcash-qr", (_req, res) => {
    if (!fs.existsSync(qrPath)) {
      return res.status(404).json({
        message: "Admin GCash QR not configured."
      });
    }

    res
      .type("png")
      .set("Cache-Control", "no-store")
      .sendFile(qrPath);
  });

  // Guest payment status.
  router.get("/status/:reservationId", async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, user_id, created_at, total_amount, status
         FROM reservations
         WHERE id = $1`,
        [req.params.reservationId]
      );

      const booking = result.rows[0];

      if (!booking || !validGuestToken(req, booking)) {
        return res.status(403).json({
          message: "Reservation access denied."
        });
      }

      const payment = await pool.query(
        `SELECT amount, payment_method, demo_reference,
                status, created_at, reviewed_at
         FROM demo_payments
         WHERE reservation_id = $1`,
        [booking.id]
      );

      res.json({
        reservation_id: booking.id,
        reservation_status: booking.status,
        amount: booking.total_amount,
        demo_payment: payment.rows[0] || null
      });

    } catch (error) {
      console.error("Payment status error:", error);

      res.status(500).json({
        message: "Unable to load demo payment status."
      });
    }
  });

  // Customer simulates payment.
  router.post("/simulate", async (req, res) => {
    const reservationId = Number(req.body?.reservation_id);

    if (!Number.isSafeInteger(reservationId) || reservationId <= 0) {
      return res.status(400).json({
        message: "Invalid reservation ID."
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `SELECT id, user_id, created_at,
                total_amount, status
         FROM reservations
         WHERE id = $1
         FOR UPDATE`,
        [reservationId]
      );

      const booking = result.rows[0];

      if (!booking || !validGuestToken(req, booking)) {
        await client.query("ROLLBACK");

        return res.status(403).json({
          message: "Reservation access denied."
        });
      }

      if (String(booking.status).toLowerCase() !== "pending") {
        await client.query("ROLLBACK");

        return res.status(409).json({
          message: "Reservation is no longer pending."
        });
      }

      if (!fs.existsSync(qrPath)) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          message: "GCash QR image is missing."
        });
      }

      const realPayment = await client.query(
        `SELECT id FROM payments
         WHERE reservation_id = $1 AND status = 'paid'
         LIMIT 1`,
        [reservationId]
      );

      if (realPayment.rowCount) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          message: "Reservation already has a paid record."
        });
      }

      const existing = await client.query(
        `SELECT status FROM demo_payments
         WHERE reservation_id = $1
         FOR UPDATE`,
        [reservationId]
      );

      if (
        existing.rowCount &&
        existing.rows[0].status !== "demo_rejected"
      ) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          message: "Demo payment already submitted."
        });
      }

      // This is not a GCash-issued transaction reference.
      const reference =
        `DEMO-GCASH-${reservationId}-` +
        crypto.randomBytes(5).toString("hex").toUpperCase();

      const created = await client.query(
        `INSERT INTO demo_payments (
          reservation_id, amount, payment_method,
          demo_reference, status
        )
        VALUES ($1, $2, 'gcash_demo', $3, 'demo_pending')
        ON CONFLICT (reservation_id)
        DO UPDATE SET
          amount = EXCLUDED.amount,
          demo_reference = EXCLUDED.demo_reference,
          status = 'demo_pending',
          created_at = NOW(),
          reviewed_at = NULL
        RETURNING *`,
        [reservationId, booking.total_amount, reference]
      );

      await client.query("COMMIT");

      res.status(201).json({
        message:
          "Demo payment submitted. No real money transferred.",
        demo_payment: created.rows[0]
      });

    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});

      console.error("Simulate payment error:", error);

      res.status(500).json({
        message: "Unable to save simulated payment."
      });

    } finally {
      client.release();
    }
  });

  // Admin reads demo transactions.
  router.get("/admin/list", adminGuard, async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          dp.id,
          dp.reservation_id,
          dp.amount,
          dp.demo_reference,
          dp.payment_method,
          dp.status,
          dp.created_at,
          dp.reviewed_at,
          r.status AS reservation_status,
          u.full_name AS guest_name,
          rm.room_number
        FROM demo_payments dp
        JOIN reservations r ON r.id = dp.reservation_id
        JOIN users u ON u.id = r.user_id
        JOIN rooms rm ON rm.id = r.room_id
        ORDER BY
          CASE WHEN dp.status = 'demo_pending'
          THEN 0 ELSE 1 END,
          dp.created_at DESC
        LIMIT 200
      `);

      res.json(result.rows);

    } catch (error) {
      console.error("Admin demo list error:", error);

      res.status(500).json({
        message: "Unable to load demo payments."
      });
    }
  });

  // Admin approves/rejects demo.
  router.post(
    "/admin/review/:id",
    adminGuard,
    async (req, res) => {
      const decision = String(req.body?.decision || "");

      if (!["approve", "reject"].includes(decision)) {
        return res.status(400).json({
          message: "Invalid review decision."
        });
      }

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const found = await client.query(
          `SELECT reservation_id FROM demo_payments
           WHERE id = $1`,
          [req.params.id]
        );

        if (!found.rowCount) {
          await client.query("ROLLBACK");
          return res.sendStatus(404);
        }

        const bookingResult = await client.query(
          `SELECT id, status FROM reservations
           WHERE id = $1 FOR UPDATE`,
          [found.rows[0].reservation_id]
        );

        const paymentResult = await client.query(
          `SELECT id, status FROM demo_payments
           WHERE id = $1 FOR UPDATE`,
          [req.params.id]
        );

        const booking = bookingResult.rows[0];
        const payment = paymentResult.rows[0];

        if (
          !booking ||
          !payment ||
          payment.status !== "demo_pending" ||
          booking.status !== "pending"
        ) {
          await client.query("ROLLBACK");

          return res.status(409).json({
            message: "Booking or payment is no longer pending."
          });
        }

        if (decision === "approve") {
          const real = await client.query(
            `SELECT id FROM payments
             WHERE reservation_id = $1 AND status = 'paid'
             LIMIT 1`,
            [booking.id]
          );

          if (real.rowCount) {
            await client.query("ROLLBACK");

            return res.status(409).json({
              message: "A paid record already exists."
            });
          }

          await client.query(
            `UPDATE reservations SET status = 'confirmed'
             WHERE id = $1`,
            [booking.id]
          );
        }

        const newStatus =
          decision === "approve"
            ? "demo_paid"
            : "demo_rejected";

        await client.query(
          `UPDATE demo_payments
           SET status = $1, reviewed_at = NOW()
           WHERE id = $2`,
          [newStatus, payment.id]
        );

        await client.query("COMMIT");

        res.json({
          status: newStatus,
          message: decision === "approve"
            ? "Demo approved. Booking confirmed. No money transferred."
            : "Demo rejected."
        });

      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});

        console.error("Admin review error:", error);

        res.status(500).json({
          message: "Unable to review demo payment."
        });

      } finally {
        client.release();
      }
    }
  );

  return router;
}
