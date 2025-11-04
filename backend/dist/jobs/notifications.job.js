"use strict";
// jobs/notifications.job.ts
// Job scheduler להתראות מתוזמנות
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
exports.startNotificationsJob = startNotificationsJob;
exports.startBookingRemindersJob = startBookingRemindersJob;
exports.startAllNotificationJobs = startAllNotificationJobs;
const cron = __importStar(require("node-cron"));
const notifications_service_1 = require("../services/notifications.service");
const prisma_1 = require("../lib/prisma");
/**
 * Job לעיבוד התראות מתוזמנות - רץ כל דקה
 */
function startNotificationsJob() {
    console.log('📅 Starting notifications scheduler job');
    // רץ כל דקה
    cron.schedule('* * * * *', async () => {
        try {
            const processedCount = await (0, notifications_service_1.processScheduledNotifications)();
            if (processedCount > 0) {
                console.log(`📤 Processed ${processedCount} scheduled notifications`);
            }
        }
        catch (error) {
            console.error('❌ Error processing scheduled notifications:', error);
        }
    });
}
/**
 * Job ליצירת תזכורות להזמנות - רץ כל 10 דקות
 */
function startBookingRemindersJob() {
    console.log('⏰ Starting booking reminders job');
    // רץ כל 10 דקות
    cron.schedule('*/10 * * * *', async () => {
        try {
            await createBookingReminders();
        }
        catch (error) {
            console.error('❌ Error creating booking reminders:', error);
        }
    });
}
/**
 * יצירת תזכורות להזמנות עתידיות
 */
async function createBookingReminders() {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    // מצא הזמנות שמתחילות בעוד 2-3 שעות ועדיין לא נשלחה להן תזכורת
    const upcomingBookings = await prisma_1.prisma.booking.findMany({
        where: {
            startTime: {
                gte: twoHoursFromNow,
                lte: threeHoursFromNow,
            },
            status: 'CONFIRMED',
            // בדוק שעדיין לא נשלחה תזכורת
            user: {
                notifications: {
                    none: {
                        type: 'booking_reminder',
                        data: {
                            contains: `"bookingId":${JSON.stringify('${booking.id}')}`,
                        },
                    },
                },
            },
        },
        include: {
            parking: true,
            user: true,
        },
    });
    console.log(`⏰ Found ${upcomingBookings.length} bookings needing reminders`);
    for (const booking of upcomingBookings) {
        try {
            await (0, notifications_service_1.createBookingReminderNotification)(booking.id);
            console.log(`✅ Created reminder for booking ${booking.id}`);
        }
        catch (error) {
            console.error(`❌ Failed to create reminder for booking ${booking.id}:`, error);
        }
    }
}
/**
 * הפעלת כל ה-jobs
 */
function startAllNotificationJobs() {
    startNotificationsJob();
    startBookingRemindersJob();
    console.log('🚀 All notification jobs started');
}
