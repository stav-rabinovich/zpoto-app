"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const r = (0, express_1.Router)();
/**
 * GET /api/anonymous/bookings/active?deviceId={id}
 * החזרת הזמנות פעילות לאורח (תמיד empty - אורחים לא יכולים להזמין)
 */
r.get('/bookings/active', async (req, res, next) => {
    try {
        const { deviceId } = req.query;
        // ולידציה של Device ID
        if (!deviceId || typeof deviceId !== 'string') {
            return res.status(400).json({ error: 'Device ID is required' });
        }
        // אורחים לא יכולים להזמין, אז תמיד נחזיר רשימה ריקה
        console.log('📱 Anonymous bookings/active request for deviceId:', deviceId);
        res.json({ data: [] });
    }
    catch (error) {
        console.error('Error in anonymous bookings/active:', error);
        next(error);
    }
});
/**
 * GET /api/anonymous/recent-searches?deviceId={id}
 * קבלת חיפושים אחרונים לפי Device ID (ללא authentication)
 */
r.get('/recent-searches', async (req, res, next) => {
    try {
        const { deviceId } = req.query;
        const limit = parseInt(req.query.limit) || 10;
        // ולידציה של Device ID
        if (!deviceId || typeof deviceId !== 'string') {
            return res.status(400).json({ error: 'Device ID is required' });
        }
        const recentSearches = await prisma_1.prisma.anonymousRecentSearch.findMany({
            where: { deviceId },
            orderBy: { createdAt: 'desc' },
            take: Math.min(limit, 50), // מקסימום 50
            select: {
                id: true,
                query: true,
                lat: true,
                lng: true,
                createdAt: true
                // לא מחזירים deviceId מסיבות אבטחה
            }
        });
        res.json({ data: recentSearches });
    }
    catch (e) {
        console.error('Error fetching anonymous recent searches:', e);
        next(e);
    }
});
/**
 * POST /api/anonymous/recent-searches
 * הוספת חיפוש חדש לרשימה (ללא authentication)
 * Body: { deviceId, query, lat?, lng? }
 */
r.post('/recent-searches', async (req, res, next) => {
    try {
        const { deviceId, query, lat, lng } = req.body;
        // ולידציה
        if (!deviceId || typeof deviceId !== 'string') {
            return res.status(400).json({ error: 'Device ID is required' });
        }
        if (!query?.trim()) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        const searchQuery = query.trim();
        // בדיקה אם החיפוש כבר קיים (למנוע כפילויות)
        const existingSearch = await prisma_1.prisma.anonymousRecentSearch.findFirst({
            where: {
                deviceId,
                query: searchQuery
            }
        });
        if (existingSearch) {
            // עדכון התאריך של החיפוש הקיים
            const updatedSearch = await prisma_1.prisma.anonymousRecentSearch.update({
                where: { id: existingSearch.id },
                data: {
                    createdAt: new Date(),
                    ...(lat !== undefined && { lat }),
                    ...(lng !== undefined && { lng })
                },
                select: {
                    id: true,
                    query: true,
                    lat: true,
                    lng: true,
                    createdAt: true
                }
            });
            return res.json({ data: updatedSearch });
        }
        // יצירת חיפוש חדש
        const recentSearch = await prisma_1.prisma.anonymousRecentSearch.create({
            data: {
                deviceId,
                query: searchQuery,
                lat: lat || null,
                lng: lng || null
            },
            select: {
                id: true,
                query: true,
                lat: true,
                lng: true,
                createdAt: true
            }
        });
        // שמירה על מקסימום 20 חיפושים אחרונים לכל device
        const searchCount = await prisma_1.prisma.anonymousRecentSearch.count({
            where: { deviceId }
        });
        if (searchCount > 20) {
            // מחיקת החיפושים הישנים ביותר
            const oldSearches = await prisma_1.prisma.anonymousRecentSearch.findMany({
                where: { deviceId },
                orderBy: { createdAt: 'asc' },
                take: searchCount - 20,
                select: { id: true }
            });
            if (oldSearches.length > 0) {
                await prisma_1.prisma.anonymousRecentSearch.deleteMany({
                    where: {
                        id: { in: oldSearches.map(s => s.id) }
                    }
                });
            }
        }
        res.status(201).json({ data: recentSearch });
    }
    catch (e) {
        console.error('Error creating anonymous recent search:', e);
        next(e);
    }
});
/**
 * DELETE /api/anonymous/recent-searches/:id?deviceId={deviceId}
 * מחיקת חיפוש ספציפי (ללא authentication)
 */
