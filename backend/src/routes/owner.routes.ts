import { Router } from 'express';
import { auth, AuthedRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import * as svc from '../services/owner.service';

const r = Router();

// כל ה-routes דורשים התחברות
r.use(auth);

/**
 * POST /api/owner/listing-requests
 * הגשת בקשה חדשה להיות בעל חניה
 * Body: { title, address, lat, lng, priceHr, description? }
 */
r.post('/listing-requests', async (req: AuthedRequest, res, next) => {
  try {
    console.log('🔥 LISTING REQUEST:', req.body, 'User ID:', req.userId);
    const { title, address, fullAddress, city, phone, lat, lng, priceHr, description, onboarding } = req.body || {};

    // בדיקות בסיסיות
    if (!address || typeof address !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid address',
      });
    }

    // המרת lat/lng למספרים אם הם מגיעים כמחרוזות
    const latitude = typeof lat === 'number' ? lat : parseFloat(lat);
    const longitude = typeof lng === 'number' ? lng : parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: 'Invalid coordinates: lat and lng must be valid numbers',
      });
    }

    console.log('🚀 Creating listing request with:', {
      userId: Number(req.userId),
      title: title || address,
      address,
      fullAddress,
      city,
      phone,
      lat: latitude,
      lng: longitude,
      priceHr: priceHr || 0,
      description,
      onboarding
    });

    const data = await svc.createListingRequest({
      userId: Number(req.userId),
      title: title || address,
      address,
      fullAddress,
      city,
      phone,
      lat: latitude,
      lng: longitude,
      priceHr: priceHr || 0,
      description,
      onboarding,
    });

    console.log('✅ Listing request created successfully:', data);
    res.status(201).json({ data });
  } catch (e: any) {
    console.error('❌ Listing request error:', e);
    next(e);
  }
});

/**
 * GET /api/owner/listing-requests
 * רשימת הבקשות שלי
 */
