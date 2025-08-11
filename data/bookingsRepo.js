// data/bookingsRepo.js
import { getJSON, setJSON } from './storage';
import * as listingsRepo from './listingsRepo';

const KEY = 'BOOKINGS_V1';

export const BOOKING_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELED: 'canceled',
};

// ---------- Helpers ----------
function normalize(b) {
  return {
    id: b.id,
    listingId: b.listingId,
    renterId: b.renterId ?? null,
    title: b.title ?? '',
    startAt: b.startAt ?? null,
    endAt: b.endAt ?? null,
    pricePerHour: b.pricePerHour ?? 12,
    totalPrice: typeof b.totalPrice === 'number' ? b.totalPrice : undefined,
    status: b.status ?? null, // ייקבע אוטומטית אם חסר
    events: Array.isArray(b.events) ? b.events : [],
    createdAt: b.createdAt ?? Date.now(),
    updatedAt: b.updatedAt ?? Date.now(),
  };
}

export async function getAll() {
  const raw = (await getJSON(KEY, [])) || [];
  return raw.map(normalize);
}

export async function saveAll(items) {
  await setJSON(KEY, items.map(normalize));
  return items;
}

export function inRange(booking, from, to) {
  if (!booking?.startAt) return false;
  const t = new Date(booking.startAt).getTime();
  return t >= from.getTime() && t <= to.getTime();
}

export function calcTotalPrice(booking) {
  if (typeof booking?.totalPrice === 'number') return booking.totalPrice;
  if (!booking?.startAt || !booking?.endAt || !booking?.pricePerHour) return 0;
  const diffHrs = Math.max(
    0,
    (new Date(booking.endAt).getTime() - new Date(booking.startAt).getTime()) / (1000 * 60 * 60)
  );
  const hoursRoundedUp = Math.ceil(diffHrs); // עיגול לשעה
  return Math.round(hoursRoundedUp * booking.pricePerHour);
}

// קובע סטטוס התחלתי לפי הגדרת החניה (auto/manual)
async function deriveInitialStatus(booking) {
  try {
    const listing = booking?.listingId ? await listingsRepo.getById(booking.listingId) : null;
    const approvalMode = listing?.approvalMode ?? (listing?.requiresManualApproval ? 'manual' : 'auto');
    return approvalMode === 'manual' ? BOOKING_STATUS.PENDING : BOOKING_STATUS.APPROVED;
  } catch {
    return BOOKING_STATUS.PENDING;
  }
}

// ---------- CRUD ----------
export async function upsert(booking) {
  const all = await getAll();
  const idx = all.findIndex((b) => b.id === booking.id);

  let withTimestamps = normalize({
    ...booking,
    updatedAt: Date.now(),
    createdAt: booking.createdAt ?? Date.now(),
  });

  if (!withTimestamps.status) {
    withTimestamps.status = await deriveInitialStatus(withTimestamps);
  }

  if (typeof withTimestamps.totalPrice !== 'number') {
    withTimestamps.totalPrice = calcTotalPrice(withTimestamps);
  }

  if (idx >= 0) all[idx] = withTimestamps;
  else all.push(withTimestamps);

  await saveAll(all);
  return withTimestamps;
}

export async function getById(id) {
  const all = await getAll();
  return all.find((b) => b.id === id) || null;
}

export async function byStatus(status) {
  const all = await getAll();
  return all.filter((b) => b.status === status);
}

export async function setStatus(id, status, extraEventPayload = undefined) {
  const all = await getAll();
  const idx = all.findIndex((b) => b.id === id);
  if (idx === -1) return null;

  const updated = {
    ...all[idx],
    status,
    updatedAt: Date.now(),
    events: [
      ...(all[idx].events ?? []),
      { type: 'status_change', at: Date.now(), payload: { to: status, ...(extraEventPayload || {}) } },
    ],
  };

  all[idx] = updated;
  await saveAll(all);
  return updated;
}

