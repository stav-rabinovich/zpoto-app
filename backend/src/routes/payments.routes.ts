import { Router } from 'express';
import { auth, AuthedRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import { createBooking } from '../services/bookings.service';

const r = Router();

/**
 * POST /api/payments/process
 * עיבוד תשלום ויצירת הזמנה
 */
r.post('/process', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const {
      parkingId,
      vehicleId,
      startTime,
      endTime,
      totalPrice,
      paymentMethod,
      licensePlate,
      vehicleDescription,
      // פרטי תשלום (לעתיד - אינטגרציה עם ספק תשלומים)
      cardNumber,
      expiryDate,
      cvv,
      cardholderName,
      // פרטי קופון
      couponCode,
      discountAmount,
      originalPrice,
    } = req.body;

    console.log('💳 Processing payment for user:', userId);
    console.log('💳 Payment details:', {
      parkingId,
      vehicleId,
      startTime,
      endTime,
      totalPrice,
      paymentMethod,
      licensePlate,
    });

    // ולידציה בסיסית
    if (!parkingId || !startTime || !endTime || !totalPrice || !paymentMethod) {
      return res.status(400).json({
        error: 'Missing required fields: parkingId, startTime, endTime, totalPrice, paymentMethod',
      });
    }

    // בדיקה שהחניה קיימת וזמינה
    const parking = await prisma.parking.findUnique({
      where: { id: parseInt(parkingId) },
      include: { owner: true },
    });

    if (!parking || !parking.isActive) {
      return res.status(404).json({ error: 'Parking not found or inactive' });
    }

    // בדיקת חפיפות זמנים
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(endTime);

    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        parkingId: parseInt(parkingId),
        status: { not: 'CANCELED' },
        NOT: [{ endTime: { lte: startDateTime } }, { startTime: { gte: endDateTime } }],
      },
    });

    if (conflictingBooking) {
      return res.status(409).json({
        error: 'Time slot is already booked',
        conflictingBooking: conflictingBooking.id,
      });
    }

    // סימולציית עיבוד תשלום
    // בעתיד כאן נוסיף אינטגרציה עם ספק תשלומים אמיתי
    console.log('💳 Simulating payment processing...');

    // סימולציה של זמן עיבוד
    await new Promise(resolve => setTimeout(resolve, 1500));

    // סימולציית הצלחה (95% הצלחה)
    const paymentSuccess = Math.random() > 0.05;

    if (!paymentSuccess) {
      console.log('💳 ❌ Payment failed (simulated)');
      return res.status(402).json({
        error: 'Payment failed',
        message: 'התשלום נכשל. אנא נסה שוב או השתמש באמצעי תשלום אחר.',
      });
    }

    // יצירת מזהה תשלום מדומה
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('💳 ✅ Payment successful, creating booking...');

    // יצירת ההזמנה דרך השירות (כך שמוד האישור יתקבל בחשבון)
    const bookingBase = await createBooking({
      userId,
      parkingId: parseInt(parkingId),
      startTime: startDateTime,
      endTime: endDateTime,
    });

    console.log('📋 Booking created with status:', bookingBase.status);

    // טיפול בקופון אם קיים
    if (couponCode && discountAmount > 0) {
      console.log('🎫 Processing coupon usage:', couponCode);

      // מציאת הקופון
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode },
      });

      if (coupon) {
        // עדכון מונה השימושים של הקופון
        await prisma.coupon.update({
          where: { code: couponCode },
          data: {
            usageCount: { increment: 1 },
          },
        });

        // יצירת רשומת שימוש בקופון
        await prisma.couponUsage.create({
          data: {
            couponId: coupon.id,
            userId,
            bookingId: bookingBase.id,
            discountAmountCents: Math.round(discountAmount * 100),
            originalAmountCents: originalPrice
              ? Math.round(originalPrice * 100)
              : Math.round(totalPrice * 100),
            finalAmountCents: Math.round(totalPrice * 100),
          },
        });

        console.log('🎫 ✅ Coupon usage recorded');
      }
    }

    // עדכון ההזמנה עם פרטי התשלום
    const booking = await prisma.booking.update({
      where: { id: bookingBase.id },
      data: {
        vehicleId: vehicleId ? parseInt(vehicleId) : null,
        paymentStatus: 'PAID',
        paymentMethod,
        paymentId,
        paidAt: new Date(),
        licensePlate,
        vehicleDescription,
        // 🔧 FIX: לא לשנות את totalPriceCents כשיש קופון
        // totalPriceCents צריך להישאר המחיר המקורי למערכת העמלות
        // המחיר שהלקוח שילם בפועל נשמר בשדות אחרים
        ...(couponCode ? {} : { totalPriceCents: Math.round(totalPrice * 100) }),
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
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    console.log('📝 ✅ Booking created successfully:', booking.id);

    // עדכון דמי התפעול אחרי קופון אם נדרש
    if (couponCode && discountAmount > 0) {
      console.log('💳 Updating operational fee after coupon usage');
      
      try {
        const { updateOperationalFeeAfterCoupon } = await import('../services/operationalFees.service');
        
        // חישוב המחירים
        const finalPriceCents = Math.round(totalPrice * 100);
        
        // 🔧 FIX: חישוב נכון של המחיר המקורי לפני קופון
        // המחיר המקורי = עלות חניה + דמי תפעול מקוריים (לא אחרי הנחה)
        const parking = await prisma.parking.findUnique({
          where: { id: parseInt(parkingId) },
          select: { priceHr: true }
        });
        
        if (!parking) {
          throw new Error(`Parking ${parkingId} not found for operational fee update`);
        }
        
        const ms = booking.endTime.getTime() - booking.startTime.getTime();
        const hours = Math.ceil(ms / (1000 * 60 * 60));
        const originalParkingCostCents = Math.round(parking.priceHr * hours * 100);
        const originalOperationalFeeCents = Math.round(originalParkingCostCents * 0.1); // 10%
        const originalTotalPriceCents = originalParkingCostCents + originalOperationalFeeCents;
        
        console.log(`💳 Coupon adjustment calculation:`, {
          parkingCost: `₪${originalParkingCostCents / 100} (${parking.priceHr}/hr × ${hours}h)`,
          originalTotal: `₪${originalTotalPriceCents / 100}`,
          finalTotal: `₪${finalPriceCents / 100}`,
          discount: `₪${discountAmount}`,
          originalOperationalFee: `₪${originalOperationalFeeCents / 100}`
        });
        
        await updateOperationalFeeAfterCoupon(
          booking.id,
          finalPriceCents,
          originalParkingCostCents
        );
        
        console.log('💳 ✅ Operational fee updated for coupon usage');
      } catch (error) {
        console.error('❌ Failed to update operational fee:', error);
        // לא נזרוק שגיאה כי התשלום כבר הצליח
      }
    }

    // החזרת תגובה מוצלחת
    res.status(201).json({
      success: true,
      booking: {
        id: booking.id,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        totalPrice: booking.totalPriceCents ? booking.totalPriceCents / 100 : 0,
        paymentStatus: booking.paymentStatus,
        paymentId: booking.paymentId,
        parking: booking.parking,
        licensePlate: booking.licensePlate,
        vehicleDescription: booking.vehicleDescription,
      },
      message: 'התשלום בוצע בהצלחה וההזמנה נוצרה!',
    });
  } catch (error) {
    console.error('💳 ❌ Payment processing error:', error);
    next(error);
  }
});

/**
 * GET /api/payments/status/:bookingId
 * בדיקת סטטוס תשלום של הזמנה
 */
r.get('/status/:bookingId', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const bookingId = parseInt(req.params.bookingId);

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId, // וידוא שההזמנה שייכת למשתמש
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        paymentId: true,
        paidAt: true,
        totalPriceCents: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({
      bookingId: booking.id,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod,
      paymentId: booking.paymentId,
      paidAt: booking.paidAt,
      totalPrice: booking.totalPriceCents ? booking.totalPriceCents / 100 : 0,
    });
  } catch (error) {
    console.error('Payment status check error:', error);
    next(error);
  }
});

export default r;