r.delete('/recent-searches/:id', async (req, res, next) => {
    try {
        const { deviceId } = req.query;
        const searchId = parseInt(req.params.id);
        // ולידציה
        if (!deviceId || typeof deviceId !== 'string') {
            return res.status(400).json({ error: 'Device ID is required' });
        }
        if (isNaN(searchId)) {
            return res.status(400).json({ error: 'Invalid search ID' });
        }
        // וידוא שהחיפוש שייך ל-Device ID
        const existingSearch = await prisma_1.prisma.anonymousRecentSearch.findFirst({
            where: { id: searchId, deviceId }
        });
        if (!existingSearch) {
            return res.status(404).json({ error: 'Anonymous recent search not found' });
        }
        await prisma_1.prisma.anonymousRecentSearch.delete({
            where: { id: searchId }
        });
        res.json({ message: 'Anonymous recent search deleted successfully' });
    }
    catch (e) {
        console.error('Error deleting specific anonymous recent search:', e);
        next(e);
    }
});
/**
 * DELETE /api/anonymous/recent-searches?deviceId={deviceId}
 * מחיקת כל החיפושים האחרונים לפי Device ID (ללא authentication)
 */
r.delete('/recent-searches', async (req, res, next) => {
    try {
        const { deviceId } = req.query;
        // ולידציה של Device ID
        if (!deviceId || typeof deviceId !== 'string') {
            return res.status(400).json({ error: 'Device ID is required' });
        }
        const result = await prisma_1.prisma.anonymousRecentSearch.deleteMany({
            where: { deviceId }
        });
        res.json({
            message: 'All anonymous recent searches deleted successfully',
            deletedCount: result.count
        });
    }
    catch (e) {
        console.error('Error deleting anonymous recent searches:', e);
        next(e);
    }
});
/**
 * GET /api/anonymous/saved-places?deviceId={id}
 * קבלת מקומות שמורים לפי Device ID (ללא authentication)
 */
r.get('/saved-places', async (req, res, next) => {
    try {
        const { deviceId } = req.query;
        const limit = parseInt(req.query.limit) || 50;
        // ולידציה של Device ID
        if (!deviceId || typeof deviceId !== 'string') {
            return res.status(400).json({ error: 'Device ID is required' });
        }
        const savedPlaces = await prisma_1.prisma.anonymousSavedPlace.findMany({
            where: { deviceId },
            orderBy: { createdAt: 'desc' },
            take: Math.min(limit, 100), // מקסימום 100
            select: {
                id: true,
                name: true,
                address: true,
                lat: true,
                lng: true,
                type: true,
                createdAt: true
                // לא מחזירים deviceId מסיבות אבטחה
            }
        });
        res.json({ data: savedPlaces });
    }
    catch (e) {
        console.error('Error fetching anonymous saved places:', e);
        next(e);
    }
});
/**
 * POST /api/anonymous/saved-places
 * הוספת מקום שמור חדש (ללא authentication)
 * Body: { deviceId, name, address, lat, lng, type }
 */