// יצירת הזמנה – נקרא מכל מסך שמייצר הזמנה
export async function requestBooking({ id, listingId, renterId, startAt, endAt, pricePerHour, title }) {
  const booking = {
    id: id ?? `b_${Date.now()}`,
    listingId,
    renterId: renterId ?? null,
    title: title ?? '',
    startAt,
    endAt,
    pricePerHour,
  };
  return upsert(booking); // יקבל PENDING/APPROVED לפי החניה
}

// ---------- לוגיקת מחזור חיים (אוטומטית) ----------
// מאשר שהזמנות APPROVED יהפכו ל-ACTIVE בזמן ההתחלה,
// והזמנות ACTIVE יהפכו ל-COMPLETED אחרי זמן הסיום.
export async function sweepAndAutoTransition(nowTs = Date.now()) {
  const all = await getAll();
  let changed = false;

  for (let i = 0; i < all.length; i++) {
    const b = all[i];
    const startTs = b.startAt ? new Date(b.startAt).getTime() : null;
    const endTs = b.endAt ? new Date(b.endAt).getTime() : null;

    if (b.status === BOOKING_STATUS.APPROVED && startTs && nowTs >= startTs) {
      all[i] = {
        ...b,
        status: BOOKING_STATUS.ACTIVE,
        updatedAt: nowTs,
        events: [...(b.events || []), { type: 'status_change', at: nowTs, payload: { to: BOOKING_STATUS.ACTIVE } }],
      };
      changed = true;
    }

    if (b.status === BOOKING_STATUS.ACTIVE && endTs && nowTs >= endTs) {
      const completed = {
        ...b,
        status: BOOKING_STATUS.COMPLETED,
        endAt: b.endAt, // נשאר
        totalPrice: calcTotalPrice(b),
        updatedAt: nowTs,
        events: [...(b.events || []), { type: 'status_change', at: nowTs, payload: { to: BOOKING_STATUS.COMPLETED } }],
      };
      all[i] = completed;
      changed = true;
    }
  }

  if (changed) await saveAll(all);
  return changed;
}

// הארכת הזמנה פעילה/מאושרת
export async function extend(bookingId, newEndAt) {
  const all = await getAll();
  const idx = all.findIndex((b) => b.id === bookingId);
  if (idx === -1) return null;

  const updated = {
    ...all[idx],
    endAt: newEndAt,
    updatedAt: Date.now(),
    totalPrice: calcTotalPrice({ ...all[idx], endAt: newEndAt }),
    events: [...(all[idx].events || []), { type: 'extend', at: Date.now(), payload: { newEndAt } }],
  };
  all[idx] = updated;
  await saveAll(all);
  return updated;
}

// סיום מוקדם – מחשב חיוב עד עכשיו ומסיים
export async function finishNow(bookingId) {
  const all = await getAll();
  const idx = all.findIndex((b) => b.id === bookingId);
  if (idx === -1) return null;

  const now = new Date().toISOString();
  const completed = {
    ...all[idx],
    endAt: now,
    status: BOOKING_STATUS.COMPLETED,
    updatedAt: Date.now(),
    totalPrice: calcTotalPrice({ ...all[idx], endAt: now }),
    events: [...(all[idx].events || []), { type: 'finish_now', at: Date.now() }],
  };
  all[idx] = completed;
  await saveAll(all);
  return completed;
}

// KPIs לטווח
export async function kpis(from, to) {
  const all = await getAll();
  const inR = all.filter((b) => inRange(b, from, to));
  const completed = inR.filter((b) => b.status === BOOKING_STATUS.COMPLETED);
  const approved = inR.filter((b) => b.status === BOOKING_STATUS.APPROVED);
  const revenue = completed.reduce((sum, b) => sum + calcTotalPrice(b), 0);
  return {
    revenue,
    completedCount: completed.length,
    approvedCount: approved.length,
    totalCount: inR.length,
  };
}
