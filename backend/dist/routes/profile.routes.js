"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const prisma_1 = require("../lib/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const r = (0, express_1.Router)();
/**
 * GET /api/profile
 * קבלת פרופיל המשתמש המחובר
 */
r.get('/', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                createdAt: true,
                // לא מחזירים סיסמה
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ data: user });
    }
    catch (e) {
        next(e);
    }
});
/**
 * PUT /api/profile
 * עדכון פרופיל המשתמש המחובר
 */
r.put('/', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        const { name, phone } = req.body;
        // ולידציה בסיסית
        if (name && typeof name !== 'string') {
            return res.status(400).json({ error: 'Name must be a string' });
        }
        if (phone && typeof phone !== 'string') {
            return res.status(400).json({ error: 'Phone must be a string' });
        }
        // עדכון הפרופיל
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                name: name?.trim() || null,
                phone: phone?.trim() || null,
            },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                createdAt: true,
            }
        });
        res.json({ data: updatedUser });
    }
    catch (e) {
        next(e);
    }
});
/**
 * PUT /api/profile/password
 * שינוי סיסמה
 */
r.put('/password', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }
        // שליפת המשתמש עם הסיסמה הנוכחית
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // בדיקת הסיסמה הנוכחית
        if (!user.password) {
            return res.status(400).json({ error: 'No password set for this user' });
        }
        const isCurrentPasswordValid = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }
        // הצפנת הסיסמה החדשה
        const hashedNewPassword = await bcryptjs_1.default.hash(newPassword, 10);
        // עדכון הסיסמה
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { password: hashedNewPassword }
        });
        res.json({ message: 'Password updated successfully' });
    }
    catch (e) {
        next(e);
    }
});
/**
 * DELETE /api/profile
 * מחיקת חשבון המשתמש
 */
r.delete('/', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ error: 'Password is required to delete account' });
        }
        // שליפת המשתמש
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // בדיקת הסיסמה
        if (!user.password) {
            return res.status(400).json({ error: 'No password set for this user' });
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Password is incorrect' });
        }
        // מחיקת המשתמש (Prisma ימחק אוטומטית את הרכבים, הזמנות וכו' בגלל CASCADE)
        await prisma_1.prisma.user.delete({
            where: { id: userId }
        });
        res.json({ message: 'Account deleted successfully' });
    }
    catch (e) {
        next(e);
    }
});
/**
 * GET /api/profile/migration-status
 * בדיקת סטטוס מיזוג נתונים אנונימיים
 * TODO: יעבוד לאחר עדכון הסכמה עם השדות החדשים
 */
r.get('/migration-status', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                googleId: true,
                facebookId: true,
                appleId: true
                // TODO: הוסף לאחר עדכון הסכמה:
                // migratedFromDeviceId: true,
                // migrationCompletedAt: true,
                // registrationSource: true
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // זמנית - נבדוק אם יש OAuth IDs
        const isSocialLogin = !!(user.googleId || user.facebookId || user.appleId);
        res.json({
            data: {
                hasMigrationData: false, // TODO: !!user.migratedFromDeviceId,
                migrationCompleted: false, // TODO: !!user.migrationCompletedAt,
                migratedFromDeviceId: null, // TODO: user.migratedFromDeviceId,
                migrationCompletedAt: null, // TODO: user.migrationCompletedAt,
                registrationSource: isSocialLogin ? 'social' : 'email' // TODO: user.registrationSource
            }
        });
    }
    catch (e) {
        next(e);
    }
});
/**
 * PUT /api/profile/complete
 * השלמת פרופיל (לאחר התחברות חברתית)
 */
r.put('/complete', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        const { name, phone, profilePicture } = req.body;
        // ולידציה
        const updateData = {};
        if (name && typeof name === 'string') {
            updateData.name = name.trim();
        }
        if (phone && typeof phone === 'string') {
            updateData.phone = phone.trim();
        }
        if (profilePicture && typeof profilePicture === 'string') {
            updateData.profilePicture = profilePicture;
        }
        // עדכון הפרופיל
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                profilePicture: true,
                role: true,
                // TODO: registrationSource: true, // הוסף לאחר עדכון הסכמה
                createdAt: true,
            }
        });
        res.json({
            data: updatedUser,
            message: 'Profile completed successfully'
        });
    }
    catch (e) {
        next(e);
    }
});
/**
 * GET /api/profile/stats
 * סטטיסטיקות המשתמש (הזמנות, רכבים וכו')
 */
r.get('/stats', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        // ספירת הזמנות
        const totalBookings = await prisma_1.prisma.booking.count({
            where: { userId }
        });
        const confirmedBookings = await prisma_1.prisma.booking.count({
            where: { userId, status: 'CONFIRMED' }
        });
        const pendingBookings = await prisma_1.prisma.booking.count({
            where: { userId, status: 'PENDING' }
        });
        // ספירת רכבים
        const totalVehicles = await prisma_1.prisma.vehicle.count({
            where: { userId }
        });
        // ספירת חניות (אם המשתמש הוא בעל חניה)
        const totalParkings = await prisma_1.prisma.parking.count({
            where: { ownerId: userId }
        });
        // סך הוצאות על הזמנות
        const bookingsWithPrices = await prisma_1.prisma.booking.findMany({
            where: { userId, status: 'CONFIRMED' },
            select: { totalPriceCents: true }
        });
        const totalSpent = bookingsWithPrices.reduce((sum, booking) => {
            return sum + (booking.totalPriceCents || 0);
        }, 0);
        const stats = {
            bookings: {
                total: totalBookings,
                confirmed: confirmedBookings,
                pending: pendingBookings,
            },
            vehicles: {
                total: totalVehicles,
            },
            parkings: {
                total: totalParkings,
            },
            spending: {
                totalCents: totalSpent,
                total: totalSpent / 100, // המרה לשקלים
            }
        };
        res.json({ data: stats });
    }
    catch (e) {
        next(e);
    }
});
exports.default = r;
