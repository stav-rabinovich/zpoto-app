"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expireOverdueApprovals = expireOverdueApprovals;
exports.checkBookingExpired = checkBookingExpired;
exports.getTimeLeftForApproval = getTimeLeftForApproval;
const prisma_1 = require("../lib/prisma");
/**
 * שירות לטיפול בפקיעת זמן אישור בקשות
 */
/**
 * בדיקה ועדכון בקשות שפג זמנן
 * פונקציה זו תרוץ כל דקה ותבדוק בקשות שפג זמנן
 */
async function expireOverdueApprovals() {
    try {
        const now = new Date();
        // מציאת כל הבקשות שפג זמנן
        const expiredBookings = await prisma_1.prisma.booking.findMany({
            where: {
                status: 'PENDING_APPROVAL',
                approvalExpiresAt: {
                    lt: now // פחות מהזמן הנוכחי = פג
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                parking: {
                    select: {
                        id: true,
                        title: true,
                        address: true
                    }
                }
            }
        });
        if (expiredBookings.length === 0) {
            console.log('⏰ No expired approval requests found');
            return { expired: 0 };
        }
        console.log(`⏰ Found ${expiredBookings.length} expired approval requests`);
        // עדכון כל הבקשות שפגו ל-EXPIRED
        const result = await prisma_1.prisma.booking.updateMany({
            where: {
                id: {
                    in: expiredBookings.map(b => b.id)
                }
            },
            data: {
                status: 'EXPIRED'
            }
        });
        console.log(`✅ Updated ${result.count} bookings to EXPIRED status`);
        // TODO: שליחת התראות למשתמשים על פקיעת הבקשות
        for (const booking of expiredBookings) {
            console.log(`📧 Should notify user ${booking.user.email} about expired booking #${booking.id}`);
            // כאן נוסיף שליחת התראה למשתמש
        }
        return {
            expired: result.count,
            bookings: expiredBookings.map(b => ({
                id: b.id,
                userEmail: b.user.email,
                parkingTitle: b.parking.title
            }))
        };
    }
    catch (error) {
        console.error('❌ Error in expireOverdueApprovals:', error);
        throw error;
    }
}
/**
 * בדיקה אם בקשה ספציפית פגה
 */
async function checkBookingExpired(bookingId) {
    const booking = await prisma_1.prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
            status: true,
            approvalExpiresAt: true
        }
    });
    if (!booking || booking.status !== 'PENDING_APPROVAL') {
        return false;
    }
    if (!booking.approvalExpiresAt) {
        return false;
    }
    return booking.approvalExpiresAt < new Date();
}
/**
 * קבלת זמן שנותר לאישור בקשה (במילישניות)
 */
async function getTimeLeftForApproval(bookingId) {
    const booking = await prisma_1.prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
            status: true,
            approvalExpiresAt: true
        }
    });
    if (!booking || booking.status !== 'PENDING_APPROVAL' || !booking.approvalExpiresAt) {
        return null;
    }
    const timeLeft = booking.approvalExpiresAt.getTime() - Date.now();
    return Math.max(0, timeLeft);
}