r.get('/listing-requests', async (req: AuthedRequest, res, next) => {
  try {
    const data = await svc.getMyListingRequests(Number(req.userId));
    res.json(data);
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/owner/parkings
 * רשימת החניות שלי (מאושרות)
 */
r.get('/parkings', async (req: AuthedRequest, res, next) => {
  try {
    const parkings = await svc.getMyParkings(req.userId!);
    res.json(parkings);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/owner/parkings/:id
 * קבלת חניה בודדת
 */
r.get('/parkings/:id', async (req: AuthedRequest, res, next) => {
  try {
    const parking = await svc.getMyParking(Number(req.params.id), req.userId!);
    res.json(parking);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/owner/parkings/:id
 * Body: { title?, address?, lat?, lng?, priceHr?, isActive?, availability? }
 */
r.patch('/parkings/:id', async (req: AuthedRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const patch = req.body || {};

    const data = await svc.updateMyParking(id, Number(req.userId), patch);
    res.json(data);
  } catch (e: any) {
    if (e?.message === 'PARKING_NOT_FOUND') {
      return res.status(404).json({ error: 'Parking not found' });
    }
    if (e?.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Not your parking' });
    }
    next(e);
  }
});

/**
 * GET /api/owner/bookings
 * רשימת הזמנות לחניות שלי
 */
r.get('/bookings', async (req: AuthedRequest, res, next) => {
  try {
    const ownerId = req.userId!;
    const bookings = await prisma.booking.findMany({
      where: {
        parking: { ownerId }
      },
      include: {
        user: {
          select: { id: true, email: true, name: true }
        },
        parking: {
          select: { id: true, title: true, address: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ data: bookings });
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /api/owner/parkings/:id/approval-mode
 * שינוי מצב אישור החניה (AUTO/MANUAL)
 */
r.patch('/parkings/:id/approval-mode', async (req: AuthedRequest, res, next) => {
  try {
    const ownerId = req.userId!;
    const parkingId = parseInt(req.params.id);
    const { approvalMode } = req.body;
    
    if (!['AUTO', 'MANUAL'].includes(approvalMode)) {
      return res.status(400).json({ error: 'Invalid approval mode' });
    }
    
    // וודא שהחניה שייכת לבעלים
    const parking = await prisma.parking.findFirst({
      where: { id: parkingId, ownerId }
    });
    
    if (!parking) {
      return res.status(404).json({ error: 'parking not found' });
    }
    
    const updated = await prisma.parking.update({
      where: { id: parkingId },
      data: { approvalMode }
    });
    
    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/owner/bookings
 * קבלת הזמנות של החניות של הבעלים
 */
r.get('/bookings', async (req: AuthedRequest, res, next) => {
  try {
    const ownerId = req.userId!;
    const bookings = await prisma.booking.findMany({
      where: {
        parking: { ownerId }
      },
      include: {
        parking: {
          select: { id: true, title: true, address: true }
        },
        user: {
          select: { id: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ data: bookings });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/owner/stats/:parkingId
 * סטטיסטיקות לחניה ספציפית של הבעלים
 */
r.get('/stats/:parkingId', async (req: AuthedRequest, res, next) => {
  try {
    const ownerId = req.userId!;
    const parkingId = parseInt(req.params.parkingId);
    
    if (isNaN(parkingId)) {
      return res.status(400).json({ error: 'Invalid parking ID' });
    }

    // וידוא שהחניה שייכת לבעלים
    const parking = await prisma.parking.findFirst({
      where: { id: parkingId, ownerId }
    });
    
    if (!parking) {
      return res.status(404).json({ error: 'Parking not found or not owned by user' });
    }

    // פרמטרים לטווח תאריכים (ברירת מחדל: 30 יום אחרונים)
    const { from, to, days = '30' } = req.query;
    const daysNum = parseInt(days as string) || 30;
    
    const fromDate = from ? new Date(from as string) : new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to as string) : new Date();

    // שליפת הזמנות בטווח
    const bookings = await prisma.booking.findMany({
      where: {
        parkingId,
        createdAt: {
          gte: fromDate,
          lte: toDate
        }
      },
      include: {
        user: {
          select: { id: true, email: true }
        }
      }
    });

    // חישוב סטטיסטיקות
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED');
    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.totalPriceCents || 0), 0);
    const totalHours = confirmedBookings.reduce((sum, b) => {
      const start = new Date(b.startTime);
      const end = new Date(b.endTime);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);

    // סטטיסטיקות יומיות
    const dailyStats = [];
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayBookings = bookings.filter(b => {
        const bookingDate = new Date(b.createdAt);
        return bookingDate >= dayStart && bookingDate <= dayEnd;
      });
      
      const dayRevenue = dayBookings
        .filter(b => b.status === 'CONFIRMED')
        .reduce((sum, b) => sum + (b.totalPriceCents || 0), 0);
      
      dailyStats.push({
        day: d.toISOString().split('T')[0],
        bookings: dayBookings.length,
        revenue: dayRevenue / 100, // המרה לשקלים
      });
    }

    const stats = {
      totalBookings,
      confirmedBookings: confirmedBookings.length,
      totalRevenue: totalRevenue / 100, // המרה לשקלים
      totalHours: Math.round(totalHours * 100) / 100,
      avgRevPerBooking: confirmedBookings.length > 0 ? Math.round((totalRevenue / confirmedBookings.length) / 100 * 100) / 100 : 0,
      avgHoursPerBooking: confirmedBookings.length > 0 ? Math.round((totalHours / confirmedBookings.length) * 100) / 100 : 0,
      daily: dailyStats,
      period: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        days: daysNum
      }
    };

    res.json({ data: stats });
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /api/owner/bookings/:id/status
 * עדכון סטטוס הזמנה על ידי בעל החניה
 */
r.patch('/bookings/:id/status', async (req: AuthedRequest, res, next) => {
  try {
    const ownerId = req.userId!;
    const bookingId = parseInt(req.params.id);
    const { status } = req.body;

    if (isNaN(bookingId)) {
      return res.status(400).json({ error: 'Invalid booking ID' });
    }

    if (!['PENDING', 'CONFIRMED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Use PENDING|CONFIRMED|CANCELLED' });
    }

    // וידוא שההזמנה שייכת לחניה של הבעלים
    const booking = await prisma.booking.findFirst({
      where: { 
        id: bookingId,
        parking: { ownerId }
      },
      include: {
        parking: true,
        user: {
          select: { id: true, email: true }
        }
      }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found or not owned by user' });
    }

    // עדכון הסטטוס
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
      include: {
        parking: true,
        user: {
          select: { id: true, email: true }
        }
      }
    });

    res.json({ data: updatedBooking });
  } catch (e) {
    next(e);
  }
});

export default r;
