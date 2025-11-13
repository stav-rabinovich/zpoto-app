import { prisma } from '../lib/prisma';

/**
 * שירות לבדיקת חפיפות הזמנות לאותו רכב
 * מטרה: למנוע מצב בו אותו רכב "נמצא" בשני מקומות בו זמנית
 */

export interface VehicleConflictCheck {
  hasConflict: boolean;
  conflictingBookings?: ConflictingBooking[];
  message?: string;
}

export interface ConflictingBooking {
  id: number;
  startTime: Date;
  endTime: Date;
  status: string;
  vehicleLicensePlate?: string;
  parking: {
    id: number;
    title: string;
    address?: string;
  };
}

/**
 * בדיקת חפיפות הזמנות לרכב מסוים
 * @param vehicleId - מזהה הרכב (אופציונלי)
 * @param licensePlate - מספר רכב (אופציונלי) 
 * @param startTime - זמן התחלת ההזמנה החדשה
 * @param endTime - זמן סיום ההזמנה החדשה
 * @param excludeBookingId - מזהה הזמנה להחרגה (לצורך עדכון הזמנה קיימת)
 * @param userId - מזהה המשתמש (לבדיקת בעלות על הרכב)
 */
export async function checkVehicleBookingConflicts(
  vehicleId: number | null,
  licensePlate: string | null,
  startTime: Date,
  endTime: Date,
  excludeBookingId?: number,
  userId?: number
): Promise<VehicleConflictCheck> {
  
  console.log(`🚗 Checking vehicle booking conflicts:`, {
    vehicleId,
    licensePlate,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    excludeBookingId,
    userId
  });

  // ולידציה בסיסית
  if (!vehicleId && !licensePlate) {
    console.log(`🚗 ❌ No vehicle identifier provided`);
    return {
      hasConflict: false,
      message: 'לא סופק מזהה רכב לבדיקה'
    };
  }

  if (endTime <= startTime) {
    console.log(`🚗 ❌ Invalid time range`);
    return {
      hasConflict: false,
      message: 'טווח זמנים לא תקין'
    };
  }

  try {
    // בניית תנאי החיפוש לרכב
    const vehicleConditions: any[] = [];
    
    if (vehicleId) {
      vehicleConditions.push({ vehicleId });
    }
    
    if (licensePlate) {
      vehicleConditions.push({ 
        OR: [
          { vehicleLicensePlate: licensePlate },
          { licensePlate: licensePlate }
        ]
      });
    }

    // אם יש vehicleId, נוסיף גם בדיקה לפי מספר הרכב ממסד הנתונים
    if (vehicleId) {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
        select: { licensePlate: true, userId: true }
      });

      if (vehicle) {
        // בדיקת בעלות על הרכב
        if (userId && vehicle.userId !== userId) {
          console.log(`🚗 ❌ Vehicle ${vehicleId} does not belong to user ${userId}`);
          return {
            hasConflict: false,
            message: 'הרכב לא שייך למשתמש'
          };
        }

        // הוספת מספר הרכב מהמסד לתנאי החיפוש
        vehicleConditions.push({ 
          OR: [
            { vehicleLicensePlate: vehicle.licensePlate },
            { licensePlate: vehicle.licensePlate }
          ]
        });
      }
    }

    console.log(`🚗 Search conditions:`, vehicleConditions);

    // חיפוש הזמנות חופפות
    const conflictingBookings = await prisma.booking.findMany({
      where: {
        // תנאי רכב - לפחות אחד מהתנאים צריך להתקיים
        OR: vehicleConditions,
        
        // תנאי זמן - חפיפה: לא (סיום לפני התחלה OR התחלה אחרי סיום)
        NOT: [
          { endTime: { lte: startTime } },   // סיום לפני התחלה
          { startTime: { gte: endTime } }    // התחלה אחרי סיום
        ],
        
        // סטטוס הזמנות פעילות
        status: {
          in: ['CONFIRMED', 'PENDING_APPROVAL', 'PENDING']
        },
        
        // החרגת הזמנה מסוימת (למקרה של עדכון)
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {})
      },
      include: {
        parking: {
          select: {
            id: true,
            title: true,
            address: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    console.log(`🚗 Found ${conflictingBookings.length} conflicting bookings`);

    if (conflictingBookings.length === 0) {
      console.log(`🚗 ✅ No conflicts found`);
      return {
        hasConflict: false,
        message: 'אין חפיפות - הרכב פנוי בזמנים המבוקשים'
      };
    }

    // עיבוד תוצאות החפיפה
    const conflicts: ConflictingBooking[] = conflictingBookings.map(booking => ({
      id: booking.id,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
      vehicleLicensePlate: booking.vehicleLicensePlate || booking.licensePlate || undefined,
      parking: {
        id: booking.parking.id,
        title: booking.parking.title,
        address: booking.parking.address || undefined
      }
    }));

    // יצירת הודעה מפורטת
    const conflictCount = conflicts.length;
    const firstConflict = conflicts[0];
    const licensePlateDisplay = firstConflict.vehicleLicensePlate || licensePlate || 'לא ידוע';
    
    let message = `נמצאה חפיפה עם הזמנה קיימת לרכב ${licensePlateDisplay}`;
    
    if (conflictCount === 1) {
      const conflict = firstConflict;
      const startStr = conflict.startTime.toLocaleString('he-IL', { 
        day: '2-digit', 
        month: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      const endStr = conflict.endTime.toLocaleString('he-IL', { 
        day: '2-digit', 
        month: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      message += ` ב${conflict.parking.title} (${startStr} - ${endStr})`;
    } else {
      message += ` ב-${conflictCount} מקומות שונים`;
    }

    console.log(`🚗 ❌ Conflict detected:`, message);

    return {
      hasConflict: true,
      conflictingBookings: conflicts,
      message
    };

  } catch (error) {
    console.error(`🚗 ❌ Error checking vehicle conflicts:`, error);
    return {
      hasConflict: false,
      message: 'שגיאה בבדיקת חפיפות רכב'
    };
  }
}

/**
 * בדיקת חפיפות מהירה - רק האם יש חפיפה או לא
 * משמשת לבדיקות מהירות ללא פרטים מלאים
 */
export async function hasVehicleBookingConflict(
  vehicleId: number | null,
  licensePlate: string | null,
  startTime: Date,
  endTime: Date,
  excludeBookingId?: number
): Promise<boolean> {
  
  const result = await checkVehicleBookingConflicts(
    vehicleId,
    licensePlate,
    startTime,
    endTime,
    excludeBookingId
  );
  
  return result.hasConflict;
}

/**
 * קבלת כל ההזמנות הפעילות של רכב מסוים
 * שימושי להצגת מידע למשתמש על הזמנות קיימות
 */
export async function getActiveVehicleBookings(
  vehicleId: number | null,
  licensePlate: string | null,
  userId?: number
): Promise<ConflictingBooking[]> {
  
  console.log(`🚗 Getting active bookings for vehicle:`, { vehicleId, licensePlate, userId });

  if (!vehicleId && !licensePlate) {
    return [];
  }

  try {
    const vehicleConditions: any[] = [];
    
    if (vehicleId) {
      vehicleConditions.push({ vehicleId });
    }
    
    if (licensePlate) {
      vehicleConditions.push({ 
        OR: [
          { vehicleLicensePlate: licensePlate },
          { licensePlate: licensePlate }
        ]
      });
    }

    const activeBookings = await prisma.booking.findMany({
      where: {
        OR: vehicleConditions,
        status: {
          in: ['CONFIRMED', 'PENDING_APPROVAL', 'PENDING']
        },
        // רק הזמנות עתידיות או פעילות כעת
        endTime: {
          gte: new Date()
        }
      },
      include: {
        parking: {
          select: {
            id: true,
            title: true,
            address: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    console.log(`🚗 Found ${activeBookings.length} active bookings`);

    return activeBookings.map(booking => ({
      id: booking.id,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
      vehicleLicensePlate: booking.vehicleLicensePlate || booking.licensePlate || undefined,
      parking: {
        id: booking.parking.id,
        title: booking.parking.title,
        address: booking.parking.address || undefined
      }
    }));

  } catch (error) {
    console.error(`🚗 ❌ Error getting active vehicle bookings:`, error);
    return [];
  }
}
