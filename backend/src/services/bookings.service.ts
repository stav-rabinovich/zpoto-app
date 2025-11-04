import { prisma } from '../lib/prisma';
import {
  fromUTC,
  toUTC,
  getIsraelDayOfWeek,
  getIsraelHour,
  validateTimeRange,
} from '../utils/timezone';
import { calculateProportionalPrice } from './pricing.service';
import {
  shouldUseProportionalPricing,
  logPriceCalculation,
  savePricingComparison,
} from '../utils/featureFlags';

/**
 * יצירת עמלה להזמנה - עם רצפה של 1₪ לשעה
 */
async function createCommissionForBooking(booking: any, originalPrice?: number) {
  console.log(`💰 Creating commission for booking ${booking.id}`);

  // קבלת פרטי החניה כולל בעל החניה
  const parking = await prisma.parking.findUnique({
    where: { id: booking.parkingId },
    select: { ownerId: true, pricing: true, priceHr: true },
  });

  if (!parking) {
    throw new Error('Parking not found for commission calculation');
  }

  // חישוב משך ההזמנה בשעות
  const ms = booking.endTime.getTime() - booking.startTime.getTime();
  const hours = Math.ceil(ms / (1000 * 60 * 60));

  // חישוב עלות החניה הברוטו (לפני דמי תפעול) - זה הבסיס לעמלה
  // הכלל: העמלה תמיד 15% מהכנסת בעל החניה (מחיר שעתי × שעות)
  const COMMISSION_RATE = 0.15;
  const parkingCostCents = Math.round(parking.priceHr * hours * 100);
  
  console.log(`💰 Commission base calculation:`);
  console.log(`   Hourly rate: ₪${parking.priceHr}`);
  console.log(`   Hours: ${hours}`);
  console.log(`   Parking cost (gross): ₪${parkingCostCents / 100}`);
  console.log(`   Commission rate: ${COMMISSION_RATE * 100}%`);

  let commissionCents = 0;

  // אם המחיר הכולל הוא 0 (חינם), אין עמלה
  if (booking.totalPriceCents === 0) {
    commissionCents = 0;
    console.log(`💰 Free booking - no commission`);
  } else {
    // בדיקה אם יש מחירון מדורג
    let pricingData = null;
    if (parking.pricing) {
      try {
        pricingData =
          typeof parking.pricing === 'string' ? JSON.parse(parking.pricing) : parking.pricing;
      } catch (error) {
        console.warn('Failed to parse pricing data:', error);
      }
    }

    if (pricingData && pricingData.hour1 !== undefined) {
      // חישוב מדורג לפי שעות
      console.log(`💰 ✅ Using TIERED commission calculation for ${hours} hours`);

      for (let i = 1; i <= hours; i++) {
        const hourKey = `hour${i}`;
        let hourPrice = 0;

        if (pricingData[hourKey] !== undefined && pricingData[hourKey] !== null) {
          hourPrice =
            typeof pricingData[hourKey] === 'string'
              ? parseFloat(pricingData[hourKey])
              : pricingData[hourKey];
        }

        let hourCommission = 0;
        if (hourPrice > 0) {
          hourCommission = hourPrice * COMMISSION_RATE; // 15% בלבד ללא רצפה

          commissionCents += Math.round(hourCommission * 100);

          console.log(
            `💰 ✅ Hour ${i}: ₪${hourPrice} → Commission ₪${hourCommission.toFixed(2)} (15%)`
          );
        } else {
          console.log(`💰 ✅ Hour ${i}: ₪${hourPrice} → Commission ₪0 (free)`);
        }
      }

      console.log(`💰 ✅ Total tiered commission: ₪${commissionCents / 100}`);
    } else {
      // אין מחירון מדורג - חישוב פשוט 15% בלבד מעלות החניה
      console.log(`💰 ⚠️ No tiered pricing, using simple calculation`);
      commissionCents = Math.round(parkingCostCents * COMMISSION_RATE);

      console.log(`💰 Commission calculation:`, {
        parkingCostCents: `₪${parkingCostCents / 100}`,
        hours,
        commission: `₪${commissionCents / 100} (15% מעלות החניה)`,
        rate: '15% of parking cost only',
      });
    }
  }

  const netOwnerCents = parkingCostCents - commissionCents;

  // יצירת רשומת עמלה
  const commission = await prisma.commission.create({
    data: {
      bookingId: booking.id,
      totalPriceCents: parkingCostCents, // עלות החניה בלבד (לא המחיר הסופי שהלקוח שילם)
      commissionCents,
      netOwnerCents,
      commissionRate: COMMISSION_RATE,
      calculatedAt: new Date(),
    },
  });

  console.log(`💰 Commission created:`, {
    id: commission.id,
    bookingId: booking.id,
    ownerId: parking.ownerId,
    commissionCents,
    netOwnerCents,
  });

  return commission;
}

