"use strict";
/**
 * Commission Service - מערכת חישוב עמלות זפוטו
 *
 * מודל העמלות:
 * - 15% מסך ההכנסה של כל שעת חניה בתשלום
 * - 0% עמלה על שעות חניה חינם
 * - ללא גבול תחתון - תמיד 15% בלבד
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCommission = calculateCommission;
exports.saveCommission = saveCommission;
exports.getOwnerCommissions = getOwnerCommissions;
exports.getAllCommissionsForMonth = getAllCommissionsForMonth;
const prisma_1 = require("../lib/prisma");
// קבועים
const COMMISSION_RATE = 0.15; // 15%
/**
 * חישוב עמלה להזמנה
 * @param bookingId - מזהה ההזמנה
 * @param totalPriceCents - סכום כולל בעגורות
 * @param hourlyPricing - מחירים לפי שעות (אופציונלי)
 * @returns תוצאת חישוב העמלה
 */
async function calculateCommission(bookingId, totalPriceCents, hourlyPricing) {
    console.log(`💰 Calculating commission for booking ${bookingId}:`);
    console.log(`💰 Total price: ₪${totalPriceCents / 100}`);
    // אם אין פירוט שעות, חשב עמלה פשוטה
    if (!hourlyPricing || hourlyPricing.length === 0) {
        const commissionCents = Math.round(totalPriceCents * COMMISSION_RATE);
        const netOwnerCents = totalPriceCents - commissionCents;
        console.log(`💰 Simple calculation: Commission ₪${commissionCents / 100}, Net ₪${netOwnerCents / 100}`);
        return {
            totalPriceCents,
            commissionCents,
            netOwnerCents,
            commissionRate: COMMISSION_RATE,
            hourlyBreakdown: []
        };
    }
    // חישוב מפורט לפי שעות
    let totalCommissionCents = 0;
    const processedHours = [];
    for (const hour of hourlyPricing) {
        if (hour.isFree || hour.priceCents === 0) {
            // שעה חינם - אין עמלה
            processedHours.push({
                ...hour,
                priceCents: 0
            });
            console.log(`💰 Hour ${hour.hour}: FREE - No commission`);
        }
        else {
            // שעה בתשלום - חשב עמלה 15% בלבד (ללא רצפה)
            const commission = Math.round(hour.priceCents * COMMISSION_RATE);
            totalCommissionCents += commission;
            processedHours.push({
                ...hour,
                priceCents: commission
            });
            console.log(`💰 Hour ${hour.hour}: ₪${hour.priceCents / 100} → Commission ₪${commission / 100} (15%)`);
        }
    }
    const netOwnerCents = totalPriceCents - totalCommissionCents;
    console.log(`💰 Total commission: ₪${totalCommissionCents / 100}`);
    console.log(`💰 Net to owner: ₪${netOwnerCents / 100}`);
    return {
        totalPriceCents,
        commissionCents: totalCommissionCents,
        netOwnerCents,
        commissionRate: COMMISSION_RATE,
        hourlyBreakdown: processedHours
    };
}
/**
 * שמירת חישוב עמלה במסד הנתונים
 */
async function saveCommission(bookingId, calculation) {
    try {
        // בדוק אם כבר קיימת עמלה להזמנה זו
        const existingCommission = await prisma_1.prisma.commission.findUnique({
            where: { bookingId }
        });
        if (existingCommission) {
            console.log(`💰 Updating existing commission for booking ${bookingId}`);
            await prisma_1.prisma.commission.update({
                where: { bookingId },
                data: {
                    totalPriceCents: calculation.totalPriceCents,
                    commissionCents: calculation.commissionCents,
                    netOwnerCents: calculation.netOwnerCents,
                    commissionRate: calculation.commissionRate,
                    hourlyBreakdown: JSON.stringify(calculation.hourlyBreakdown),
                    calculatedAt: new Date()
                }
            });
        }
        else {
            console.log(`💰 Creating new commission for booking ${bookingId}`);
            await prisma_1.prisma.commission.create({
                data: {
                    bookingId,
                    totalPriceCents: calculation.totalPriceCents,
                    commissionCents: calculation.commissionCents,
                    netOwnerCents: calculation.netOwnerCents,
                    commissionRate: calculation.commissionRate,
                    hourlyBreakdown: JSON.stringify(calculation.hourlyBreakdown)
                }
            });
        }
        // עדכן גם את ההזמנה עצמה
        await prisma_1.prisma.booking.update({
            where: { id: bookingId },
            data: {
                commissionCents: calculation.commissionCents,
                netOwnerCents: calculation.netOwnerCents,
                commissionRate: calculation.commissionRate
            }
        });
        console.log(`💰 Commission saved successfully for booking ${bookingId}`);
    }
    catch (error) {
        console.error(`💰 Error saving commission for booking ${bookingId}:`, error);
        throw error;
    }
}
/**
 * קבלת עמלות של בעל חניה לחודש נתון
 */
