import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Device ID Manager
 * מנהל מזהה ייחודי לכל מכשיר לשימוש ב-Anonymous Sessions
 */

const DEVICE_ID_KEY = 'zpoto_device_id';

/**
 * יוצר Device ID ייחודי
 * @returns {string} Device ID חדש
 */
const generateDeviceId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  const platform = Platform.OS.substring(0, 3);
  
  return `${platform}_${timestamp}_${random}`;
};

/**
 * מחזיר את ה-Device ID הקיים או יוצר חדש
 * @returns {Promise<string>} Device ID קבוע למכשיר
 */
export const getDeviceId = async () => {
  try {
    // בודק אם יש Device ID שמור
    let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    
    if (!deviceId) {
      // יוצר Device ID חדש אם לא קיים
      deviceId = generateDeviceId();
      await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
      console.log('📱 Device ID נוצר:', deviceId);
    } else {
      console.log('📱 Device ID נטען:', deviceId);
    }
    
    return deviceId;
  } catch (error) {
    console.error('❌ שגיאה בטעינת Device ID:', error);
    
    // fallback - יוצר ID זמני בזיכרון
    const fallbackId = generateDeviceId();
    console.warn('⚠️ משתמש ב-Device ID זמני:', fallbackId);
    return fallbackId;
  }
};

/**
 * מאפס את ה-Device ID (לבדיקות בלבד)
 * @returns {Promise<void>}
 */
export const resetDeviceId = async () => {
  try {
    await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
    console.log('🔄 Device ID אופס');
  } catch (error) {
    console.error('❌ שגיאה באיפוס Device ID:', error);
  }
};

/**
 * בודק אם יש Device ID שמור
 * @returns {Promise<boolean>}
 */
export const hasDeviceId = async () => {
  try {
    const deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    return !!deviceId;
  } catch (error) {
    console.error('❌ שגיאה בבדיקת Device ID:', error);
    return false;
  }
};

/**
 * מחזיר מידע על ה-Device ID (לדיבוג)
 * @returns {Promise<object>}
 */
export const getDeviceIdInfo = async () => {
  try {
    const deviceId = await getDeviceId();
    const parts = deviceId.split('_');
    
    return {
      deviceId,
      platform: parts[0],
      timestamp: parts[1] ? parseInt(parts[1], 36) : null,
      created: parts[1] ? new Date(parseInt(parts[1], 36)) : null,
      isValid: parts.length === 3
    };
  } catch (error) {
    console.error('❌ שגיאה בקבלת מידע על Device ID:', error);
    return null;
  }
};

export default {
  getDeviceId,
  resetDeviceId,
  hasDeviceId,
  getDeviceIdInfo
};
