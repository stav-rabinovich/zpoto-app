import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserBookings, createBooking, getActiveBookings } from '../services/api';

/**
 * Hook לטעינת הזמנות המשתמש
 */
export const useBookings = () => {
  return useQuery({
    queryKey: ['bookings'],
    queryFn: getUserBookings,
    staleTime: 1000 * 60 * 2, // 2 דקות
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook לטעינת הזמנות פעילות
 */
export const useActiveBookings = () => {
  return useQuery({
    queryKey: ['bookings', 'active'],
    queryFn: getActiveBookings,
    staleTime: 1000 * 30, // 30 שניות
    refetchInterval: 1000 * 60, // רענון כל דקה
  });
};

/**
 * Hook ליצירת הזמנה חדשה
 */
export const useCreateBooking = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      // רענון הזמנות לאחר יצירה מוצלחת
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings', 'active'] });
    },
  });
};
