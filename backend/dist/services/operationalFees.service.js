"use strict";
/**
 * Operational Fees Service - מערכת דמי תפעול למחפשי חניה
 *
 * מודל דמי התפעול:
 * - 10% מעלות החניה הבסיסית
 * - נוסף לסכום החניה
 * - מחפש החניה משלם: עלות חניה + דמי תפעול
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateOperationalFee = calculateOperationalFee;
exports.createOperationalFee = createOperationalFee;
exports.getOperationalFeeByBookingId = getOperationalFeeByBookingId;
exports.updateOperationalFeeForExtension = updateOperationalFeeForExtension;
exports.getOperationalFeeStats = getOperationalFeeStats;
const prisma_1 = require("../lib/prisma");
// קבועים
const OPERATIONAL_FEE_RATE = 0.1; // 10%
/**
 * חישוב דמי תפעול להזמנה
 * @param parkingCostCents - עלות החניה הבסיסית בעגורות
 * @returns תוצאת חישוב דמי התפעול
 */
function calculateOperationalFee(parkingCostCents) {
    console.log(`💳 Calculating operational fee for parking cost: ₪${parkingCostCents / 100}`);
    const operationalFeeCents = Math.round(parkingCostCents * OPERATIONAL_FEE_RATE);
    const totalPaymentCents = parkingCostCents + operationalFeeCents;
    const result = {
        parkingCostCents,
        operationalFeeCents,
        totalPaymentCents,
        operationalFeeRate: OPERATIONAL_FEE_RATE
    };
    console.log(`💳 Operational fee calculation:`, {
        parkingCost: `₪${parkingCostCents / 100}`,
        operationalFee: `₪${operationalFeeCents / 100} (10%)`,
        totalPayment: `₪${totalPaymentCents / 100}`,
        formula: 'Total = Parking Cost + (Parking Cost × 10%)'
    });
    return result;
}
/**
 * יצירת רשומת דמי תפעול להזמנה
 * @param bookingId - מזהה ההזמנה
 * @param parkingCostCents - עלות החניה הבסיסית
 * @returns רשומת דמי התפעול שנוצרה
 */
async function createOperationalFee(bookingId, parkingCostCents) {
    console.log(`💳 Creating operational fee record for booking #${bookingId}`);
    const calculation = calculateOperationalFee(parkingCostCents);
    const operationalFee = await prisma_1.prisma.operationalFee.create({
        data: {
            bookingId,
            parkingCostCents: calculation.parkingCostCents,
            operationalFeeCents: calculation.operationalFeeCents,
            totalPaymentCents: calculation.totalPaymentCents,
            operationalFeeRate: calculation.operationalFeeRate
        }
    });
    console.log(`💳 ✅ Operational fee created:`, {
        id: operationalFee.id,
        bookingId: operationalFee.bookingId,
        parkingCost: `₪${operationalFee.parkingCostCents / 100}`,
        operationalFee: `₪${operationalFee.operationalFeeCents / 100}`,
        totalPayment: `₪${operationalFee.totalPaymentCents / 100}`
    });
    return operationalFee;
}
/**
 * קבלת דמי תפעול להזמנה
 * @param bookingId - מזהה ההזמנה
 * @returns רשומת דמי התפעול או null
 */
async function getOperationalFeeByBookingId(bookingId) {
    return await prisma_1.prisma.operationalFee.findUnique({
        where: { bookingId }
    });
}
/**
 * עדכון דמי תפעול (למקרה של הארכות)
 * @param bookingId - מזהה ההזמנה
 * @param newParkingCostCents - עלות חניה מעודכנת אחרי הארכה
 * @returns רשומת דמי התפעול מעודכנת
 */
async function updateOperationalFeeForExtension(bookingId, newParkingCostCents) {
    console.log(`💳 Updating operational fee for booking #${bookingId} extension`);
    const calculation = calculateOperationalFee(newParkingCostCents);
    const updatedFee = await prisma_1.prisma.operationalFee.update({
        where: { bookingId },
        data: {
            parkingCostCents: calculation.parkingCostCents,
            operationalFeeCents: calculation.operationalFeeCents,
            totalPaymentCents: calculation.totalPaymentCents,
        }
    });
    console.log(`💳 ✅ Operational fee updated for extension`);
    return updatedFee;
}
/**
 * קבלת סטטיסטיקות דמי תפעול לאדמין
 * @param filters - פילטרים לתקופה
 * @returns סטטיסטיקות דמי תפעול
 */
async function getOperationalFeeStats(filters) {
    const whereClause = {};
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
        // רשימת כל דמי התפעול
        prisma_1.prisma.operationalFee.findMany({
            where: whereClause,
            include: {
                booking: {
                    select: {
                        id: true,
                        createdAt: true,
                        user: {
                            select: {
                                email: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: { calculatedAt: 'desc' }
        }),
        // סטטיסטיקות כלליות
        prisma_1.prisma.operationalFee.aggregate({
            where: whereClause,
            _sum: {
                operationalFeeCents: true,
                totalPaymentCents: true,
                parkingCostCents: true
            },
            _count: true
        })
    ]);
    return {
        fees,
        stats: {
            totalOperationalFeesCollected: totalStats._sum.operationalFeeCents || 0,
            totalPaymentsProcessed: totalStats._sum.totalPaymentCents || 0,
            totalParkingCosts: totalStats._sum.parkingCostCents || 0,
            totalTransactions: totalStats._count,
            averageOperationalFee: totalStats._count > 0
                ? Math.round((totalStats._sum.operationalFeeCents || 0) / totalStats._count)
                : 0
        }
    };
}
exports.default = {
    calculateOperationalFee,
    createOperationalFee,
    getOperationalFeeByBookingId,
    updateOperationalFeeForExtension,
    getOperationalFeeStats
};
