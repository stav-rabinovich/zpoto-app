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

  return prisma.parking.update({
    where: { id: parkingId },
    data: patch,
  });
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
    select: { totalPriceCents: true },
  });

  const totalRevenueCents = bookingsWithPrice.reduce(
    (sum, b) => sum + (b.totalPriceCents || 0),
    0
  );

  return {
    totalParkings,
    totalBookings,
    confirmedBookings,
    totalRevenueCents,
    totalRevenueILS: (totalRevenueCents / 100).toFixed(2),
  };
}
