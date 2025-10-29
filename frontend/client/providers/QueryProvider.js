import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// יצירת QueryClient עם הגדרות מותאמות
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // זמן cache ברירת מחדל
      staleTime: 1000 * 60 * 5, // 5 דקות
      // זמן שמירה בזיכרון
      gcTime: 1000 * 60 * 30, // 30 דקות (cacheTime בגרסאות ישנות)
      // ניסיון חוזר במקרה של שגיאה
      retry: (failureCount, error) => {
        // לא לנסות שוב על שגיאות 4xx
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // מקסימום 3 ניסיונות
        return failureCount < 3;
      },
      // רענון כשחוזרים לאפליקציה
      refetchOnWindowFocus: true,
      // רענון כשמתחברים לאינטרנט
      refetchOnReconnect: true,
    },
    mutations: {
      // ניסיון חוזר למוטציות
      retry: 1,
    },
  },
});

/**
 * Provider לReact Query
 * עוטף את האפליקציה ומספק גישה ל-QueryClient
 */
export const QueryProvider = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

export default QueryProvider;
