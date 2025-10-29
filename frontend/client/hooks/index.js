/**
 * מרכז כל ה-hooks המותאמים אישית
 * מייצא את כל ה-hooks במקום אחד לנוחות השימוש
 */

// Hooks להזמנות
export * from './useBookings';

// Hooks לזמינות חניות
export * from './useAvailability';

// Hooks למועדפים
export * from './useFavorites';

// Hooks לחיפוש ומקומות
export * from './useSearch';

/**
 * דוגמאות שימוש:
 * 
 * import { useBookings, useCreateBooking } from '../hooks';
 * import { useFavorites, useFavoriteToggle } from '../hooks';
 * import { useRecentSearches, useOwnerStatus } from '../hooks';
 * 
 * const MyComponent = () => {
 *   const { data: bookings, isLoading } = useBookings();
 *   const { toggleFavorite } = useFavoriteToggle();
 *   const createBooking = useCreateBooking();
 *   
 *   // ...
 * };
 */
