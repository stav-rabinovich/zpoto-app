"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllChats = getAllChats;
exports.getChatsByUser = getChatsByUser;
exports.sendMessage = sendMessage;
exports.deleteMessage = deleteMessage;
const prisma_1 = require("../lib/prisma");
/**
 * קבלת כל הצ'אטים (לאדמין)
 */
async function getAllChats() {
    return prisma_1.prisma.chat.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                },
            },
            parking: {
                select: {
                    id: true,
                    title: true,
                    address: true,
                },
            },
        },
    });
}
/**
 * קבלת צ'אטים של משתמש מסוים
 */
async function getChatsByUser(userId) {
    return prisma_1.prisma.chat.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        include: {
            parking: {
                select: {
                    id: true,
                    title: true,
                    address: true,
                },
            },
        },
    });
}
/**
 * שליחת הודעה חדשה
 */
async function sendMessage(input) {
    return prisma_1.prisma.chat.create({
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
                },
            },
            parking: {
                select: {
                    id: true,
                    title: true,
                    address: true,
                },
            },
        },
    });
}
/**
 * מחיקת הודעה
 */
async function deleteMessage(id) {
    return prisma_1.prisma.chat.delete({
        where: { id },
    });
}