/**
 * חישוב זמינות מלוח זמנים של בעל החניה
 * מחזיר את הזמן הראשון שבו החניה לא זמינה
 * 🔧 תוקן: משתמש בפונקציות עזר לזמן
 */
function calculateAvailabilityFromSchedule(startTime: Date, schedule: any): Date {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  console.log(`🔍 NEW SYSTEM: calculateAvailabilityFromSchedule called with:`, {
    startTime: startTime.toISOString(),
    schedule: schedule,
  });

  // אם אין schedule כלל, החניה זמינה 24/7 - החזר 12 שעות מקסימום
  if (!schedule || Object.keys(schedule).length === 0) {
    console.log(`🔍 No schedule found, returning 12 hours from start time`);
    return new Date(startTime.getTime() + 12 * 60 * 60 * 1000);
  }

  // וולידציה של זמן ההתחלה
  if (!validateTimeRange(startTime, new Date(startTime.getTime() + 60000))) {
    console.log('❌ Invalid start time');
    return new Date(startTime.getTime() + 60 * 60 * 1000); // החזר שעה אחת
  }

  console.log(`🔍 NEW SYSTEM: Starting availability calculation from ${startTime.toISOString()}`);

  // התחל לבדוק מהזמן הנתון (ב-UTC) שעה אחר שעה
  let checkTime = new Date(startTime);

  // בדוק עד 7 ימים קדימה (מקסימום סביר)
  for (let day = 0; day < 7; day++) {
    // השתמש בפונקציות העזר החדשות
    const dayOfWeek = getIsraelDayOfWeek(checkTime);
    const dayName = dayNames[dayOfWeek];
    const availableBlocks = schedule[dayName] || [];

    console.log(
      `🔍 NEW SYSTEM: Day ${day}: Checking ${dayName} (UTC: ${checkTime.toISOString()}), available blocks:`,
      availableBlocks
    );

    // אם אין בלוקים זמינים ביום הזה, החניה לא זמינה כלל ביום הזה
    if (availableBlocks.length === 0) {
      console.log(`🔍 No available blocks for ${dayName} - parking not available this day`);

      // אם זה היום הראשון, החניה לא זמינה מהזמן המבוקש
      if (day === 0) {
        console.log(`🔍 First day has no availability - returning start time`);
        // המר חזרה ל-UTC לפני החזרה
        return checkTime;
      }

      // אם זה יום אחר, החניה לא זמינה מתחילת היום הזה
      const dayStart = new Date(checkTime);
      dayStart.setHours(0, 0, 0, 0);
      // המר חזרה ל-UTC לפני החזרה
      const dayStartUTC = toUTC(dayStart);
      console.log(
        `🔍 Returning start of unavailable day: Israel ${dayStart.toISOString()} -> UTC ${dayStartUTC.toISOString()}`
      );
      return dayStartUTC;
    }

    // בדוק כל שעה ביום הזה - 🔧 תוקן: בדוק רק שעות רלוונטיות
    const startHour = day === 0 ? getIsraelHour(checkTime) : 0;
    const endHour = 24;

    console.log(`🔍 Checking hours ${startHour} to ${endHour} for ${dayName}`);

    for (let hour = startHour; hour < endHour; hour++) {
      const blockStart = Math.floor(hour / 4) * 4; // 0, 4, 8, 12, 16, 20

      // בדוק אם הבלוק הזה זמין
      const isBlockAvailable = availableBlocks.includes(blockStart);

      console.log(`🔍 Hour ${hour} (block ${blockStart}): available = ${isBlockAvailable}`);

      // אם הבלוק הזה לא זמין, החניה לא פנויה מהשעה הזו
      if (!isBlockAvailable) {
        const unavailableTime = new Date(checkTime);
        unavailableTime.setHours(hour, 0, 0, 0);

        // וודא שזה אחרי זמן ההתחלה המבוקש
        if (unavailableTime > startTime) {
          // המר חזרה ל-UTC לפני החזרה
          const unavailableTimeUTC = toUTC(unavailableTime);
          console.log(
            `🔍 Found unavailable time: Israel ${unavailableTime.toISOString()} -> UTC ${unavailableTimeUTC.toISOString()}`
          );
          return unavailableTimeUTC;
        }
      }
    }

    console.log(`🔍 All hours available for ${dayName}, moving to next day`);

    // כל היום זמין, עבור ליום הבא
    checkTime.setDate(checkTime.getDate() + 1); // setDate במקום setUTCDate
    checkTime.setHours(0, 0, 0, 0); // setHours במקום setUTCHours
  }

  // אם הגענו עד הנה, החניה זמינה לכל 7 הימים - החזר 7 ימים מקסימום
  const maxTime = new Date(startTime.getTime() + 7 * 24 * 60 * 60 * 1000);
  console.log(`🔍 All 7 days available, returning max time: ${maxTime.toISOString()}`);
  return maxTime;
}

