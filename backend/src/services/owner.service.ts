import { prisma } from '../lib/prisma';

/**
 * הגשת בקשה חדשה להיות בעל חניה
 */
export async function createListingRequest(input: {
  userId: number;
  title: string;
  address: string;
  fullAddress?: string;
  city?: string;
  lat: number;
  lng: number;
  priceHr: number;
  description?: string;
  phone?: string;
  onboarding?: string;
}) {
  console.log('📝 Creating listing request in service:', input);

  try {
    const result = await prisma.listingRequest.create({
      data: {
        userId: input.userId,
        title: input.title,
        address: input.address,
        fullAddress: input.fullAddress,
        city: input.city,
        lat: input.lat,
        lng: input.lng,
        priceHr: input.priceHr,
        description: input.description,
        phone: input.phone,
        onboarding: input.onboarding,
        status: 'PENDING',
      },
    });

    console.log('✅ Listing request created in DB:', result);
    return result;
  } catch (error) {
    console.error('❌ Database error creating listing request:', error);
    throw error;
  }
}

/**
 * רשימת הבקשות של המשתמש
 */
export async function getMyListingRequests(userId: number) {
  return prisma.listingRequest.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * רשימת החניות של הבעלים
 */
export async function getMyParkings(ownerId: number) {
  return prisma.parking.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * קבלת חניה בודדת (רק בעלים יכול)
 */
export async function getMyParking(parkingId: number, ownerId: number) {
  const parking = await prisma.parking.findFirst({
    where: { id: parkingId, ownerId },
  });
  if (!parking) throw new Error('Parking not found or not owned by you');
  return parking;
}

/**
 * עדכון חניה (רק בעלים יכול)
 */
export async function updateMyParking(
  parkingId: number,
  ownerId: number,
  patch: Partial<{
    title: string;
    address: string;
    lat: number;
    lng: number;
    priceHr: number;
    isActive: boolean;
    availability: string;
    pricing: string;
  }>
) {
  // בדיקה שהחניה שייכת לבעלים
  const parking = await prisma.parking.findUnique({
    where: { id: parkingId },
    select: { ownerId: true },
  });

  if (!parking) throw new Error('PARKING_NOT_FOUND');
  if (parking.ownerId !== ownerId) throw new Error('FORBIDDEN');

  console.log(`🔄 Updating parking ${parkingId} with patch:`, patch);

  // אם יש pricing, נדפיס אותו
  if (patch.pricing) {
    try {
      const pricingData = JSON.parse(patch.pricing);
      console.log(`💰 Parsed pricing data:`, pricingData);
    } catch (error) {
      console.log(`❌ Failed to parse pricing:`, error);
    }
  }

  const result = await prisma.parking.update({
    where: { id: parkingId },
    data: patch,
  });

  console.log(`✅ Updated parking ${parkingId} successfully`);
  console.log(`📊 New pricing:`, result.pricing);
  return result;
}

/**
 * רשימת הזמנות לחניות של הבעלים
 */
export async function getMyBookings(ownerId: number) {
  return prisma.booking.findMany({
    where: {
      parking: {
        ownerId,
      },
    },
    include: {
      user: {
        select: { id: true, email: true },
      },
      parking: {
        select: { id: true, title: true, address: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * סטטיסטיקות של הבעלים
 */
export async function getMyStats(ownerId: number) {
  const [totalParkings, totalBookings] = await Promise.all([
    prisma.parking.count({ where: { ownerId } }),
    prisma.booking.count({
      where: {
        parking: { ownerId },
      },
    }),
  ]);

  const confirmedBookings = await prisma.booking.count({
    where: {
      parking: { ownerId },
      status: 'CONFIRMED',
    },
  });

  // הכנסות
  const bookingsWithPrice = await prisma.booking.findMany({
    where: {
      parking: { ownerId },
      status: 'CONFIRMED',
      totalPriceCents: { not: null },
    },
    select: { totalPriceCents: true, paymentStatus: true, createdAt: true },
  });

  console.log(`💰 Owner ${ownerId} stats calculation:`);
  console.log(`💰 Found ${bookingsWithPrice.length} confirmed bookings with price`);
  bookingsWithPrice.forEach((booking, index) => {
    console.log(
      `💰 Booking ${index + 1}: ₪${(booking.totalPriceCents || 0) / 100} (${booking.paymentStatus}) - ${booking.createdAt}`
    );
  });

  const totalRevenueCents = bookingsWithPrice.reduce((sum, b) => sum + (b.totalPriceCents || 0), 0);

  console.log(
    `💰 Total revenue for owner ${ownerId}: ₪${totalRevenueCents / 100} (${totalRevenueCents} cents)`
  );

  return {
    totalParkings,
    totalBookings,
    confirmedBookings,
    totalRevenueCents,
    totalRevenueILS: (totalRevenueCents / 100).toFixed(2),
  };
}

/**
 * בדיקת התנגשויות הזמנות עם בלוקי זמן שרוצים להסיר מהזמינות
 */
export async function checkBookingConflicts(
  parkingId: number,
  dayKey: string,
  timeSlotsToRemove: number[]
): Promise<any[]> {
  console.log(
    `🔍 Checking booking conflicts for parking ${parkingId}, day ${dayKey}, slots:`,
    timeSlotsToRemove
  );

  // מיפוי ימים לmספרי יום בשבוע (0=ראשון, 1=שני, וכו')
  const dayMapping: { [key: string]: number } = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const dayOfWeek = dayMapping[dayKey];
  if (dayOfWeek === undefined) {
    throw new Error(`Invalid day key: ${dayKey}`);
  }

  // חישוב טווח שעות מבלוקי הזמן
  const timeRanges = timeSlotsToRemove.map(slot => ({
    start: slot,
    end: slot + 4, // כל בלוק הוא 4 שעות
  }));

  // חיפוש הזמנות שמתנגשות עם הבלוקים שרוצים להסיר
  const conflicts = await prisma.booking.findMany({
    where: {
      parkingId,
      status: 'CONFIRMED',
      OR: timeRanges.map(range => ({
        AND: [
          // הזמנה מתחילה או מסתיימת בטווח הזמן הרלוונטי
          {
            startTime: {
              gte: new Date(), // רק הזמנות עתידיות
            },
          },
          // בדיקה שהיום בשבוע תואם
          {
            startTime: {
              // נבדוק שהיום בשבוע של ההזמנה תואם ליום שרוצים לשנות
              // זה מורכב יותר - נצטרך לבדוק כל הזמנה בנפרד
            },
          },
        ],
      })),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // סינון נוסף לפי יום בשבוע ושעות
  const filteredConflicts = conflicts.filter(booking => {
    const bookingStart = new Date(booking.startTime);
    const bookingEnd = new Date(booking.endTime);
    const bookingDayOfWeek = bookingStart.getDay();
    const bookingStartHour = bookingStart.getHours();
    const bookingEndHour = bookingEnd.getHours();

    // בדיקה שהיום תואם
    if (bookingDayOfWeek !== dayOfWeek) return false;

    // בדיקה שיש חפיפה עם אחד מהבלוקים
    return timeRanges.some(range => {
      return bookingStartHour < range.end && bookingEndHour > range.start;
    });
  });

  console.log(`📊 Found ${filteredConflicts.length} booking conflicts`);
  return filteredConflicts;
}
