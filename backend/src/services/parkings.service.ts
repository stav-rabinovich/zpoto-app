import { prisma } from '../lib/prisma';

/** רשימת חניות (מהחדש לישן) */
export async function listParkings() {
  return prisma.parking.findMany({
    orderBy: { id: 'desc' },
  });
}

/** יצירת חניה חדשה עם ownerId (לא Nested Write) */
export async function createParking(input: {
  title: string;
  address: string;
  lat: number;
  lng: number;
  priceHr: number;
  ownerId: number;
}) {
  return prisma.parking.create({
    data: {
      title: input.title,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      priceHr: input.priceHr,
      ownerId: input.ownerId, // << כאן ה־ownerId נכתב ישירות
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
