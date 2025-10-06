import api from '../../utils/api';

/**
 * שירותי API להזמנות
 */

/**
 * קבלת כל ההזמנות של המשתמש המחובר
 * @returns {Promise} רשימת הזמנות
 */
export const getUserBookings = async () => {
  try {
    const response = await api.get('/api/bookings');
    return {
      success: true,
      data: response.data.data || []
    };
  } catch (error) {
    console.error('Failed to fetch user bookings:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בטעינת ההזמנות',
      data: []
    };
  }
};

/**
 * יצירת הזמנה חדשה
 * @param {Object} bookingData - נתוני ההזמנה
 * @param {number} bookingData.parkingId - מזהה החניה
 * @param {string} bookingData.startTime - זמן התחלה (ISO string)
 * @param {string} bookingData.endTime - זמן סיום (ISO string)
 * @param {string} bookingData.status - סטטוס ההזמנה (PENDING/CONFIRMED)
 * @returns {Promise} תוצאת יצירת ההזמנה
 */
export const createBooking = async (bookingData) => {
  try {
    console.log('📤 Sending booking request:', bookingData);
    console.log('🌐 API base URL:', api.defaults.baseURL);
    
    const response = await api.post('/api/bookings', bookingData);
    
    console.log('📥 Booking response status:', response.status);
    console.log('📥 Booking response data:', response.data);
    
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('❌ Failed to create booking:', error);
    console.error('❌ Error response:', error.response?.data);
    console.error('❌ Error status:', error.response?.status);
    console.error('❌ Error message:', error.message);
    
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'שגיאה ביצירת ההזמנה',
      data: null
    };
  }
};

/**
 * קבלת הזמנה בודדת
 * @param {number} bookingId - מזהה ההזמנה
 * @returns {Promise} פרטי ההזמנה
 */
export const getBooking = async (bookingId) => {
  try {
    const response = await api.get(`/api/bookings/${bookingId}`);
    return {
      success: true,
      data: response.data.data || response.data
    };
  } catch (error) {
    console.error('Failed to fetch booking:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בטעינת ההזמנה',
      data: null
    };
  }
};

/**
 * עדכון סטטוס הזמנה
 * @param {number} bookingId - מזהה ההזמנה
 * @param {string} status - הסטטוס החדש (PENDING/CONFIRMED/CANCELLED)
 * @returns {Promise} תוצאת העדכון
 */
export const updateBookingStatus = async (bookingId, status) => {
  try {
    const response = await api.patch(`/api/bookings/${bookingId}/status`, { status });
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
 * ביטול הזמנה
 * @param {number} bookingId - מזהה ההזמנה
 * @returns {Promise} תוצאת הביטול
 */
export const cancelBooking = async (bookingId) => {
  try {
    const response = await api.post(`/api/bookings/${bookingId}/cancel`);
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('Failed to cancel booking:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בביטול ההזמנה',
      data: null
    };
  }
};

/**
 * פונקציות עזר
 */

/**
 * חישוב מחיר הזמנה
 * @param {string} startTime - זמן התחלה
 * @param {string} endTime - זמן סיום
 * @param {number} pricePerHour - מחיר לשעה
 * @returns {number} המחיר בשקלים
 */
export const calculateBookingPrice = (startTime, endTime, pricePerHour) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const hours = (end - start) / (1000 * 60 * 60);
  return Math.ceil(hours * pricePerHour);
};

/**
 * בדיקה אם הזמנה פעילה
 * @param {Object} booking - אובייקט ההזמנה
 * @returns {boolean} האם ההזמנה פעילה
 */
export const isBookingActive = (booking) => {
  if (!booking || booking.status !== 'CONFIRMED') return false;
  
  const now = new Date();
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  
  return now >= start && now <= end;
};

/**
 * בדיקה אם הזמנה עתידית
 * @param {Object} booking - אובייקט ההזמנה
 * @returns {boolean} האם ההזמנה עתידית
 */
export const isBookingUpcoming = (booking) => {
  if (!booking) return false;
  
  const now = new Date();
  const start = new Date(booking.startTime);
  
  return start > now;
};

/**
 * פורמט תאריך להצגה
 * @param {string} dateString - תאריך כ-string
 * @returns {string} תאריך מפורמט
 */
export const formatBookingDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * קבלת צבע סטטוס
 * @param {string} status - סטטוס ההזמנה
 * @returns {string} צבע בהקס
 */
export const getStatusColor = (status) => {
  switch (status) {
    case 'CONFIRMED':
      return '#4CAF50'; // ירוק
    case 'PENDING':
      return '#FF9800'; // כתום
    case 'CANCELLED':
      return '#F44336'; // אדום
    default:
      return '#9E9E9E'; // אפור
  }
};

/**
 * קבלת טקסט סטטוס בעברית
 * @param {string} status - סטטוס ההזמנה
 * @returns {string} טקסט בעברית
 */
export const getStatusText = (status) => {
  switch (status) {
    case 'CONFIRMED':
      return 'מאושרת';
    case 'PENDING':
      return 'ממתינה לאישור';
    case 'CANCELLED':
      return 'מבוטלת';
    default:
      return 'לא ידוע';
  }
};
