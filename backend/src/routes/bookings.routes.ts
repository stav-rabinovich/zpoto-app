import { Router } from 'express';
import { auth, AuthedRequest } from '../middlewares/auth';
import * as svc from '../services/bookings.service';

const r = Router();

/**
 * GET /api/bookings
 * מחזיר את כל ההזמנות (כרגע ללא סינון).
 * אפשר להרחיב בהמשך לשאילתות (?me=1, ?parkingId=...)
 */
r.get('/', async (_req, res, next) => {
  try {
    const data = await svc.listBookings();
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/bookings
 * Body: { parkingId: number, startTime: string ISO, endTime: string ISO, status?: "PENDING"|"CONFIRMED"|"CANCELLED" }
 * דורש התחברות; userId נלקח מה- JWT.
 */
r.post('/', auth, async (req: AuthedRequest, res, next) => {
  try {
    const { parkingId, startTime, endTime, status } = req.body ?? {};

    if (typeof parkingId !== 'number' || typeof startTime !== 'string' || typeof endTime !== 'string') {
      return res.status(400).json({ error: 'Invalid body: {parkingId:number, startTime:ISO string, endTime:ISO string, status?}' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid dates: startTime/endTime must be valid ISO strings' });
    }

    const data = await svc.createBooking({
      userId: Number(req.userId),
      parkingId,
      startTime: start,
      endTime: end,
      status,
    });

    res.status(201).json({ data });
  } catch (e: any) {
    if (e?.message === 'INVALID_DATES') return res.status(400).json({ error: 'Invalid dates' });
    if (e?.message === 'INVALID_RANGE') return res.status(400).json({ error: 'endTime must be after startTime' });
    if (e?.message === 'OVERLAP') return res.status(409).json({ error: 'Overlapping booking exists for this parking' });
    next(e);
  }
});

/**
 * GET /api/bookings/:id
 * שליפת הזמנה לפי מזהה
 */
r.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await svc.getBooking(id);
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /api/bookings/:id/status
 * Body: { status: "PENDING"|"CONFIRMED"|"CANCELLED" }
 * רק יוצר ההזמנה יכול לשנות סטטוס (אפשר להרחיב בהמשך לבעל החניה).
 */
r.patch('/:id/status', auth, async (req: AuthedRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body ?? {};
    if (!['PENDING', 'CONFIRMED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Use PENDING|CONFIRMED|CANCELLED' });
    }

    const current = await svc.getBooking(id);
    if (!current) return res.status(404).json({ error: 'Not found' });
    if (current.userId !== Number(req.userId)) {
      return res.status(403).json({ error: 'Forbidden: only the booking creator can change status' });
    }

    const data = await svc.updateBookingStatus(id, status);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/bookings/:id/cancel
 * קיצור נוח לביטול (מגדיר status=CANCELLED)
 */
r.post('/:id/cancel', auth, async (req: AuthedRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const current = await svc.getBooking(id);
    if (!current) return res.status(404).json({ error: 'Not found' });
    if (current.userId !== Number(req.userId)) {
      return res.status(403).json({ error: 'Forbidden: only the booking creator can cancel' });
    }
    const data = await svc.cancelBooking(id);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

export default r;
