"use strict";
/**
 * Routes for Operational Fees API
 * נתיבי API לדמי תפעול
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const operationalFees_service_1 = require("../services/operationalFees.service");
const router = (0, express_1.Router)();
/**
 * GET /api/operational-fees/stats
 * קבלת סטטיסטיקות דמי תפעול לאדמין
 */
router.get('/stats', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const filters = {};
        if (startDate) {
            filters.startDate = new Date(startDate);
        }
        if (endDate) {
            filters.endDate = new Date(endDate);
        }
        const stats = await (0, operationalFees_service_1.getOperationalFeeStats)(filters);
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        console.error('❌ Failed to get operational fee stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get operational fee statistics',
        });
    }
});
/**
 * GET /api/operational-fees/summary
 * סיכום מהיר לדשבורד
 */
router.get('/summary', async (req, res) => {
    try {
        // דמי תפעול מהחודש הנוכחי
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const monthlyStats = await (0, operationalFees_service_1.getOperationalFeeStats)({
            startDate: startOfMonth,
            endDate: endOfMonth,
        });
        // דמי תפעול מכל הזמנים
        const allTimeStats = await (0, operationalFees_service_1.getOperationalFeeStats)();
        res.json({
            success: true,
            data: {
                monthly: {
                    totalOperationalFees: monthlyStats.stats.totalOperationalFeesCollected,
                    totalTransactions: monthlyStats.stats.totalTransactions,
                    averageFee: monthlyStats.stats.averageOperationalFee,
                },
                allTime: {
                    totalOperationalFees: allTimeStats.stats.totalOperationalFeesCollected,
                    totalTransactions: allTimeStats.stats.totalTransactions,
                    averageFee: allTimeStats.stats.averageOperationalFee,
                },
            },
        });
    }
    catch (error) {
        console.error('❌ Failed to get operational fee summary:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get operational fee summary',
        });
    }
});
exports.default = router;
