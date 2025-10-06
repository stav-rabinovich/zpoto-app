import { prisma } from '../lib/prisma';

/**
 * קבלת כל הצ'אטים (לאדמין)
 */
export async function getAllChats() {
  return prisma.chat.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        }
      },
      parking: {
        select: {
          id: true,
          title: true,
          address: true,
        }
      }
    }
  });
}

/**
 * קבלת צ'אטים של משתמש מסוים
 */
export async function getChatsByUser(userId: number) {
  return prisma.chat.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: {
      parking: {
        select: {
          id: true,
          title: true,
          address: true,
        }
      }
    }
  });
}

/**
 * שליחת הודעה חדשה
 */
export async function sendMessage(input: {
  userId: number;
  message: string;
  isFromUser: boolean;
  parkingId?: number;
}) {
  return prisma.chat.create({
    data: {
      userId: input.userId,
      message: input.message,
      isFromUser: input.isFromUser,
      parkingId: input.parkingId,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        }
      },
      parking: {
        select: {
          id: true,
          title: true,
          address: true,
        }
      }
    }
  });
}

/**
 * מחיקת הודעה
 */
export async function deleteMessage(id: number) {
  return prisma.chat.delete({
    where: { id }
  });
}
