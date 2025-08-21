// data/listingsRepo.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'zp_listings';

function nowTs() { return Date.now(); }

// קרא את כל החניות
export async function getAll() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// שמירה/עדכון חניה
export async function upsert(listing) {
  const arr = await getAll();
  const idx = arr.findIndex(x => x.id === listing.id);
  const normalized = {
    id: listing.id,
    title: listing.title?.trim() || '',
    address: listing.address?.trim() || '',
    pricePerHour: Number(listing.pricePerHour ?? 0),
    approvalMode: listing.approvalMode === 'manual' ? 'manual' : 'auto',
    photos: Array.isArray(listing.photos) ? listing.photos : [],
    latitude: isFinite(listing.latitude) ? Number(listing.latitude) : null,
    longitude: isFinite(listing.longitude) ? Number(listing.longitude) : null,
    // הכי חשוב: ברירת מחדל ACTIVE אם לא הוגדר
    status: listing.status || 'active',
    createdAt: listing.createdAt || nowTs(),
    updatedAt: nowTs(),
  };
  if (idx >= 0) arr[idx] = { ...arr[idx], ...normalized };
  else arr.push(normalized);
  await AsyncStorage.setItem(KEY, JSON.stringify(arr));
  return normalized;
}

// שינוי סטטוס (הפעל/השהה)
export async function setStatus(id, status) {
  const arr = await getAll();
  const idx = arr.findIndex(x => x.id === id);
  if (idx < 0) return null;
  arr[idx].status = status;
  arr[idx].updatedAt = nowTs();
  await AsyncStorage.setItem(KEY, JSON.stringify(arr));
  return arr[idx];
}

export async function getById(id) {
  const arr = await getAll();
  return arr.find(x => x.id === id) || null;
}

// עזר לחיפוש: מסנן לפי מילת חיפוש/מרחק
export function filterListings(list, { keyword = '', center = null, radiusKm = null } = {}) {
  const kw = (keyword || '').trim().toLowerCase();
  const hasCenter = center && isFinite(center.latitude) && isFinite(center.longitude) && isFinite(radiusKm);
  const results = (list || [])
    .filter(l => (l.status ?? 'active') === 'active')
    .filter(l => {
      if (!kw) return true;
      const hay = `${l.title || ''} ${l.address || ''}`.toLowerCase();
      return hay.includes(kw);
    })
    .filter(l => {
      if (!hasCenter) return true; // בלי כתובת/רדיוס – לא מסננים לפי מרחק
      if (l.latitude == null || l.longitude == null) return false;
      const d = distanceKm(center.latitude, center.longitude, l.latitude, l.longitude);
      return d <= radiusKm;
    });
  return results;
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat/2)**2 +
    Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
