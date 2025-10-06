import api from '../../utils/api';

/**
 * שירותי API לפרופיל משתמש
 */

/**
 * קבלת פרופיל המשתמש המחובר
 * @returns {Promise} פרטי המשתמש
 */
export const getUserProfile = async () => {
  try {
    const response = await api.get('/api/profile');
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בטעינת הפרופיל',
      data: null
    };
  }
};

/**
 * עדכון פרופיל המשתמש
 * @param {Object} profileData - נתוני הפרופיל החדשים
 * @param {string} profileData.name - שם המשתמש
 * @param {string} profileData.phone - מספר טלפון
 * @returns {Promise} תוצאת העדכון
 */
export const updateUserProfile = async (profileData) => {
  try {
    const response = await api.put('/api/profile', profileData);
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('Failed to update user profile:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בעדכון הפרופיל',
      data: null
    };
  }
};

/**
 * שינוי סיסמה
 * @param {Object} passwordData - נתוני הסיסמה
 * @param {string} passwordData.currentPassword - הסיסמה הנוכחית
 * @param {string} passwordData.newPassword - הסיסמה החדשה
 * @returns {Promise} תוצאת שינוי הסיסמה
 */
export const changePassword = async (passwordData) => {
  try {
    const response = await api.put('/api/profile/password', passwordData);
    return {
      success: true,
      message: response.data.message || 'הסיסמה שונתה בהצלחה'
    };
  } catch (error) {
    console.error('Failed to change password:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בשינוי הסיסמה'
    };
  }
};

/**
 * מחיקת חשבון המשתמש
 * @param {string} password - סיסמת המשתמש לאימות
 * @returns {Promise} תוצאת מחיקת החשבון
 */
export const deleteUserAccount = async (password) => {
  try {
    const response = await api.delete('/api/profile', { data: { password } });
    return {
      success: true,
      message: response.data.message || 'החשבון נמחק בהצלחה'
    };
  } catch (error) {
    console.error('Failed to delete user account:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה במחיקת החשבון'
    };
  }
};

/**
 * קבלת סטטיסטיקות המשתמש
 * @returns {Promise} סטטיסטיקות המשתמש
 */
export const getUserStats = async () => {
  try {
    const response = await api.get('/api/profile/stats');
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('Failed to fetch user stats:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בטעינת הסטטיסטיקות',
      data: null
    };
  }
};

/**
 * פונקציות עזר לפרופיל
 */

/**
 * ולידציה של מספר טלפון ישראלי
 * @param {string} phone - מספר טלפון
 * @returns {boolean} האם המספר תקין
 */
export const validatePhoneNumber = (phone) => {
  if (!phone) return true; // אופציונלי
  
  // הסרת רווחים ומקפים
  const cleaned = phone.replace(/[\s-]/g, '');
  
  // פורמטים ישראליים נפוצים
  const patterns = [
    /^0[5-9]\d{8}$/, // 05X-XXXXXXX
    /^\+972[5-9]\d{8}$/, // +972-5X-XXXXXXX
    /^972[5-9]\d{8}$/, // 972-5X-XXXXXXX
  ];
  
  return patterns.some(pattern => pattern.test(cleaned));
};

/**
 * פורמט מספר טלפון להצגה
 * @param {string} phone - מספר טלפון
 * @returns {string} מספר טלפון מפורמט
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  // הסרת רווחים ומקפים
  const cleaned = phone.replace(/[\s-]/g, '');
  
  // פורמט ישראלי: 050-123-4567
  if (/^0[5-9]\d{8}$/.test(cleaned)) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  }
  
  return phone; // החזרת המקור אם לא מתאים לפורמט
};

/**
 * ולידציה של שם משתמש
 * @param {string} name - שם המשתמש
 * @returns {Object} תוצאת הולידציה
 */
export const validateName = (name) => {
  if (!name) {
    return { isValid: true, error: null }; // אופציונלי
  }
  
  if (name.length < 2) {
    return { isValid: false, error: 'השם חייב להכיל לפחות 2 תווים' };
  }
  
  if (name.length > 50) {
    return { isValid: false, error: 'השם לא יכול להכיל יותר מ-50 תווים' };
  }
  
  // בדיקת תווים מותרים (עברית, אנגלית, רווחים)
  if (!/^[\u0590-\u05FFa-zA-Z\s]+$/.test(name)) {
    return { isValid: false, error: 'השם יכול להכיל רק אותיות עבריות, אנגליות ורווחים' };
  }
  
  return { isValid: true, error: null };
};

/**
 * ולידציה של סיסמה
 * @param {string} password - הסיסמה
 * @returns {Object} תוצאת הולידציה
 */
export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, error: 'סיסמה נדרשת' };
  }
  
  if (password.length < 6) {
    return { isValid: false, error: 'הסיסמה חייבת להכיל לפחות 6 תווים' };
  }
  
  if (password.length > 100) {
    return { isValid: false, error: 'הסיסמה לא יכולה להכיל יותר מ-100 תווים' };
  }
  
  return { isValid: true, error: null };
};

/**
 * קבלת תמונת פרופיל ברירת מחדל לפי שם
 * @param {string} name - שם המשתמש
 * @returns {string} URL לתמונת פרופיל
 */
export const getDefaultAvatar = (name) => {
  if (!name) return null;
  
  const initials = name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  // יצירת URL לשירות יצירת אווטר עם האותיות הראשונות
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&color=fff&size=200`;
};

/**
 * פורמט תאריך הצטרפות
 * @param {string} dateString - תאריך הצטרפות
 * @returns {string} תאריך מפורמט
 */
export const formatJoinDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * חישוב זמן מאז הצטרפות
 * @param {string} dateString - תאריך הצטרפות
 * @returns {string} זמן מאז הצטרפות
 */
export const getTimeSinceJoin = (dateString) => {
  if (!dateString) return '';
  
  const joinDate = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - joinDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 30) {
    return `${diffDays} ימים`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} חודשים`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years} שנים`;
  }
};

/**
 * בדיקה אם הפרופיל מלא
 * @param {Object} profile - פרופיל המשתמש
 * @returns {Object} מידע על שלמות הפרופיל
 */
export const getProfileCompleteness = (profile) => {
  if (!profile) {
    return { percentage: 0, missingFields: [] };
  }
  
  const fields = [
    { key: 'email', label: 'אימייל', weight: 30 },
    { key: 'name', label: 'שם', weight: 25 },
    { key: 'phone', label: 'טלפון', weight: 25 },
  ];
  
  let completedWeight = 0;
  const missingFields = [];
  
  fields.forEach(field => {
    if (profile[field.key]) {
      completedWeight += field.weight;
    } else {
      missingFields.push(field.label);
    }
  });
  
  return {
    percentage: Math.round(completedWeight),
    missingFields
  };
};
