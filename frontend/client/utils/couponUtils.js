/**
 * Coupon Utilities - פונקציות עזר לטיפול בקופונים
 * מכיל לוגיקת חישוב הנחות, validation ופורמטים
 */

// קבועים
export const COUPON_TYPES = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED: 'FIXED'
};

export const APPLY_TO_TYPES = {
  SERVICE_FEE: 'SERVICE_FEE',
  TOTAL_AMOUNT: 'TOTAL_AMOUNT'
};

export const COUPON_ERROR_CODES = {
  NOT_FOUND: 'NOT_FOUND',
  EXPIRED: 'EXPIRED',
  INACTIVE: 'INACTIVE',
  MAX_USAGE_REACHED: 'MAX_USAGE_REACHED'
};

// פונקציות עזר לפורמט
export const formatCurrency = (amountCents) => {
  return `₪${(amountCents / 100).toFixed(2)}`;
};

export const formatDiscount = (coupon) => {
  if (coupon.discountType === COUPON_TYPES.PERCENTAGE) {
    return `${coupon.discountValue}%`;
  } else {
    return `₪${coupon.discountValue}`;
  }
};

export const formatApplyTo = (applyTo) => {
  return applyTo === APPLY_TO_TYPES.SERVICE_FEE ? 'דמי תפעול' : 'סכום כולל';
};

// פונקציות חישוב מקומיות (לבדיקות מהירות)
export const calculateLocalDiscount = (coupon, parkingCostCents, operationalFeeCents) => {
  const totalAmountCents = parkingCostCents + operationalFeeCents;
  let discountAmountCents = 0;

  if (coupon.discountType === COUPON_TYPES.PERCENTAGE) {
    // הנחה באחוזים
    if (coupon.applyTo === APPLY_TO_TYPES.SERVICE_FEE) {
      discountAmountCents = Math.round(operationalFeeCents * (coupon.discountValue / 100));
    } else {
      discountAmountCents = Math.round(totalAmountCents * (coupon.discountValue / 100));
    }
  } else {
    // הנחה קבועה
    const discountCents = coupon.discountValue * 100;
    if (coupon.applyTo === APPLY_TO_TYPES.SERVICE_FEE) {
      discountAmountCents = Math.min(discountCents, operationalFeeCents);
    } else {
      discountAmountCents = Math.min(discountCents, totalAmountCents);
    }
  }

  const finalAmountCents = totalAmountCents - discountAmountCents;
  const discountPercentage = (discountAmountCents / totalAmountCents) * 100;

  return {
    discountAmountCents,
    originalAmountCents: totalAmountCents,
    finalAmountCents,
    discountPercentage: Math.round(discountPercentage * 100) / 100
  };
};

// פונקציית validation מקומית
export const validateCouponLocally = (coupon) => {
  if (!coupon) {
    return { isValid: false, error: 'קופון לא נמצא', errorCode: COUPON_ERROR_CODES.NOT_FOUND };
  }

  if (!coupon.isActive) {
    return { isValid: false, error: 'קופון לא פעיל', errorCode: COUPON_ERROR_CODES.INACTIVE };
  }

  const now = new Date();
  const validUntil = new Date(coupon.validUntil);
  if (now > validUntil) {
    return { isValid: false, error: 'קופון פג תוקף', errorCode: COUPON_ERROR_CODES.EXPIRED };
  }

  if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) {
    return { isValid: false, error: 'הגיע למגבלת השימושים', errorCode: COUPON_ERROR_CODES.MAX_USAGE_REACHED };
  }

  return { isValid: true };
};

// פונקציית API לבדיקת קופון
export const validateCouponAPI = async (code, apiBaseUrl = 'http://10.0.0.23:4000') => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: code.trim().toUpperCase() })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Coupon validation API error:', error);
    return {
      isValid: false,
      error: 'שגיאה בבדיקת הקופון',
      errorCode: 'NETWORK_ERROR'
    };
  }
};

