/**
 * API Client חדש - Server-Only Architecture
 * משתמש בtoken manager עם refresh אוטומטי
 * אין שמירה מקומית של נתונים כלל
 */

import axios from 'axios';
import tokenManager from './token-manager';
import { API_BASE } from '../consts';

// יצירת instance של axios
const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// הגדרת interceptors של token manager
tokenManager.setupApiInterceptors();

// Interceptor נוסף לlogger
api.interceptors.request.use(
  (config) => {
    console.log('🔍 API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.config?.url);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error.response?.status || 'Network Error', error.config?.url);
    
    // הוספת הודעות שגיאה ידידותיות
    if (!error.response && error.code !== 'ECONNABORTED') {
      error.message = 'בעיה בחיבור לשרת. בדוק את החיבור לאינטרנט.';
    } else if (error.code === 'ECONNABORTED') {
      error.message = 'הבקשה ארכה יותר מדי. נסה שוב.';
    } else if (error.response?.status === 404) {
      error.message = 'המידע המבוקש לא נמצא.';
    } else if (error.response?.status >= 500) {
      error.message = 'שגיאה בשרת. נסה שוב בעוד מספר דקות.';
    }
    
    return Promise.reject(error);
  }
);

/**
 * פונקציות API ספציפיות - כולן מהשרת בלבד
 */

// אימות
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    
    // שמירת tokens
    const { token, refreshToken, expiresIn } = response.data;
    await tokenManager.saveTokens(token, refreshToken, expiresIn);
    
    return response;
  },

  register: async (email, password, name = null) => {
    const response = await api.post('/api/auth/register', { email, password, name });
    
    // שמירת tokens
    const { token, refreshToken, expiresIn } = response.data;
    await tokenManager.saveTokens(token, refreshToken, expiresIn);
    
    return response;
  },

  logout: async () => {
    try {
      // ניסיון להודיע לשרת על התנתקות
      await api.post('/api/auth/logout');
    } catch (error) {
      console.warn('Failed to notify server about logout:', error);
    } finally {
      // ניקוי tokens מקומיים
      await tokenManager.clearTokens();
    }
  },

  getProfile: async () => {
    return await api.get('/api/auth/me');
  },

  refreshToken: async () => {
    return await tokenManager.refreshTokenIfNeeded();
  }
};

// פרופיל משתמש
export const profileAPI = {
  get: async () => {
    return await api.get('/api/profile');
  },

  update: async (data) => {
    return await api.put('/api/profile', data);
  },

  updatePassword: async (currentPassword, newPassword) => {
    return await api.put('/api/profile/password', {
      currentPassword,
      newPassword
    });
  },

  delete: async () => {
    const response = await api.delete('/api/profile');
    await tokenManager.clearTokens();
    return response;
  },

  getStats: async () => {
    return await api.get('/api/profile/stats');
  }
};

// רכבים
export const vehiclesAPI = {
  list: async () => {
    return await api.get('/api/vehicles');
  },

  create: async (vehicleData) => {
    return await api.post('/api/vehicles', vehicleData);
  },

  update: async (id, vehicleData) => {
    return await api.put(`/api/vehicles/${id}`, vehicleData);
  },

  delete: async (id) => {
    return await api.delete(`/api/vehicles/${id}`);
  },

  setDefault: async (id) => {
    return await api.patch(`/api/vehicles/${id}/default`);
  }
};

// הזמנות
export const bookingsAPI = {
  list: async () => {
    return await api.get('/api/bookings');
  },

  create: async (bookingData) => {
    return await api.post('/api/bookings', bookingData);
  },

  get: async (id) => {
    return await api.get(`/api/bookings/${id}`);
  },

  cancel: async (id) => {
    return await api.patch(`/api/bookings/${id}/cancel`);
  }
};

// מקומות שמורים
export const savedPlacesAPI = {
  list: async () => {
    return await api.get('/api/saved-places');
  },

  create: async (placeData) => {
    return await api.post('/api/saved-places', placeData);
  },

  update: async (id, placeData) => {
    return await api.put(`/api/saved-places/${id}`, placeData);
  },

  delete: async (id) => {
    return await api.delete(`/api/saved-places/${id}`);
  }
};

// חיפושים אחרונים
export const recentSearchesAPI = {
  list: async (limit = 10) => {
    return await api.get(`/api/recent-searches?limit=${limit}`);
  },

  add: async (query, lat = null, lng = null) => {
    return await api.post('/api/recent-searches', { query, lat, lng });
  },

  delete: async (id) => {
    return await api.delete(`/api/recent-searches/${id}`);
  },

  clear: async () => {
    return await api.delete('/api/recent-searches');
  }
};

// מועדפים
export const favoritesAPI = {
  list: async () => {
    return await api.get('/api/favorites');
  },

  add: async (parkingId) => {
    return await api.post('/api/favorites', { parkingId });
  },

  remove: async (parkingId) => {
    return await api.delete(`/api/favorites/${parkingId}`);
  },

  check: async (parkingId) => {
    return await api.get(`/api/favorites/check/${parkingId}`);
  },

  clear: async () => {
    return await api.delete('/api/favorites');
  }
};

// אמצעי תשלום
export const paymentMethodsAPI = {
  list: async () => {
    return await api.get('/api/payment-methods');
  },

  create: async (methodData) => {
    return await api.post('/api/payment-methods', methodData);
  },

  update: async (id, methodData) => {
    return await api.put(`/api/payment-methods/${id}`, methodData);
  },

  delete: async (id) => {
    return await api.delete(`/api/payment-methods/${id}`);
  },

  setDefault: async (id) => {
    return await api.patch(`/api/payment-methods/${id}/default`);
  }
};

// חניות
export const parkingsAPI = {
  search: async (lat, lng, radius = 5, startTime = null, endTime = null) => {
    const params = { lat, lng, radius };
    if (startTime) params.startTime = startTime;
    if (endTime) params.endTime = endTime;
    
    return await api.get('/api/parkings/search', { params });
  },

  list: async () => {
    return await api.get('/api/parkings');
  },

  get: async (id) => {
    return await api.get(`/api/parkings/${id}`);
  }
};

// בעלי חניות
export const ownerAPI = {
  listingRequests: {
    create: async (requestData) => {
      return await api.post('/api/owner/listing-requests', requestData);
    },

    list: async () => {
      return await api.get('/api/owner/listing-requests');
    },

    get: async (id) => {
      return await api.get(`/api/owner/listing-requests/${id}`);
    }
  },

  parkings: {
    list: async () => {
      return await api.get('/api/owner/parkings');
    },

    get: async (id) => {
      return await api.get(`/api/owner/parkings/${id}`);
    },

    update: async (id, data) => {
      return await api.patch(`/api/owner/parkings/${id}`, data);
    }
  },

  bookings: {
    list: async () => {
      return await api.get('/api/owner/bookings');
    },

    updateStatus: async (id, status) => {
      return await api.patch(`/api/owner/bookings/${id}/status`, { status });
    }
  },

  stats: {
    get: async (parkingId) => {
      return await api.get(`/api/owner/stats/${parkingId}`);
    }
  }
};

// פונקציות עזר
export const apiUtils = {
  // בדיקת חיבור לשרת
  healthCheck: async () => {
    return await api.get('/health');
  },

  // קבלת מידע על token
  getTokenInfo: () => {
    return tokenManager.getTokenInfo();
  },

  // אתחול token manager
  initializeTokens: async () => {
    return await tokenManager.loadTokens();
  },

  // ניקוי כל הtokens
  clearAllTokens: async () => {
    return await tokenManager.clearTokens();
  }
};

export default api;
