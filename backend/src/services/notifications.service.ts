// services/notifications.service.ts
// שירות התראות Push ו-In-App

import { prisma } from '../lib/prisma';

export interface CreateNotificationInput {
  userId: number;
  type: string;
  title: string;
  body: string;
  data?: any;
  scheduledFor?: Date;
  pushToken?: string;
}

/**
 * יצירת התראה חדשה
 */
export async function createNotification(input: CreateNotificationInput) {
  console.log('📢 Creating notification:', input);

  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data ? JSON.stringify(input.data) : null,
      scheduledFor: input.scheduledFor,
      pushToken: input.pushToken,
    },
  });

  // אם ההתראה לא מתוזמנת - שלח מיד
  if (!input.scheduledFor) {
    await sendNotificationNow(notification.id);
  }

  return notification;
}

/**
 * שליחת התראה מיידית
 */
export async function sendNotificationNow(notificationId: number) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: { user: true },
  });

  if (!notification) {
    console.error('❌ Notification not found:', notificationId);
    return;
  }

  console.log(`📤 Sending notification ${notificationId} to user ${notification.userId}`);

  try {
    // כאן נוסיף לוגיקת שליחת Push notification (Firebase/APNS)
    // לעת עתה נסמן כנשלח

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isSent: true,
        sentAt: new Date(),
        pushSent: true, // נעדכן כשנוסיף Firebase
      },
    });

    console.log(`✅ Notification ${notificationId} sent successfully`);
  } catch (error) {
    console.error(`❌ Failed to send notification ${notificationId}:`, error);

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        pushError: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

/**
 * קבלת התראות של משתמש
 */
export async function getUserNotifications(userId: number, limit = 50) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * סימון התראה כנקראה
 */
export async function markNotificationAsRead(notificationId: number, userId: number) {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId, // וידוא שההתראה שייכת למשתמש
    },
    data: { isRead: true },
  });
}

/**
 * סימון כל ההתראות כנקראות
 */
export async function markAllNotificationsAsRead(userId: number) {
  return prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: { isRead: true },
  });
}

/**
 * מחיקת התראה
 */
export async function deleteNotification(notificationId: number, userId: number) {
  return prisma.notification.deleteMany({
    where: {
      id: notificationId,
      userId, // וידוא שההתראה שייכת למשתמש
    },
  });
}

/**
 * קבלת מספר התראות לא נקראות
 */
export async function getUnreadNotificationsCount(userId: number): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
}

/**
 * יצירת התראת תזכורת להזמנה
 */
export async function createBookingReminderNotification(bookingId: number) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      parking: true,
      user: true,
    },
  });

  if (!booking) {
    console.error('❌ Booking not found for reminder:', bookingId);
    return;
  }

  // חישוב זמן התזכורת (2 שעות לפני)
  const reminderTime = new Date(booking.startTime.getTime() - 2 * 60 * 60 * 1000);

  // אל תיצור תזכורת אם הזמן כבר עבר
  if (reminderTime <= new Date()) {
    console.log('⏰ Reminder time already passed for booking:', bookingId);
    return;
  }

  return createNotification({
    userId: booking.userId,
    type: 'booking_reminder',
    title: '🅿️ תזכורת חניה',
    body: `החניה שלך ב${booking.parking.address} מתחילה בעוד שעתיים`,
    data: {
      bookingId: booking.id,
      parkingId: booking.parkingId,
      startTime: booking.startTime.toISOString(),
    },
    scheduledFor: reminderTime,
  });
}

/**
 * עיבוד התראות מתוזמנות (לרוץ בcron job)
 */
export async function processScheduledNotifications() {
  const now = new Date();

  const pendingNotifications = await prisma.notification.findMany({
    where: {
      scheduledFor: { lte: now },
      isSent: false,
    },
    take: 100, // עיבוד עד 100 התראות בכל פעם
  });

  console.log(`📅 Processing ${pendingNotifications.length} scheduled notifications`);

  for (const notification of pendingNotifications) {
    await sendNotificationNow(notification.id);
  }

  return pendingNotifications.length;
}
