"use strict";
/**
 * שירות הארכות חניה
 * מטפל בלוגיקה של הארכת חניה ב-30 דקות
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkExtensionEligibility = checkExtensionEligibility;
exports.executeExtension = executeExtension;
exports.getExtensionHistory = getExtensionHistory;
const client_1 = require("@prisma/client");
const parkings_service_1 = require("./parkings.service");
const prisma = new client_1.PrismaClient();
/**
 * בדיקת זמינות החניה מהבעלים בטווח זמנים נתון
 * 🔧 תוקן: משתמש במערכת הזמינות החדשה
 */
async function checkOwnerAvailability(parkingId, startTime, endTime) {
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
    const isAvailable = (0, parkings_service_1.isParkingAvailableByOwnerSettings)(parking.availability, startTime, endTime);
    if (isAvailable) {
        console.log(`✅ Extension: Parking available according to owner settings`);
        return { isAvailable: true };
    }
    else {
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
/**
 * בדיקה האם ניתן להאריך חניה ב-30 דקות
 */
async function checkExtensionEligibility(bookingId, userId) {
    console.log(`🔍 Checking extension eligibility for booking #${bookingId} by user #${userId}`);
    // 1. שליפת פרטי ההזמנה הנוכחית
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            parking: {
                select: {
                    id: true,
                    title: true,
                    priceHr: true,
                    ownerId: true,
                },
            },
        },
    });
    console.log(`📋 Booking found:`, booking
        ? {
            id: booking.id,
            userId: booking.userId,
            status: booking.status,
            startTime: booking.startTime,
            endTime: booking.endTime,
            parkingTitle: booking.parking?.title,
        }
        : 'No booking found');
    if (!booking) {
        return {
            success: false,
            canExtend: false,
            reason: 'BOOKING_NOT_FOUND',
        };
    }
    // 2. וודא שההזמנה שייכת למשתמש
    if (booking.userId !== userId) {
        console.log(`❌ Authorization failed - booking belongs to user #${booking.userId}, requested by user #${userId}`);
        return {
            success: false,
            canExtend: false,
            reason: 'UNAUTHORIZED',
        };
    }
    // 3. וודא שההזמנה פעילה כרגע או עתידית
    const now = new Date();
    const isActive = booking.status === 'CONFIRMED' && booking.startTime <= now && booking.endTime > now;
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
        console.log(`❌ Booking not active or upcoming - status: ${booking.status}, period: ${booking.startTime} to ${booking.endTime}`);
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
    const availabilityCheck = await checkOwnerAvailability(booking.parkingId, booking.endTime, newEndTime);
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
    // 8. חישוב מחיר ההארכה - תמיד חצי מהמחיר של השעה הראשונה מהמחירון (עיגול כלפי מעלה)
    let firstHourPrice = booking.parking.priceHr; // fallback למחיר הישן
    // נסה לקרוא את המחירון החדש
    const parkingWithPricing = await prisma.parking.findUnique({
        where: { id: booking.parkingId },
        select: { pricing: true, priceHr: true },
    });
    if (parkingWithPricing?.pricing) {
        try {
            const pricingData = typeof parkingWithPricing.pricing === 'string'
                ? JSON.parse(parkingWithPricing.pricing)
                : parkingWithPricing.pricing;
            if (pricingData?.hour1) {
                const hour1Price = typeof pricingData.hour1 === 'string' ? parseFloat(pricingData.hour1) : pricingData.hour1;
                if (!isNaN(hour1Price) && hour1Price > 0) {
                    firstHourPrice = hour1Price;
                    console.log(`💰 Using tiered pricing: hour1 = ₪${firstHourPrice}`);
                }
            }
        }
        catch (error) {
            console.warn('Failed to parse pricing data for extension, using legacy price:', error);
        }
    }
    const extensionPrice = firstHourPrice / 2; // חצי מהמחיר
    const roundedExtensionPrice = Math.ceil(extensionPrice); // עיגול כלפי מעלה
    // 🔧 FIX: הפרדה בין עלות החניה לדמי התפעול
    const extensionParkingCostCents = Math.round(roundedExtensionPrice * 100); // עלות החניה בלבד
    const extensionOperationalFeeCents = Math.round(extensionParkingCostCents * 0.1); // דמי תפעול 10%
    const extensionPriceCents = extensionParkingCostCents + extensionOperationalFeeCents; // סה"כ
    console.log(`✅ Extension available:`, {
        extensionMinutes,
        legacyPriceHr: booking.parking.priceHr,
        actualFirstHourPrice: firstHourPrice,
        extensionPrice,
        roundedExtensionPrice,
        extensionPriceCents,
        formula: 'Extension price = Math.ceil(First hour price / 2) × 1.1 (with operational fee)',
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
async function executeExtension(bookingId, userId, paymentId) {
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
                        priceHr: true,
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
        const extensionCost = eligibility.extensionPrice; // באגורות (כולל דמי תפעול)
        // 🔧 FIX: עדכון נכון של totalPriceCents - רק עלות החניה ללא דמי תפעול
        const extensionParkingOnlyCents = Math.round(extensionCost / 1.1); // עלות החניה בלבד
        const newTotalPriceCents = (currentBooking.totalPriceCents || 0) + extensionParkingOnlyCents;
        // ביצוע ההארכה עם עדכון המחיר הכולל
        const updatedBooking = await prisma.booking.update({
            where: { id: bookingId },
            data: {
                endTime: eligibility.newEndTime,
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
                        priceHr: true,
                    },
                },
            },
        });
        // 💰 חישוב עמלה על הארכה - 15% מעלות החניה בלבד (לא כולל דמי תפעול)
        try {
            const COMMISSION_RATE = 0.15;
            // 🔧 FIX: עמלה רק על עלות החניה, לא על דמי התפעול
            // חישוב עלות החניה מתוך הסכום הכולל
            const extensionParkingOnlyCents = Math.round(extensionCost / 1.1); // הסרת דמי התפעול
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
                console.log(`💰 Updated existing commission: +₪${extensionCommissionCents / 100} commission on extension`);
            }
            else {
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
        }
        catch (commissionError) {
            console.error(`❌ Failed to calculate commission for extension:`, commissionError);
            // לא נכשיל את ההארכה בגלל בעיית עמלה
        }
        // 💳 עדכון דמי תפעול למחפש החניה
        try {
            const { updateOperationalFeeForExtension } = await Promise.resolve().then(() => __importStar(require('./operationalFees.service')));
            // 🔧 FIX: העברת הסכום הכולל (כולל דמי תפעול) לפונקציה
            const totalWithOperationalFee = newTotalPriceCents * 1.1; // הוספת דמי תפעול
            await updateOperationalFeeForExtension(bookingId, Math.round(totalWithOperationalFee));
            console.log(`💳 Operational fee updated for extension: booking #${bookingId}`);
        }
        catch (operationalFeeError) {
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
    }
    catch (error) {
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
async function getExtensionHistory(bookingId) {
    // לעתיד - ניתן להוסיף טבלה נפרדת להיסטוריית הארכות
    // כרגע נחזיר מידע בסיסי
    return {
        bookingId,
        extensions: [],
        totalExtensions: 0,
        totalExtensionTime: 0,
    };
}
