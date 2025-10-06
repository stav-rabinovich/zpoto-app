import api from '../../utils/api';

/**
 * שירותי API לבעלי חניות
 */

/**
 * קבלת כל החניות של הבעלים
 * @returns {Promise} רשימת חניות
 */
export const getOwnerParkings = async () => {
  try {
    const response = await api.get('/api/owner/parkings');
    return {
      success: true,
      data: response.data || []
    };
  } catch (error) {
    console.error('Failed to fetch owner parkings:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בטעינת החניות',
      data: []
    };
  }
};

/**
 * קבלת חניה בודדת
 * @param {number} parkingId - מזהה החניה
 * @returns {Promise} פרטי החניה
 */
export const getOwnerParking = async (parkingId) => {
  try {
    const response = await api.get(`/api/owner/parkings/${parkingId}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Failed to fetch owner parking:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בטעינת החניה',
      data: null
    };
  }
};

/**
 * עדכון פרטי חניה
 * @param {number} parkingId - מזהה החניה
 * @param {Object} parkingData - נתוני החניה המעודכנים
 * @returns {Promise} תוצאת העדכון
 */
export const updateOwnerParking = async (parkingId, parkingData) => {
  try {
    const response = await api.patch(`/api/owner/parkings/${parkingId}`, parkingData);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Failed to update owner parking:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בעדכון החניה',
      data: null
    };
  }
};

/**
 * שינוי מצב אישור החניה
 * @param {number} parkingId - מזהה החניה
 * @param {string} approvalMode - מצב האישור (AUTO/MANUAL)
 * @returns {Promise} תוצאת השינוי
 */
export const updateParkingApprovalMode = async (parkingId, approvalMode) => {
  try {
    const response = await api.patch(`/api/owner/parkings/${parkingId}/approval-mode`, { approvalMode });
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('Failed to update parking approval mode:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בעדכון מצב האישור',
      data: null
    };
  }
};

/**
 * קבלת הזמנות של החניות של הבעלים
 * @returns {Promise} רשימת הזמנות
 */
export const getOwnerBookings = async () => {
  try {
    const response = await api.get('/api/owner/bookings');
    return {
      success: true,
      data: response.data.data || []
    };
  } catch (error) {
    console.error('Failed to fetch owner bookings:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בטעינת ההזמנות',
      data: []
    };
  }
};

/**
 * עדכון סטטוס הזמנה על ידי בעל החניה
 * @param {number} bookingId - מזהה ההזמנה
 * @param {string} status - הסטטוס החדש (PENDING/CONFIRMED/CANCELLED)
 * @returns {Promise} תוצאת העדכון
 */
export const updateBookingStatus = async (bookingId, status) => {
  try {
    const response = await api.patch(`/api/owner/bookings/${bookingId}/status`, { status });
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('Failed to update booking status:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בעדכון סטטוס ההזמנה',
      data: null
    };
  }
};

/**
 * קבלת סטטיסטיקות לחניה ספציפית
 * @param {number} parkingId - מזהה החניה
 * @param {Object} options - אפשרויות נוספות
 * @param {number} options.days - מספר ימים אחורה (ברירת מחדל: 30)
 * @param {string} options.from - תאריך התחלה (ISO string)
 * @param {string} options.to - תאריך סיום (ISO string)
 * @returns {Promise} סטטיסטיקות החניה
 */
export const getParkingStats = async (parkingId, options = {}) => {
  try {
    const params = new URLSearchParams();
    if (options.days) params.append('days', options.days);
    if (options.from) params.append('from', options.from);
    if (options.to) params.append('to', options.to);
    
    const queryString = params.toString();
    const url = `/api/owner/stats/${parkingId}${queryString ? `?${queryString}` : ''}`;
    
    const response = await api.get(url);
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('Failed to fetch parking stats:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בטעינת הסטטיסטיקות',
      data: null
    };
  }
};

/**
 * פונקציות עזר לבעלי חניות
 */

/**
 * קבלת סטטוס החניה (פעילה/לא פעילה)
 * @param {Object} parking - אובייקט החניה
 * @returns {Object} מידע על הסטטוס
 */
export const getParkingStatus = (parking) => {
  if (!parking) return { status: 'unknown', text: 'לא ידוע', color: '#9E9E9E' };
  
  if (parking.isActive) {
    return { status: 'active', text: 'פעילה', color: '#4CAF50' };
  } else {
    return { status: 'inactive', text: 'לא פעילה', color: '#F44336' };
  }
};

/**
 * קבלת טקסט מצב אישור בעברית
 * @param {string} approvalMode - מצב האישור
 * @returns {string} טקסט בעברית
 */
export const getApprovalModeText = (approvalMode) => {
  switch (approvalMode) {
    case 'AUTO':
      return 'אישור אוטומטי';
    case 'MANUAL':
      return 'אישור ידני';
    default:
      return 'לא ידוע';
  }
};

/**
 * חישוב הכנסות חודשיות
 * @param {Array} bookings - רשימת הזמנות
 * @returns {number} הכנסות בשקלים
 */
export const calculateMonthlyRevenue = (bookings) => {
  if (!Array.isArray(bookings)) return 0;
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  return bookings
    .filter(booking => {
      const bookingDate = new Date(booking.createdAt);
      return bookingDate >= startOfMonth && booking.status === 'CONFIRMED';
    })
    .reduce((total, booking) => total + (booking.totalPriceCents || 0), 0) / 100;
};

/**
 * קבלת הזמנות לפי סטטוס
 * @param {Array} bookings - רשימת הזמנות
 * @param {string} status - הסטטוס המבוקש
 * @returns {Array} הזמנות מסוננות
 */
export const getBookingsByStatus = (bookings, status) => {
  if (!Array.isArray(bookings)) return [];
  return bookings.filter(booking => booking.status === status);
};

/**
 * מיון הזמנות לפי תאריך (חדש יותר קודם)
 * @param {Array} bookings - רשימת הזמנות
 * @returns {Array} הזמנות ממוינות
 */
export const sortBookingsByDate = (bookings) => {
  if (!Array.isArray(bookings)) return [];
  
  return [...bookings].sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
};

/**
 * קבלת הזמנות עתידיות
 * @param {Array} bookings - רשימת הזמנות
 * @returns {Array} הזמנות עתידיות
 */
export const getUpcomingBookings = (bookings) => {
  if (!Array.isArray(bookings)) return [];
  
  const now = new Date();
  return bookings.filter(booking => {
    const startTime = new Date(booking.startTime);
    return startTime > now && booking.status === 'CONFIRMED';
  });
};

/**
 * קבלת הזמנות פעילות כרגע
 * @param {Array} bookings - רשימת הזמנות
 * @returns {Array} הזמנות פעילות
 */
export const getActiveBookings = (bookings) => {
  if (!Array.isArray(bookings)) return [];
  
  const now = new Date();
  return bookings.filter(booking => {
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);
    return now >= startTime && now <= endTime && booking.status === 'CONFIRMED';
  });
};

/**
 * חישוב תפוסה ממוצעת
 * @param {Object} stats - סטטיסטיקות החניה
 * @returns {number} אחוז תפוסה (0-100)
 */
export const calculateOccupancyRate = (stats) => {
  if (!stats || !stats.totalHours) return 0;
  
  const daysInPeriod = stats.period?.days || 30;
  const maxHours = daysInPeriod * 24; // שעות מקסימליות אפשריות
  
  return Math.round((stats.totalHours / maxHours) * 100);
};

/**
 * פורמט מטבע לתצוגה
 * @param {number} amount - סכום בשקלים
 * @returns {string} סכום מפורמט
 */
export const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return '₪0';
  
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * קבלת הזמנות שדורשות אישור
 * @param {Array} bookings - רשימת הזמנות
 * @returns {Array} הזמנות הממתינות לאישור
 */
export const getPendingApprovalBookings = (bookings) => {
  if (!Array.isArray(bookings)) return [];
  return bookings.filter(booking => booking.status === 'PENDING');
};

/**
 * חישוב ממוצע הכנסה לשעה
 * @param {Object} stats - סטטיסטיקות החניה
 * @returns {number} ממוצע הכנסה לשעה
 */
export const calculateAverageHourlyRevenue = (stats) => {
  if (!stats || !stats.totalHours || stats.totalHours === 0) return 0;
  return Math.round((stats.totalRevenue / stats.totalHours) * 100) / 100;
};
