import { prisma } from '../lib/prisma';

/**
 * מחזיר את כל ההזמנות.
 */
export async function listBookings() {
  return prisma.booking.findMany({
    orderBy: { id: 'desc' },
  });
}

/**
 * בדיקת חפיפה.
 */
async function hasOverlap(params: { parkingId: number; startTime: Date; endTime: Date }) {
  const { parkingId, startTime, endTime } = params;
  const conflict = await prisma.booking.findFirst({
    where: {
      parkingId,
      NOT: [
        { endTime: { lte: startTime } },
        { startTime: { gte: endTime } },
      ],
      status: { not: 'CANCELLED' },
    },
    select: { id: true },
  });
  return Boolean(conflict);
}

/**
 * יצירת הזמנה חדשה עם קיבוע מחיר.
 */
export async function createBooking(input: {
  userId: number;
  parkingId: number;
  startTime: Date;
  endTime: Date;
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
}) {
  if (!(input.startTime instanceof Date) || !(input.endTime instanceof Date)) {
    throw new Error('INVALID_DATES');
  }
  if (input.endTime <= input.startTime) {
    throw new Error('INVALID_RANGE');
  }

  const overlap = await hasOverlap({
    parkingId: input.parkingId,
    startTime: input.startTime,
    endTime: input.endTime,
  });
  if (overlap) {
    throw new Error('OVERLAP');
  }

  // שליפת המחיר לשעה מהחניה
  const parking = await prisma.parking.findUnique({
    where: { id: input.parkingId },
    select: { priceHr: true },
  });
  if (!parking) {
    throw new Error('PARKING_NOT_FOUND');
  }

  // חישוב סך הכל
  const ms = input.endTime.getTime() - input.startTime.getTime();
  const hours = ms / 1000 / 60 / 60;
  const priceHrCents = Math.round(parking.priceHr * 100);
  const totalPriceCents = Math.round(hours * priceHrCents);

  return prisma.booking.create({
    data: {
      userId: input.userId,
      parkingId: input.parkingId,
      startTime: input.startTime,
      endTime: input.endTime,
      status: input.status ?? 'PENDING',
      priceHrCentsAtBooking: priceHrCents,
      totalPriceCents,
    },
  });
}

/** שליפה לפי מזהה */
export async function getBooking(id: number) {
  return prisma.booking.findUnique({ where: { id } });
}

/** עדכון סטטוס */
export async function updateBookingStatus(id: number, status: 'PENDING' | 'CONFIRMED' | 'CANCELLED') {
  return prisma.booking.update({
    where: { id },
    data: { status },
  });
}

/** ביטול הזמנה */
export async function cancelBooking(id: number) {
  return prisma.booking.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });
}