/**
 * מחזיר את כל ההזמנות - עם פרטי חניה ומשתמש.
 */
export async function listBookings() {
  return prisma.booking.findMany({
    orderBy: { id: 'desc' },
    include: {
      parking: true,
      user: {
        select: { id: true, email: true },
      },
    },
  });
}
/**
 * מחזיר את ההזמנות של משתמש מסוים עם סטטיסטיקות מסונכרנות
 */
export async function listBookingsByUser(userId: number) {
  const bookings = await prisma.booking.findMany({
    where: { userId },
    orderBy: { id: 'desc' },
    include: {
      parking: {
        select: {
          id: true,
          title: true,
          address: true,
          lat: true,
          lng: true,
          priceHr: true,
          isActive: true,
          owner: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  // חישוב סטטיסטיקות מסונכרנות למשתמש
  const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED');

  const totalParkingHours = confirmedBookings.reduce((total, booking) => {
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return total + hours;
  }, 0);

  const totalSpentCents = confirmedBookings.reduce((total, booking) => {
    return total + (booking.totalPriceCents || 0);
  }, 0);

  console.log(
    `👤 User ${userId} stats: ${confirmedBookings.length} confirmed bookings, ${totalParkingHours.toFixed(1)}h, ₪${(totalSpentCents / 100).toFixed(2)} spent`
  );

  // החזרת הנתונים עם הסטטיסטיקות
  return {
    bookings,
    userStats: {
      totalBookings: bookings.length,
      confirmedBookings: confirmedBookings.length,
      totalParkingHours: Math.round(totalParkingHours * 10) / 10,
      totalSpentCents,
      totalSpentILS: (totalSpentCents / 100).toFixed(2),
    },
  };
}

/**
 * בדיקת חפיפה.
 */
async function hasOverlap(params: { parkingId: number; startTime: Date; endTime: Date }) {
  const { parkingId, startTime, endTime } = params;
  const conflict = await prisma.booking.findFirst({
    where: {
      parkingId,
      NOT: [{ endTime: { lte: startTime } }, { startTime: { gte: endTime } }],
      status: {
        notIn: ['CANCELED', 'REJECTED', 'EXPIRED'],
      },
    },
    select: { id: true },
  });
  return Boolean(conflict);
}

/**
 * יצירת הזמנה חדשה עם קיבוע מחיר.
 */
export async function createBooking(input: {
  userId: number;
  parkingId: number;
  startTime: Date;
  endTime: Date;
  status?: 'PENDING' | 'PENDING_APPROVAL' | 'CONFIRMED' | 'CANCELED' | 'REJECTED' | 'EXPIRED';
}) {
  console.log(
    `🔥 Creating booking: parking ${input.parkingId}, ${input.startTime.toISOString()} - ${input.endTime.toISOString()}`
  );

  // בדיקת תקינות מקיפה באמצעות הפונקציה החדשה
  const validation = await validateBookingTimeSlot(input.parkingId, input.startTime, input.endTime);

  if (!validation.isValid) {
    console.log(`❌ Booking validation failed: ${validation.error}`);
    throw new Error(`VALIDATION_FAILED: ${validation.error}`);
  }

  console.log(`✅ Booking validation passed: ${validation.message}`);

  // בדיקת חפיפות נוספת (כפול ביטחון)
  const overlap = await hasOverlap({
    parkingId: input.parkingId,
    startTime: input.startTime,
    endTime: input.endTime,
  });
  if (overlap) {
    console.log(`❌ Overlap detected with existing booking`);
    throw new Error('OVERLAP');
  }

  // שליפת פרטי החניה כולל מוד אישור ומחירון
  const parking = await prisma.parking.findUnique({
    where: { id: input.parkingId },
    select: {
      priceHr: true,
      pricing: true,
      approvalMode: true,
      title: true,
      ownerId: true,
    },
  });
  if (!parking) {
    throw new Error('PARKING_NOT_FOUND');
  }

  // 🆕 חישוב מחיר עם תמיכה במודל יחסי חדש
  let totalPriceCents = 0;
  let pricingSource = 'Legacy priceHr field';
  let pricingMethod = 'legacy';
  let priceBreakdown = null;
  let exactDurationHours = 0;

  const ms = input.endTime.getTime() - input.startTime.getTime();
  const hours = Math.ceil(ms / (1000 * 60 * 60)); // עיגול כלפי מעלה לשעות שלמות (legacy)
  exactDurationHours = ms / (1000 * 60 * 60); // שעות מדויקות (חדש)

  // בדיקה האם להשתמש במודל התמחור החדש
  const useProportionalPricing = shouldUseProportionalPricing(input.userId);

  if (parking.pricing) {
    try {
      const pricingData =
        typeof parking.pricing === 'string' ? JSON.parse(parking.pricing) : parking.pricing;

      if (pricingData && pricingData.hour1 !== undefined) {
        if (useProportionalPricing) {
          // 🆕 חישוב יחסי חדש
          console.log(
            `💰 🆕 Using NEW PROPORTIONAL pricing system for ${exactDurationHours.toFixed(2)} hours`
          );
          const breakdown = calculateProportionalPrice(ms, pricingData, parking.priceHr);

          totalPriceCents = breakdown.totalPriceCents;
          pricingSource = 'NEW proportional pricing system';
          pricingMethod = 'proportional';
          priceBreakdown = breakdown;

          console.log(`💰 🆕 Proportional result:`, breakdown);
        } else {
          // 🔄 חישוב מדורג ישן (לתאימות לאחור)
          console.log(`💰 🔄 Using LEGACY tiered pricing system for ${hours} hours`);
          pricingSource = 'Legacy tiered pricing system';
          pricingMethod = 'legacy';

          for (let i = 1; i <= hours; i++) {
            const hourKey = `hour${i}`;
            let hourPrice = 0;

            if (pricingData[hourKey] !== undefined && pricingData[hourKey] !== null) {
              hourPrice =
                typeof pricingData[hourKey] === 'string'
                  ? parseFloat(pricingData[hourKey])
                  : pricingData[hourKey];
            } else if (pricingData.hour1 !== undefined) {
              // fallback לשעה ראשונה אם אין מחיר לשעה הספציפית
              hourPrice =
                typeof pricingData.hour1 === 'string'
                  ? parseFloat(pricingData.hour1)
                  : pricingData.hour1;
            } else {
              // fallback למחיר הישן
              hourPrice = parking.priceHr;
            }

            const hourPriceCents = Math.round(hourPrice * 100);
            totalPriceCents += hourPriceCents;

            console.log(
              `💰 ✅ Hour ${i}: ₪${hourPrice} (${hourPriceCents} cents) from ${pricingData[hourKey] !== undefined ? hourKey : 'fallback'}`
            );
          }

          console.log(
            `💰 🔄 Total legacy tiered price: ₪${totalPriceCents / 100} (${totalPriceCents} cents)`
          );
        }

        // חישוב השוואה ולוגינג (אם מופעל)
        if (useProportionalPricing && priceBreakdown) {
          // חישוב מחיר legacy לצורך השוואה
          let legacyPriceCents = 0;
          for (let i = 1; i <= hours; i++) {
            const hourKey = `hour${i}`;
            let hourPrice = pricingData[hourKey] || pricingData.hour1 || parking.priceHr;
            hourPrice = typeof hourPrice === 'string' ? parseFloat(hourPrice) : hourPrice;
            legacyPriceCents += Math.round(hourPrice * 100);
          }

          // שמירת נתוני השוואה
          await savePricingComparison({
            userId: input.userId,
            parkingId: input.parkingId,
            durationMs: ms,
            legacyPriceCents,
            proportionalPriceCents: totalPriceCents,
            methodUsed: 'proportional',
            breakdown: priceBreakdown,
          });
        }
      } else {
        // אין מחירון תקין, השתמש במחיר הישן
        console.log(`💰 ⚠️ No valid pricing data, using legacy priceHr`);
        totalPriceCents = Math.round(hours * parking.priceHr * 100);
      }
    } catch (error) {
      console.warn('Failed to parse pricing data, using legacy priceHr:', error);
      totalPriceCents = Math.round(hours * parking.priceHr * 100);
    }
  } else {
    // אין מחירון חדש, השתמש במחיר הישן
    console.log(`💰 ⚠️ No pricing field, using legacy priceHr`);
    totalPriceCents = Math.round(hours * parking.priceHr * 100);
  }

  // לוגינג מפורט של חישוב המחיר
  logPriceCalculation({
    userId: input.userId,
    parkingId: input.parkingId,
    durationMs: ms,
    method: pricingMethod as 'legacy' | 'proportional',
    newPrice: totalPriceCents,
    breakdown: priceBreakdown,
  });

  console.log(`🏁 Creating booking for parking #${input.parkingId}:`);
  console.log(`📋 Parking details:`, {
    id: input.parkingId,
    title: parking.title,
    ownerId: parking.ownerId,
    approvalMode: parking.approvalMode,
    legacyPriceHr: parking.priceHr,
    hours: hours,
    exactDurationHours: exactDurationHours.toFixed(2),
    totalPriceCents: totalPriceCents,
    totalPriceILS: (totalPriceCents / 100).toFixed(2),
    pricingSource,
    pricingMethod: pricingMethod,
    useProportionalPricing: useProportionalPricing,
  });

  // 🎯 פישוט: כל ההזמנות מאושרות אוטומטית
  const bookingStatus = 'CONFIRMED';
  const approvalExpiresAt = null;

  console.log(`🎯 Auto-approval system: setting status to CONFIRMED`);

  // // 📝 LEGACY CODE - Manual Approval System (Commented Out)
  // // This system allowed owners to manually approve bookings
  // console.log(`🎛️ Approval mode check: "${parking.approvalMode}"`);
  // if (parking.approvalMode === 'MANUAL') {
  //   bookingStatus = 'PENDING_APPROVAL';
  //   approvalExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
  //   console.log(`⏳ Manual approval mode - setting status to PENDING_APPROVAL, expires at: ${approvalExpiresAt}`);
  // } else if (parking.approvalMode === 'AUTO') {
  //   bookingStatus = 'CONFIRMED';
  //   console.log(`⚡ Auto approval mode - setting status to CONFIRMED`);
  // }

  // יצירת ההזמנה
  const booking = await prisma.booking.create({
    data: {
      userId: input.userId,
      parkingId: input.parkingId,
      startTime: input.startTime,
      endTime: input.endTime,
      status: bookingStatus,
      totalPriceCents,
      approvalExpiresAt,
      approvedAt: new Date(), // ✅ אישור מיידי
    },
  });

  console.log(`✅ Booking created with ID: ${booking.id}`);

  // 💰 חישוב ויצירת עמלה לבעל החניה
  try {
    await createCommissionForBooking(booking);
    console.log(`💰 Commission created successfully for booking ${booking.id}`);
  } catch (error) {
    console.error(`❌ Failed to create commission for booking ${booking.id}:`, error);
    // לא נכשיל את כל ההזמנה בגלל בעיה בעמלה - רק נלוג
  }

  // 💳 יצירת דמי תפעול למחפש החניה
  try {
    const { createOperationalFee } = await import('./operationalFees.service');
    await createOperationalFee(booking.id, totalPriceCents);
    console.log(`💳 Operational fee created successfully for booking ${booking.id}`);
  } catch (error) {
    console.error(`❌ Failed to create operational fee for booking ${booking.id}:`, error);
    // לא נכשיל את כל ההזמנה בגלל בעיה בדמי תפעול - רק נלוג
  }

  return booking;
}

/** שליפה לפי מזהה - עם פרטי חניה ודמי תפעול */
export async function getBooking(id: number) {
  return prisma.booking.findUnique({
    where: { id },
    include: {
      parking: true,
      user: {
        select: {
          id: true,
          email: true,
        },
      },
      operationalFee: true, // כולל דמי תפעול
      // TODO: להוסיף couponUsages לאחר עדכון Prisma Client
    },
  });
}

/** עדכון סטטוס */
export async function updateBookingStatus(
  id: number,
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED'
) {
  return prisma.booking.update({
    where: { id },
    data: { status },
  });
}

/** ביטול הזמנה */
export async function cancelBooking(id: number) {
  console.log(`🚫 Cancelling booking ${id}`);

  // עדכון סטטוס ההזמנה
  const booking = await prisma.booking.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  // טיפול בעמלה - מחיקה או עדכון סטטוס
  try {
    const commission = await prisma.commission.findUnique({
      where: { bookingId: id },
    });

    if (commission) {
      // אם העמלה עדיין לא עובדה, נמחק אותה
      if (!commission.payoutProcessed) {
        await prisma.commission.delete({
          where: { bookingId: id },
        });
        console.log(`💰 Commission deleted for cancelled booking ${id}`);
      } else {
        // אם העמלה כבר עובדה, נצטרך לטפל בזה בנפרד (החזר)
        console.log(
          `⚠️ Commission for booking ${id} was already processed - manual refund may be needed`
        );
      }
    }
  } catch (error) {
    console.error(`❌ Error handling commission for cancelled booking ${id}:`, error);
    // לא נכשיל את הביטול בגלל בעיה בעמלה
  }

  return booking;
}

/**
 * חישוב זמינות מקסימלית לחניה מזמן התחלה נתון
 * מחזיר עד איזה שעה החניה פנויה בהתחשב בהגדרות בעל החניה ובהזמנות קיימות
 */
export async function calculateParkingAvailability(parkingId: number, startTime: Date) {
  console.log(
    `🔍 Calculating availability for parking ${parkingId} from ${startTime.toISOString()}`
  );

  // וודא שהחניה קיימת
  const parking = await prisma.parking.findUnique({
    where: { id: parkingId },
    select: {
      id: true,
      title: true,
      isActive: true,
      availability: true,
      owner: {
        select: { isBlocked: true },
      },
    },
  });

  if (!parking) {
    console.log(`🔍 Parking ${parkingId} not found`);
    return {
      availableUntil: null,
      maxHours: 0,
      message: 'החניה לא נמצאה',
      canBook: false,
    };
  }

  if (!parking.isActive) {
    console.log(`🔍 Parking ${parkingId} is not active`);
    return {
      availableUntil: null,
      maxHours: 0,
      message: 'החניה לא פעילה',
      canBook: false,
    };
  }

  if (parking.owner?.isBlocked) {
    console.log(`🔍 Parking ${parkingId} owner is blocked`);
    return {
      availableUntil: null,
      maxHours: 0,
      message: 'החניה לא זמינה',
      canBook: false,
    };
  }

  // שלב 1: חישוב זמינות לפי הגדרות בעל החניה (שעות פעילות)
  let ownerAvailabilityEndTime: Date;

  if (parking.availability) {
    try {
      const availabilitySchedule = JSON.parse(parking.availability);
      console.log(`🔍 Parsed availability schedule:`, availabilitySchedule);

      // בדוק אם יש בכלל הגדרות זמינות
      const hasAnyAvailability = Object.values(availabilitySchedule).some(
        (dayBlocks: any) => Array.isArray(dayBlocks) && dayBlocks.length > 0
      );

      if (!hasAnyAvailability) {
        console.log(`🔍 No availability blocks found in schedule - treating as 24/7 available`);
        ownerAvailabilityEndTime = new Date(startTime.getTime() + 12 * 60 * 60 * 1000);
      } else {
        ownerAvailabilityEndTime = calculateAvailabilityFromSchedule(
          startTime,
          availabilitySchedule
        );
        console.log(`🔍 Owner availability ends at: ${ownerAvailabilityEndTime.toISOString()}`);
      }
    } catch (error) {
      console.error('Error parsing availability schedule:', error);
      // אם יש שגיאה בפרסור, השתמש בברירת מחדל של 12 שעות
      console.log(`🔍 Using 12 hours default due to parsing error`);
      ownerAvailabilityEndTime = new Date(startTime.getTime() + 12 * 60 * 60 * 1000);
    }
  } else {
    // אם אין לוח זמנים, החניה זמינה 24/7 - השתמש בברירת מחדל של 12 שעות
    ownerAvailabilityEndTime = new Date(startTime.getTime() + 12 * 60 * 60 * 1000);
    console.log(
      `🔍 No schedule found, using 12 hours default: ${ownerAvailabilityEndTime.toISOString()}`
    );
  }

  // שלב 2: מצא את ההזמנה הקרובה ביותר שמתחילה אחרי זמן ההתחלה
  const nextBooking = await prisma.booking.findFirst({
    where: {
      parkingId,
      // רק הזמנות שמתחילות אחרי הזמן המבוקש (הזמנות עתידיות)
      startTime: { gt: startTime },
      status: {
        in: ['CONFIRMED', 'PENDING', 'PENDING_APPROVAL'], // כל ההזמנות הפעילות
      },
    },
    orderBy: { startTime: 'asc' },
    select: {
      startTime: true,
      endTime: true,
      status: true,
    },
  });

  console.log(`🔍 Next booking search criteria:`, {
    parkingId,
    startTimeGte: startTime.toISOString(),
    endTimeGte: startTime.toISOString(),
  });
  console.log(`🔍 Next booking found:`, nextBooking);

  // שלב 3: קבע את זמן הזמינות הסופי
  let finalAvailableUntil: Date;
  let limitedBy: 'schedule' | 'booking' | 'none';

  if (nextBooking) {
    // יש הזמנה קיימת - בחר את הזמן הקרוב ביותר
    if (nextBooking.startTime <= ownerAvailabilityEndTime) {
      finalAvailableUntil = nextBooking.startTime;
      limitedBy = 'booking';
      console.log(`🔍 Limited by booking: ${finalAvailableUntil.toISOString()}`);
    } else {
      finalAvailableUntil = ownerAvailabilityEndTime;
      limitedBy = 'schedule';
      console.log(`🔍 Limited by schedule: ${finalAvailableUntil.toISOString()}`);
    }
  } else {
    // אין הזמנות - החניה פנויה עד סוף שעות הפעילות
    finalAvailableUntil = ownerAvailabilityEndTime;
    limitedBy = 'schedule';
    console.log(`🔍 No bookings, limited by schedule: ${finalAvailableUntil.toISOString()}`);
  }

  // שלב 4: בדיקות תקינות
  const availableMs = finalAvailableUntil.getTime() - startTime.getTime();
  const availableHours = Math.max(0, Math.floor(availableMs / (60 * 60 * 1000)));
  const availableMinutes = Math.max(0, Math.floor(availableMs / (60 * 1000)));

  console.log(`🔍 Time calculation:`, {
    startTime: startTime.toISOString(),
    finalAvailableUntil: finalAvailableUntil.toISOString(),
    availableMs,
    availableHours,
    availableMinutes,
  });

  // אם פחות מ-15 דקות זמינות, החניה לא זמינה
  if (availableMs < 15 * 60 * 1000) {
    console.log(`🔍 Less than 15 minutes available (${availableMs}ms), marking as unavailable`);
    return {
      availableUntil: null,
      maxHours: 0,
      message: 'החניה לא זמינה כרגע',
      canBook: false,
    };
  }

  console.log(
    `🔍 Final calculation: ${availableHours} hours, ${availableMinutes} minutes available`
  );

  // שלב 5: יצירת הודעה ברורה למשתמש
  const message = generateAvailabilityMessage(startTime, finalAvailableUntil, limitedBy);

  return {
    availableUntil: finalAvailableUntil.toISOString(),
    maxHours: availableHours,
    maxMinutes: availableMinutes,
    message,
    canBook: true,
    limitedBy,
  };
}

/**
 * יצירת הודעה ברורה על זמינות החניה
 */
function generateAvailabilityMessage(
  startTime: Date,
  availableUntil: Date,
  limitedBy: 'schedule' | 'booking' | 'none'
): string {
  // השתמש בפונקציות העזר החדשות
  const nowIsrael = fromUTC(new Date());
  const today = new Date(nowIsrael.getFullYear(), nowIsrael.getMonth(), nowIsrael.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  // המר את זמן הזמינות לזמן ישראל
  const availableUntilIsrael = fromUTC(availableUntil);
  const displayDate = new Date(
    availableUntilIsrael.getFullYear(),
    availableUntilIsrael.getMonth(),
    availableUntilIsrael.getDate()
  );

  // פורמט הזמן לתצוגה
  const availableTime = availableUntilIsrael.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
  });

  console.log(`🔍 Availability message generation:`, {
    utc: availableUntil.toISOString(),
    israel: availableUntilIsrael.toISOString(),
    display: availableTime,
    limitedBy,
  });

  let message: string;

  if (displayDate.getTime() === today.getTime()) {
    // זמין עד היום
    message = `פנויה היום עד ${availableTime}`;
  } else if (displayDate.getTime() === tomorrow.getTime()) {
    // זמין עד מחר
    message = `פנויה עד מחר ב-${availableTime}`;
  } else {
    // זמין עד תאריך אחר
    const dateStr = availableUntilIsrael.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
    });
    message = `פנויה עד ${dateStr} ב-${availableTime}`;
  }

  // הוסף הסבר למה החניה מוגבלת
  if (limitedBy === 'booking') {
    message += ' (בגלל הזמנה קיימת)';
  } else if (limitedBy === 'schedule') {
    message += ' (לפי שעות פעילות)';
  }

  return message;
}

/**
 * בדיקה אם הזמנה מסוימת תקינה (לא חורגת מהזמינות)
 * משמש לvalidation לפני יצירת הזמנה או מעבר לתשלום
 */
export async function validateBookingTimeSlot(parkingId: number, startTime: Date, endTime: Date) {
  console.log(
    `🔍 Validating booking slot for parking ${parkingId}: ${startTime.toISOString()} - ${endTime.toISOString()}`
  );

  // בדיקות בסיסיות
  if (endTime <= startTime) {
    return {
      isValid: false,
      error: 'זמן הסיום חייב להיות אחרי זמן ההתחלה',
    };
  }

  // בדיקת זמן עבר - תן מרווח של 5 דקות לטעויות זמן
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  if (startTime < fiveMinutesAgo) {
    return {
      isValid: false,
      error: 'לא ניתן להזמין חניה בזמן עבר',
    };
  }

  // בדוק זמינות מזמן ההתחלה
  const availability = await calculateParkingAvailability(parkingId, startTime);

  if (!availability.canBook) {
    return {
      isValid: false,
      error: availability.message,
    };
  }

  // בדוק שזמן הסיום לא חורג מהזמינות
  const availableUntil = new Date(availability.availableUntil!);

  // המר את הזמינות לשעון ישראל לצורך השוואה נכונה
  let effectiveLimit = new Date(availableUntil);

  if (availableUntil.getUTCHours() === 0 && availableUntil.getUTCMinutes() === 0) {
    // מקרה מיוחד: 00:00 UTC - 🔧 תוקן: משתמש בפונקציות העזר החדשות
    const prevDay = new Date(availableUntil.getTime() - 24 * 60 * 60 * 1000);
    effectiveLimit = fromUTC(prevDay);
    effectiveLimit.setHours(23, 59, 59, 999); // 23:59:59 בישראל
  } else {
    // בדיקה: האם זה זמן מהזמנה קיימת או מלוח זמנים?
    // צריך להתאים לאותה לוגיקה כמו בתצוגה

    // קבל את availability שוב כדי לדעת מה limitedBy
    const availabilityForLimit = await calculateParkingAvailability(parkingId, startTime);
    const isLimitedByBooking = availabilityForLimit.limitedBy === 'booking';

    if (isLimitedByBooking) {
      // זמן מהזמנה קיימת - כבר בשעון ישראל, לא צריך המרה
      effectiveLimit = new Date(availableUntil);
    } else {
      // זמן מלוח זמנים - 🔧 תוקן: משתמש בפונקציות העזר החדשות במקום המרה ידנית
      effectiveLimit = fromUTC(availableUntil);
    }
  }

  console.log(`🔍 Validation check:`, {
    endTime: endTime.toISOString(),
    availableUntil: availableUntil.toISOString(),
    effectiveLimit: effectiveLimit.toISOString(),
    isValid: endTime <= effectiveLimit,
  });

  if (endTime > effectiveLimit) {
    return {
      isValid: false,
      error: `החניה זמינה רק עד ${availability.message.split('עד ')[1]}`,
      availableUntil: availability.availableUntil,
      suggestedEndTime: effectiveLimit.toISOString(),
    };
  }

  return {
    isValid: true,
    message: 'ההזמנה תקינה',
  };
}