r.post('/saved-places', async (req, res, next) => {
    try {
        const { deviceId, name, address, lat, lng, type } = req.body;
        // ולידציה
        if (!deviceId || typeof deviceId !== 'string') {
            return res.status(400).json({ error: 'Device ID is required' });
        }
        if (!name?.trim()) {
            return res.status(400).json({ error: 'Place name is required' });
        }
        if (!address?.trim()) {
            return res.status(400).json({ error: 'Address is required' });
        }
        if (typeof lat !== 'number' || typeof lng !== 'number') {
            return res.status(400).json({ error: 'Valid coordinates (lat, lng) are required' });
        }
        const validTypes = ['home', 'work', 'custom'];
        if (!type || !validTypes.includes(type)) {
            return res.status(400).json({ error: 'Valid type is required (home, work, custom)' });
        }
        // בדיקה אם המקום כבר קיים (למנוע כפילויות)
        const existingPlace = await prisma_1.prisma.anonymousSavedPlace.findFirst({
            where: {
                deviceId,
                name: name.trim(),
                type
            }
        });
        if (existingPlace) {
            return res.status(200).json({ data: existingPlace });
        }
        // יצירת מקום שמור חדש
        const savedPlace = await prisma_1.prisma.anonymousSavedPlace.create({
            data: {
                deviceId,
                name: name.trim(),
                address: address.trim(),
                lat,
                lng,
                type
            },
            select: {
                id: true,
                name: true,
                address: true,
                lat: true,
                lng: true,
                type: true,
                createdAt: true
            }
        });
        // שמירה על מקסימום 20 מקומות שמורים לכל device
        const placesCount = await prisma_1.prisma.anonymousSavedPlace.count({
            where: { deviceId }
        });
        if (placesCount > 20) {
            // מחיקת המקומות הישנים ביותר
            const oldPlaces = await prisma_1.prisma.anonymousSavedPlace.findMany({
                where: { deviceId },
                orderBy: { createdAt: 'asc' },
                take: placesCount - 20,
                select: { id: true }
            });
            if (oldPlaces.length > 0) {
                await prisma_1.prisma.anonymousSavedPlace.deleteMany({
                    where: {
                        id: { in: oldPlaces.map(p => p.id) }
                    }
                });
            }
        }
        res.status(201).json({ data: savedPlace });
    }
    catch (e) {
        console.error('Error creating anonymous saved place:', e);
        next(e);
    }
});
/**
 * DELETE /api/anonymous/saved-places/:id?deviceId={deviceId}
 * מחיקת מקום שמור ספציפי (ללא authentication)
 */
r.delete('/saved-places/:id', async (req, res, next) => {
    try {
        const { deviceId } = req.query;
        const placeId = parseInt(req.params.id);
        // ולידציה
        if (!deviceId || typeof deviceId !== 'string') {
            return res.status(400).json({ error: 'Device ID is required' });
        }
        if (isNaN(placeId)) {
            return res.status(400).json({ error: 'Invalid place ID' });
        }
        // וידוא שהמקום שייך ל-Device ID
        const existingPlace = await prisma_1.prisma.anonymousSavedPlace.findFirst({
            where: { id: placeId, deviceId }
        });
        if (!existingPlace) {
            return res.status(404).json({ error: 'Anonymous saved place not found' });
        }
        await prisma_1.prisma.anonymousSavedPlace.delete({
            where: { id: placeId }
        });
        res.json({ message: 'Anonymous saved place deleted successfully' });
    }
    catch (e) {
        console.error('Error deleting anonymous saved place:', e);
        next(e);
    }
});
/**
 * DELETE /api/anonymous/saved-places?deviceId={deviceId}
 * מחיקת כל המקומות השמורים לפי Device ID (ללא authentication)
 */
r.delete('/saved-places', async (req, res, next) => {
    try {
        const { deviceId } = req.query;
        // ולידציה של Device ID
        if (!deviceId || typeof deviceId !== 'string') {
            return res.status(400).json({ error: 'Device ID is required' });
        }
        const result = await prisma_1.prisma.anonymousSavedPlace.deleteMany({
            where: { deviceId }
        });
        res.json({
            message: 'All anonymous saved places deleted successfully',
            deletedCount: result.count
        });
    }
    catch (e) {
        console.error('Error deleting all anonymous saved places:', e);
        next(e);
    }
});
/**
 * GET /api/anonymous/favorites?deviceId={id}
 * קבלת מועדפים לפי Device ID (ללא authentication)
 */
