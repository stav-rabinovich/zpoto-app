import api from '../../utils/api';

/**
 * שירותי API להזמנות
 */

/**
 * בדיקת זמינות חניה
 * @param {number} parkingId - מזהה החניה
 * @param {string} startTime - זמן התחלה (ISO string)
 * @returns {Promise} נתוני זמינות
 */
export const checkParkingAvailability = async (parkingId, startTime) => {
  try {
    console.log(`🔍 Checking availability for parking ${parkingId} from ${startTime}`);
    
    const response = await api.get(`/api/bookings/availability/${parkingId}`, {
      params: { startTime }
    });
    
    console.log('📊 Availability response:', response.data);
    
    return {
      success: true,
      data: response.data?.data || response.data
    };
  } catch (error) {
    console.error('❌ Failed to check parking availability:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בבדיקת זמינות',
      data: null
    };
  }
};

/**
 * בדיקת תקינות הזמנה לפני יצירתה
 * @param {number} parkingId - מזהה החניה
 * @param {string} startTime - זמן התחלה (ISO string)
 * @param {string} endTime - זמן סיום (ISO string)
 * @returns {Promise} תוצאת validation
 */
export const validateBookingSlot = async (parkingId, startTime, endTime) => {
  try {
    console.log(`🔍 Validating booking slot for parking ${parkingId}: ${startTime} - ${endTime}`);
    
    const response = await api.post('/api/bookings/validate', {
      parkingId,
      startTime,
      endTime
    });
    
    console.log('✅ Validation response:', response.data);
    
    // השרת תמיד מחזיר 200, אבל עם valid: true/false
    if (response.data.valid) {
      return {
        success: true,
        valid: true,
        data: response.data
      };
    } else {
      return {
        success: true,
        valid: false,
        error: response.data.error,
        availableUntil: response.data.availableUntil,
        suggestedEndTime: response.data.suggestedEndTime
      };
    }
  } catch (error) {
    console.error('❌ Booking validation failed:', error);
    
    return {
      success: false,
      valid: false,
      error: error.response?.data?.error || 'שגיאה בבדיקת תקינות ההזמנה'
    };
  }
};

/**
 * קבלת כל ההזמנות של המשתמש המחובר
 * @returns {Promise} רשימת הזמנות
 */
