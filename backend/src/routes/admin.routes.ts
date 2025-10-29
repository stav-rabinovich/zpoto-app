import { Router } from 'express';
import * as svc from '../services/admin.service';
import * as cleanupSvc from '../services/cleanup.service';
import { couponService } from '../services/coupon.service';
import { requireAdmin, AuthedRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';

const r = Router();

// כל ה-routes דורשים הרשאות Admin
r.use(requireAdmin);

/**
 * GET /api/admin/listing-requests
 * רשימת כל בקשות הפרסום (עם אפשרות סינון לפי סטטוס)
 */
r.get('/listing-requests', async (req, res, next) => {
  try {
    const { status } = req.query;
    const data = await svc.listListingRequests(status ? { status: String(status) } : undefined);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/admin/listing-requests/:id
 * פרטי בקשה בודדת
 */
r.get('/listing-requests/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await svc.getListingRequest(id);
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/admin/listing-requests/:id/approve
 * אישור בקשה - יוצר Parking ומשנה role ל-OWNER
 */
r.post('/listing-requests/:id/approve', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await svc.approveListingRequest(id);
    res.json(result);
  } catch (e: any) {
    if (e?.message === 'REQUEST_NOT_FOUND') {
      return res.status(404).json({ error: 'Request not found' });
    }
    if (e?.message === 'REQUEST_ALREADY_PROCESSED') {
      return res.status(400).json({ error: 'Request already processed' });
    }
    next(e);
  }
});

/**
 * PATCH /api/admin/listing-requests/:id/reject
 * דחיית בקשה
 * Body: { reason?: string }
 */
r.patch('/listing-requests/:id/reject', async (req, res) => {
  const id = Number(req.params.id);
  const { reason } = req.body ?? {};
  try {
    await svc.rejectRequest(id, reason);
    res.json({ message: 'Request rejected' });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * PATCH /api/admin/listing-requests/:id/onboarding
 * עדכון נתוני אונבורדינג
 * Body: { onboarding: string (JSON) }
 */
r.patch('/listing-requests/:id/onboarding', async (req, res) => {
  const id = Number(req.params.id);
  const { onboarding } = req.body ?? {};

  if (typeof onboarding !== 'string') {
    return res.status(400).json({ error: 'onboarding must be a JSON string' });
  }

  try {
    // חילוץ קואורדינטות מנתוני האונבורדינג
    let updateData: any = { onboarding };

    try {
      const onboardingData = JSON.parse(onboarding);

      // אם יש קואורדינטות בנתוני האונבורדינג, עדכן גם את השדות הישירים
      if (onboardingData.lat && onboardingData.lng) {
        updateData.lat = parseFloat(onboardingData.lat);
        updateData.lng = parseFloat(onboardingData.lng);
        console.log(
          `🗺️ Updated coordinates for request ${id}: lat=${updateData.lat}, lng=${updateData.lng}`
        );
      }

      // עדכון כתובת מפורטת אם יש
      if (onboardingData.fullAddress && onboardingData.city) {
        updateData.fullAddress = onboardingData.fullAddress;
        updateData.city = onboardingData.city;
      }
    } catch (parseError) {
      console.error('Failed to parse onboarding JSON:', parseError);
      // ממשיכים עם עדכון רק של onboarding field
    }

    const updated = await prisma.listingRequest.update({
      where: { id },
      data: updateData,
    });
    res.json(updated);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/admin/listing-requests/:id/send-for-signature
 * שליחת מייל ללקוח לחתימה על המסמך
 * Body: { onboardingData: object }
 */
r.post('/listing-requests/:id/send-for-signature', async (req, res) => {
  const id = Number(req.params.id);
  const { onboardingData } = req.body ?? {};

  try {
    // שמירת הנתונים עם קואורדינטות מעודכנות
    const updateData: any = {
      onboarding: JSON.stringify(onboardingData),
    };

    // אם יש קואורדינטות מהגיאוקודינג, עדכן גם אותן
    if (onboardingData.lat && onboardingData.lng) {
      updateData.lat = parseFloat(onboardingData.lat);
      updateData.lng = parseFloat(onboardingData.lng);
      console.log(`🗺️ Updating coordinates from onboarding: ${updateData.lat}, ${updateData.lng}`);
    }

    // עדכון כתובת מלאה אם קיימת
    if (onboardingData.fullAddress) {
      updateData.fullAddress = onboardingData.fullAddress;
      console.log(`📍 Updating full address: ${onboardingData.fullAddress}`);
    }

    await prisma.listingRequest.update({
      where: { id },
      data: updateData,
    });

    // קבלת פרטי הבקשה
    const request = await prisma.listingRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // שליחת מייל לחתימה (אופציונלי - אם יש הגדרות)
    try {
      const { sendOnboardingSignatureEmail } = await import('../services/email.service');
      await sendOnboardingSignatureEmail(request.user.email, onboardingData, id);
      console.log('✅ Signature email sent to:', request.user.email);
    } catch (emailError) {
      console.log('⚠️ Email not configured, skipping email send');
      console.log('📧 Would send email to:', request.user.email);
    }

    res.json({
      message: 'Data saved successfully. Email configuration needed for sending.',
      email: request.user.email,
      signatureUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/sign/${id}`,
      note: 'Configure EMAIL_USER and EMAIL_PASS in .env to enable email sending',
    });
  } catch (e: any) {
    console.error('❌ Error:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/admin/users/:id/temp-password
 * הצגת הסיסמה הזמנית מהטרמינל (אם נוצרה לאחרונה)
 */
r.get('/users/:id/temp-password', async (req, res) => {
  const userId = Number(req.params.id);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'OWNER') {
      return res.status(400).json({ error: 'User is not an owner' });
    }

    // בדיקה אם המשתמש נוצר לאחרונה (תוך 24 שעות)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const isRecentlyCreated = user.updatedAt > dayAgo;

    if (!isRecentlyCreated) {
      return res.json({
        hasRecentPassword: false,
        message: 'No recent temporary password available. User created more than 24 hours ago.',
      });
    }

    // חיפוש הסיסמה הזמנית שנוצרה בטרמינל
    // נוצרת בפורמט: zpoto + 6 ספרות אחרונות של timestamp
    // מאחר ואין אפשרות לשחזר את הסיסמה המוצפנת, נציג הודעה מתאימה

    res.json({
      hasRecentPassword: true,
      email: user.email,
      name: user.name,
      message: 'הסיסמה הזמנית נוצרה בעת אישור הבקשה. בדוק בטרמינל הודעה עם הפורמט: zpoto######',
      note: 'אם השכחת את הסיסמה, השתמש בכפתור "שנה סיסמה" למטה ליצירת סיסמה חדשה',
      terminalHint: 'חפש בטרמינל: "Generated temporary password for owner"',
    });
  } catch (e: any) {
    console.error('❌ Error getting temp password info:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * PATCH /api/admin/users/:id
 * עדכון פרטי משתמש
 */
r.patch('/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, email, phone } = req.body;

  console.log('📝 Updating user:', { id, name, email, phone });

  try {
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;

    console.log('📝 Update data:', updateData);

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    console.log('✅ User updated successfully:', updated);
    res.json(updated);
  } catch (e: any) {
    console.error('❌ Error updating user:', e);
    res.status(500).json({ error: 'Internal Server Error', details: e.message });
  }
});

/**
 * GET /api/admin/parkings/:id
 * פרטי חניה מפורטים (כולל פרטי בעל החניה וסיסמה)
 */
r.get('/parkings/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    const parking = await prisma.parking.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            createdAt: true,
            password: true, // נכלול כדי לבדוק אם יש סיסמה
            isBlocked: true, // סטטוס חסימה
          },
        },
        bookings: {
          select: {
            id: true,
            status: true,
            startTime: true,
            endTime: true,
            totalPriceCents: true,
            createdAt: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: req.query.includeFullBookingHistory === 'true' ? undefined : 10,
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    if (!parking) {
      return res.status(404).json({ error: 'Parking not found' });
    }

    // שליפת נתוני אונבורדינג אם קיימים
    let onboardingData = null;
    if (parking.owner) {
      const listingRequest = await prisma.listingRequest.findFirst({
        where: {
          userId: parking.owner.id,
          status: 'APPROVED',
        },
        orderBy: { createdAt: 'desc' },
        select: { onboarding: true },
      });

      if (listingRequest?.onboarding) {
        try {
          onboardingData = JSON.parse(listingRequest.onboarding);
          console.log(`📋 Found onboarding data for parking ${id}:`, Object.keys(onboardingData));
        } catch (error) {
          console.error('Error parsing onboarding data:', error);
        }
      }
    }

    // הסרת הסיסמה המלאה מהתגובה ועיבוד פרטי הבעלים
    const { password, ...safeOwner } = parking.owner || {};

    res.json({
      ...parking,
      owner: parking.owner
        ? {
            ...safeOwner,
            hasPassword: !!password,
            isBlocked: parking.owner.isBlocked,
            // לא מחזירים את הסיסמה המוצפנת כלל - זה חסר תועלת
          }
        : null,
      onboardingData, // הוספת נתוני האונבורדינג
    });
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /api/admin/parkings/:id
 * עדכון פרטי חניה
 */
r.patch('/parkings/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { isActive } = req.body;

  try {
    const updated = await prisma.parking.update({
      where: { id },
      data: {
        ...(typeof isActive === 'boolean' && { isActive }),
      },
    });

    res.json(updated);
  } catch (e: any) {
    console.error('❌ Error updating parking:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * PATCH /api/admin/parkings/:id/owner-password
 * עדכון סיסמת בעל החניה
 * Body: { newPassword: string }
 */
r.patch('/parkings/:id/owner-password', async (req, res, next) => {
  try {
    const parkingId = Number(req.params.id);
    const { newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({
        error: 'New password is required and must be at least 6 characters',
      });
    }

    // מציאת החניה ובעליה
    const parking = await prisma.parking.findUnique({
      where: { id: parkingId },
      include: { owner: true },
    });

    if (!parking) {
      return res.status(404).json({ error: 'Parking not found' });
    }

    if (!parking.owner) {
      return res.status(400).json({ error: 'No owner found for this parking' });
    }

    // הצפנת הסיסמה החדשה
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // עדכון סיסמת הבעלים
    const updatedOwner = await prisma.user.update({
      where: { id: parking.owner.id },
      data: { password: hashedPassword },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
    });

    console.log(
      `✅ Admin updated owner password for parking ${parkingId}, owner: ${updatedOwner.email}`
    );

    res.json({
      success: true,
      message: 'Owner password updated successfully',
      owner: updatedOwner,
      newPasswordPreview: `${newPassword.substring(0, 6)}...`,
    });
  } catch (e) {
    console.error('❌ Error updating owner password:', e);
    next(e);
  }
});

/**
 * PATCH /api/admin/users/:id/block
 * חסימה או ביטול חסימה של משתמש
 * Body: { block: boolean }
 */
r.patch('/users/:id/block', async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const { block } = req.body;

    if (typeof block !== 'boolean') {
      return res.status(400).json({ error: 'block field must be boolean' });
    }

    // עדכון סטטוס החסימה
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: block },
      select: {
        id: true,
        email: true,
        name: true,
        isBlocked: true,
      },
    });

    // אם חוסמים - מכבים את כל החניות של הבעלים
    if (block) {
      await prisma.parking.updateMany({
        where: { ownerId: userId },
        data: {
          isActive: false,
          // מאפסים שעות פעילות (availability) כדי שיגדיר מחדש אחרי שחרור
          availability: null,
        },
      });
    } else {
      // אם משחררים - מפעילים את החניות אבל שעות הפעילות נשארות null
      await prisma.parking.updateMany({
        where: { ownerId: userId },
        data: { isActive: true },
      });
    }

    console.log(`${block ? '🚫 Blocked' : '✅ Unblocked'} user ${user.email} (ID: ${userId})`);

    res.json({
      success: true,
      message: block ? 'User blocked successfully' : 'User unblocked successfully',
      user,
    });
  } catch (e) {
    console.error('❌ Error updating user block status:', e);
    next(e);
  }
});

/**
 * DELETE /api/admin/parkings/:id
 * מחיקת חניה
 */
r.delete('/parkings/:id', async (req, res) => {
  const id = Number(req.params.id);

  try {
    await prisma.parking.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error('❌ Error deleting parking:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/admin/parkings
 * רשימת כל החניות עם נתונים מסונכרנים
 */
r.get('/parkings', async (_req, res, next) => {
  try {
    const parkings = await prisma.parking.findMany({
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            createdAt: true,
            isBlocked: true,
            listingRequests: {
              select: {
                id: true,
                onboarding: true,
                status: true,
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        bookings: {
          select: {
            id: true,
            status: true,
            startTime: true,
            endTime: true,
            totalPriceCents: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // חישוב נתונים מסונכרנים לכל חניה
    const parkingsWithStats = parkings.map(parking => {
      const confirmedBookings = parking.bookings.filter(b => b.status === 'CONFIRMED');
      const pendingBookings = parking.bookings.filter(b => b.status === 'PENDING_APPROVAL');
      const canceledBookings = parking.bookings.filter(b => b.status === 'CANCELED');

      // חישוב שעות חניה
      const totalParkingHours = confirmedBookings.reduce((total, booking) => {
        const start = new Date(booking.startTime);
        const end = new Date(booking.endTime);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }, 0);

      // חישוב הכנסות
      const totalRevenueCents = confirmedBookings.reduce((total, booking) => {
        return total + (booking.totalPriceCents || 0);
      }, 0);

      // חישוב ממוצע הכנסה לשעה
      const averageRevenuePerHour =
        totalParkingHours > 0 ? totalRevenueCents / 100 / totalParkingHours : 0;

      // חישוב ממוצע משך חניה
      const averageParkingDuration =
        confirmedBookings.length > 0 ? totalParkingHours / confirmedBookings.length : 0;

      // חישוב הזמנות השבוע האחרון
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentBookings = confirmedBookings.filter(b => new Date(b.startTime) >= weekAgo).length;

      console.log(
        `🏢 Parking ${parking.id} (${parking.address}): ${confirmedBookings.length} confirmed, ${pendingBookings.length} pending, ${totalParkingHours.toFixed(1)}h, ₪${(totalRevenueCents / 100).toFixed(2)}`
      );

      return {
        ...parking,
        // הסרת bookings מהתגובה - רק ה-stats חשובים
        bookings: undefined,
        stats: {
          totalBookings: parking._count.bookings,
          confirmedBookings: confirmedBookings.length,
          pendingBookings: pendingBookings.length,
          canceledBookings: canceledBookings.length,
          totalParkingHours: Math.round(totalParkingHours * 10) / 10,
          averageParkingDuration: Math.round(averageParkingDuration * 10) / 10,
          totalRevenueCents,
          totalRevenueILS: (totalRevenueCents / 100).toFixed(2),
          averageRevenuePerHour: averageRevenuePerHour.toFixed(2),
          recentBookingsWeek: recentBookings,
          utilizationRate:
            totalParkingHours > 0 ? ((totalParkingHours / (24 * 7)) * 100).toFixed(1) : '0', // אחוז ניצול שבועי משוער
        },
      };
    });

    console.log(`🏢 Admin parkings loaded: ${parkingsWithStats.length} parkings with full stats`);
    res.json({ data: parkingsWithStats });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/admin/stats
 * נתונים סטטיסטיים כלליים
 */
r.get('/stats', async (_req, res, next) => {
  try {
    const data = await svc.getStats();
    res.json(data);
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/admin/users
 * רשימת כל המשתמשים
 */
r.get('/users', async (_req, res, next) => {
  try {
    const data = await svc.listUsers();
    res.json(data);
  } catch (e) {
    console.log(e);
    next(e);
  }
});

/**
 * GET /api/admin/bookings
 * רשימת כל ההזמנות (עם פילטרים אופציונליים)
 */
r.get('/bookings', async (req, res, next) => {
  try {
    const { status, userId, parkingId } = req.query;
    const data = await svc.listAllBookings({
      status: status ? String(status) : undefined,
      userId: userId ? Number(userId) : undefined,
      parkingId: parkingId ? Number(parkingId) : undefined,
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/admin/chats
 * רשימת כל הצ'אטים
 */
r.get('/chats', async (req, res, next) => {
  try {
    const { getAllChats } = await import('../services/chat.service');
    const chats = await getAllChats();
    res.json({ data: chats });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/admin/chats/:userId/reply
 * מענה לצ'אט של משתמש
 */
r.post('/chats/:userId/reply', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    const { message, parkingId } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const { sendMessage } = await import('../services/chat.service');
    const chat = await sendMessage({
      userId,
      message: message.trim(),
      isFromUser: false, // מאדמין
      parkingId: parkingId || undefined,
    });

    res.json({ data: chat });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/admin/users
 * רשימת כל המשתמשים עם סטטיסטיקות
 */
r.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, registrationSource } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // בניית פילטרים
    const where: any = {};
    if (role && typeof role === 'string') {
      where.role = role;
    }
    // TODO: הוסף לאחר עדכון הסכמה:
    // if (registrationSource && typeof registrationSource === 'string') {
    //   where.registrationSource = registrationSource;
    // }

    // שליפת משתמשים
    const users = await prisma.user.findMany({
      where,
      skip: offset,
      take: Number(limit),
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        googleId: true,
        facebookId: true,
        appleId: true,
        profilePicture: true,
        createdAt: true,
        // TODO: הוסף לאחר עדכון הסכמה:
        // registrationSource: true,
        // lastLoginAt: true,
        // isEmailVerified: true,
        // migratedFromDeviceId: true,
        // migrationCompletedAt: true,
        _count: {
          select: {
            bookings: true,
            favorites: true,
            vehicles: true,
            ownedParkings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // ספירה כוללת
    const total = await prisma.user.count({ where });

    // הוספת מידע נוסף לכל משתמש
    const usersWithStats = users.map(user => ({
      ...user,
      isSocialLogin: !!(user.googleId || user.facebookId || user.appleId),
      registrationSource: user.googleId
        ? 'google'
        : user.facebookId
          ? 'facebook'
          : user.appleId
            ? 'apple'
            : 'email',
      stats: {
        totalBookings: user._count.bookings,
        totalFavorites: user._count.favorites,
        totalVehicles: user._count.vehicles,
        totalParkings: user._count.ownedParkings,
      },
    }));

    res.json({
      data: usersWithStats,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/admin/users/:id
 * פרטי משתמש מפורטים
 */
r.get('/users/:id', async (req, res, next) => {
  try {
    const userId = Number(req.params.id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        bookings: {
          include: {
            parking: {
              select: {
                id: true,
                title: true,
                address: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: req.query.includeFullBookingHistory === 'true' ? undefined : 10,
        },
        favorites: {
          include: {
            parking: {
              select: {
                id: true,
                title: true,
                address: true,
              },
            },
          },
        },
        vehicles: true,
        ownedParkings: {
          select: {
            id: true,
            title: true,
            address: true,
            isActive: true,
            createdAt: true,
          },
        },
        savedPlaces: true,
        recentSearches: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // הסרת הסיסמה מהתגובה
    const { password, ...userWithoutPassword } = user;

    res.json({ data: userWithoutPassword });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/admin/stats/users
 * סטטיסטיקות משתמשים כלליות
 */
r.get('/stats/users', async (req, res, next) => {
  try {
    // סטטיסטיקות בסיסיות
    const totalUsers = await prisma.user.count();
    const totalAdmins = await prisma.user.count({ where: { role: 'ADMIN' } });
    const totalOwners = await prisma.user.count({ where: { role: 'OWNER' } });
    const totalRegularUsers = await prisma.user.count({ where: { role: 'USER' } });

    // משתמשים עם OAuth
    const googleUsers = await prisma.user.count({ where: { googleId: { not: null } } });
    const facebookUsers = await prisma.user.count({ where: { facebookId: { not: null } } });
    const appleUsers = await prisma.user.count({ where: { appleId: { not: null } } });

    // משתמשים חדשים השבוע
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newUsersThisWeek = await prisma.user.count({
      where: { createdAt: { gte: weekAgo } },
    });

    // משתמשים פעילים (עם הזמנות)
    const activeUsers = await prisma.user.count({
      where: {
        bookings: {
          some: {},
        },
      },
    });

    res.json({
      data: {
        total: totalUsers,
        byRole: {
          admin: totalAdmins,
          owner: totalOwners,
          user: totalRegularUsers,
        },
        byRegistrationSource: {
          email: totalUsers - googleUsers - facebookUsers - appleUsers,
          google: googleUsers,
          facebook: facebookUsers,
          apple: appleUsers,
        },
        activity: {
          newThisWeek: newUsersThisWeek,
          activeUsers,
        },
      },
    });
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/admin/users/:id/role
 * שינוי תפקיד משתמש
 */
r.put('/users/:id/role', async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const { role } = req.body;

    if (!role || !['USER', 'ADMIN', 'OWNER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be USER, ADMIN, or OWNER' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    res.json({
      data: updatedUser,
      message: `User role updated to ${role}`,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/admin/parkings/:id/delete-and-reset-owner
 * מחיקת חניה והחזרת בעל החניה למצב מחפש חניה
 */
r.delete('/parkings/:id/delete-and-reset-owner', async (req, res, next) => {
  try {
    const parkingId = Number(req.params.id);

    console.log(`🗑️ מוחק חניה ${parkingId} ומחזיר בעלים למצב מחפש חניה...`);

    // מצא את החניה ובעל החניה
    const parking = await prisma.parking.findUnique({
      where: { id: parkingId },
      include: { owner: true },
    });

    if (!parking) {
      return res.status(404).json({ error: 'Parking not found' });
    }

    const ownerId = parking.ownerId;

    // מחק את החניה (זה ימחק אוטומטית הזמנות קשורות)
    await prisma.parking.delete({
      where: { id: parkingId },
    });

    console.log(`✅ חניה ${parkingId} נמחקה`);

    // בדוק אם לבעלים יש עוד חניות
    const remainingParkings = await prisma.parking.count({
      where: { ownerId },
    });

    if (remainingParkings === 0) {
      console.log(`👤 בעל החניה ${ownerId} לא נותר לו חניות - מחזיר למצב מחפש חניה`);

      // אם אין עוד חניות, הפוך אותו חזרה למשתמש רגיל
      // לא צריך לעדכן שום דבר - הוא פשוט לא יהיה בעל חניה יותר
      // הסטטוס שלו יוחזר אוטומטית ל-'none' כי אין לו חניות
    }

    res.json({
      message: 'Parking deleted and owner reset to seeker status',
      parkingId,
      ownerId,
      remainingParkings,
    });
  } catch (e) {
    console.error('❌ שגיאה במחיקת חניה:', e);
    next(e);
  }
});

/**
 * POST /api/admin/system/health-check
 * בדיקת תקינות המערכת
 */
r.post('/system/health-check', async (req, res, next) => {
  try {
    const result = await cleanupSvc.systemHealthCheck();
    res.json(result);
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/admin/system/fix-orphaned-owners
 * תיקון משתמשים שנשארו OWNER ללא חניות
 */
r.post('/system/fix-orphaned-owners', async (req, res, next) => {
  try {
    const result = await cleanupSvc.fixOrphanedOwners();
    res.json(result);
  } catch (error: any) {
    next(error);
  }
});

/**
 * POST /api/admin/system/auto-fix
 * תיקון אוטומטי של כל הבעיות
 */
r.post('/system/auto-fix', async (req, res, next) => {
  try {
    const result = await cleanupSvc.autoFixSystemIssues();
    res.json(result);
  } catch (error: any) {
    next(error);
  }
});

// =====================
// COUPON MANAGEMENT ROUTES
// =====================

/**
 * GET /api/admin/coupons
 * רשימת כל הקופונים
 */
r.get('/coupons', async (req, res, next) => {
  try {
    const coupons = await couponService.getAllCoupons();
    res.json(coupons);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/coupons/stats
 * סטטיסטיקות קופונים
 */
r.get('/coupons/stats', async (req, res, next) => {
  try {
    const stats = await couponService.getCouponStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/coupons/:id
 * פרטי קופון בודד
 */
r.get('/coupons/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'מזהה קופון לא תקין' });
    }

    const coupon = await couponService.getCouponById(id);
    if (!coupon) {
      return res.status(404).json({ error: 'קופון לא נמצא' });
    }

    res.json(coupon);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/coupons
 * יצירת קופון חדש
 */
r.post('/coupons', async (req, res, next) => {
  try {
    const { code, discountType, discountValue, applyTo, validUntil, maxUsage } = req.body;

    // Validation
    if (!code || !discountType || !discountValue || !applyTo || !validUntil) {
      return res.status(400).json({
        error: 'שדות חובה חסרים: code, discountType, discountValue, applyTo, validUntil',
      });
    }

    const coupon = await couponService.createCoupon({
      code,
      discountType,
      discountValue: Number(discountValue),
      applyTo,
      validUntil: new Date(validUntil),
      maxUsage: maxUsage ? Number(maxUsage) : undefined,
      createdById: (req as AuthedRequest).userId!, // מגיע מה-middleware
    });

    res.status(201).json(coupon);
  } catch (error: any) {
    if (error.message.includes('כבר קיים')) {
      return res.status(409).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * PUT /api/admin/coupons/:id
 * עדכון קופון
 */
r.put('/coupons/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'מזהה קופון לא תקין' });
    }

    const { code, discountType, discountValue, applyTo, validUntil, maxUsage, isActive } = req.body;

    const updateData: any = {};
    if (code !== undefined) updateData.code = code;
    if (discountType !== undefined) updateData.discountType = discountType;
    if (discountValue !== undefined) updateData.discountValue = Number(discountValue);
    if (applyTo !== undefined) updateData.applyTo = applyTo;
    if (validUntil !== undefined) updateData.validUntil = new Date(validUntil);
    if (maxUsage !== undefined) updateData.maxUsage = maxUsage ? Number(maxUsage) : null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const coupon = await couponService.updateCoupon(id, updateData);
    res.json(coupon);
  } catch (error: any) {
    if (error.message.includes('לא נמצא')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('כבר קיים')) {
      return res.status(409).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * DELETE /api/admin/coupons/:id
 * מחיקת קופון
 */
r.delete('/coupons/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'מזהה קופון לא תקין' });
    }

    await couponService.deleteCoupon(id);
    res.status(204).send();
  } catch (error: any) {
    if (error.message.includes('לא נמצא')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('כבר נוצל')) {
      return res.status(409).json({ error: error.message });
    }
    next(error);
  }
});

export default r;
