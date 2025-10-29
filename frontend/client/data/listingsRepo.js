// data/listingsRepo.js - DISABLED
// המערכת עובדת כעת 100% מול השרת

const KEY = 'zp_listings';

function nowTs() { return Date.now(); }

export async function getAll() {
  console.log(' Local listings disabled - returning empty array');
  return [];
}

// שמירה/עדכון חניה - DISABLED
export async function upsert(listing) {
  console.log(' Local listings disabled - not saving');
  return listing; // מחזיר את הנתונים כמו שהם
}

// שינוי סטטוס - DISABLED
export async function setStatus(id, status) {
  console.log('📝 Local listings disabled - not updating status');
  return null;
}

export async function getById(id) {
  console.log('📝 Local listings disabled - returning null');
  return null;
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
