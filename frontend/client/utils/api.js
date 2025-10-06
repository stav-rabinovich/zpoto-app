import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../consts';

// יצירת instance של axios
const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000, // הגדלת timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// הוספת retry logic
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 שניה

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Interceptor להוספת token אוטומטית
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      console.log('🔍 API Request:', config.method?.toUpperCase(), config.url);
      console.log('🔑 Token exists:', !!token);
      console.log('🔑 Token preview:', token ? `${token.substring(0, 20)}...` : 'none');
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('✅ Authorization header added');
      } else {
        console.log('⚠️ No token found in storage');
      }
    } catch (error) {
      console.warn('❌ Failed to get token from storage:', error);
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Interceptor לטיפול בשגיאות עם retry logic
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.config?.url);
    return response;
  },
  async (error) => {
    console.error('❌ API Error:', error.response?.status || 'Network Error', error.config?.url);
    console.error('❌ Error data:', error.response?.data);
    
    if (error.response?.status === 401) {
      console.error('🔐 Authentication failed - token might be invalid');
    } else if (error.response?.status === 404) {
      console.error('🔍 Resource not found');
    }
    const config = error.config;
    
    // בדיקה אם זו שגיאת רשת שניתן לנסות שוב
    const isNetworkError = !error.response && error.code !== 'ECONNABORTED';
    const isRetryableStatus = error.response?.status >= 500;
    const shouldRetry = (isNetworkError || isRetryableStatus) && config && !config._retry;
    
    if (shouldRetry) {
      config._retry = true;
      config._retryCount = config._retryCount || 0;
      
      if (config._retryCount < MAX_RETRIES) {
        config._retryCount++;
        console.log(`🔄 Retrying request (${config._retryCount}/${MAX_RETRIES}):`, config.url);
        
        await sleep(RETRY_DELAY * config._retryCount);
        return api(config);
      }
    }
    
    // טיפול בשגיאות ספציפיות
    if (error.response?.status === 401) {
      console.warn('🔐 Unauthorized - token may be invalid');
    } else if (isNetworkError) {
      console.error('🌐 Network error:', error.message);
      error.message = 'בעיה בחיבור לשרת. בדוק את החיבור לאינטרנט.';
    } else if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Request timeout');
      error.message = 'הבקשה ארכה יותר מדי. נסה שוב.';
    }
    
    return Promise.reject(error);
  }
);

export default api;
