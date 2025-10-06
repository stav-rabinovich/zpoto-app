/**
 * API פשוט ללא dependencies מורכבים
 */

import api from './api';

class SimpleOptimizedAPI {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 דקות
  }

  /**
   * בקשת GET פשוטה עם cache בסיסי
   */
  async get(url, options = {}) {
    const { useCache = true, forceRefresh = false } = options;
    
    // בדיקת cache
    if (useCache && !forceRefresh) {
      const cached = this.cache.get(url);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('📦 Cache hit:', url);
        return cached.data;
      }
    }

    try {
      const response = await api.get(url);
      
      // שמירה בcache
      if (useCache) {
        this.cache.set(url, {
          data: response,
          timestamp: Date.now()
        });
      }
      
      return response;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  /**
   * בקשת POST פשוטה
   */
  async post(url, data, options = {}) {
    try {
      const response = await api.post(url, data);
      
      // ניקוי cache רלוונטי
      this.clearCacheByPattern(url);
      
      return response;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  /**
   * בקשה כללית
   */
  async request(config) {
    const { method = 'GET', url, data, ...options } = config;
    
    if (method.toLowerCase() === 'get') {
      return this.get(url, options);
    } else {
      return api.request(config);
    }
  }

  /**
   * פונקציות מיוחדות לנתונים
   */
  async getUserProfile(userId, options = {}) {
    const url = userId ? `/api/users/${userId}` : '/api/auth/me';
    return this.get(url, options);
  }

  async getUserVehicles(userId, options = {}) {
    const url = '/api/vehicles';
    return this.get(url, options);
  }

  async getUserBookings(userId, options = {}) {
    const url = '/api/bookings';
    return this.get(url, options);
  }

  async getUserStats(userId, options = {}) {
    const url = '/api/users/stats';
    return this.get(url, options);
  }

  /**
   * ניקוי cache
   */
  clearCache(pattern = null) {
    if (pattern) {
      this.clearCacheByPattern(pattern);
    } else {
      this.cache.clear();
    }
  }

  clearCacheByPattern(pattern) {
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * סטטיסטיקות
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      cacheKeys: Array.from(this.cache.keys())
    };
  }
}

// יצירת instance יחיד
const optimizedAPI = new SimpleOptimizedAPI();

export default optimizedAPI;
