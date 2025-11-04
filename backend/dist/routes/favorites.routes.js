"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const prisma_1 = require("../lib/prisma");
const r = (0, express_1.Router)();
/**
 * GET /api/favorites
 * קבלת כל החניות המועדפות של המשתמש
 */
r.get('/', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        const favorites = await prisma_1.prisma.favorite.findMany({
            where: { userId },
            include: {
                parking: {
                    select: {
                        id: true,
                        title: true,
                        lat: true,
                        lng: true,
                        priceHr: true,
                        isActive: true,
                        approvalMode: true,
                        createdAt: true,
                        owner: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ data: favorites });
    }
    catch (e) {
        next(e);
    }
});
/**
 * POST /api/favorites
 * הוספת חניה למועדפים
 */
r.post('/', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        const { parkingId } = req.body;
        // ולידציה
        if (typeof parkingId !== 'number') {
            return res.status(400).json({ error: 'Valid parking ID is required' });
        }
        // בדיקה שהחניה קיימת ופעילה
        const parking = await prisma_1.prisma.parking.findUnique({
            where: { id: parkingId },
        });
        if (!parking) {
            return res.status(404).json({ error: 'Parking not found' });
        }
        if (!parking.isActive) {
            return res.status(400).json({ error: 'Cannot add inactive parking to favorites' });
        }
        // בדיקה שהחניה לא כבר במועדפים
        const existingFavorite = await prisma_1.prisma.favorite.findUnique({
            where: {
                userId_parkingId: {
                    userId,
                    parkingId,
                },
            },
        });
        if (existingFavorite) {
            return res.status(400).json({ error: 'Parking is already in favorites' });
        }
        // יצירת מועדף חדש
        const favorite = await prisma_1.prisma.favorite.create({
            data: {
                userId,
                parkingId,
            },
            include: {
                parking: {
                    select: {
                        id: true,
                        title: true,
                        lat: true,
                        lng: true,
                        priceHr: true,
                        isActive: true,
                        approvalMode: true,
                        createdAt: true,
                        owner: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });
        res.status(201).json({ data: favorite });
    }
    catch (e) {
        next(e);
    }
});
/**
 * DELETE /api/favorites/:parkingId
 * הסרת חניה ממועדפים
 */
r.delete('/:parkingId', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        const parkingId = parseInt(req.params.parkingId);
        if (isNaN(parkingId)) {
            return res.status(400).json({ error: 'Invalid parking ID' });
        }
        // בדיקה שהמועדף קיים
        const existingFavorite = await prisma_1.prisma.favorite.findUnique({
            where: {
                userId_parkingId: {
                    userId,
                    parkingId,
                },
            },
        });
        if (!existingFavorite) {
            return res.status(404).json({ error: 'Favorite not found' });
        }
        await prisma_1.prisma.favorite.delete({
            where: {
                userId_parkingId: {
                    userId,
                    parkingId,
                },
            },
        });
        res.json({ message: 'Parking removed from favorites successfully' });
    }
    catch (e) {
        next(e);
    }
});
/**
 * GET /api/favorites/check/:parkingId
 * בדיקה אם חניה ספציפית במועדפים
 */
r.get('/check/:parkingId', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        const parkingId = parseInt(req.params.parkingId);
        if (isNaN(parkingId)) {
            return res.status(400).json({ error: 'Invalid parking ID' });
        }
        const favorite = await prisma_1.prisma.favorite.findUnique({
            where: {
                userId_parkingId: {
                    userId,
                    parkingId,
                },
            },
        });
        res.json({
            data: {
                isFavorite: !!favorite,
                favoriteId: favorite?.id || null,
            },
        });
    }
    catch (e) {
        next(e);
    }
});
/**
 * DELETE /api/favorites
 * מחיקת כל המועדפים
 */
r.delete('/', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        const result = await prisma_1.prisma.favorite.deleteMany({
            where: { userId },
        });
        res.json({
            message: 'All favorites deleted successfully',
            deletedCount: result.count,
        });
    }
    catch (e) {
        next(e);
    }
});
exports.default = r;
