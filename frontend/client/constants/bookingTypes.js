// constants/bookingTypes.js
// קבועים לסוגי הזמנות ומגבלות

/**
 * סוגי הזמנות במערכת
 */
export const BOOKING_TYPES = {
  /** הזמנה מיידית - דרך כפתור "סביבי" */
  IMMEDIATE: 'immediate',
  /** הזמנה עתידית - דרך חיפוש בדף הבית עם זמנים */
  FUTURE: 'future'
};

/**
 * מגבלות להזמנה מיידית
 */
export const IMMEDIATE_CONSTRAINTS = {
  /** מקסימום שעות להזמנה מיידית */
  MAX_HOURS: 12,
  /** מינימום שעות להזמנה מיידית */
  MIN_HOURS: 2.5,
  /** רדיוס חיפוש במטרים */
  RADIUS_METERS: 700
};

/**
 * מגבלות להזמנה עתידית
 */
export const FUTURE_CONSTRAINTS = {
  /** רדיוס חיפוש בק"מ */
  RADIUS_KM: 1.5,
  /** מינימום שעות להזמנה עתידית */
  MIN_HOURS: 1
};

/**
 * בדיקה האם סוג הזמנה תקין
 * @param {string} bookingType - סוג ההזמנה
 * @returns {boolean}
 */
export const isValidBookingType = (bookingType) => {
  return Object.values(BOOKING_TYPES).includes(bookingType);
};

/**
 * קבלת מגבלות לפי סוג הזמנה
 * @param {string} bookingType - סוג ההזמנה
 * @returns {Object} מגבלות רלוונטיות
 */
export const getConstraintsForBookingType = (bookingType) => {
  switch (bookingType) {
    case BOOKING_TYPES.IMMEDIATE:
      return IMMEDIATE_CONSTRAINTS;
    case BOOKING_TYPES.FUTURE:
      return FUTURE_CONSTRAINTS;
    default:
      return IMMEDIATE_CONSTRAINTS; // ברירת מחדל
  }
};

/**
 * בדיקה האם הזמנה היא מיידית
 * @param {string} bookingType - סוג ההזמנה
 * @returns {boolean}
 */
export const isImmediateBooking = (bookingType) => {
  return bookingType === BOOKING_TYPES.IMMEDIATE;
};

/**
 * בדיקה האם הזמנה היא עתידית
 * @param {string} bookingType - סוג ההזמנה
 * @returns {boolean}
 */
export const isFutureBooking = (bookingType) => {
  return bookingType === BOOKING_TYPES.FUTURE;
};
