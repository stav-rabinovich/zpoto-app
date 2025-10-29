"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const prisma_1 = require("../lib/prisma");
const r = (0, express_1.Router)();
/**
 * GET /api/migration/preview
 * תצוגה מקדימה של נתוני אורח זמינים למיגרציה
 * Query: ?deviceId=xxx
 */
r.get('/preview', async (req, res, next) => {
    try {
        const { deviceId } = req.query;
        console.log(`🔍 Getting migration preview for deviceId: ${deviceId}`);
        // ולידציה
        if (!deviceId || typeof deviceId !== 'string') {
            return res.status(400).json({
                error: 'Device ID is required',
                data: { counts: { total: 0, favorites: 0, savedPlaces: 0, recentSearches: 0 } }
            });
        }
        // ספירת נתונים זמינים למיגרציה
        const [favoritesCount, savedPlacesCount, recentSearchesCount] = await Promise.all([
            prisma_1.prisma.anonymousFavorite.count({ where: { deviceId } }),
            prisma_1.prisma.anonymousSavedPlace.count({ where: { deviceId } }),
            prisma_1.prisma.anonymousRecentSearch.count({ where: { deviceId } })
        ]);
        const totalCount = favoritesCount + savedPlacesCount + recentSearchesCount;
        console.log(`📊 Migration preview - Total: ${totalCount}, Favorites: ${favoritesCount}, SavedPlaces: ${savedPlacesCount}, RecentSearches: ${recentSearchesCount}`);
        // החזרת התוצאות
        return res.json({
            data: {
                counts: {
                    total: totalCount,
                    favorites: favoritesCount,
                    savedPlaces: savedPlacesCount,
                    recentSearches: recentSearchesCount
                },
                samples: {
                // ניתן להוסיף דוגמאות נתונים כאן אם נרצה
                }
            }
        });
    }
    catch (error) {
        console.error('❌ Error getting migration preview:', error);
        next(error);
    }
});
/**
 * POST /api/migration/anonymous-to-user
 * העברת נתוני אורח (Device ID) למשתמש רשום (User ID)
 * Body: { deviceId }
 */
r.post('/anonymous-to-user', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        const { deviceId } = req.body;
        console.log(`🔄 Starting migration for userId: ${userId}, deviceId: ${deviceId}`);
        // ולידציה
        if (!deviceId || typeof deviceId !== 'string') {
            return res.status(400).json({ error: 'Device ID is required' });
        }
        // התחלת טרנזקציה לוודא שכל הנתונים מועברים יחד
        const migrationResult = await prisma_1.prisma.$transaction(async (tx) => {
            const result = {
                favorites: { migrated: 0, skipped: 0 },
                savedPlaces: { migrated: 0, skipped: 0 },
                recentSearches: { migrated: 0, skipped: 0 },
                cleanup: { favorites: 0, savedPlaces: 0, recentSearches: 0 }
            };
            // נתחיל בלי הלוג עד שנעדכן את הסכמה
            // 1. העברת מועדפים אנונימיים
            console.log('📋 Migrating anonymous favorites...');
            const anonymousFavorites = await tx.anonymousFavorite.findMany({
                where: { deviceId }
            });
            for (const anonymousFav of anonymousFavorites) {
                try {
                    // בדיקה אם המועדף כבר קיים למשתמש
                    const existingFavorite = await tx.favorite.findUnique({
                        where: {
                            userId_parkingId: {
                                userId,
                                parkingId: anonymousFav.parkingId
                            }
                        }
                    });
                    if (!existingFavorite) {
                        // יצירת מועדף חדש למשתמש
                        await tx.favorite.create({
                            data: {
                                userId,
                                parkingId: anonymousFav.parkingId
                            }
                        });
                        result.favorites.migrated++;
                        console.log(`✅ Migrated favorite: parking ${anonymousFav.parkingId}`);
                    }
                    else {
                        result.favorites.skipped++;
                        console.log(`⏭️ Skipped existing favorite: parking ${anonymousFav.parkingId}`);
                    }
                }
                catch (error) {
                    console.error(`❌ Error migrating favorite ${anonymousFav.id}:`, error);
                    result.favorites.skipped++;
                }
            }
            // 2. העברת מקומות שמורים אנונימיים
            console.log('🏠 Migrating anonymous saved places...');
            const anonymousSavedPlaces = await tx.anonymousSavedPlace.findMany({
                where: { deviceId }
            });
            for (const anonymousPlace of anonymousSavedPlaces) {
                try {
                    // בדיקה אם מקום דומה כבר קיים למשתמש (לפי שם וסוג)
                    const existingPlace = await tx.savedPlace.findFirst({
                        where: {
                            userId,
                            name: anonymousPlace.name,
                            type: anonymousPlace.type
                        }
                    });
                    if (!existingPlace) {
                        // יצירת מקום שמור חדש למשתמש
                        await tx.savedPlace.create({
                            data: {
                                userId,
                                name: anonymousPlace.name,
                                address: anonymousPlace.address,
                                lat: anonymousPlace.lat,
                                lng: anonymousPlace.lng,
                                type: anonymousPlace.type
                            }
                        });
                        result.savedPlaces.migrated++;
                        console.log(`✅ Migrated saved place: ${anonymousPlace.name}`);
                    }
                    else {
                        result.savedPlaces.skipped++;
                        console.log(`⏭️ Skipped existing saved place: ${anonymousPlace.name}`);
                    }
                }
                catch (error) {
                    console.error(`❌ Error migrating saved place ${anonymousPlace.id}:`, error);
                    result.savedPlaces.skipped++;
                }
            }
            // 3. העברת חיפושים אחרונים אנונימיים
            console.log('🔍 Migrating anonymous recent searches...');
            const anonymousRecentSearches = await tx.anonymousRecentSearch.findMany({
                where: { deviceId },
                orderBy: { createdAt: 'desc' },
                take: 20 // מעבירים רק את 20 החיפושים האחרונים
            });
            for (const anonymousSearch of anonymousRecentSearches) {
                try {
                    // בדיקה אם חיפוש דומה כבר קיים למשתמש
                    const existingSearch = await tx.recentSearch.findFirst({
                        where: {
                            userId,
                            query: anonymousSearch.query
                        }
                    });
                    if (!existingSearch) {
                        // יצירת חיפוש חדש למשתמש
                        await tx.recentSearch.create({
                            data: {
                                userId,
                                query: anonymousSearch.query,
                                lat: anonymousSearch.lat,
                                lng: anonymousSearch.lng
                            }
                        });
                        result.recentSearches.migrated++;
                        console.log(`✅ Migrated recent search: ${anonymousSearch.query}`);
                    }
                    else {
                        // עדכון התאריך של החיפוש הקיים
                        await tx.recentSearch.update({
                            where: { id: existingSearch.id },
                            data: { createdAt: new Date() }
                        });
                        result.recentSearches.skipped++;
                        console.log(`⏭️ Updated existing search: ${anonymousSearch.query}`);
                    }
                }
                catch (error) {
                    console.error(`❌ Error migrating recent search ${anonymousSearch.id}:`, error);
                    result.recentSearches.skipped++;
                }
            }
            return result;
        });
        console.log('🎉 Migration completed successfully:', migrationResult);
        res.json({
            message: 'Anonymous data migration completed successfully',
            data: migrationResult
        });
    }
    catch (error) {
        console.error('💥 Migration failed:', error);
        next(error);
    }
});
/**
 * POST /api/migration/cleanup-anonymous
 * מחיקת נתוני אורח לאחר מיזוג מוצלח
 * Body: { deviceId }
 */
