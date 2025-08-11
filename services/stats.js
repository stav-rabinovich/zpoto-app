// services/stats.js
// שכבת הפשטה לסטטיסטיקות. כרגע: חישוב לוקלי מ-AsyncStorage.
// בעת מעבר לשרת: רק נחליף את DATA_SOURCE ל-'remote' ונממש fetch.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DATA_SOURCE, API_BASE } from './config';

const BOOKINGS_KEY = 'bookings';
const LISTINGS_KEY = 'owner_listings';

// ----- Utilities -----
function clampRange(fromISO, toISO) {
  const to = toISO ? new Date(toISO) : new Date();
  const from = fromISO ? new Date(fromISO) : new Date(to.getTime() - 30 * 24 * 3600 * 1000);
  return { from, to };
}
function isInRange(dtISO, from, to) {
  const t = new Date(dtISO).getTime();
  return t >= from.getTime() && t <= to.getTime();
}
function daysBetween(a, b) {
  const ms = Math.abs(b.getTime() - a.getTime());
  return Math.max(1, Math.ceil(ms / (24 * 3600 * 1000)));
}
function dayKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ----- Local provider -----
async function local_getListingStats({ listingId, fromISO, toISO }) {
  const { from, to } = clampRange(fromISO, toISO);
  const raw = await AsyncStorage.getItem(BOOKINGS_KEY);
  const all = raw ? JSON.parse(raw) : [];

  // סנן להזמנות של הליסטינג הזה בטווח
  const items = all.filter(b => b.ownerListingId === listingId && isInRange(b.start, from, to));

  // KPIs
  let totalRevenue = 0;
  let totalHours = 0;
  let totalBookings = 0;

  // סדרות יומיות (count/revenue/hour)
  const daysCount = {};
  const daysRevenue = {};
  const daysHours = {};

  items.forEach(b => {
    totalBookings += 1;
    totalRevenue += (b.total || 0);
    totalHours += (b.hours || 0);
    // חלק לימים לפי start
    const k = dayKey(new Date(b.start));
    daysCount[k] = (daysCount[k] || 0) + 1;
    daysRevenue[k] = (daysRevenue[k] || 0) + (b.total || 0);
    daysHours[k] = (daysHours[k] || 0) + (b.hours || 0);
  });

  // בנה טיימליין של כל הימים בטווח כדי למלא אפסים
  const outDays = [];
  const span = daysBetween(from, to);
  for (let i = 0; i < span; i++) {
    const d = new Date(from.getTime() + i * 24 * 3600 * 1000);
    const k = dayKey(d);
    outDays.push({
      day: k,
      bookings: daysCount[k] || 0,
      revenue: daysRevenue[k] || 0,
      hours: daysHours[k] || 0,
    });
  }

  // הזמנות אחרונות לתצוגה בטבלה
  const recent = items
    .slice()
    .sort((a, b) => new Date(b.start) - new Date(a.start))
    .slice(0, 20);

  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    totalRevenue,
    totalHours,
    totalBookings,
    daily: outDays,
    recent,
  };
}

async function local_getOwnerOverview({ fromISO, toISO }) {
  const { from, to } = clampRange(fromISO, toISO);
  const [rawB, rawL] = await Promise.all([
    AsyncStorage.getItem(BOOKINGS_KEY),
    AsyncStorage.getItem(LISTINGS_KEY),
  ]);
  const bookings = rawB ? JSON.parse(rawB) : [];
  const listings = rawL ? JSON.parse(rawL) : [];

  const perListing = {};
  listings.forEach(l => {
    perListing[l.id] = { listingId: l.id, title: l.title || l.address || 'חניה', revenue: 0, bookings: 0, hours: 0 };
  });

  bookings.forEach(b => {
    if (!b.ownerListingId) return;
    if (!isInRange(b.start, from, to)) return;
    if (!perListing[b.ownerListingId]) {
      perListing[b.ownerListingId] = { listingId: b.ownerListingId, title: 'חניה', revenue: 0, bookings: 0, hours: 0 };
    }
    perListing[b.ownerListingId].revenue += (b.total || 0);
    perListing[b.ownerListingId].bookings += 1;
    perListing[b.ownerListingId].hours += (b.hours || 0);
  });

  const items = Object.values(perListing).sort((a, b) => b.revenue - a.revenue);
  const totals = items.reduce(
    (acc, x) => {
      acc.revenue += x.revenue;
      acc.bookings += x.bookings;
      acc.hours += x.hours;
      return acc;
    },
    { revenue: 0, bookings: 0, hours: 0 }
  );

  return { range: { from: from.toISOString(), to: to.toISOString() }, items, totals };
}

// ----- Remote provider (סקיצה – יופעל כשתחליפו ל-'remote') -----
async function remote_getListingStats({ listingId, fromISO, toISO }) {
  const qs = new URLSearchParams();
  if (fromISO) qs.append('from', fromISO);
  if (toISO) qs.append('to', toISO);
  const res = await fetch(`${API_BASE}/owner/listings/${encodeURIComponent(listingId)}/stats?${qs.toString()}`);
  if (!res.ok) throw new Error('Remote stats failed');
  return res.json();
}
async function remote_getOwnerOverview({ fromISO, toISO }) {
  const qs = new URLSearchParams();
  if (fromISO) qs.append('from', fromISO);
  if (toISO) qs.append('to', toISO);
  const res = await fetch(`${API_BASE}/owner/overview?${qs.toString()}`);
  if (!res.ok) throw new Error('Remote overview failed');
  return res.json();
}

// ----- Public API -----
export async function getListingStats(params) {
  if (DATA_SOURCE === 'remote') return remote_getListingStats(params);
  return local_getListingStats(params);
}
export async function getOwnerOverview(params) {
  if (DATA_SOURCE === 'remote') return remote_getOwnerOverview(params);
  return local_getOwnerOverview(params);
}
