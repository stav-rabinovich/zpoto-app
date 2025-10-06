/**
 * מנגנון Cache בזיכרון בלבד - לא persistent!
 * מחליף את כל מנגנוני ה-cache המקומיים
 */

class MemoryCache {
  constructor() {
    this.cache = new Map(); // רק בזיכרון!
    this.maxSize = 100; // מקסימום 100 entries
    this.defaultTTL = 5 * 60 * 1000; // 5 דקות ברירת מחדל
    this.cleanupInterval = 60 * 1000; // ניקוי כל דקה
    
    // התחלת ניקוי תקופתי
    this.startCleanup();
  }

  /**
   * שמירת נתונים ב-cache
   */
  set(key, value, ttl = this.defaultTTL) {
    // בדיקת גודל cache
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const entry = {
      value,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccess: Date.now()
    };

    this.cache.set(key, entry);
    console.log(`💾 Cached: ${key} (TTL: ${ttl}ms)`);
    
    return true;
  }

  /**
   * קבלת נתונים מ-cache
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // בדיקת תוקף
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      console.log(`🗑️ Cache expired: ${key}`);
      return null;
    }

    // עדכון סטטיסטיקות גישה
    entry.accessCount++;
    entry.lastAccess = Date.now();

    console.log(`✅ Cache hit: ${key}`);
    return entry.value;
  }

  /**
   * בדיקה אם נתונים קיימים ב-cache
   */
  has(key) {
    const entry = this.cache.get(key);
    return entry && !this.isExpired(entry);
  }

  /**
   * מחיקת נתונים מ-cache
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`🗑️ Cache deleted: ${key}`);
    }
    return deleted;
  }

  /**
   * ניקוי cache מלא
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🧹 Cache cleared: ${size} entries`);
    return size;
  }

  /**
   * בדיקה אם entry פג תוקף
   */
  isExpired(entry) {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * הסרת הentry הישן ביותר
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️ Cache evicted (oldest): ${oldestKey}`);
    }
  }

  /**
   * ניקוי entries שפגו תוקף
   */
  cleanup() {
    const before = this.cache.size;
    const expired = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        expired.push(key);
      }
    }

    expired.forEach(key => this.cache.delete(key));
    
    if (expired.length > 0) {
      console.log(`🧹 Cache cleanup: removed ${expired.length} expired entries`);
    }

    return expired.length;
  }

  /**
   * התחלת ניקוי תקופתי
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * עצירת ניקוי תקופתי
   */
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * קבלת סטטיסטיקות cache
   */
  getStats() {
    const entries = Array.from(this.cache.values());
    const now = Date.now();
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalAccess: entries.reduce((sum, entry) => sum + entry.accessCount, 0),
      averageAge: entries.length > 0 
        ? entries.reduce((sum, entry) => sum + (now - entry.timestamp), 0) / entries.length 
        : 0,
      expired: entries.filter(entry => this.isExpired(entry)).length
    };
  }

  /**
   * קבלת רשימת keys
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * קבלת גודל cache
   */
  size() {
    return this.cache.size;
  }
}

// יצירת instance יחיד (singleton)
const memoryCache = new MemoryCache();

export default memoryCache;

/**
 * פונקציות עזר לשימוש קל
 */

/**
 * Cache עם TTL מותאם לסוג הנתונים
 */
export const cacheWithTTL = {
  // נתונים שמשתנים לעיתים רחוקות - 10 דקות
  static: (key, value) => memoryCache.set(key, value, 10 * 60 * 1000),
  
  // נתונים שמשתנים לעיתים קרובות - 2 דקות
  dynamic: (key, value) => memoryCache.set(key, value, 2 * 60 * 1000),
  
  // נתונים זמניים - 30 שניות
  temporary: (key, value) => memoryCache.set(key, value, 30 * 1000),
  
  // נתונים של משתמש - 5 דקות
  user: (key, value) => memoryCache.set(key, value, 5 * 60 * 1000),
};

/**
 * יצירת key מובנה לcache
 */
export const createCacheKey = (prefix, ...parts) => {
  return `${prefix}:${parts.join(':')}`;
};

/**
 * Cache לפי סוג נתונים
 */
export const cacheKeys = {
  // פרופיל משתמש
  userProfile: (userId) => createCacheKey('user_profile', userId),
  
  // רכבים של משתמש
  userVehicles: (userId) => createCacheKey('user_vehicles', userId),
  
  // הזמנות של משתמש
  userBookings: (userId) => createCacheKey('user_bookings', userId),
  
  // מקומות שמורים
  savedPlaces: (userId) => createCacheKey('saved_places', userId),
  
  // חיפושים אחרונים
  recentSearches: (userId) => createCacheKey('recent_searches', userId),
  
  // מועדפים
  favorites: (userId) => createCacheKey('favorites', userId),
  
  // אמצעי תשלום
  paymentMethods: (userId) => createCacheKey('payment_methods', userId),
  
  // תוצאות חיפוש חניות
  parkingSearch: (lat, lng, radius) => createCacheKey('parking_search', lat, lng, radius),
  
  // פרטי חניה
  parkingDetails: (parkingId) => createCacheKey('parking_details', parkingId),
  
  // סטטיסטיקות
  userStats: (userId) => createCacheKey('user_stats', userId),
};

/**
 * פונקציות עזר לשימוש נפוץ
 */

// שמירת תוצאות API ב-cache
export const cacheApiResponse = (key, data, ttl) => {
  return memoryCache.set(key, data, ttl);
};

// קבלת תוצאות API מ-cache
export const getCachedApiResponse = (key) => {
  return memoryCache.get(key);
};

// מחיקת cache של משתמש ספציפי
export const clearUserCache = (userId) => {
  const userKeys = memoryCache.keys().filter(key => key.includes(userId));
  userKeys.forEach(key => memoryCache.delete(key));
  return userKeys.length;
};

// קבלת סטטיסטיקות cache
export const getCacheStats = () => {
  return memoryCache.getStats();
};