async function getOwnerCommissions(ownerId, year, month) {
    const startDate = new Date(year, month - 1, 1); // תחילת החודש
    const endDate = new Date(year, month, 0, 23, 59, 59); // סוף החודש
    console.log(`💰 Getting commissions for owner ${ownerId} for ${month}/${year}`);
    const commissions = await prisma_1.prisma.commission.findMany({
        where: {
            booking: {
                parking: {
                    ownerId
                },
                paidAt: {
                    gte: startDate,
                    lte: endDate
                },
                status: 'CONFIRMED'
            }
        },
        include: {
            booking: {
                include: {
                    parking: {
                        select: {
                            title: true,
                            address: true
                        }
                    }
                }
            }
        },
        orderBy: {
            calculatedAt: 'desc'
        }
    });
    const totalCommissionCents = commissions.reduce((sum, c) => sum + c.commissionCents, 0);
    const totalNetOwnerCents = commissions.reduce((sum, c) => sum + c.netOwnerCents, 0);
    console.log(`💰 Found ${commissions.length} commissions, total net: ₪${totalNetOwnerCents / 100}`);
    return {
        commissions,
        summary: {
            totalCommissionCents,
            totalNetOwnerCents,
            totalCommissionILS: (totalCommissionCents / 100).toFixed(2),
            totalNetOwnerILS: (totalNetOwnerCents / 100).toFixed(2),
            count: commissions.length
        }
    };
}
/**
 * חישוב עמלות לכל בעלי החניות לחודש נתון (לאדמין)
 */
async function getAllCommissionsForMonth(year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    console.log(`💰 Getting all commissions for ${month}/${year}`);
    const commissions = await prisma_1.prisma.commission.findMany({
        where: {
            booking: {
                paidAt: {
                    gte: startDate,
                    lte: endDate
                },
                status: 'CONFIRMED'
            }
        },
        include: {
            booking: {
                include: {
                    parking: {
                        include: {
                            owner: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true
                                }
                            }
                        }
                    }
                }
            }
        },
        orderBy: {
            calculatedAt: 'desc'
        }
    });
    // קיבוץ לפי בעל חניה
    const ownerSummaries = commissions.reduce((acc, commission) => {
        const ownerId = commission.booking.parking.owner.id;
        if (!acc[ownerId]) {
            acc[ownerId] = {
                owner: commission.booking.parking.owner,
                totalCommissionCents: 0,
                totalNetOwnerCents: 0,
                count: 0,
                commissions: []
            };
        }
        acc[ownerId].totalCommissionCents += commission.commissionCents;
        acc[ownerId].totalNetOwnerCents += commission.netOwnerCents;
        acc[ownerId].count += 1;
        acc[ownerId].commissions.push(commission);
        return acc;
    }, {});
    const totalZpotoRevenueCents = commissions.reduce((sum, c) => sum + c.commissionCents, 0);
    console.log(`💰 Total Zpoto revenue for ${month}/${year}: ₪${totalZpotoRevenueCents / 100}`);
    return {
        ownerSummaries: Object.values(ownerSummaries),
        totalZpotoRevenueCents,
        totalZpotoRevenueILS: (totalZpotoRevenueCents / 100).toFixed(2),
        period: { year, month, startDate, endDate }
    };
}
