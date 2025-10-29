import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRecentSearches, saveRecentSearch, getSavedPlaces, getOwnerStatus } from '../services/api';

/**
 * Hook לטעינת חיפושים אחרונים
 */
export const useRecentSearches = () => {
  return useQuery({
    queryKey: ['searches', 'recent'],
    queryFn: getRecentSearches,
    staleTime: 1000 * 60 * 10, // 10 דקות
  });
};

/**
 * Hook לשמירת חיפוש חדש
 */
export const useSaveSearch = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: saveRecentSearch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['searches', 'recent'] });
    },
  });
};

/**
 * Hook לטעינת מקומות שמורים
 */
export const useSavedPlaces = () => {
  return useQuery({
    queryKey: ['places', 'saved'],
    queryFn: getSavedPlaces,
    staleTime: 1000 * 60 * 15, // 15 דקות
  });
};

/**
 * Hook לבדיקת סטטוס בעל חניה
 */
export const useOwnerStatus = (email) => {
  return useQuery({
    queryKey: ['owner', 'status', email],
    queryFn: () => getOwnerStatus(email),
    enabled: !!email, // רק אם יש אימייל
    staleTime: 1000 * 60 * 5, // 5 דקות
  });
};
