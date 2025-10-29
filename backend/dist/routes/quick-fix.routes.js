"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// quick-fix.routes.ts - תיקון מיידי למשתמש חסום
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middlewares/auth");
const r = (0, express_1.Router)();
// כל ה-routes דורשים הרשאות Admin
r.use(auth_1.requireAdmin);
/**
 * POST /api/quick-fix/unblock-user/:id
 * ביטול חסימה מיידי למשתמש ספציפי
 */
r.post('/unblock-user/:id', async (req, res, next) => {
    try {
        const userId = Number(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        console.log(`🔧 Quick fix: Unblocking user ${userId}`);
        // בדיקת המשתמש לפני התיקון
        const userBefore = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                role: true,
                isBlocked: true,
                name: true
            }
        });
        if (!userBefore) {
            return res.status(404).json({ error: 'User not found' });
        }
        console.log('👤 User before fix:', userBefore);
        // תיקון המשתמש - החזרה למצב מחפש חניה רגיל
        const userAfter = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                role: 'USER', // החזרה למחפש חניה
                isBlocked: false // ביטול חסימה
            }
        });
        console.log('✅ User after fix:', {
            id: userAfter.id,
            email: userAfter.email,
            role: userAfter.role,
            isBlocked: userAfter.isBlocked
        });
        // מחיקת כל החניות של המשתמש (אם יש)
        const deletedParkings = await prisma_1.prisma.parking.deleteMany({
            where: { ownerId: userId }
        });
        console.log(`🗑️ Deleted ${deletedParkings.count} parkings for user ${userId}`);
        res.json({
            success: true,
            message: `User ${userId} fixed successfully`,
            data: {
                userBefore,
                userAfter: {
                    id: userAfter.id,
                    email: userAfter.email,
                    role: userAfter.role,
                    isBlocked: userAfter.isBlocked
                },
                deletedParkings: deletedParkings.count
            }
        });
    }
    catch (error) {
        console.error('❌ Error in quick fix:', error);
        next(error);
    }
});
/**
 * GET /api/quick-fix/user-status/:id
 * בדיקת סטטוס משתמש
 */
r.get('/user-status/:id', async (req, res, next) => {
    try {
        const userId = Number(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isBlocked: true,
                createdAt: true
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const parkingsCount = await prisma_1.prisma.parking.count({
            where: { ownerId: userId }
        });
        const listingRequests = await prisma_1.prisma.listingRequest.findMany({
            where: { userId },
            select: { id: true, status: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json({
            success: true,
            data: {
                user,
                parkingsCount,
                listingRequests,
                diagnosis: {
                    isProblematic: user.role === 'OWNER' && parkingsCount === 0,
                    isBlocked: user.isBlocked,
                    hasRequests: listingRequests.length > 0
                }
            }
        });
    }
    catch (error) {
        console.error('❌ Error checking user status:', error);
        next(error);
    }
});
exports.default = r;
