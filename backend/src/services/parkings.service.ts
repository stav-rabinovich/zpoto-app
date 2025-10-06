import { prisma } from '../lib/prisma';

/** רשימת חניות (מהחדש לישן) - עם פרטי בעלים */
export async function listParkings() {
  return prisma.parking.findMany({
    orderBy: { id: 'desc' },
    include: {
      owner: {
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              ownedParkings: true,
              listingRequests: true,
            }
          },
          listingRequests: {
            select: {
              id: true,
              onboarding: true,
              status: true,
            },
            where: {
              status: 'APPROVED'
            },
            take: 1,
          }
        }
      }
    }
  });
}

/** יצירת חניה חדשה עם ownerId (לא Nested Write) */
export async function createParking(input: {
  address: string;
  lat: number;
  lng: number;
  priceHr: number;
  ownerId: number;
}) {
  return prisma.parking.create({
    data: {
      title: input.address, // הכותרת היא הכתובת
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      priceHr: input.priceHr,
      ownerId: input.ownerId,
    },
  });
}

/** שליפה לפי מזהה */
export async function getParking(id: number) {
  return prisma.parking.findUnique({
    where: { id },
  });
}

/** עדכון (בדיקת בעלות נעשית ברמה של הראוטר) */
export async function updateParking(
  id: number,
  patch: Partial<{
    title: string;
    address: string;
    lat: number;
    lng: number;
    priceHr: number;
    isActive: boolean;
  }>
) {
  return prisma.parking.update({
    where: { id },
    data: patch,
  });
}

/** מחיקה */
export async function deleteParking(id: number) {
  await prisma.parking.delete({ where: { id } });
}

/**
 * חיפוש חניות לפי מיקום וזמן
 * @param lat - קו רוחב מרכז החיפוש
 * @param lng - קו אורך מרכז החיפוש
 * @param radiusKm - רדיוס בקילומטרים (ברירת מחדל 5)
 * @param startTime - זמן התחלה (אופציונלי)
 * @param endTime - זמן סיום (אופציונלי)
 */
export async function searchParkings(params: {
  lat: number;
  lng: number;
  radiusKm?: number;
  startTime?: Date;
  endTime?: Date;
}) {
  const { lat, lng, radiusKm = 5, startTime, endTime } = params;

  // חישוב bounding box (קירוב פשוט)
  // 1 מעלה ≈ 111 ק"מ
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

  const minLat = lat - latDelta;
  const maxLat = lat + latDelta;
  const minLng = lng - lngDelta;
  const maxLng = lng + lngDelta;

  // שליפת חניות פעילות בטווח
  const parkings = await prisma.parking.findMany({
    where: {
      isActive: true,
      lat: { gte: minLat, lte: maxLat },
      lng: { gte: minLng, lte: maxLng },
    },
  });

  // אם יש תאריכים - סינון לפי זמינות
  if (startTime && endTime) {
    const parkingsWithAvailability = await Promise.all(
      parkings.map(async (parking) => {
        // בדיקת חפיפות
        const conflict = await prisma.booking.findFirst({
          where: {
            parkingId: parking.id,
            NOT: [
              { endTime: { lte: startTime } },
              { startTime: { gte: endTime } },
            ],
            status: { not: 'CANCELLED' },
          },
          select: { id: true },
        });

        return {
          ...parking,
          available: !conflict,
        };
      })
    );

    // החזרת רק חניות זמינות
    return parkingsWithAvailability.filter((p) => p.available);
  }

  // אם אין תאריכים - החזרת כל החניות בטווח
  return parkings.map((p) => ({ ...p, available: true }));
}