r.get('/favorites', async (req, res, next) => {
    try {
        const { deviceId } = req.query;
        if (!deviceId || typeof deviceId !== 'string') {
            return res.status(400).json({ error: 'Device ID is required' });
        }
        const favorites = await prisma_1.prisma.anonymousFavorite.findMany({
            where: { deviceId },
            include: {
                parking: {
                    select: {
                        id: true,
                        title: true,
                        address: true,
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
                                email: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ data: favorites });
    }
    catch (e) {
        console.error('Error fetching anonymous favorites:', e);
        next(e);
    }
});
/**
 * POST /api/anonymous/favorites
 * הוספת חניה למועדפים אנונימיים
 * Body: { deviceId, parkingId }
 */
r.post('/favorites', async (req, res, next) => {
    try {
        console.log('🚀 POST /api/anonymous/favorites - received request');
        console.log('📦 Request body:', req.body);
        const { deviceId, parkingId } = req.body;
        console.log('📝 Parsed - deviceId:', deviceId, 'parkingId:', parkingId);
        if (!deviceId || typeof deviceId !== 'string') {
            console.log('❌ Invalid deviceId:', deviceId);
            return res.status(400).json({ error: 'Device ID is required' });
        }
        if (typeof parkingId !== 'number') {
            console.log('❌ Invalid parkingId:', parkingId, 'type:', typeof parkingId);
            return res.status(400).json({ error: 'Valid parking ID is required' });
        }
        // בדיקה שהחניה קיימת ופעילה
        const parking = await prisma_1.prisma.parking.findUnique({
            where: { id: parkingId }
        });
        if (!parking) {
            return res.status(404).json({ error: 'Parking not found' });
        }
        if (!parking.isActive) {
            return res.status(400).json({ error: 'Cannot add inactive parking to favorites' });
        }
        // בדיקה שהחניה לא כבר במועדפים
        const existingFavorite = await prisma_1.prisma.anonymousFavorite.findUnique({
            where: {
                deviceId_parkingId: {
                    deviceId,
                    parkingId
                }
            }
        });
        if (existingFavorite) {
            // החזרת המועדף הקיים במקום שגיאה
            const favoriteWithParking = await prisma_1.prisma.anonymousFavorite.findUnique({
                where: {
                    deviceId_parkingId: {
                        deviceId,
                        parkingId
                    }
                },
                include: {
                    parking: {
                        select: {
                            id: true,
                            title: true,
                            address: true,
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
                                    email: true
                                }
                            }
                        }
                    }
                }
            });
            return res.status(200).json({ data: favoriteWithParking });
        }
        // יצירת מועדף חדש
        const favorite = await prisma_1.prisma.anonymousFavorite.create({
            data: {
                deviceId,
                parkingId
            },
            include: {
                parking: {
                    select: {
                        id: true,
                        title: true,
                        address: true,
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
                                email: true
                            }
                        }
                    }
                }
            }
        });
        res.status(201).json({ data: favorite });
    }
    catch (e) {
        console.error('Error creating anonymous favorite:', e);
        next(e);
    }
});
/**
 * DELETE /api/anonymous/favorites/:parkingId?deviceId={deviceId}
 * הסרת חניה ממועדפים אנונימיים
 */
r.delete('/favorites/:parkingId', async (req, res, next) => {
    try {
        const { deviceId } = req.query;
        const parkingId = parseInt(req.params.parkingId);
        if (!deviceId || typeof deviceId !== 'string') {
            return res.status(400).json({ error: 'Device ID is required' });
        }
        if (isNaN(parkingId)) {
            return res.status(400).json({ error: 'Invalid parking ID' });
        }
        // בדיקה שהמועדף קיים
        const existingFavorite = await prisma_1.prisma.anonymousFavorite.findUnique({
            where: {
                deviceId_parkingId: {
                    deviceId,
                    parkingId
                }
            }
        });
        if (!existingFavorite) {
            return res.status(404).json({ error: 'Favorite not found' });
        }
        await prisma_1.prisma.anonymousFavorite.delete({
            where: {
                deviceId_parkingId: {
                    deviceId,
                    parkingId
                }
            }
        });
        res.json({ message: 'Parking removed from favorites successfully' });
    }
    catch (e) {
        console.error('Error removing anonymous favorite:', e);
        next(e);
    }
});
exports.default = r;
