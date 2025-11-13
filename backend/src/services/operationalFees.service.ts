/**
 * Operational Fees Service - מערכת דמי תפעול למחפשי חניה
 *
 * מודל דמי התפעול:
 * - 10% מעלות החניה הבסיסית
 * - נוסף לסכום החניה
 * - מחפש החניה משלם: עלות חניה + דמי תפעול
 */

import { prisma } from '../lib/prisma';

// קבועים
const OPERATIONAL_FEE_RATE = 0.1; // 10%

/**
 * תוצאת חישוב דמי תפעול
 */
interface OperationalFeeCalculation {
  parkingCostCents: number;
  operationalFeeCents: number;
  totalPaymentCents: number;
  operationalFeeRate: number;
}

/**
 * חישוב דמי תפעול להזמנה
 * @param parkingCostCents - עלות החניה הבסיסית בעגורות
 * @returns תוצאת חישוב דמי התפעול
 */
export function calculateOperationalFee(parkingCostCents: number): OperationalFeeCalculation {
  console.log(`💳 Calculating operational fee for parking cost: ₪${parkingCostCents / 100}`);

  const operationalFeeCents = Math.round(parkingCostCents * OPERATIONAL_FEE_RATE);
  const totalPaymentCents = parkingCostCents + operationalFeeCents;

  const result = {
    parkingCostCents,
    operationalFeeCents,
    totalPaymentCents,
    operationalFeeRate: OPERATIONAL_FEE_RATE,
  };

  console.log(`💳 Operational fee calculation:`, {
    parkingCost: `₪${parkingCostCents / 100}`,
    operationalFee: `₪${operationalFeeCents / 100} (10%)`,
    totalPayment: `₪${totalPaymentCents / 100}`,
    formula: 'Total = Parking Cost + (Parking Cost × 10%)',
  });

  return result;
}

/**
 * יצירת רשומת דמי תפעול להזמנה
 * @param bookingId - מזהה ההזמנה
 * @param parkingCostCents - עלות החניה הבסיסית
 * @returns רשומת דמי התפעול שנוצרה
 */
export async function createOperationalFee(bookingId: number, parkingCostCents: number) {
  console.log(`💳 Creating operational fee record for booking #${bookingId}`);

  const calculation = calculateOperationalFee(parkingCostCents);

  const operationalFee = await prisma.operationalFee.create({
    data: {
      bookingId,
      parkingCostCents: calculation.parkingCostCents,
      operationalFeeCents: calculation.operationalFeeCents,
      totalPaymentCents: calculation.totalPaymentCents,
      operationalFeeRate: calculation.operationalFeeRate,
    },
  });

  console.log(`💳 ✅ Operational fee created:`, {
    id: operationalFee.id,
    bookingId: operationalFee.bookingId,
    parkingCost: `₪${operationalFee.parkingCostCents / 100}`,
    operationalFee: `₪${operationalFee.operationalFeeCents / 100}`,
    totalPayment: `₪${operationalFee.totalPaymentCents / 100}`,
  });

  return operationalFee;
}

/**
 * קבלת דמי תפעול להזמנה
 * @param bookingId - מזהה ההזמנה
 * @returns רשומת דמי התפעול או null
 */
export async function getOperationalFeeByBookingId(bookingId: number) {
  return await prisma.operationalFee.findUnique({
    where: { bookingId },
  });
}

/**
 * עדכון דמי תפעול עבור הארכת הזמנה
 * @param bookingId - מזהה ההזמנה
 * @param newTotalParkingCents - עלות החניה החדשה (ללא דמי תפעול)
 * @param extensionOperationalFeeCents - דמי התפעול של ההארכה בלבד
 * @returns רשומת דמי התפעול מעודכנת
 */
export async function updateOperationalFeeForExtension(
  bookingId: number,
  newTotalParkingCents: number,
  extensionOperationalFeeCents: number
) {
  console.log(`💳 Updating operational fee for booking #${bookingId} extension`);
  
  // קבלת דמי התפעול הנוכחיים
  const currentFee = await prisma.operationalFee.findUnique({
    where: { bookingId }
  });
  
  if (!currentFee) {
    console.error(`❌ No operational fee found for booking #${bookingId}`);
    throw new Error('Operational fee not found');
  }
  
  // חישוב עלות החניה של ההארכה (ההפרש בין הסכום הכולל לסכום הקודם)
  const extensionParkingCost = newTotalParkingCents - currentFee.parkingCostCents;
  
  // חישוב המחיר הסופי - הוספת עלות החניה ודמי התפעול של ההארכה
  // הקופון כבר מיושם בהזמנה המקורית ולא צריך להחיל אותו שוב
  const newTotalPaymentCents = currentFee.totalPaymentCents + extensionParkingCost + extensionOperationalFeeCents;
  
  // החישוב שהאדמין יבצע: actualOperationalFee = totalPaymentCents - parkingCostCents
  // אז צריך לוודא שoperationalFeeCents יתאים לחישוב הזה
  const newOperationalFeeCents = newTotalPaymentCents - newTotalParkingCents;
  
  console.log(`💳 Extension calculation logic:`, {
    currentTotalPayment: `₪${currentFee.totalPaymentCents / 100}`,
    extensionParkingCost: `₪${extensionParkingCost / 100}`,
    extensionOperationalFee: `₪${extensionOperationalFeeCents / 100}`,
    newTotalPayment: `₪${newTotalPaymentCents / 100}`,
    calculation: 'currentTotal + extensionParking + extensionOperational = newTotal'
  });
  
  console.log(`💳 Extension operational fee calculation:`, {
    originalOperationalFee: `₪${currentFee.operationalFeeCents / 100}`,
    extensionOperationalFee: `₪${extensionOperationalFeeCents / 100}`,
    newTotalOperationalFee: `₪${newOperationalFeeCents / 100}`,
    newTotalPayment: `₪${newTotalPaymentCents / 100}`,
    parkingCost: `₪${newTotalParkingCents / 100}`
  });

  const updatedFee = await prisma.operationalFee.update({
    where: { bookingId },
    data: {
      parkingCostCents: newTotalParkingCents,
      operationalFeeCents: newOperationalFeeCents,
      totalPaymentCents: newTotalPaymentCents,
    },
  });

  console.log(`💳 ✅ Operational fee updated for extension`);

  return updatedFee;
}