export const getUserBookings = async () => {
  try {
    console.log('🔍 Starting getUserBookings API call...');
    const response = await api.get('/api/bookings');
    console.log('📋 Raw Bookings API response:', response.data);
    
    // הAPI מחזיר { data: [...] }
    const bookingsData = response.data?.data || response.data || [];
    console.log('📊 Extracted bookings data:', {
      type: typeof bookingsData,
      isArray: Array.isArray(bookingsData),
      length: bookingsData.length || 'N/A',
      first: bookingsData[0] ? {
        id: bookingsData[0].id,
        status: bookingsData[0].status,
        parking: bookingsData[0].parking?.address
      } : 'No first item'
    });
    
    // וודא שזה מערך
    const validBookings = Array.isArray(bookingsData) ? bookingsData : [];
    
    console.log(`✅ Returning ${validBookings.length} valid bookings`);
    
    return {
      success: true,
      data: validBookings
    };
  } catch (error) {
    console.error('❌ Failed to fetch user bookings:', error);
    console.error('❌ Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
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
 * חישוב מחיר הזמנה - proportional pricing
 * @param {string} startTime - זמן התחלה
 * @param {string} endTime - זמן סיום
 * @param {Object} spot - נתוני החניה (עם מחירון מדורג אופציונלי)
 * @param {number} fallbackPrice - מחיר גיבוי אם אין מחירון
 * @returns {Object} אובייקט עם פרטי המחיר
 */
export const calculateBookingPrice = (startTime, endTime, spot, fallbackPrice = 10) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end - start;
  const exactHours = diffMs / (1000 * 60 * 60);
  const wholeHours = Math.floor(exactHours);
  const fractionalPart = exactHours - wholeHours;
  
  // אם יש מחירון מדורג בחניה
  if (spot && spot.pricing) {
    try {
      const pricingData = typeof spot.pricing === 'string' ? JSON.parse(spot.pricing) : spot.pricing;
      
      let total = 0;
      const breakdown = [];
      
      // חישוב שעות שלמות
      for (let i = 1; i <= wholeHours; i++) {
        const rawHourPrice = pricingData[`hour${i}`] || pricingData.hour1 || fallbackPrice;
        const hourPrice = typeof rawHourPrice === 'string' ? parseFloat(rawHourPrice) : rawHourPrice;
        total += hourPrice;
        breakdown.push({ hour: i, price: hourPrice, isFractional: false });
      }
      
      // חישוב חלק שברי (אם קיים)
      if (fractionalPart > 0) {
        const nextHourIndex = wholeHours + 1;
        const rawNextHourPrice = pricingData[`hour${nextHourIndex}`] || pricingData.hour1 || fallbackPrice;
        const nextHourPrice = typeof rawNextHourPrice === 'string' ? parseFloat(rawNextHourPrice) : rawNextHourPrice;
        const fractionalPrice = fractionalPart * nextHourPrice;
        total += fractionalPrice;
        breakdown.push({ 
          hour: nextHourIndex, 
          price: fractionalPrice, 
          isFractional: true, 
          fractionalPart: fractionalPart 
        });
      }
      
      return {
        total: total,
        exactHours: exactHours,
        breakdown: breakdown,
        method: 'proportional'
      };
    } catch (error) {
      console.error('Failed to parse pricing data:', error);
    }
  }
  
  // fallback למחיר פשוט
  const pricePerHour = spot?.price || fallbackPrice;
  const flatTotal = exactHours * pricePerHour;
  
  return {
    total: flatTotal,
    exactHours: exactHours,
    breakdown: [],
    method: 'flat'
  };
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
      return '#2196F3'; // כחול
    case 'PENDING_APPROVAL':
      return '#FF9800'; // כתום - ממתין לאישור
    case 'CANCELED':
    case 'CANCELLED':
      return '#9E9E9E'; // אפור
    case 'REJECTED':
      return '#F44336'; // אדום - נדחה
    case 'EXPIRED':
      return '#795548'; // חום - פג זמן
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
      return 'ממתינה';
    case 'PENDING_APPROVAL':
      return 'ממתינה לאישור בעל החניה';
    case 'CANCELED':
    case 'CANCELLED':
      return 'מבוטלת';
    case 'REJECTED':
      return 'נדחתה על ידי בעל החניה';
    case 'EXPIRED':
      return 'פג זמן האישור';
    default:
      return 'לא ידוע';
  }
};

/**
 * קבלת זמינות חניה מזמן התחלה נתון
 * @param {number} parkingId - מזהה החניה
 * @param {string} startTime - זמן התחלה (ISO string)
 * @returns {Promise} נתוני זמינות החניה
 */
export const getParkingAvailability = async (parkingId, startTime) => {
  try {
    console.log(`🕒 API CLIENT: Checking availability for parking ${parkingId} from ${startTime}`);
    
    const url = `/api/bookings/availability/${parkingId}?startTime=${encodeURIComponent(startTime)}`;
    console.log(`🔗 API CLIENT: Full URL: ${url}`);
    
    const response = await api.get(url);
    
    console.log('📊 API CLIENT: Raw response:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers
    });
    
    const availabilityData = response.data.data;
    console.log('📊 API CLIENT: Extracted availability data:', availabilityData);
    
    return {
      success: true,
      data: availabilityData
    };
  } catch (error) {
    console.error('❌ API CLIENT: Failed to fetch parking availability:', error);
    console.error('❌ API CLIENT: Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בבדיקת זמינות החניה',
      data: null
    };
  }
};

