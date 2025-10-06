/**
 * מנגנון ניהול Token עם refresh אוטומטי
 * מחליף את כל מנגנוני הtoken המקומיים
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

class TokenManager {
  constructor() {
    this.token = null;
    this.refreshToken = null;
    this.refreshPromise = null;
    this.refreshTimer = null;
    this.tokenExpiry = null;
    
    // הגדרות
    this.refreshThreshold = 5 * 60 * 1000; // רענון 5 דקות לפני פקיעה
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  /**
   * טעינת tokens מ-AsyncStorage
   */
  async loadTokens() {
    try {
      const [storedToken, storedRefreshToken, storedExpiry] = await Promise.all([
        AsyncStorage.getItem('userToken'),
        AsyncStorage.getItem('refreshToken'),
        AsyncStorage.getItem('tokenExpiry')
      ]);

      if (storedToken) {
        this.token = storedToken;
        this.refreshToken = storedRefreshToken;
        this.tokenExpiry = storedExpiry ? new Date(storedExpiry) : null;

        console.log('✅ Tokens loaded from storage');
        
        // בדיקה אם צריך רענון
        this.scheduleRefresh();
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to load tokens:', error);
      return false;
    }
  }

  /**
   * שמירת tokens ב-AsyncStorage
   */
  async saveTokens(token, refreshToken = null, expiresIn = null) {
    try {
      this.token = token;
      this.refreshToken = refreshToken;
      
      // חישוב זמן פקיעה
      if (expiresIn) {
        this.tokenExpiry = new Date(Date.now() + (expiresIn * 1000));
      }

      const savePromises = [
        AsyncStorage.setItem('userToken', token)
      ];

      if (refreshToken) {
        savePromises.push(AsyncStorage.setItem('refreshToken', refreshToken));
      }

      if (this.tokenExpiry) {
        savePromises.push(AsyncStorage.setItem('tokenExpiry', this.tokenExpiry.toISOString()));
      }

      await Promise.all(savePromises);
      
      console.log('✅ Tokens saved to storage');
      
      // תזמון רענון
      this.scheduleRefresh();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to save tokens:', error);
      return false;
    }
  }

  /**
   * מחיקת tokens
   */
  async clearTokens() {
    try {
      await Promise.all([
        AsyncStorage.removeItem('userToken'),
        AsyncStorage.removeItem('refreshToken'),
        AsyncStorage.removeItem('tokenExpiry')
      ]);

      this.token = null;
      this.refreshToken = null;
      this.tokenExpiry = null;
      
      // ביטול רענון מתוזמן
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }

      console.log('✅ Tokens cleared');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear tokens:', error);
      return false;
    }
  }

  /**
   * קבלת token נוכחי
   */
  getToken() {
    return this.token;
  }

  /**
   * בדיקה אם token תקף
   */
  isTokenValid() {
    if (!this.token) return false;
    
    if (this.tokenExpiry) {
      const now = new Date();
      const timeUntilExpiry = this.tokenExpiry.getTime() - now.getTime();
      
      // אם פג תוקף
      if (timeUntilExpiry <= 0) {
        console.log('⚠️ Token expired');
        return false;
      }
      
      // אם עומד לפוג תוקף בקרוב
      if (timeUntilExpiry <= this.refreshThreshold) {
        console.log('⚠️ Token expiring soon, needs refresh');
        this.refreshTokenIfNeeded();
      }
    }
    
    return true;
  }

  /**
   * תזמון רענון token
   */
  scheduleRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.tokenExpiry || !this.refreshToken) {
      return;
    }

    const now = new Date();
    const timeUntilRefresh = this.tokenExpiry.getTime() - now.getTime() - this.refreshThreshold;

    if (timeUntilRefresh > 0) {
      console.log(`⏰ Token refresh scheduled in ${Math.round(timeUntilRefresh / 1000 / 60)} minutes`);
      
      this.refreshTimer = setTimeout(() => {
        this.refreshTokenIfNeeded();
      }, timeUntilRefresh);
    } else {
      // צריך רענון עכשיו
      this.refreshTokenIfNeeded();
    }
  }

  /**
   * רענון token אם נדרש
   */
  async refreshTokenIfNeeded() {
    if (!this.refreshToken) {
      console.log('⚠️ No refresh token available');
      return false;
    }

    // מניעת רענון כפול
    if (this.refreshPromise) {
      console.log('⏳ Refresh already in progress');
      return await this.refreshPromise;
    }

    console.log('🔄 Starting token refresh...');
    
    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * ביצוע רענון token בפועל
   */
  async performTokenRefresh() {
    let retries = 0;
    
    while (retries < this.maxRetries) {
      try {
        console.log(`🔄 Token refresh attempt ${retries + 1}/${this.maxRetries}`);
        
        const response = await api.post('/api/auth/refresh', {
          refreshToken: this.refreshToken
        });

        const { token, refreshToken, expiresIn } = response.data;
        
        await this.saveTokens(token, refreshToken, expiresIn);
        
        console.log('✅ Token refreshed successfully');
        return true;
        
      } catch (error) {
        retries++;
        console.error(`❌ Token refresh failed (attempt ${retries}):`, error);
        
        // אם זה שגיאת אימות, לא ננסה שוב
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.log('🚪 Refresh token invalid, clearing tokens');
          await this.clearTokens();
          return false;
        }
        
        // המתנה לפני ניסיון הבא
        if (retries < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * retries));
        }
      }
    }
    
    console.error('❌ Token refresh failed after all retries');
    return false;
  }

  /**
   * קבלת token עם רענון אוטומטי
   */
  async getValidToken() {
    if (!this.token) {
      await this.loadTokens();
    }

    if (!this.isTokenValid()) {
      const refreshed = await this.refreshTokenIfNeeded();
      if (!refreshed) {
        return null;
      }
    }

    return this.token;
  }

  /**
   * הוספת interceptor ל-API לרענון אוטומטי
   */
  setupApiInterceptors() {
    // Request interceptor - הוספת token
    api.interceptors.request.use(
      async (config) => {
        const token = await this.getValidToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - טיפול ב-401
    api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          console.log('🔄 401 error, attempting token refresh...');
          
          const refreshed = await this.refreshTokenIfNeeded();
          
          if (refreshed) {
            const newToken = this.getToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          } else {
            // רענון נכשל, ניקוי tokens
            await this.clearTokens();
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * קבלת מידע על token
   */
  getTokenInfo() {
    return {
      hasToken: !!this.token,
      hasRefreshToken: !!this.refreshToken,
      expiry: this.tokenExpiry,
      timeUntilExpiry: this.tokenExpiry 
        ? this.tokenExpiry.getTime() - Date.now() 
        : null,
      needsRefresh: this.tokenExpiry 
        ? (this.tokenExpiry.getTime() - Date.now()) <= this.refreshThreshold
        : false
    };
  }
}

// יצירת instance יחיד
const tokenManager = new TokenManager();

export default tokenManager;

/**
 * פונקציות עזר
 */
export const getValidToken = () => tokenManager.getValidToken();
export const clearTokens = () => tokenManager.clearTokens();
export const getTokenInfo = () => tokenManager.getTokenInfo();
export const setupTokenInterceptors = () => tokenManager.setupApiInterceptors();
