import { prisma } from '../lib/prisma';

/**
 * רשימת כל בקשות הפרסום
 */
export async function listListingRequests(filters?: { status?: string }) {
  return prisma.listingRequest.findMany({
    where: filters?.status ? { status: filters.status } : undefined,
    include: {
      user: {
        select: { id: true, email: true, role: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * שליפת בקשה בודדת
 */
export async function getListingRequest(id: number) {
  return prisma.listingRequest.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, email: true, role: true },
      },
    },
  });
}

/**
 * אישור בקשה - יוצר Parking חדש ומעדכן סטטוס
 */
export async function approveListingRequest(id: number) {
  const request = await prisma.listingRequest.findUnique({
    where: { id },
  });

  if (!request) throw new Error('REQUEST_NOT_FOUND');
  if (request.status !== 'PENDING') throw new Error('REQUEST_ALREADY_PROCESSED');

  // יצירת חניה חדשה
  // אם יש fullAddress ו-city, השתמש בהם. אחרת השתמש ב-address
  const parkingAddress = request.fullAddress && request.city 
    ? `${request.fullAddress}, ${request.city}`
    : request.address;
    
  const parking = await prisma.parking.create({
    data: {
      title: parkingAddress,
      address: parkingAddress,
      lat: request.lat,
      lng: request.lng,
      priceHr: request.priceHr || 15, // ברירת מחדל
      ownerId: request.userId,
      isActive: true,
    },
  });

  // עדכון סטטוס הבקשה
  const updatedRequest = await prisma.listingRequest.update({
    where: { id },
    data: { status: 'APPROVED' },
  });

  // שינוי תפקיד המשתמש ל-OWNER
  await prisma.user.update({
    where: { id: request.userId },
    data: { role: 'OWNER' },
  });

  return { request: updatedRequest, parking };
}

/**
 * דחיית בקשה
 */
export async function rejectListingRequest(id: number, reason?: string) {
  const request = await prisma.listingRequest.findUnique({
    where: { id },
  });

  if (!request) throw new Error('REQUEST_NOT_FOUND');
  if (request.status !== 'PENDING') throw new Error('REQUEST_ALREADY_PROCESSED');

  return prisma.listingRequest.update({
    where: { id },
    data: {
      status: 'REJECTED',
      rejectionReason: reason || 'No reason provided',
    },
  });
}

/**
 * נתונים סטטיסטיים כלליים
 */
export async function getStats() {
  const [totalUsers, totalParkings, totalBookings, totalRequests] = await Promise.all([
    prisma.user.count(),
    prisma.parking.count(),
    prisma.booking.count(),
    prisma.listingRequest.count(),
  ]);

  const pendingRequests = await prisma.listingRequest.count({
    where: { status: 'PENDING' },
  });

  const confirmedBookings = await prisma.booking.count({
    where: { status: 'CONFIRMED' },
  });

  // חישוב הכנסות (סכום totalPriceCents)
  const bookingsWithPrice = await prisma.booking.findMany({
    where: {
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
    totalUsers,
    totalParkings,
    totalBookings,
    totalRequests,
    pendingRequests,
    confirmedBookings,
    totalRevenueCents,
    totalRevenueILS: (totalRevenueCents / 100).toFixed(2),
  };
}

/**
 * רשימת כל המשתמשים - עם הזמנות לחישוב שעות
 */
export async function listUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      bookings: {
        select: {
          startTime: true,
          endTime: true,
        },
      },
      _count: {
        select: {
          ownedParkings: true,
          bookings: true,
          listingRequests: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * רשימת כל ההזמנות עם פילטרים
 */
export async function listAllBookings(filters?: { status?: string; userId?: number; parkingId?: number }) {
  return prisma.booking.findMany({
    where: {
      status: filters?.status,
      userId: filters?.userId,
      parkingId: filters?.parkingId,
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
