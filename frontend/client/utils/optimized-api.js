/**
 * API מאופטם עם cache, batching, ו-performance improvements
 * מחליף את כל הקריאות הישירות ל-API
 */

import api from './api';
import memoryCache, { cacheKeys, cacheWithTTL, getCachedApiResponse, cacheApiResponse } from './memory-cache';
import requestQueue from './request-queue';

class OptimizedAPI {
  constructor() {
    this.pendingRequests = new Map(); // למניעת בקשות כפולות
    this.batchQueue = new Map(); // לקיבוץ בקשות
    this.batchTimeout = 100; // 100ms לקיבוץ בקשות
  }

  /**
   * בקשה מאופטמת עם cache
   */
  async request(config, cacheOptions = {}) {
    const { 
      useCache = true, 
      cacheTTL = 5 * 60 * 1000, 
      cacheKey = null,
      skipQueue = false 
    } = cacheOptions;

    // יצירת key לcache
    const key = cacheKey || this.generateCacheKey(config);

    // בדיקת cache קודם
    if (useCache && config.method === 'GET') {
      const cached = getCachedApiResponse(key);
      if (cached) {
        console.log(`⚡ Cache hit: ${config.url}`);
        return { data: cached };
      }
    }

    // מניעת בקשות כפולות
    if (this.pendingRequests.has(key)) {
      console.log(`⏳ Waiting for pending request: ${config.url}`);
      return await this.pendingRequests.get(key);
    }

    // ביצוע הבקשה
    const requestPromise = this.executeRequest(config, skipQueue);
    this.pendingRequests.set(key, requestPromise);

    try {
      const response = await requestPromise;

      // שמירה ב-cache (רק GET requests)
      if (useCache && config.method === 'GET' && response.data) {
        cacheApiResponse(key, response.data, cacheTTL);
      }

      return response;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  /**
   * ביצוע בקשה בפועל
   */
  async executeRequest(config, skipQueue = false) {
    try {
      return await api(config);
    } catch (error) {
      // אם הבקשה נכשלה ולא מדובר בשגיאת validation
      if (!skipQueue && this.shouldQueue(error)) {
        console.log(`📥 Queueing failed request: ${config.url}`);
        
        return new Promise((resolve, reject) => {
          requestQueue.addRequest({
            ...config,
            onSuccess: resolve,
            onError: reject
          });
        });
      }
      
      throw error;
    }
  }

  /**
   * בדיקה אם צריך להוסיף לתור
   */
  shouldQueue(error) {
    // רק שגיאות רשת או שרת, לא validation errors
    return !error.response || error.response.status >= 500;
  }

  /**
   * יצירת cache key
   */
  generateCacheKey(config) {
    const { method, url, params, data } = config;
    const parts = [method, url];
    
    if (params) {
      parts.push(JSON.stringify(params));
    }
    
    if (data && method !== 'GET') {
      parts.push(JSON.stringify(data));
    }
    
    return parts.join('|');
  }

  /**
   * קיבוץ בקשות דומות
   */
  async batchRequest(requests) {
    // TODO: implement batching logic
    // לעת עתה מבצע בקשות רגילות
    return Promise.all(requests.map(req => this.request(req.config, req.cacheOptions)));
  }

  /**
   * בקשות מותאמות לסוגי נתונים שונים
   */

  // פרופיל משתמש - cache ארוך
  async getUserProfile(userId) {
    return this.request(
      { method: 'GET', url: '/api/profile' },
      { 
        cacheKey: cacheKeys.userProfile(userId),
        cacheTTL: 10 * 60 * 1000 // 10 דקות
      }
    );
  }

  // רכבים - cache בינוני
  async getUserVehicles(userId) {
    return this.request(
      { method: 'GET', url: '/api/vehicles' },
      { 
        cacheKey: cacheKeys.userVehicles(userId),
        cacheTTL: 5 * 60 * 1000 // 5 דקות
      }
    );
  }

  // הזמנות - cache קצר
  async getUserBookings(userId) {
    return this.request(
      { method: 'GET', url: '/api/bookings' },
      { 
        cacheKey: cacheKeys.userBookings(userId),
        cacheTTL: 2 * 60 * 1000 // 2 דקות
      }
    );
  }

  // מקומות שמורים - cache ארוך
  async getSavedPlaces(userId) {
    return this.request(
      { method: 'GET', url: '/api/saved-places' },
      { 
        cacheKey: cacheKeys.savedPlaces(userId),
        cacheTTL: 10 * 60 * 1000 // 10 דקות
      }
    );
  }

  // חיפושים אחרונים - cache קצר
  async getRecentSearches(userId) {
    return this.request(
      { method: 'GET', url: '/api/recent-searches' },
      { 
        cacheKey: cacheKeys.recentSearches(userId),
        cacheTTL: 1 * 60 * 1000 // 1 דקה
      }
    );
  }

  // מועדפים - cache בינוני
  async getFavorites(userId) {
    return this.request(
      { method: 'GET', url: '/api/favorites' },
      { 
        cacheKey: cacheKeys.favorites(userId),
        cacheTTL: 5 * 60 * 1000 // 5 דקות
      }
    );
  }

  // אמצעי תשלום - cache ארוך
  async getPaymentMethods(userId) {
    return this.request(
      { method: 'GET', url: '/api/payment-methods' },
      { 
        cacheKey: cacheKeys.paymentMethods(userId),
        cacheTTL: 10 * 60 * 1000 // 10 דקות
      }
    );
  }

  // חיפוש חניות - cache קצר עם מיקום
  async searchParkings(lat, lng, radius = 5, startTime, endTime) {
    const params = { lat, lng, radius };
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;

    return this.request(
      { method: 'GET', url: '/api/parkings/search', params },
      { 
        cacheKey: cacheKeys.parkingSearch(lat, lng, radius),
        cacheTTL: 30 * 1000 // 30 שניות בלבד
      }
    );
  }

  // פרטי חניה - cache בינוני
  async getParkingDetails(parkingId) {
    return this.request(
      { method: 'GET', url: `/api/parkings/${parkingId}` },
      { 
        cacheKey: cacheKeys.parkingDetails(parkingId),
        cacheTTL: 5 * 60 * 1000 // 5 דקות
      }
    );
  }

  /**
   * פעולות שמבטלות cache
   */

  // יצירת הזמנה - מבטל cache של הזמנות
  async createBooking(userId, bookingData) {
    const response = await this.request(
      { method: 'POST', url: '/api/bookings', data: bookingData },
      { useCache: false, skipQueue: true }
    );

    // ביטול cache רלוונטי
    memoryCache.delete(cacheKeys.userBookings(userId));
    
    return response;
  }

  // יצירת רכב - מבטל cache של רכבים
  async createVehicle(userId, vehicleData) {
    const response = await this.request(
      { method: 'POST', url: '/api/vehicles', data: vehicleData },
      { useCache: false, skipQueue: true }
    );

    // ביטול cache רלוונטי
    memoryCache.delete(cacheKeys.userVehicles(userId));
    
    return response;
  }

  // עדכון פרופיל - מבטל cache של פרופיל
  async updateProfile(userId, profileData) {
    const response = await this.request(
      { method: 'PUT', url: '/api/profile', data: profileData },
      { useCache: false, skipQueue: true }
    );

    // ביטול cache רלוונטי
    memoryCache.delete(cacheKeys.userProfile(userId));
    
    return response;
  }

  /**
   * ניקוי cache
   */
  clearCache(pattern = null) {
    if (pattern) {
      const keys = memoryCache.keys().filter(key => key.includes(pattern));
      keys.forEach(key => memoryCache.delete(key));
      return keys.length;
    } else {
      return memoryCache.clear();
    }
  }

  /**
   * בקשת GET פשוטה
   */
  async get(url, options = {}) {
    return this.request({
      method: 'GET',
      url,
      ...options
    });
  }

  /**
   * בקשת POST פשוטה
   */
  async post(url, data, options = {}) {
    return this.request({
      method: 'POST',
      url,
      data,
      ...options
    });
  }

  /**
   * סטטיסטיקות
   */
  getStats() {
    return {
      cache: memoryCache.getStats(),
      pendingRequests: this.pendingRequests.size,
      batchQueue: this.batchQueue.size
    };
  }
}

// יצירת instance יחיד
const optimizedAPI = new OptimizedAPI();

export default optimizedAPI;

/**
 * פונקציות עזר לשימוש קל
 */
export const {
  getUserProfile,
  getUserVehicles,
  getUserBookings,
  getSavedPlaces,
  getRecentSearches,
  getFavorites,
  getPaymentMethods,
  searchParkings,
  getParkingDetails,
  createBooking,
  createVehicle,
  updateProfile,
  clearCache,
  getStats
} = optimizedAPI;
