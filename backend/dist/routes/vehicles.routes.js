"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const prisma_1 = require("../lib/prisma");
const r = (0, express_1.Router)();
/**
 * GET /api/vehicles
 * קבלת כל הרכבים של המשתמש המחובר
 */
r.get('/', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        const vehicles = await prisma_1.prisma.vehicle.findMany({
            where: { userId },
            orderBy: [
                { isDefault: 'desc' }, // רכב ברירת מחדל קודם
                { createdAt: 'desc' },
            ],
        });
        res.json({ data: vehicles });
    }
    catch (e) {
        next(e);
    }
});
/**
 * POST /api/vehicles
 * יצירת רכב חדש
 */
r.post('/', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        const { licensePlate, make, model, color, year, description, isDefault } = req.body;
        if (!licensePlate?.trim()) {
            return res.status(400).json({ error: 'License plate is required' });
        }
        // אם זה רכב ברירת מחדל, נבטל את ברירת המחדל מכל הרכבים האחרים
        if (isDefault) {
            await prisma_1.prisma.vehicle.updateMany({
                where: { userId },
                data: { isDefault: false },
            });
        }
        const vehicle = await prisma_1.prisma.vehicle.create({
            data: {
                userId,
                licensePlate: licensePlate.trim(),
                make: make?.trim() || null,
                model: model?.trim() || null,
                color: color?.trim() || null,
                year: year ? parseInt(year) : null,
                description: description?.trim() || null,
                isDefault: Boolean(isDefault),
            },
        });
        res.status(201).json({ data: vehicle });
    }
    catch (e) {
        if (e.code === 'P2002') {
            return res.status(400).json({ error: 'License plate already exists for this user' });
        }
        next(e);
    }
});
/**
 * PUT /api/vehicles/:id
 * עדכון רכב קיים
 */
r.put('/:id', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        const vehicleId = parseInt(req.params.id);
        const { licensePlate, make, model, color, year, description, isDefault } = req.body;
        if (isNaN(vehicleId)) {
            return res.status(400).json({ error: 'Invalid vehicle ID' });
        }
        // וידוא שהרכב שייך למשתמש
        const existingVehicle = await prisma_1.prisma.vehicle.findFirst({
            where: { id: vehicleId, userId },
        });
        if (!existingVehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        if (!licensePlate?.trim()) {
            return res.status(400).json({ error: 'License plate is required' });
        }
        // אם זה רכב ברירת מחדל, נבטל את ברירת המחדל מכל הרכבים האחרים
        if (isDefault && !existingVehicle.isDefault) {
            await prisma_1.prisma.vehicle.updateMany({
                where: { userId, id: { not: vehicleId } },
                data: { isDefault: false },
            });
        }
        const vehicle = await prisma_1.prisma.vehicle.update({
            where: { id: vehicleId },
            data: {
                licensePlate: licensePlate.trim(),
                make: make?.trim() || null,
                model: model?.trim() || null,
                color: color?.trim() || null,
                year: year ? parseInt(year) : null,
                description: description?.trim() || null,
                isDefault: Boolean(isDefault),
            },
        });
        res.json({ data: vehicle });
    }
    catch (e) {
        if (e.code === 'P2002') {
            return res.status(400).json({ error: 'License plate already exists for this user' });
        }
        next(e);
    }
});
/**
 * DELETE /api/vehicles/:id
 * מחיקת רכב
 */
r.delete('/:id', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        const vehicleId = parseInt(req.params.id);
        if (isNaN(vehicleId)) {
            return res.status(400).json({ error: 'Invalid vehicle ID' });
        }
        // וידוא שהרכב שייך למשתמש
        const existingVehicle = await prisma_1.prisma.vehicle.findFirst({
            where: { id: vehicleId, userId },
        });
        if (!existingVehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        await prisma_1.prisma.vehicle.delete({
            where: { id: vehicleId },
        });
        res.json({ message: 'Vehicle deleted successfully' });
    }
    catch (e) {
        next(e);
    }
});
/**
 * PATCH /api/vehicles/:id/default
 * הגדרת רכב כברירת מחדל
 */
r.patch('/:id/default', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        const vehicleId = parseInt(req.params.id);
        if (isNaN(vehicleId)) {
            return res.status(400).json({ error: 'Invalid vehicle ID' });
        }
        // וידוא שהרכב שייך למשתמש
        const existingVehicle = await prisma_1.prisma.vehicle.findFirst({
            where: { id: vehicleId, userId },
        });
        if (!existingVehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        // ביטול ברירת מחדל מכל הרכבים האחרים
        await prisma_1.prisma.vehicle.updateMany({
            where: { userId, id: { not: vehicleId } },
            data: { isDefault: false },
        });
        // הגדרת הרכב הנוכחי כברירת מחדל
        const vehicle = await prisma_1.prisma.vehicle.update({
            where: { id: vehicleId },
            data: { isDefault: true },
        });
        res.json({ data: vehicle });
    }
    catch (e) {
        next(e);
    }
});
exports.default = r;