/**
 * קבלת סטטיסטיקות דמי תפעול לאדמין
 * @param filters - פילטרים לתקופה
 * @returns סטטיסטיקות דמי תפעול
 */
export async function getOperationalFeeStats(filters?: { startDate?: Date; endDate?: Date }) {
  const whereClause: any = {};

  if (filters?.startDate || filters?.endDate) {
    whereClause.calculatedAt = {};
    if (filters.startDate) {
      whereClause.calculatedAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      whereClause.calculatedAt.lte = filters.endDate;
    }
  }

  const [fees, totalStats] = await Promise.all([
    // רשימת כל דמי התפעול עם נתוני קופונים
    prisma.operationalFee.findMany({
      where: whereClause,
      include: {
        booking: {
          select: {
            id: true,
            createdAt: true,
            user: {
              select: {
                email: true,
                name: true,
              },
            },
            // TODO: להוסיף couponUsages לאחר עדכון Prisma Client
          },
        },
      },
      orderBy: { calculatedAt: 'desc' },
    }),

    // סטטיסטיקות כלליות
    prisma.operationalFee.aggregate({
      where: whereClause,
      _sum: {
        operationalFeeCents: true,
        totalPaymentCents: true,
        parkingCostCents: true,
      },
      _count: true,
    }),
  ]);

  return {
    fees,
    stats: {
      totalOperationalFeesCollected: totalStats._sum.operationalFeeCents || 0,
      totalPaymentsProcessed: totalStats._sum.totalPaymentCents || 0,
      totalParkingCosts: totalStats._sum.parkingCostCents || 0,
      totalTransactions: totalStats._count,
      averageOperationalFee:
        totalStats._count > 0
          ? Math.round((totalStats._sum.operationalFeeCents || 0) / totalStats._count)
          : 0,
    },
  };
}

/**
 * עדכון דמי תפעול אחרי שימוש בקופון
 * @param bookingId - מזהה ההזמנה
 * @param finalTotalPriceCents - המחיר הסופי שהמשתמש שילם (אחרי הנחה)
 * @param originalParkingCostCents - עלות החניה המקורית (לא בשימוש - נחשב מההזמנה)
 */
export async function updateOperationalFeeAfterCoupon(
  bookingId: number,
  finalTotalPriceCents: number,
  originalParkingCostCents: number
) {
  console.log(`💳 Updating operational fee after coupon for booking #${bookingId}`);
  
  // 🔧 FIX: קבלת הנתונים המדויקים מהרשומת הקיימת של דמי התפעול
  const existingFee = await prisma.operationalFee.findUnique({
    where: { bookingId }
  });

  if (!existingFee) {
    throw new Error(`No operational fee found for booking #${bookingId}`);
  }

  // השתמש בעלות החניה המקורית מהרשומת הקיימת (זה המחיר הנכון!)
  const correctParkingCostCents = existingFee.parkingCostCents;
  
  // חישוב דמי התפעול בפועל אחרי הקופון
  const actualOperationalFeeCents = finalTotalPriceCents - correctParkingCostCents;
  
  console.log(`💳 Coupon adjustment (FIXED):`, {
    correctParkingCost: `₪${correctParkingCostCents / 100}`,
    wrongParkingCost: `₪${originalParkingCostCents / 100} (ignored)`,
    finalTotal: `₪${finalTotalPriceCents / 100}`,
    actualOperationalFee: `₪${actualOperationalFeeCents / 100}`
  });

  const updatedFee = await prisma.operationalFee.update({
    where: { bookingId },
    data: {
      operationalFeeCents: actualOperationalFeeCents,
      totalPaymentCents: finalTotalPriceCents,
    },
  });

  console.log(`💳 ✅ Operational fee updated after coupon:`, {
    id: updatedFee.id,
    bookingId: updatedFee.bookingId,
    parkingCost: `₪${updatedFee.parkingCostCents / 100}`,
    operationalFee: `₪${updatedFee.operationalFeeCents / 100}`,
    totalPayment: `₪${updatedFee.totalPaymentCents / 100}`,
  });

  return updatedFee;
}

export default {
  calculateOperationalFee,
  createOperationalFee,
  getOperationalFeeByBookingId,
  updateOperationalFeeForExtension,
  updateOperationalFeeAfterCoupon,
  getOperationalFeeStats,
};
