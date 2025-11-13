import { Router } from 'express';
import { auth, AuthedRequest } from '../middlewares/auth';
import { 
  checkVehicleBookingConflicts, 
  getActiveVehicleBookings 
} from '../services/vehicleBookingConflicts.service';

const r = Router();

/**
 * POST /api/bookings/check-vehicle-conflicts
 * בדיקת חפיפות הזמנות לרכב מסוים
 */
r.post('/check-vehicle-conflicts', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const {
      vehicleId,
      licensePlate,
      startTime,
      endTime,
      excludeBookingId
    } = req.body;

    console.log(`🚗 API: Checking vehicle conflicts for user ${userId}:`, {
      vehicleId,
      licensePlate,
      startTime,
      endTime,
      excludeBookingId
    });

    // ולידציה בסיסית
    if (!startTime || !endTime) {
      return res.status(400).json({
        error: 'Missing required fields: startTime, endTime'
      });
    }

    if (!vehicleId && !licensePlate) {
      return res.status(400).json({
        error: 'Either vehicleId or licensePlate must be provided'
      });
    }

    // המרת מחרוזות לתאריכים
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(endTime);

    // ולידציה של תאריכים
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format for startTime or endTime'
      });
    }

    if (endDateTime <= startDateTime) {
      return res.status(400).json({
        error: 'endTime must be after startTime'
      });
    }

    // בדיקת חפיפות
    const conflictCheck = await checkVehicleBookingConflicts(
      vehicleId ? parseInt(vehicleId) : null,
      licensePlate || null,
      startDateTime,
      endDateTime,
      excludeBookingId ? parseInt(excludeBookingId) : undefined,
      userId
    );

    console.log(`🚗 API: Conflict check result:`, {
      hasConflict: conflictCheck.hasConflict,
      conflictsCount: conflictCheck.conflictingBookings?.length || 0
    });

    // החזרת התוצאות
    res.json({
      success: true,
      hasConflict: conflictCheck.hasConflict,
      message: conflictCheck.message,
      conflictingBookings: conflictCheck.conflictingBookings || [],
      // נתונים נוספים לצורך UI
      vehicleIdentifier: vehicleId ? `vehicleId: ${vehicleId}` : `licensePlate: ${licensePlate}`,
      timeRange: {
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString()
      }
    });

  } catch (error) {
    console.error('🚗 API: Vehicle conflict check error:', error);
    next(error);
  }
});

/**
 * GET /api/bookings/vehicle-active/:vehicleId
 * קבלת הזמנות פעילות של רכב מסוים לפי vehicleId
 */
r.get('/vehicle-active/:vehicleId', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const vehicleId = parseInt(req.params.vehicleId);

    console.log(`🚗 API: Getting active bookings for vehicle ${vehicleId}, user ${userId}`);

    // בדיקה שהרכב שייך למשתמש
    const { prisma } = await import('../lib/prisma');
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        userId
      },
      select: {
        id: true,
        licensePlate: true
      }
    });

    if (!vehicle) {
      return res.status(404).json({
        error: 'Vehicle not found or does not belong to user'
      });
    }

    // קבלת הזמנות פעילות
    const activeBookings = await getActiveVehicleBookings(
      vehicleId,
      vehicle.licensePlate,
      userId
    );

    console.log(`🚗 API: Found ${activeBookings.length} active bookings for vehicle ${vehicleId}`);

    res.json({
      success: true,
      vehicle: {
        id: vehicle.id,
        licensePlate: vehicle.licensePlate
      },
      activeBookings,
      count: activeBookings.length
    });

  } catch (error) {
    console.error('🚗 API: Get active vehicle bookings error:', error);
    next(error);
  }
});

/**
 * POST /api/bookings/vehicle-active-by-plate
 * קבלת הזמנות פעילות של רכב מסוים לפי מספר רכב
 */
r.post('/vehicle-active-by-plate', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { licensePlate } = req.body;

    console.log(`🚗 API: Getting active bookings for license plate ${licensePlate}, user ${userId}`);

    if (!licensePlate) {
      return res.status(400).json({
        error: 'Missing required field: licensePlate'
      });
    }

    // קבלת הזמנות פעילות
    const activeBookings = await getActiveVehicleBookings(
      null,
      licensePlate,
      userId
    );

    console.log(`🚗 API: Found ${activeBookings.length} active bookings for license plate ${licensePlate}`);

    res.json({
      success: true,
      licensePlate,
      activeBookings,
      count: activeBookings.length
    });

  } catch (error) {
    console.error('🚗 API: Get active vehicle bookings by plate error:', error);
    next(error);
  }
});

export default r;
