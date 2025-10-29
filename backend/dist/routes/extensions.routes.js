"use strict";
/**
 * API endpoints להארכות חניה
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const extensions_service_1 = require("../services/extensions.service");
const r = (0, express_1.Router)();
/**
 * GET /api/extensions/check/:bookingId
 * בדיקת זכאות להארכה
 */
r.get('/check/:bookingId', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        const bookingId = parseInt(req.params.bookingId);
        if (isNaN(bookingId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid booking ID'
            });
        }
        console.log(`🔍 Extension check request: booking #${bookingId} by user #${userId}`);
        const result = await (0, extensions_service_1.checkExtensionEligibility)(bookingId, userId);
        res.json(result);
    }
    catch (error) {
        console.error('❌ Extension check error:', error);
        next(error);
    }
});
/**
 * POST /api/extensions/execute
 * ביצוע הארכה (אחרי תשלום מוצלח)
 */
r.post('/execute', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        const { bookingId, paymentId } = req.body;
        if (!bookingId || !paymentId) {
            return res.status(400).json({
                success: false,
                error: 'Missing bookingId or paymentId'
            });
        }
        console.log(`💰 Extension execution request:`, {
            bookingId,
            userId,
            paymentId
        });
        const result = await (0, extensions_service_1.executeExtension)(parseInt(bookingId), userId, paymentId);
        if (result.success) {
            res.json({
                success: true,
                message: 'Extension completed successfully',
                booking: result.booking
            });
        }
        else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    }
    catch (error) {
        console.error('❌ Extension execution error:', error);
        next(error);
    }
});
/**
 * GET /api/extensions/history/:bookingId
 * היסטוריית הארכות
 */
r.get('/history/:bookingId', auth_1.auth, async (req, res, next) => {
    try {
        const bookingId = parseInt(req.params.bookingId);
        if (isNaN(bookingId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid booking ID'
            });
        }
        const history = await (0, extensions_service_1.getExtensionHistory)(bookingId);
        res.json({
            success: true,
            data: history
        });
    }
    catch (error) {
        console.error('❌ Extension history error:', error);
        next(error);
    }
});
exports.default = r;
