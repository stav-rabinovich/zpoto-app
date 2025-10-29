/**
 * שירותי API להארכות חניה
 */

import api from '../../utils/api';
import { convertFromUTC, formatForDisplay } from '../../utils/timezone';

/**
 * בדיקת זכאות להארכה של 30 דקות
 * @param {number} bookingId - מזהה ההזמנה
 * @returns {Promise<Object>} תוצאת הבדיקה
 */
export const checkExtensionEligibility = async (bookingId) => {
  try {
    console.log(`🔍 Checking extension eligibility for booking #${bookingId}`);
    
    const response = await api.get(`/api/extensions/check/${bookingId}`);
    
    console.log(`✅ Extension check result:`, response.data);
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Extension check failed:', error);
    
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Extension check failed'
    };
  }
};

/**
 * ביצוע הארכה (אחרי תשלום מוצלח)
 * @param {number} bookingId - מזהה ההזמנה
 * @param {string} paymentId - מזהה התשלום
 * @returns {Promise<Object>} תוצאת ההארכה
 */
export const executeExtension = async (bookingId, paymentId) => {
  try {
    console.log(`💰 Executing extension for booking #${bookingId} with payment #${paymentId}`);
    
    const response = await api.post('/api/extensions/execute', {
      bookingId,
      paymentId
    });
    
    console.log(`✅ Extension executed successfully:`, response.data);
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Extension execution failed:', error);
    
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Extension execution failed'
    };
  }
};

/**
 * קבלת היסטוריית הארכות
 * @param {number} bookingId - מזהה ההזמנה
 * @returns {Promise<Object>} היסטוריית הארכות
 */
export const getExtensionHistory = async (bookingId) => {
  try {
    const response = await api.get(`/api/extensions/history/${bookingId}`);
    
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('❌ Extension history failed:', error);
    
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to get extension history'
    };
  }
};

/**
 * פורמט מחיר הארכה
 * @param {number} priceCents - מחיר באגורות
 * @returns {string} מחיר מפורמט
 */
export const formatExtensionPrice = (priceCents) => {
  if (!priceCents || priceCents === 0) return '₪0';
  
  const price = priceCents / 100;
  return `₪${price.toFixed(price % 1 === 0 ? 0 : 2)}`;
};

/**
 * פורמט זמן הארכה חדש
 * @param {string} newEndTime - זמן סיום חדש (UTC מהשרת)
 * @returns {string} זמן מפורמט בזמן ישראל
 */
export const formatNewEndTime = (newEndTime) => {
  if (!newEndTime) return '';
  
  try {
    // השרת שולח זמן ב-UTC, נמיר לזמן ישראל
    const israelTime = convertFromUTC(newEndTime);
    return formatForDisplay(israelTime, 'time');
  } catch (error) {
    console.error('❌ Error formatting new end time:', error);
    // fallback לפורמט הישן
    const date = new Date(newEndTime);
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
};

/**
 * בדיקה אם ההזמנה זכאית להארכה (בדיקה מקומית)
 * @param {Object} booking - אובייקט ההזמנה
 * @returns {boolean} האם זכאית להארכה
 */
export const isEligibleForExtension = (booking) => {
  if (!booking) return false;
  
  // רק הזמנות מאושרות וזמנות
  if (booking.status !== 'CONFIRMED') return false;
  
  const now = new Date();
  const startTime = new Date(booking.startTime);
  const endTime = new Date(booking.endTime);
  
  // ההזמנה צריכה להיות פעילה כרגע או עתידית
  const isActive = startTime <= now && endTime > now;
  const isUpcoming = startTime > now;
  
  if (isActive) {
    // לחניות פעילות - צריך להישאר לפחות 10 דקות
    const timeLeft = endTime.getTime() - now.getTime();
    const minutesLeft = timeLeft / (1000 * 60);
    return minutesLeft >= 10;
  } else if (isUpcoming) {
    // לחניות עתידיות - תמיד ניתן להאריך
    return true;
  }
  
  // חניות שעברו - לא ניתן להאריך
  return false;
};
