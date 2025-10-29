import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserFavorites, addFavorite, removeFavorite } from '../services/api';

/**
 * Hook לטעינת מועדפים
 */
export const useFavorites = () => {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: getUserFavorites,
    staleTime: 1000 * 60 * 5, // 5 דקות
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook להוספת מועדף
 */
export const useAddFavorite = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: addFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
};

/**
 * Hook להסרת מועדף
 */
export const useRemoveFavorite = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: removeFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
};

/**
 * Hook מותאם לטיפול במועדפים (toggle)
 */
export const useFavoriteToggle = () => {
  const addMutation = useAddFavorite();
  const removeMutation = useRemoveFavorite();
  const { data: favorites } = useFavorites();
  
  const toggleFavorite = async (parkingId) => {
    const favoriteIds = favorites?.data?.map(fav => fav.parking.id) || [];
    const isFavorite = favoriteIds.includes(parkingId);
    
    if (isFavorite) {
      return removeMutation.mutateAsync(parkingId);
    } else {
      return addMutation.mutateAsync(parkingId);
    }
  };
  
  return {
    toggleFavorite,
    isLoading: addMutation.isPending || removeMutation.isPending,
    favorites: favorites?.data || [],
  };
};