r.post('/cleanup-anonymous', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        const { deviceId } = req.body;
        console.log(`🧹 Starting cleanup for userId: ${userId}, deviceId: ${deviceId}`);
        // ולידציה
        if (!deviceId || typeof deviceId !== 'string') {
            return res.status(400).json({ error: 'Device ID is required' });
        }
        // מחיקת כל הנתונים האנונימיים בטרנזקציה
        const cleanupResult = await prisma_1.prisma.$transaction(async (tx) => {
            const result = {
                favorites: 0,
                savedPlaces: 0,
                recentSearches: 0
            };
            // מחיקת מועדפים אנונימיים
            const deletedFavorites = await tx.anonymousFavorite.deleteMany({
                where: { deviceId }
            });
            result.favorites = deletedFavorites.count;
            // מחיקת מקומות שמורים אנונימיים
            const deletedSavedPlaces = await tx.anonymousSavedPlace.deleteMany({
                where: { deviceId }
            });
            result.savedPlaces = deletedSavedPlaces.count;
            // מחיקת חיפושים אחרונים אנונימיים
            const deletedRecentSearches = await tx.anonymousRecentSearch.deleteMany({
                where: { deviceId }
            });
            result.recentSearches = deletedRecentSearches.count;
            return result;
        });
        console.log('🗑️ Cleanup completed:', cleanupResult);
        res.json({
            message: 'Anonymous data cleanup completed successfully',
            data: cleanupResult
        });
    }
    catch (error) {
        console.error('💥 Cleanup failed:', error);
        next(error);
    }
});
/**
 * GET /api/migration/preview?deviceId={deviceId}
 * תצוגה מקדימה של הנתונים שיועברו (ללא ביצוע המיזוג)
 */
r.get('/preview', auth_1.auth, async (req, res, next) => {
    try {
        const { deviceId } = req.query;
        // ולידציה
        if (!deviceId || typeof deviceId !== 'string') {
            return res.status(400).json({ error: 'Device ID is required' });
        }
        // ספירת הנתונים הזמינים למיזוג
        const preview = await prisma_1.prisma.$transaction(async (tx) => {
            const favorites = await tx.anonymousFavorite.count({
                where: { deviceId }
            });
            const savedPlaces = await tx.anonymousSavedPlace.count({
                where: { deviceId }
            });
            const recentSearches = await tx.anonymousRecentSearch.count({
                where: { deviceId }
            });
            // קבלת דוגמאות של הנתונים
            const sampleFavorites = await tx.anonymousFavorite.findMany({
                where: { deviceId },
                include: {
                    parking: {
                        select: {
                            id: true,
                            title: true,
                            address: true
                        }
                    }
                },
                take: 3
            });
            const sampleSavedPlaces = await tx.anonymousSavedPlace.findMany({
                where: { deviceId },
                take: 3,
                select: {
                    name: true,
                    address: true,
                    type: true
                }
            });
            const sampleRecentSearches = await tx.anonymousRecentSearch.findMany({
                where: { deviceId },
                orderBy: { createdAt: 'desc' },
                take: 3,
                select: {
                    query: true,
                    createdAt: true
                }
            });
            return {
                counts: {
                    favorites,
                    savedPlaces,
                    recentSearches,
                    total: favorites + savedPlaces + recentSearches
                },
                samples: {
                    favorites: sampleFavorites,
                    savedPlaces: sampleSavedPlaces,
                    recentSearches: sampleRecentSearches
                }
            };
        });
        res.json({
            message: 'Migration preview generated successfully',
            data: preview
        });
    }
    catch (error) {
        console.error('💥 Preview failed:', error);
        next(error);
    }
});
exports.default = r;
