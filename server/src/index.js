// [SERVER] server/src/index.js
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

/**
 * Middlewares
 * - CORS פתוח (מאפשר גישה מהאדמין ומהמובייל)
 * - JSON עד 10MB (בשביל נתונים גדולים/תמונות עתידיות)
 * - לוג בסיסי לכל בקשה (מאוד עוזר לדיבאג)
 */
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// כלי עזר ל־async
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// -----------------------------------------------------
// בריאות שרת
// -----------------------------------------------------
app.get("/health", (_req, res) => res.json({ ok: true }));

// -----------------------------------------------------
// OwnerApplications — בקשות בעלי-חניה
// -----------------------------------------------------

// יצירת בקשת בעל-חניה (נקרא מהמובייל)
app.post(
  "/api/owner-applications",
  asyncHandler(async (req, res) => {
    const { fullName, phone, address, lat, lng, docsUrl } = req.body;
    if (!fullName || !phone || !address || lat == null || lng == null) {
      return res
        .status(400)
        .json({ error: "missing fields: fullName, phone, address, lat, lng" });
    }
    const row = await prisma.ownerApplication.create({
      data: {
        fullName,
        phone,
        address,
        lat: Number(lat),
        lng: Number(lng),
        docsUrl: docsUrl ?? null,
      },
    });
    res.json(row);
  })
);

// רשימת בקשות (לאדמין)
app.get(
  "/api/admin/owner-applications",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.ownerApplication.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(rows);
  })
);

// אישור בקשה (אדמין)
app.post(
  "/api/admin/owner-applications/:id/approve",
  asyncHandler(async (req, res) => {
    const row = await prisma.ownerApplication.update({
      where: { id: req.params.id },
      data: { status: "APPROVED" },
    });
    res.json(row);
  })
);

// דחיית בקשה (אדמין)
app.post(
  "/api/admin/owner-applications/:id/reject",
  asyncHandler(async (req, res) => {
    const row = await prisma.ownerApplication.update({
      where: { id: req.params.id },
      data: { status: "REJECTED" },
    });
    res.json(row);
  })
);

// -----------------------------------------------------
// Listing Requests — בקשות מודעת-חניה (מהמסך שלך במובייל)
// -----------------------------------------------------

// יצירת בקשת מודעת-חניה מהמובייל
app.post(
  "/api/listing-requests",
  asyncHandler(async (req, res) => {
    const {
      title,
      address,
      description,
      vehicleTypes,
      pricePerHour,
      photos,
      lat,
      lng,
    } = req.body;

    if (!title || !address) {
      return res.status(400).json({ error: "title & address are required" });
    }

    const row = await prisma.listingRequest.create({
      data: {
        title,
        address,
        description: description ?? null,
        vehicleTypes: Array.isArray(vehicleTypes) ? vehicleTypes : [],
        pricePerHour: Number(pricePerHour ?? 0),
        photos: Array.isArray(photos) ? photos : [],
        lat: lat != null ? Number(lat) : null,
        lng: lng != null ? Number(lng) : null,
      },
    });

    res.json(row);
  })
);

// רשימת בקשות מודעות (אדמין)
app.get(
  "/api/admin/listing-requests",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.listingRequest.findMany({
      orderBy: { submittedAt: "desc" },
    });
    res.json(rows);
  })
);

// אישור בקשת מודעה (אדמין)
app.post(
  "/api/admin/listing-requests/:id/approve",
  asyncHandler(async (req, res) => {
    const row = await prisma.listingRequest.update({
      where: { id: req.params.id },
      data: { status: "APPROVED" },
    });
    res.json(row);
  })
);

// דחיית בקשת מודעה (אדמין)
app.post(
  "/api/admin/listing-requests/:id/reject",
  asyncHandler(async (req, res) => {
    const row = await prisma.listingRequest.update({
      where: { id: req.params.id },
      data: { status: "REJECTED" },
    });
    res.json(row);
  })
);

// -----------------------------------------------------
// דיפולטים ושגיאות
// -----------------------------------------------------

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Not Found", path: req.path });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res
    .status(500)
    .json({ error: "Internal Server Error", details: String(err?.message ?? err) });
});

// Graceful shutdown ל-Prisma
process.on("SIGINT", async () => {
  try {
    await prisma.$disconnect();
  } finally {
    process.exit(0);
  }
});

// Run server — חשוב: 0.0.0.0 כדי שגם טלפון יוכל להגיע דרך ה-LAN
app.listen(PORT, "0.0.0.0", () =>
  console.log(`API ready on http://localhost:${PORT}`)
);
