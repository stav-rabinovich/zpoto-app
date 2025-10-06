import { Router } from 'express';
import { auth, AuthedRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

const r = Router();

/**
 * GET /api/profile
 * קבלת פרופיל המשתמש המחובר
 */
r.get('/', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        // לא מחזירים סיסמה
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ data: user });
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/profile
 * עדכון פרופיל המשתמש המחובר
 */
r.put('/', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { name, phone } = req.body;

    // ולידציה בסיסית
    if (name && typeof name !== 'string') {
      return res.status(400).json({ error: 'Name must be a string' });
    }

    if (phone && typeof phone !== 'string') {
      return res.status(400).json({ error: 'Phone must be a string' });
    }

    // עדכון הפרופיל
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name?.trim() || null,
        phone: phone?.trim() || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      }
    });

    res.json({ data: updatedUser });
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/profile/password
 * שינוי סיסמה
 */
r.put('/password', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // שליפת המשתמש עם הסיסמה הנוכחית
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // בדיקת הסיסמה הנוכחית
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // הצפנת הסיסמה החדשה
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // עדכון הסיסמה
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    res.json({ message: 'Password updated successfully' });
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/profile
 * מחיקת חשבון המשתמש
 */
r.delete('/', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required to delete account' });
    }

    // שליפת המשתמש
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // בדיקת הסיסמה
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Password is incorrect' });
    }

    // מחיקת המשתמש (Prisma ימחק אוטומטית את הרכבים, הזמנות וכו' בגלל CASCADE)
    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({ message: 'Account deleted successfully' });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/profile/stats
 * סטטיסטיקות המשתמש (הזמנות, רכבים וכו')
 */
r.get('/stats', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;

    // ספירת הזמנות
    const totalBookings = await prisma.booking.count({
      where: { userId }
    });

    const confirmedBookings = await prisma.booking.count({
      where: { userId, status: 'CONFIRMED' }
    });

    const pendingBookings = await prisma.booking.count({
      where: { userId, status: 'PENDING' }
    });

    // ספירת רכבים
    const totalVehicles = await prisma.vehicle.count({
      where: { userId }
    });

    // ספירת חניות (אם המשתמש הוא בעל חניה)
    const totalParkings = await prisma.parking.count({
      where: { ownerId: userId }
    });

    // סך הוצאות על הזמנות
    const bookingsWithPrices = await prisma.booking.findMany({
      where: { userId, status: 'CONFIRMED' },
      select: { totalPriceCents: true }
    });

    const totalSpent = bookingsWithPrices.reduce((sum, booking) => {
      return sum + (booking.totalPriceCents || 0);
    }, 0);

    const stats = {
      bookings: {
        total: totalBookings,
        confirmed: confirmedBookings,
        pending: pendingBookings,
      },
      vehicles: {
        total: totalVehicles,
      },
      parkings: {
        total: totalParkings,
      },
      spending: {
        totalCents: totalSpent,
        total: totalSpent / 100, // המרה לשקלים
      }
    };

    res.json({ data: stats });
  } catch (e) {
    next(e);
  }
});

export default r;