// פונקציית API לחישוב הנחה
export const calculateDiscountAPI = async (code, parkingCostCents, operationalFeeCents, apiBaseUrl = 'http://10.0.0.23:4000') => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/coupons/calculate-discount`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: code.trim().toUpperCase(),
        parkingCostCents,
        operationalFeeCents
      })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Discount calculation API error:', error);
    return {
      isValid: false,
      error: 'שגיאה בחישוב ההנחה',
      errorCode: 'NETWORK_ERROR'
    };
  }
};

// פונקציית חישוב דמי תפעול
export const calculateOperationalFee = (parkingCostCents, feePercentage = 5) => {
  return Math.round(parkingCostCents * (feePercentage / 100));
};

// פונקציית חישוב מחיר כולל
export const calculateTotalPrice = (parkingCostCents, operationalFeeCents = null) => {
  const opFee = operationalFeeCents || calculateOperationalFee(parkingCostCents);
  return parkingCostCents + opFee;
};

// פונקציית פורמט הודעות שגיאה
export const formatCouponError = (errorCode, error) => {
  const errorMessages = {
    [COUPON_ERROR_CODES.NOT_FOUND]: 'קופון לא נמצא במערכת',
    [COUPON_ERROR_CODES.EXPIRED]: 'קופון פג תוקף',
    [COUPON_ERROR_CODES.INACTIVE]: 'קופון לא פעיל כרגע',
    [COUPON_ERROR_CODES.MAX_USAGE_REACHED]: 'הקופון הגיע למגבלת השימושים',
    'NETWORK_ERROR': 'שגיאת רשת - נסה שוב'
  };

  return errorMessages[errorCode] || error || 'שגיאה לא ידועה';
};

// פונקציית יצירת סיכום הנחה
export const createDiscountSummary = (coupon, discount) => {
  return {
    couponCode: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    applyTo: coupon.applyTo,
    discountAmount: discount.discountAmountCents / 100,
    originalAmount: discount.originalAmountCents / 100,
    finalAmount: discount.finalAmountCents / 100,
    discountPercentage: discount.discountPercentage,
    savings: discount.discountAmountCents / 100
  };
};

// פונקציית בדיקה אם קופון תקף לשימוש
export const isCouponUsable = (coupon) => {
  const validation = validateCouponLocally(coupon);
  return validation.isValid;
};

// פונקציית חישוב זמן תפוגה
export const getTimeUntilExpiry = (validUntil) => {
  const now = new Date();
  const expiry = new Date(validUntil);
  const diffMs = expiry - now;
  
  if (diffMs <= 0) {
    return 'פג תוקף';
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) {
    return `${days} ימים`;
  } else if (hours > 0) {
    return `${hours} שעות`;
  } else {
    return 'פחות משעה';
  }
};

// פונקציית debug לבדיקות
export const debugCoupon = (coupon, parkingCostCents, operationalFeeCents) => {
  console.log('🎟️ Coupon Debug Info:');
  console.log('Coupon:', coupon);
  console.log('Parking Cost (cents):', parkingCostCents);
  console.log('Operational Fee (cents):', operationalFeeCents);
  
  const validation = validateCouponLocally(coupon);
  console.log('Validation:', validation);
  
  if (validation.isValid) {
    const discount = calculateLocalDiscount(coupon, parkingCostCents, operationalFeeCents);
    console.log('Discount:', discount);
    
    const summary = createDiscountSummary(coupon, discount);
    console.log('Summary:', summary);
  }
};

export default {
  COUPON_TYPES,
  APPLY_TO_TYPES,
  COUPON_ERROR_CODES,
  formatCurrency,
  formatDiscount,
  formatApplyTo,
  calculateLocalDiscount,
  validateCouponLocally,
  validateCouponAPI,
  calculateDiscountAPI,
  calculateOperationalFee,
  calculateTotalPrice,
  formatCouponError,
  createDiscountSummary,
  isCouponUsable,
  getTimeUntilExpiry,
  debugCoupon
};
