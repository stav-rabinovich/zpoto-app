import { Router } from 'express';
import { auth, AuthedRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import * as svc from '../services/bookings.service';
import { getTimeLeftForApproval } from '../services/approval-timeout.service';
import { calculateProportionalPrice, formatPriceBreakdown } from '../services/pricing.service';
import { shouldUseProportionalPricing } from '../utils/featureFlags';

const r = Router();

/** 
 * GET /api/bookings/active
 * מחזיר הזמנות פעילות כרגע של המשתמש
 */
r.get('/active', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const now = new Date();

    const activeBookings = await prisma.booking.findMany({
      where: {
        userId,
        status: 'CONFIRMED',
        startTime: { lte: now },
        endTime: { gte: now },
      },
      include: {
        parking: {
          select: {
            id: true,
            title: true,
            address: true,
            lat: true,
            lng: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    res.json({ data: activeBookings });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/bookings
 * מחזיר את ההזמנות של המשתמש המחובר
 */
r.get('/', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const result = await svc.listBookingsByUser(userId);

    console.log(`📋 Bookings API: Found ${result.bookings.length} bookings for user #${userId}`);

    // מחזיר את ההזמנות ישירות כdata
    res.json({
      data: result.bookings,
      userStats: result.userStats,
    });
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
    console.log('🔥 BOOKING REQUEST:', req.body, 'User ID:', req.userId);
    const { parkingId, startTime, endTime, status } = req.body ?? {};

    if (
      typeof parkingId !== 'number' ||
      typeof startTime !== 'string' ||
      typeof endTime !== 'string'
    ) {
      console.log('❌ Invalid body types:', {
        parkingId: typeof parkingId,
        startTime: typeof startTime,
        endTime: typeof endTime,
      });
      return res
        .status(400)
        .json({
          error:
            'Invalid body: {parkingId:number, startTime:ISO string, endTime:ISO string, status?}',
        });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res
        .status(400)
        .json({ error: 'Invalid dates: startTime/endTime must be valid ISO strings' });
    }

    console.log('🚀 Creating booking with:', {
      userId: Number(req.userId),
      parkingId,
      startTime: start,
      endTime: end,
      status,
    });

    const data = await svc.createBooking({
      userId: Number(req.userId),
      parkingId,
      startTime: start,
      endTime: end,
      status,
    });

    console.log('✅ Booking created successfully:', data);
    res.status(201).json({ data });
  } catch (e: any) {
    if (e?.message === 'INVALID_DATES') return res.status(400).json({ error: 'Invalid dates' });
    if (e?.message === 'INVALID_RANGE')
      return res.status(400).json({ error: 'endTime must be after startTime' });
    if (e?.message === 'OVERLAP')
      return res.status(409).json({ error: 'Overlapping booking exists for this parking' });
    if (e?.message?.startsWith('VALIDATION_FAILED:')) {
      const errorMessage = e.message.replace('VALIDATION_FAILED: ', '');
      return res.status(400).json({ error: errorMessage });
    }
    next(e);
  }
});

/**
 * GET /api/bookings/:id
 * שליפת הזמנה לפי מזהה
 */
r.get('/:id', auth, async (req: AuthedRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }
    const data = await svc.getBooking(id);
    if (!data) return res.status(404).json({ error: 'Not found' });

    // הוספת נתוני קופון אם קיימים
    try {
      const couponUsages = await prisma.couponUsage.findMany({
        where: { bookingId: id },
        include: { coupon: true }
      });
      (data as any).couponUsages = couponUsages;
      console.log(`✅ Found ${couponUsages.length} coupon usages for booking ${id}`);
    } catch (error: any) {
      console.log('Could not fetch coupon data:', error?.message || error);
      (data as any).couponUsages = [];
    }

    res.json(data);
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
    if (
      !['PENDING', 'PENDING_APPROVAL', 'CONFIRMED', 'CANCELED', 'REJECTED', 'EXPIRED'].includes(
        status
      )
    ) {
      return res
        .status(400)
        .json({
          error: 'Invalid status. Use PENDING|PENDING_APPROVAL|CONFIRMED|CANCELED|REJECTED|EXPIRED',
        });
    }

    const current = await svc.getBooking(id);
    if (!current) return res.status(404).json({ error: 'Not found' });

    // בדיקה שהמשתמש הוא יוצר ההזמנה או בעל החניה
    const isBookingCreator = current.userId === Number(req.userId);
    const isParkingOwner = current.parking?.ownerId === Number(req.userId);

    if (!isBookingCreator && !isParkingOwner) {
      return res
        .status(403)
        .json({ error: 'Forbidden: only the booking creator or parking owner can change status' });
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

/**
 * GET /api/bookings/pending-approval
 * מחזיר בקשות הזמנה הממתינות לאישור בעל החניה
 */
r.get('/pending-approval', auth, async (req: AuthedRequest, res, next) => {
  try {
    const ownerId = req.userId!;

    console.log(`🔍 Fetching pending approval bookings for owner #${ownerId}`);

    const pendingBookings = await prisma.booking.findMany({
      where: {
        status: 'PENDING_APPROVAL',
        parking: {
          ownerId: ownerId,
        },
        // רק בקשות שעדיין לא פגו
        approvalExpiresAt: {
          gte: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        parking: {
          select: {
            id: true,
            title: true,
            address: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`📋 Found ${pendingBookings.length} pending approval bookings`);

    res.json({ data: pendingBookings });
  } catch (e) {
    console.error('❌ Error fetching pending approval bookings:', e);
    next(e);
  }
});

/**
 * POST /api/bookings/:id/approve
 * אישור בקשת הזמנה על ידי בעל החניה
 */
r.post('/:id/approve', auth, async (req: AuthedRequest, res, next) => {
  try {
    const bookingId = Number(req.params.id);
    const ownerId = req.userId!;

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        status: 'PENDING_APPROVAL',
        parking: {
          ownerId: ownerId,
        },
      },
      include: {
        parking: true,
        user: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found or not pending approval' });
    }

    // בדיקה שהבקשה לא פגה
    if (booking.approvalExpiresAt && booking.approvalExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Approval request has expired' });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CONFIRMED',
        approvedAt: new Date(),
      },
      include: {
        user: true,
        parking: true,
      },
    });

    // TODO: שליחת התראה למשתמש על אישור הבקשה

    res.json({ data: updatedBooking });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/bookings/:id/reject
 * דחיית בקשת הזמנה על ידי בעל החניה
 */
r.post('/:id/reject', auth, async (req: AuthedRequest, res, next) => {
  try {
    const bookingId = Number(req.params.id);
    const ownerId = req.userId!;
    const { reason } = req.body || {};

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        status: 'PENDING_APPROVAL',
        parking: {
          ownerId: ownerId,
        },
      },
      include: {
        parking: true,
        user: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found or not pending approval' });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason || 'לא צוין',
      },
      include: {
        user: true,
        parking: true,
      },
    });

    // TODO: שליחת התראה למשתמש על דחיית הבקשה

    res.json({ data: updatedBooking });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/bookings/:id/time-left
 * מחזיר כמה זמן נותר לאישור בקשה (במילישניות)
 */
r.get('/:id/time-left', auth, async (req: AuthedRequest, res, next) => {
  try {
    const bookingId = Number(req.params.id);

    if (isNaN(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }

    const timeLeft = await getTimeLeftForApproval(bookingId);

    if (timeLeft === null) {
      return res.status(404).json({ error: 'Booking not found or not pending approval' });
    }

    res.json({
      timeLeftMs: timeLeft,
      timeLeftSeconds: Math.ceil(timeLeft / 1000),
      expired: timeLeft <= 0,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/bookings/availability/:parkingId
 * מחזיר את הזמינות המקסימלית של חניה מזמן נתון
 * Query params: startTime (ISO) - זמן התחלה לבדיקה
 */
r.get('/availability/:parkingId', async (req, res, next) => {
  try {
    const parkingId = Number(req.params.parkingId);
    const { startTime } = req.query;

    console.log('🔍 SERVER DEBUG: Availability request received:', {
      parkingId,
      startTime,
      requestUrl: req.originalUrl,
      timestamp: new Date().toISOString(),
    });

    if (isNaN(parkingId)) {
      return res.status(400).json({ error: 'Invalid parking ID' });
    }

    if (!startTime) {
      return res.status(400).json({ error: 'Missing required param: startTime' });
    }

    const start = new Date(String(startTime));
    if (isNaN(start.getTime())) {
      return res.status(400).json({ error: 'Invalid date format for startTime' });
    }

    console.log('🔍 SERVER DEBUG: Parsed start time:', {
      startTime: start.toISOString(),
      dayOfWeek: start.getUTCDay(),
      hour: start.getUTCHours(),
    });

    const availability = await svc.calculateParkingAvailability(parkingId, start);

    console.log('🔍 SERVER DEBUG: Calculated availability result:', availability);

    res.json({ data: availability });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/bookings/validate
 * בדיקת תקינות הזמנה לפני יצירתה או מעבר לתשלום
 * Body: { parkingId: number, startTime: string ISO, endTime: string ISO }
 */
r.post('/validate', async (req, res, next) => {
  try {
    const { parkingId, startTime, endTime } = req.body ?? {};

    console.log('🔍 Booking validation request:', { parkingId, startTime, endTime });

    if (
      typeof parkingId !== 'number' ||
      typeof startTime !== 'string' ||
      typeof endTime !== 'string'
    ) {
      return res.status(400).json({
        error: 'Invalid body: {parkingId:number, startTime:ISO string, endTime:ISO string}',
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format for startTime/endTime',
      });
    }

    const validation = await svc.validateBookingTimeSlot(parkingId, start, end);

    console.log('🔍 Validation result:', validation);

    if (validation.isValid) {
      res.json({
        valid: true,
        message: validation.message,
      });
    } else {
      // אל תחזיר status 400 - זה validation result רגיל, לא שגיאה
      res.json({
        valid: false,
        error: validation.error,
        availableUntil: validation.availableUntil,
        suggestedEndTime: validation.suggestedEndTime,
      });
    }
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/bookings/find-problematic/:parkingId
 * מציאת הזמנות בעייתיות שמפריעות לחישובי זמינות
 */
r.get('/find-problematic/:parkingId', async (req, res, next) => {
  try {
    const parkingId = Number(req.params.parkingId);

    if (isNaN(parkingId)) {
      return res.status(400).json({ error: 'Invalid parking ID' });
    }

    // מצא הזמנות שמתחילות ב-21/10 ומסתיימות ב-21/10
    const problematicBookings = await prisma.booking.findMany({
      where: {
        parkingId,
        startTime: {
          gte: new Date('2025-10-21T00:00:00.000Z'),
          lt: new Date('2025-10-22T00:00:00.000Z'),
        },
        status: { in: ['CONFIRMED', 'PENDING', 'PENDING_APPROVAL'] },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    console.log(
      `🔍 Found ${problematicBookings.length} bookings from 21/10 for parking ${parkingId}:`,
      problematicBookings
    );

    res.json({
      parkingId,
      problematicBookings,
      count: problematicBookings.length,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/bookings/delete-specific/:bookingId
 * מחיקת הזמנה ספציפית לפי ID
 */
r.delete('/delete-specific/:bookingId', async (req, res, next) => {
  try {
    const bookingId = Number(req.params.bookingId);

    if (isNaN(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }

    // מצא את ההזמנה קודם
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        parkingId: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    console.log(`🗑️ Deleting booking ${bookingId}:`, booking);

    // מחק את ההזמנה
    await prisma.booking.delete({
      where: { id: bookingId },
    });

    console.log(`✅ Successfully deleted booking ${bookingId}`);

    res.json({
      message: `Successfully deleted booking ${bookingId}`,
      deletedBooking: booking,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/bookings/fix-parking-10
 * מחיקת ההזמנה הבעייתית מחניה 10 (21/10)
 */
r.delete('/fix-parking-10', async (req, res, next) => {
  try {
    // מצא ומחק את ההזמנה הבעייתית מ-21/10 בחניה 10
    const problematicBooking = await prisma.booking.findFirst({
      where: {
        parkingId: 10,
        startTime: {
          gte: new Date('2025-10-21T00:00:00.000Z'),
          lt: new Date('2025-10-22T00:00:00.000Z'),
        },
        status: { in: ['CONFIRMED', 'PENDING', 'PENDING_APPROVAL'] },
      },
    });

    if (!problematicBooking) {
      return res.json({ message: 'No problematic booking found' });
    }

    console.log(`🗑️ Found and deleting problematic booking:`, problematicBooking);

    // מחק את ההזמנה
    await prisma.booking.delete({
      where: { id: problematicBooking.id },
    });

    console.log(`✅ Successfully deleted problematic booking ${problematicBooking.id}`);

    res.json({
      message: 'Successfully deleted problematic booking',
      deletedBooking: problematicBooking,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/bookings/debug/:parkingId
 * בדיקת נתוני חניה לדיבוג
 */
r.get('/debug/:parkingId', async (req, res, next) => {
  try {
    const parkingId = Number(req.params.parkingId);

    if (isNaN(parkingId)) {
      return res.status(400).json({ error: 'Invalid parking ID' });
    }

    const parking = await prisma.parking.findUnique({
      where: { id: parkingId },
      select: {
        id: true,
        title: true,
        isActive: true,
        availability: true,
        owner: {
          select: {
            id: true,
            isBlocked: true,
          },
        },
      },
    });

    if (!parking) {
      return res.status(404).json({ error: 'Parking not found' });
    }

    let parsedAvailability = null;
    if (parking.availability) {
      try {
        parsedAvailability = JSON.parse(parking.availability);
      } catch (e) {
        parsedAvailability = { error: 'Invalid JSON', raw: parking.availability };
      }
    }

    // גם בדוק הזמנות של החניה
    const bookings = await prisma.booking.findMany({
      where: { parkingId },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        createdAt: true,
      },
      orderBy: { startTime: 'desc' },
      take: 10,
    });

    res.json({
      parking: {
        ...parking,
        parsedAvailability,
      },
      recentBookings: bookings,
    });
  } catch (e) {
    next(e);
  }
});

// הוסר API ה-calculate-price - המערכת משתמשת בחישוב client-side מעודכן

export default r;
