/**
 * מרכז כל שירותי ה-API
 * מייצא את כל השירותים במקום אחד לנוחות השימוש
 */

// שירותי הזמנות
export * from './bookings';

// שירותי בעלי חניות
export * from './owner';

// שירותי פרופיל
export * from './profile';

// שירותי רכבים
export * from './vehicles';

// שירותי משתמשים (מועדפים ומקומות שמורים)
export * from './userService';

// שירותי חיפוש והזמנות פעילות
export * from './searchService';

/**
 * דוגמאות שימוש:
 * 
 * import { getUserBookings, createBooking } from '../services/api';
 * import { getOwnerParkings, updateOwnerParking } from '../services/api';
 * import { getUserFavorites, addFavorite } from '../services/api';
 * import { getRecentSearches, saveRecentSearch } from '../services/api';
 */
