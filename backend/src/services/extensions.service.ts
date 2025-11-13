/**
 * שירות הארכות חניה
 * מטפל בלוגיקה של הארכת חניה ב-30 דקות
 */

import { PrismaClient } from '@prisma/client';
import { isParkingAvailableByOwnerSettings } from './parkings.service';

const prisma = new PrismaClient();

/**
 * בדיקת זמינות החניה מהבעלים בטווח זמנים נתון
 * 🔧 תוקן: משתמש במערכת הזמינות החדשה
 */
async function checkOwnerAvailability(
  parkingId: number,
  startTime: Date,
  endTime: Date
): Promise<{ isAvailable: boolean; unavailableFrom?: string }> {
  console.log(`🔍 Extension: Checking owner availability for parking ${parkingId}:`, {
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
  });

  // קבלת הגדרות זמינות החניה
  const parking = await prisma.parking.findUnique({
    where: { id: parkingId },
    select: {
      availability: true,
      ownerId: true,
    },
  });

  if (!parking) {
    console.log(`❌ Extension: Parking ${parkingId} not found`);
    return { isAvailable: false, unavailableFrom: 'החניה לא נמצאה' };
  }

  if (!parking.availability) {
    // אם אין הגדרות זמינות - החניה זמינה תמיד
    console.log(`✅ Extension: No availability settings - parking always available`);
    return { isAvailable: true };
  }

  // השתמש בפונקציה החדשה שעובדת עם זמן ישראל
  const isAvailable = isParkingAvailableByOwnerSettings(parking.availability, startTime, endTime);

  if (isAvailable) {
    console.log(`✅ Extension: Parking available according to owner settings`);
    return { isAvailable: true };
  } else {
    console.log(`❌ Extension: Parking not available according to owner settings`);
    // יצירת הודעה עם זמן ישראל
    const { fromUTC } = require('../utils/timezone');
    const startTimeIsrael = fromUTC(startTime);
    const unavailableFrom = startTimeIsrael.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      isAvailable: false,
      unavailableFrom,
    };
  }
}

interface ExtensionRequest {
  bookingId: number;
  userId: number;
}

interface ExtensionResult {
  success: boolean;
  canExtend: boolean;
  reason?: string;
  message?: string;
  newEndTime?: Date;
  extensionPrice?: number;
  conflictBooking?: any;
}

/**
 * בדיקה האם ניתן להאריך חניה ב-30 דקות
 */