/**
 * בדיקת חפיפות הזמנות לרכב מסוים
 * 🚗 מטרה: למנוע מצב בו אותו רכב "נמצא" בשני מקומות בו זמנית
 * @param {Object} params - פרמטרי הבדיקה
 * @param {number|null} params.vehicleId - מזהה הרכב (אופציונלי)
 * @param {string|null} params.licensePlate - מספר רכב (אופציונלי)
 * @param {string} params.startTime - זמן התחלה (ISO string)
 * @param {string} params.endTime - זמן סיום (ISO string)
 * @param {number|null} params.excludeBookingId - מזהה הזמנה להחרגה (אופציונלי)
 * @returns {Promise} תוצאת בדיקת החפיפות
 */
export const checkVehicleBookingConflicts = async ({ 
  vehicleId, 
  licensePlate, 
  startTime, 
  endTime, 
  excludeBookingId 
}) => {
  try {
    console.log(`🚗 CLIENT: Checking vehicle booking conflicts:`, {
      vehicleId,
      licensePlate,
      startTime,
      endTime,
      excludeBookingId
    });

    if (!vehicleId && !licensePlate) {
      throw new Error('Either vehicleId or licensePlate must be provided');
    }

    if (!startTime || !endTime) {
      throw new Error('startTime and endTime are required');
    }

    // יצירת timeout promise (30 שניות)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 30000);
    });

    // קריאה ל-API
    const apiPromise = api.post('/api/bookings/check-vehicle-conflicts', {
      vehicleId,
      licensePlate,
      startTime,
      endTime,
      excludeBookingId
    });

    // המתנה לתגובה עם timeout
    const response = await Promise.race([apiPromise, timeoutPromise]);
    
    console.log('🚗 CLIENT: Vehicle conflict check response:', response.data);
    
    return {
      success: true,
      hasConflict: response.data.hasConflict,
      message: response.data.message,
      conflictingBookings: response.data.conflictingBookings || [],
      vehicleIdentifier: response.data.vehicleIdentifier,
      timeRange: response.data.timeRange
    };

  } catch (error) {
    console.error('🚗 CLIENT: Failed to check vehicle conflicts:', error);
    
    // טיפול בשגיאות שונות
    if (error.message === 'Request timeout') {
      return {
        success: false,
        error: 'הבקשה חרגה מהזמן המותר. אנא נסה שוב.',
        hasConflict: false,
        conflictingBookings: []
      };
    }

    if (error.response?.status === 409 && error.response?.data?.vehicleConflict) {
      // זוהתה חפיפת רכב - החזר את הפרטים
      return {
        success: true,
        hasConflict: true,
        message: error.response.data.message,
        conflictingBookings: error.response.data.conflictingBookings || [],
        vehicleConflict: true
      };
    }

    return {
      success: false,
      error: error.response?.data?.error || error.message || 'שגיאה בבדיקת חפיפות רכב',
      hasConflict: false,
      conflictingBookings: []
    };
  }
};

/**
 * קבלת הזמנות פעילות של רכב מסוים
 * @param {number} vehicleId - מזהה הרכב
 * @returns {Promise} רשימת הזמנות פעילות
 */
export const getActiveVehicleBookings = async (vehicleId) => {
  try {
    console.log(`🚗 CLIENT: Getting active bookings for vehicle ${vehicleId}`);
    
    const response = await api.get(`/api/bookings/vehicle-active/${vehicleId}`);
    
    console.log('🚗 CLIENT: Active vehicle bookings response:', response.data);
    
    return {
      success: true,
      vehicle: response.data.vehicle,
      activeBookings: response.data.activeBookings || [],
      count: response.data.count || 0
    };

  } catch (error) {
    console.error('🚗 CLIENT: Failed to get active vehicle bookings:', error);
    
    return {
      success: false,
      error: error.response?.data?.error || 'שגיאה בקבלת הזמנות פעילות',
      activeBookings: [],
      count: 0
    };
  }
};
