// jobs/notifications.job.ts
// Job scheduler להתראות מתוזמנות

import * as cron from 'node-cron';
import {
  processScheduledNotifications,
  createBookingReminderNotification,
} from '../services/notifications.service';
import { prisma } from '../lib/prisma';

/**
 * Job לעיבוד התראות מתוזמנות - רץ כל דקה
 */
export function startNotificationsJob() {
  console.log('📅 Starting notifications scheduler job');

  // רץ כל דקה
  cron.schedule('* * * * *', async () => {
    try {
      const processedCount = await processScheduledNotifications();
      if (processedCount > 0) {
        console.log(`📤 Processed ${processedCount} scheduled notifications`);
      }
    } catch (error) {
      console.error('❌ Error processing scheduled notifications:', error);
    }
  });
}

/**
 * Job ליצירת תזכורות להזמנות - רץ כל 10 דקות
 */
export function startBookingRemindersJob() {
  console.log('⏰ Starting booking reminders job');

  // רץ כל 10 דקות
  cron.schedule('*/10 * * * *', async () => {
    try {
      await createBookingReminders();
    } catch (error) {
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
  const upcomingBookings = await prisma.booking.findMany({
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
      await createBookingReminderNotification(booking.id);
      console.log(`✅ Created reminder for booking ${booking.id}`);
    } catch (error) {
      console.error(`❌ Failed to create reminder for booking ${booking.id}:`, error);
    }
  }
}

/**
 * הפעלת כל ה-jobs
 */
export function startAllNotificationJobs() {
  startNotificationsJob();
  startBookingRemindersJob();
  console.log('🚀 All notification jobs started');
}