export async function checkExtensionEligibility(
  bookingId: number,
  userId: number
): Promise<ExtensionResult> {
  console.log(`🔍 Checking extension eligibility for booking #${bookingId} by user #${userId}`);

  // 1. שליפת פרטי ההזמנה הנוכחית
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      parking: {
        select: {
          id: true,
          title: true,
          pricing: true,
          ownerId: true,
        },
      },
    },
  });

  console.log(
    `📋 Booking found:`,
    booking
      ? {
          id: booking.id,
          userId: booking.userId,
          status: booking.status,
          startTime: booking.startTime,
          endTime: booking.endTime,
          parkingTitle: booking.parking?.title,
        }
      : 'No booking found'
  );

  if (!booking) {
    return {
      success: false,
      canExtend: false,
      reason: 'BOOKING_NOT_FOUND',
    };
  }

  // 2. וודא שההזמנה שייכת למשתמש
  if (booking.userId !== userId) {
    console.log(
      `❌ Authorization failed - booking belongs to user #${booking.userId}, requested by user #${userId}`
    );
    return {
      success: false,
      canExtend: false,
      reason: 'UNAUTHORIZED',
    };
  }

  // 3. וודא שההזמנה פעילה כרגע או עתידית
  const now = new Date();
  const isActive =
    booking.status === 'CONFIRMED' && booking.startTime <= now && booking.endTime > now;
  const isUpcoming = booking.status === 'CONFIRMED' && booking.startTime > now;

  console.log(`⏰ Activity check:`, {
    status: booking.status,
    startTime: booking.startTime,
    endTime: booking.endTime,
    now,
    isStarted: booking.startTime <= now,
    isNotEnded: booking.endTime > now,
    isActive,
    isUpcoming,
  });

  if (!isActive && !isUpcoming) {
    console.log(
      `❌ Booking not active or upcoming - status: ${booking.status}, period: ${booking.startTime} to ${booking.endTime}`
    );
    return {
      success: false,
      canExtend: false,
      reason: 'BOOKING_NOT_ACTIVE',
    };
  }

  // לחניות פעילות - בדיקה שנשארו לפחות 10 דקות
  if (isActive) {
    const timeLeft = booking.endTime.getTime() - now.getTime();
    const minutesLeft = timeLeft / (1000 * 60);

    if (minutesLeft < 10) {
      console.log(`❌ Less than 10 minutes left: ${minutesLeft.toFixed(1)} minutes`);
      return {
        success: false,
        canExtend: false,
        reason: 'TOO_CLOSE_TO_END',
      };
    }
  }

  // 4. חישוב זמן ההארכה החדש (30 דקות)
  const extensionMinutes = 30;
  const newEndTime = new Date(booking.endTime.getTime() + extensionMinutes * 60 * 1000);

  console.log(`⏰ Current end time: ${booking.endTime}`);
  console.log(`⏰ Proposed new end time: ${newEndTime}`);

  // 5. בדיקת התנגשויות עם הזמנות אחרות (עדיפות ראשונה)
  console.log(`🔍 Checking for conflicting bookings from ${booking.endTime} to ${newEndTime}`);

  // 6. בדיקת התנגשויות עם הזמנות אחרות
  const conflictingBooking = await prisma.booking.findFirst({
    where: {
      parkingId: booking.parkingId,
      status: 'CONFIRMED',
      startTime: {
        lt: newEndTime, // מתחיל לפני שההארכה מסתיימת
      },
      endTime: {
        gt: booking.endTime, // מסתיים אחרי שההזמנה הנוכחית מסתיימת
      },
      id: {
        not: bookingId, // לא ההזמנה הנוכחית
      },
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (conflictingBooking) {
    console.log(`❌ Extension blocked by conflicting booking:`, {
      conflictId: conflictingBooking.id,
      conflictStart: conflictingBooking.startTime,
      conflictEnd: conflictingBooking.endTime,
      conflictUser: conflictingBooking.user?.email,
    });

    return {
      success: true,
      canExtend: false,
      reason: 'PARKING_OCCUPIED',
      conflictBooking: {
        id: conflictingBooking.id,
        startTime: conflictingBooking.startTime,
        endTime: conflictingBooking.endTime,
        userEmail: conflictingBooking.user?.email,
      },
    };
  }

  // 7. בדיקת זמינות החניה מהבעלים - חסימת הארכה אם הוגדרה הגבלה
  console.log(`🕐 Checking owner availability from ${booking.endTime} to ${newEndTime}`);

  const availabilityCheck = await checkOwnerAvailability(
    booking.parkingId,
    booking.endTime,
    newEndTime
  );

  // אם בעל החניה הגדיר שהחניה לא זמינה - חסימת הארכה
  if (!availabilityCheck.isAvailable) {
    console.log(`❌ Owner marked parking as unavailable during extension period`);
    console.log(`🔒 Extension blocked due to owner availability settings`);
    return {
      success: false,
      canExtend: false,
      reason: 'OWNER_UNAVAILABLE',
      message: `החניה לא זמינה להארכה.\n\nבעל החניה הגדיר שהחניה פעילה רק עד ${availabilityCheck.unavailableFrom}.\n\nההארכה המבוקשת (30 דקות נוספות) תחרוג מהשעות הפעילות שהגדיר בעל החניה.`,
    };
  }

  // 8. חישוב מחיר ההארכה - תמיד חצי מהמחיר של השעה הראשונה מהמחירון
  let firstHourPrice = 10; // ברירת מחדל
  
  // נסה לקרוא מהמחירון הקיים של החניה
  if (booking.parking.pricing) {
    try {
      const pricingData = typeof booking.parking.pricing === 'string' 
        ? JSON.parse(booking.parking.pricing) 
        : booking.parking.pricing;
      
      if (pricingData?.hour1) {
        firstHourPrice = typeof pricingData.hour1 === 'string' 
          ? parseFloat(pricingData.hour1) 
          : pricingData.hour1;
        console.log(`💰 Using existing pricing: hour1 = ₪${firstHourPrice}`);
      }
    } catch (error) {
      console.warn('Failed to parse existing pricing for extension:', error);
    }
  }

  // נסה לקרוא את המחירון החדש (אם לא היה במחירון הקיים)
  const parkingWithPricing = await prisma.parking.findUnique({
    where: { id: booking.parkingId },
    select: { pricing: true },
  });

  if (parkingWithPricing?.pricing) {
    try {
      const pricingData =
        typeof parkingWithPricing.pricing === 'string'
          ? JSON.parse(parkingWithPricing.pricing)
          : parkingWithPricing.pricing;

      if (pricingData?.hour1) {
        const hour1Price =
          typeof pricingData.hour1 === 'string' ? parseFloat(pricingData.hour1) : pricingData.hour1;

        if (!isNaN(hour1Price) && hour1Price > 0) {
          firstHourPrice = hour1Price;
          console.log(`💰 Using tiered pricing: hour1 = ₪${firstHourPrice}`);
        }
      }
    } catch (error) {
      console.warn('Failed to parse pricing data for extension, using legacy price:', error);
    }
  }

  // 🔧 FIX: חישוב מדויק יותר ללא עיגול מיותר
  const extensionPrice = firstHourPrice / 2; // חצי מהמחיר
  
  console.log(`🔍 DEBUG Extension pricing calculation:`, {
    firstHourPrice,
    extensionPrice,
    extensionPriceBeforeRound: extensionPrice * 100
  });
  
  // המרה לעגורות ואז עיגול - כדי למנוע עיגול כפול
  const extensionParkingCostCents = Math.round(extensionPrice * 100); // עלות החניה בעגורות
  const extensionOperationalFeeCents = Math.round(extensionParkingCostCents * 0.1); // דמי תפעול 10%
  const extensionPriceCents = extensionParkingCostCents + extensionOperationalFeeCents; // סה"כ

  console.log(`✅ Extension available:`, {
    extensionMinutes,
    actualFirstHourPrice: firstHourPrice,
    extensionPrice,
    extensionParkingCostCents: extensionParkingCostCents / 100,
    extensionOperationalFeeCents: extensionOperationalFeeCents / 100,
    extensionPriceCents: extensionPriceCents / 100,
    formula: 'Extension price = (First hour price / 2) × 1.1 (with operational fee)',
  });

  return {
    success: true,
    canExtend: true,
    newEndTime,
    extensionPrice: extensionPriceCents,
  };
}

/**
 * ביצוע הארכת חניה (אחרי תשלום מוצלח)
 */
export async function executeExtension(
  bookingId: number,
  userId: number,
  paymentId: string
): Promise<{ success: boolean; booking?: any; error?: string }> {
  console.log(`💰 Executing extension for booking #${bookingId} with payment #${paymentId}`);

  try {
    // בדיקה חוזרת לפני ביצוע
    const eligibility = await checkExtensionEligibility(bookingId, userId);

    if (!eligibility.canExtend) {
      return {
        success: false,
        error: eligibility.reason || 'EXTENSION_NOT_AVAILABLE',
      };
    }

    // שליפת ההזמנה הנוכחית לקבלת המחיר הקודם
    const currentBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        totalPriceCents: true,
        endTime: true,
        parking: {
          select: {
            title: true,
            address: true,
          },
        },
      },
    });

    if (!currentBooking) {
      return {
        success: false,
        error: 'BOOKING_NOT_FOUND',
      };
    }

    // חישוב העלות החדשה הכוללת
    const extensionCost = eligibility.extensionPrice!; // באגורות (כולל דמי תפעול)
    
    // 🔧 FIX: צריך לקבל את עלות החניה הבסיסית מ-operationalFee, לא מ-totalPriceCents
    const existingOperationalFee = await prisma.operationalFee.findUnique({
      where: { bookingId }
    });
    
    if (!existingOperationalFee) {
      throw new Error(`No operational fee found for booking #${bookingId}`);
    }
    
    const extensionParkingOnlyCents = Math.round(extensionCost / 1.1); // עלות החניה של ההארכה בלבד
    const currentParkingCostCents = existingOperationalFee.parkingCostCents; // עלות החניה הנוכחית (ללא דמי תפעול)
    const newTotalPriceCents = currentParkingCostCents + extensionParkingOnlyCents;
    
    console.log(`💳 Extension cost calculation (FIXED):`, {
      extensionCostWithFees: `₪${extensionCost / 100}`,
      extensionParkingOnly: `₪${extensionParkingOnlyCents / 100}`,
      currentBookingTotalPriceCents: `₪${(currentBooking.totalPriceCents || 0) / 100}`,
      currentParkingCostCents: `₪${currentParkingCostCents / 100}`,
      newTotalParking: `₪${newTotalPriceCents / 100}`,
      calculation: `${currentParkingCostCents / 100} + ${extensionParkingOnlyCents / 100} = ${newTotalPriceCents / 100}`
    });

    // ביצוע ההארכה עם עדכון המחיר הכולל
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        endTime: eligibility.newEndTime!,
        totalPriceCents: newTotalPriceCents, // רק עלות החניה, לא דמי תפעול
        // TODO: ניתן להוסיף שדות נוספים כמו:
        // extensionCount: { increment: 1 },
        // extensionHistory: JSON של כל ההארכות
      },
      include: {
        parking: {
          select: {
            title: true,
            address: true,
          },
        },
      },
    });

    // 💰 חישוב עמלה על הארכה - 15% מעלות החניה בלבד (לא כולל דמי תפעול)
    try {
      const COMMISSION_RATE = 0.15;
      
      // 🔧 FIX: השתמש בחישוב הקיים, לא תחשב מחדש
      const extensionCommissionCents = Math.round(extensionParkingOnlyCents * COMMISSION_RATE);
      const extensionNetOwnerCents = extensionParkingOnlyCents - extensionCommissionCents;

      // עדכון העמלה הקיימת או יצירת חדשה
      const existingCommission = await prisma.commission.findUnique({
        where: { bookingId },
      });

      if (existingCommission) {
        // עדכון עמלה קיימת
        await prisma.commission.update({
          where: { bookingId },
          data: {
            totalPriceCents: newTotalPriceCents,
            commissionCents: existingCommission.commissionCents + extensionCommissionCents,
            netOwnerCents: existingCommission.netOwnerCents + extensionNetOwnerCents,
            calculatedAt: new Date(),
          },
        });
        console.log(
          `💰 Updated existing commission: +₪${extensionCommissionCents / 100} commission on extension`
        );
      } else {
        // יצירת עמלה חדשה (אם אין)
        await prisma.commission.create({
          data: {
            bookingId,
            totalPriceCents: newTotalPriceCents,
            commissionCents: extensionCommissionCents,
            netOwnerCents: extensionNetOwnerCents,
            commissionRate: COMMISSION_RATE,
          },
        });
        console.log(`💰 Created new commission for extension: ₪${extensionCommissionCents / 100}`);
      }
    } catch (commissionError) {
      console.error(`❌ Failed to calculate commission for extension:`, commissionError);
      // לא נכשיל את ההארכה בגלל בעיית עמלה
    }

    // 💳 עדכון דמי תפעול למחפש החניה
    try {
      const { updateOperationalFeeForExtension } = await import('./operationalFees.service');
      
      // 🔧 FIX: חישוב נכון של דמי התפעול - רק על ההארכה החדשה
      // דמי התפעול צריכים להתעדכן רק בגובה ההארכה, לא על כל ההזמנה
      const extensionOperationalFeeCents = Math.round(extensionParkingOnlyCents * 0.1);
      const newOperationalFeeTotal = extensionOperationalFeeCents;
      
      console.log(`💳 Extension operational fee calculation:`, {
        extensionParkingCost: extensionParkingOnlyCents / 100,
        extensionOperationalFee: extensionOperationalFeeCents / 100,
        formula: 'Extension operational fee = Extension parking cost × 0.1'
      });
      
      await updateOperationalFeeForExtension(bookingId, newTotalPriceCents, extensionOperationalFeeCents);
      console.log(`💳 Operational fee updated for extension: booking #${bookingId}`);
    } catch (operationalFeeError) {
      console.error(`❌ Failed to update operational fee for extension:`, operationalFeeError);
      // לא נכשיל את ההארכה בגלל בעיית דמי תפעול
    }

    console.log(`✅ Extension completed successfully:`, {
      bookingId: updatedBooking.id,
      originalEndTime: currentBooking.endTime,
      newEndTime: updatedBooking.endTime,
      originalPrice: currentBooking.totalPriceCents,
      extensionCost,
      newTotalPrice: newTotalPriceCents,
      parkingTitle: updatedBooking.parking.title,
    });

    return {
      success: true,
      booking: updatedBooking,
    };
  } catch (error) {
    console.error(`❌ Extension execution failed:`, error);
    return {
      success: false,
      error: 'EXECUTION_FAILED',
    };
  }
}

/**
 * קבלת היסטוריית הארכות להזמנה
 */
export async function getExtensionHistory(bookingId: number) {
  // לעתיד - ניתן להוסיף טבלה נפרדת להיסטוריית הארכות
  // כרגע נחזיר מידע בסיסי

  return {
    bookingId,
    extensions: [],
    totalExtensions: 0,
    totalExtensionTime: 0,
  };
}
