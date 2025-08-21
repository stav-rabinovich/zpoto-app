// utils/osm.js
// עטיפה ל-Nominatim (OpenStreetMap) עם:
// 1) Throttle + Queue כדי לא לעבור Rate Limit (קריאה אחת ~כל 1100ms)
// 2) Cache בזיכרון (TTL משתנה לפונקציה) כדי להפחית פניות חוזרות
// 3) שמירה על אותה חתימת פונקציות קיימת: osmAutocomplete, searchAddress, osmLookup, osmReverse

const BASE = 'https://nominatim.openstreetmap.org';

// ========= Throttle Queue =========
const MIN_INTERVAL_MS = 1100; // בטוח מול Nominatim
let _lastStart = 0;
const _q = [];

/**
 * תור מבוקר: כל בקשה יוצאת בהפרש מינימלי מהקודמת.
 * מחזיר Promise של fetch(url, options).then(res => res.json())
 */
function enqueueJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    _q.push({ url, options, resolve, reject });
    if (_q.length === 1) {
      // אם זה הפריט היחיד בתור – התחל לשרת
      _drain();
    }
  });
}

async function _drain() {
  if (_q.length === 0) return;

  const now = Date.now();
  const wait = Math.max(0, MIN_INTERVAL_MS - (now - _lastStart));
  if (wait > 0) {
    setTimeout(_serveNext, wait);
  } else {
    _serveNext();
  }
}

async function _serveNext() {
  if (_q.length === 0) return;
  const { url, options, resolve, reject } = _q.shift();
  _lastStart = Date.now();
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': 'ZpotoApp/1.0 (demo)',
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      resolve(null);
    } else {
      const json = await res.json();
      resolve(json);
    }
  } catch (e) {
    resolve(null);
  } finally {
    // המשך לפריט הבא אחרי ההפרש המינימלי
    if (_q.length > 0) _drain();
  }
}

// ========= Cache (LRU פשוט) =========
class SimpleLRU {
  constructor(max = 200) {
    this.max = max;
    this.map = new Map(); // key -> { value, exp }
  }
  _touch(key, entry) {
    this.map.delete(key);
    this.map.set(key, entry);
  }
  get(key) {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (e.exp && Date.now() > e.exp) {
      this.map.delete(key);
      return undefined;
    }
    // הפוך ל-MRU
    this._touch(key, e);
    return e.value;
  }
  set(key, value, ttlMs = 0) {
    if (this.map.size >= this.max) {
      // מחיקה של ה-LRU הראשון במפה
      const firstKey = this.map.keys().next().value;
      this.map.delete(firstKey);
    }
    const exp = ttlMs > 0 ? Date.now() + ttlMs : 0;
    this.map.set(key, { value, exp });
  }
}

const cache = new SimpleLRU(250);

// Utils
function bboxAround({ latitude, longitude }, km = 10) {
  const d = km / 111; // 1° ≈ 111km
  const left = longitude - d;
  const right = longitude + d;
  const top = latitude + d;
  const bottom = latitude - d;
  return { left, right, top, bottom };
}

function cacheKey(fn, params) {
  return `${fn}:${JSON.stringify(params)}`;
}

function num(n) {
  const v = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(v) ? v : undefined;
}

// ========= Public API =========

// 🔍 השלמה/חיפוש קל
export async function osmAutocomplete(input, { aroundLocation = null, limit = 6, language = 'he' } = {}) {
  if (!input || input.trim().length < 2) return [];
  const params = new URLSearchParams({
    q: input.trim(),
    format: 'jsonv2',
    addressdetails: '1',
    'accept-language': language,
    limit: String(limit),
  });

  if (aroundLocation?.latitude && aroundLocation?.longitude) {
    const bb = bboxAround(aroundLocation, 8);
    params.append('viewbox', `${bb.left},${bb.top},${bb.right},${bb.bottom}`);
    params.append('bounded', '1');
  }

  const url = `${BASE}/search?${params.toString()}`;
  const key = cacheKey('autocomplete', { url });

  const cached = cache.get(key);
  if (cached) return cached;

  const arr = await enqueueJson(url);
  if (!Array.isArray(arr)) return [];

  const out = arr.map((r) => {
    const osmTypeLetter = r.osm_type?.[0]?.toUpperCase() || 'N';
    const id = `${osmTypeLetter}-${r.osm_id}`;
    return {
      id,
      placeId: id,
      description: r.display_name,
      lat: num(r.lat),
      lon: num(r.lon),
      osmType: r.osm_type,
      osmId: r.osm_id,
    };
  });

  // TTL קצר (5 דקות) – אוטוקומפליט
  cache.set(key, out, 5 * 60 * 1000);
  return out;
}

// 📌 Forward Geocoding פשוט
export async function searchAddress(query, language = 'he', limit = 5) {
  if (!query || query.trim().length < 2) return [];
  const params = new URLSearchParams({
    q: query.trim(),
    format: 'jsonv2',
    addressdetails: '1',
    'accept-language': language,
    limit: String(limit),
  });

  const url = `${BASE}/search?${params.toString()}`;
  const key = cacheKey('search', { url });

  const cached = cache.get(key);
  if (cached) return cached;

  const data = await enqueueJson(url);
  if (!Array.isArray(data)) return [];

  const out = data.map((item) => ({
    name: item.display_name,
    latitude: num(item.lat),
    longitude: num(item.lon),
  }));

  // TTL בינוני (30 דקות)
  cache.set(key, out, 30 * 60 * 1000);
  return out;
}

// 🧭 Lookup לפי OSM ids (יציב – TTL ארוך)
export async function osmLookup(placeId, language = 'he') {
  if (!placeId) return null;
  const [prefix, idStr] = String(placeId).split('-');
  const map = { N: 'N', W: 'W', R: 'R' };
  const osm_ids = `${map[prefix] || 'N'}${idStr}`;

  const params = new URLSearchParams({
    osm_ids,
    format: 'jsonv2',
    'accept-language': language,
    addressdetails: '1',
  });

  const url = `${BASE}/lookup?${params.toString()}`;
  const key = cacheKey('lookup', { url });

  const cached = cache.get(key);
  if (cached) return cached;

  const arr = await enqueueJson(url);
  const r = Array.isArray(arr) ? arr[0] : null;
  if (!r) return null;

  const out = {
    placeId,
    name: r.name || '',
    address: r.display_name || '',
    latitude: num(r.lat),
    longitude: num(r.lon),
  };

  // TTL ארוך (7 ימים) – נתון יציב
  cache.set(key, out, 7 * 24 * 60 * 60 * 1000);
  return out;
}

// 🔄 Reverse Geocoding (TTL בינוני)
export async function osmReverse(latitude, longitude, language = 'he') {
  const lat = num(latitude);
  const lon = num(longitude);
  if (lat === undefined || lon === undefined) return null;

  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: 'jsonv2',
    'accept-language': language,
    addressdetails: '1',
  });

  const url = `${BASE}/reverse?${params.toString()}`;
  const key = cacheKey('reverse', { url });

  const cached = cache.get(key);
  if (cached) return cached;

  const r = await enqueueJson(url);
  if (!r || typeof r !== 'object') return null;

  const out = {
    name: r.name || '',
    address: r.display_name || '',
    latitude: lat,
    longitude: lon,
  };

  // TTL 6 שעות – מספיק עדכני ל-Reverse
  cache.set(key, out, 6 * 60 * 60 * 1000);
  return out;
}
