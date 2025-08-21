// components/BookingLifecycleWatcher.js
import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import * as bookingsRepo from '../data/bookingsRepo';

/**
 * קומפוננטה קלה שרצה "ברקע" בכל מסך שבו מרנדרים אותה,
 * ומבצעת מעבר סטטוסים אוטומטי:
 * APPROVED -> ACTIVE כשהזמן התחיל
 * ACTIVE   -> COMPLETED כשהזמן הסתיים
 *
 * כדי להשתמש:
 *  - ייבא למסך (למשל BookingsScreen / OwnerOverviewScreen)
 *  - הוסף <BookingLifecycleWatcher /> בתוך ה- JSX העליון של המסך
 */
export default function BookingLifecycleWatcher() {
  useEffect(() => {
    let mounted = true;

    const tick = async () => {
      if (!mounted) return;
      try {
        await bookingsRepo.sweepAndAutoTransition();
      } catch (e) {
        // שקט—לא מפוצצים קונסול
      }
    };

    // ריצה מיידית + כל 30 שניות
    tick();
    const interval = setInterval(tick, 30 * 1000);

    // כשהאפליקציה חוזרת לפוקוס – להריץ סוויפ
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });

    return () => {
      mounted = false;
      clearInterval(interval);
      sub?.remove();
    };
  }, []);

  return null;
}
