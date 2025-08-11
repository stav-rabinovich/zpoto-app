// utils/notify.js
// שכבת עזר להתראות (לוקליות) בעזרת expo-notifications.
// כולל: אתחול הרשאות/ערוץ, תזמון למזמין (seeker), תזמון לבעל חניה (owner),
// וביטולי התראות.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// להציג התראות גם כשהאפליקציה בפורגראונד
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const ANDROID_CHANNEL_ID = 'bookings';

export async function initNotifications() {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      finalStatus = req.status;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'הזמנות',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 200, 150, 200],
        lightColor: '#FFFFFF',
        sound: undefined,
        bypassDnd: false,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      });
    }

    return finalStatus === 'granted';
  } catch (e) {
    console.warn('initNotifications error', e);
    return false;
  }
}

// ===== helpers =====
async function scheduleAt(dateObj, { title, body, data }) {
  try {
    if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return null;
    const now = new Date();
    if (dateObj <= now) return null;

    const trigger =
      Platform.OS === 'android'
        ? { date: dateObj, channelId: ANDROID_CHANNEL_ID }
        : dateObj;

    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data ?? {} },
      trigger,
    });
    return id;
  } catch (e) {
    console.warn('scheduleAt error', e);
    return null;
  }
}

async function notifyNow({ title, body, data }) {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data ?? {} },
      trigger: null, // מידי
    });
    return id;
  } catch (e) {
    console.warn('notifyNow error', e);
    return null;
  }
}

// ===== זרימת המזמין (Seeker) =====
export async function scheduleBookingNotifications(booking) {
  try {
    const ids = [];
    const now = new Date();
    const start = new Date(booking.start);
    const end = new Date(booking.end);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return ids;
    }

    // תחילת ההזמנה
    const startId = await scheduleAt(start, {
      title: 'הזמנה התחילה',
      body: `${booking.spot?.title || 'חניה'} החלה עכשיו.`,
      data: { bookingId: booking.id },
    });
    if (startId) ids.push(startId);

    // 30 דק׳ לפני סיום (אם נותר מספיק זמן)
    if (end - now > 45 * 60 * 1000) {
      const tMinus30 = new Date(end.getTime() - 30 * 60 * 1000);
      const beforeId = await scheduleAt(tMinus30, {
        title: 'עוד 30 דקות מסתיים',
        body: 'אפשר להאריך מתוך "ההזמנות שלי".',
        data: { bookingId: booking.id },
      });
      if (beforeId) ids.push(beforeId);
    }

    // בסיום
    const endId = await scheduleAt(end, {
      title: 'הזמנה הסתיימה',
      body: `ההזמנה לחניה ${booking.spot?.title || ''} הסתיימה.`,
      data: { bookingId: booking.id },
    });
    if (endId) ids.push(endId);

    return ids;
  } catch (e) {
    console.warn('scheduleBookingNotifications error', e);
    return [];
  }
}

export async function cancelBookingNotifications(notificationIds) {
  try {
    if (!Array.isArray(notificationIds)) return;
    await Promise.all(notificationIds.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  } catch (e) {
    console.warn('cancelBookingNotifications error', e);
  }
}

// ===== זרימת בעל חניה (Owner) – בדמו: התראות מקומיות במכשיר =====
export async function notifyOwnerNewRequest(booking) {
  if (!booking?.ownerListingId) return null;
  return notifyNow({
    title: 'בקשת הזמנה חדשה',
    body: `${booking.spot?.title || 'חניה'} • ${fmtTimeRange(booking.start, booking.end)}`,
    data: { bookingId: booking.id, role: 'owner' },
  });
}

export async function scheduleOwnerNotifications(booking) {
  try {
    const ids = [];
    if (!booking?.ownerListingId) return ids;

    const start = new Date(booking.start);
    const end = new Date(booking.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return ids;
    }

    // 30 דק׳ לפני התחלה
    const tMinusStart = new Date(start.getTime() - 30 * 60 * 1000);
    const beforeStartId = await scheduleAt(tMinusStart, {
      title: 'תזכורת: הזמנה מתחילה',
      body: `החניה ${booking.spot?.title || ''} תתחיל בעוד 30 דק׳.`,
      data: { bookingId: booking.id, role: 'owner' },
    });
    if (beforeStartId) ids.push(beforeStartId);

    // בסיום (החניה מתפנה)
    const endId = await scheduleAt(end, {
      title: 'ההשכרה הסתיימה',
      body: `החניה ${booking.spot?.title || ''} שוב פנויה.`,
      data: { bookingId: booking.id, role: 'owner' },
    });
    if (endId) ids.push(endId);

    return ids;
  } catch (e) {
    console.warn('scheduleOwnerNotifications error', e);
    return [];
  }
}

export async function cancelOwnerNotifications(notificationIds) {
  try {
    if (!Array.isArray(notificationIds)) return;
    await Promise.all(notificationIds.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  } catch (e) {
    console.warn('cancelOwnerNotifications error', e);
  }
}

// ===== Utilities =====
function fmtTimeRange(startIso, endIso) {
  try {
    const s = new Date(startIso), e = new Date(endIso);
    const d = (dt) => dt.toLocaleDateString('he-IL');
    const t = (dt) => dt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    const sameDay = s.toDateString() === e.toDateString();
    return sameDay ? `${d(s)} • ${t(s)}–${t(e)}` : `${d(s)} ${t(s)} → ${d(e)} ${t(e)}`;
  } catch {
    return '';
  }
}
