"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// jobs.routes.ts - endpoints לעבודות רקע
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const monthly_payouts_job_1 = require("../jobs/monthly-payouts.job");
const r = (0, express_1.Router)();
/**
 * POST /api/jobs/monthly-payouts
 * הרצה ידנית של עיבוד תשלומים חודשיים (לבדיקות)
 */
r.post('/monthly-payouts', async (req, res, next) => {
    try {
        console.log('🔧 Manual trigger of monthly payouts processing');
        const result = await (0, monthly_payouts_job_1.processMonthlyPayouts)();
        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                data: {
                    payoutsCreated: result.payoutsCreated,
                    period: result.period,
                },
            });
        }
        else {
            res.status(500).json({
                success: false,
                error: result.error,
            });
        }
    }
    catch (error) {
        console.error('❌ Error in manual monthly payouts:', error);
        next(error);
    }
});
/**
 * POST /api/jobs/test-monthly-payouts
 * בדיקה של מערכת התשלומים (לא מעבד באמת)
 */
r.post('/test-monthly-payouts', async (req, res, next) => {
    try {
        console.log('🧪 Testing monthly payouts system');
        const result = await (0, monthly_payouts_job_1.testMonthlyPayouts)();
        res.json({
            success: true,
            message: 'Test completed',
            data: result,
        });
    }
    catch (error) {
        console.error('❌ Error in test monthly payouts:', error);
        next(error);
    }
});
/**
 * GET /api/jobs/status
 * סטטוס מערכת העבודות הרקע
 */
r.get('/status', async (req, res) => {
    try {
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        // בדיקת תשלומים החודש
        const thisMonthPayouts = await prisma_1.prisma.ownerPayout.count({
            where: {
                periodStart: {
                    gte: thisMonth,
                },
            },
        });
        // בדיקת תשלומים החודש שעבר
        const lastMonthPayouts = await prisma_1.prisma.ownerPayout.count({
            where: {
                periodStart: {
                    gte: lastMonth,
                    lt: thisMonth,
                },
            },
        });
        // בדיקת עמלות שלא עובדו
        const unpaidCommissions = await prisma_1.prisma.commission.count({
            where: {
                payoutProcessed: false,
            },
        });
        res.json({
            success: true,
            data: {
                currentTime: now.toISOString(),
                thisMonthPayouts,
                lastMonthPayouts,
                unpaidCommissions,
                nextPayoutDate: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
            },
        });
    }
    catch (error) {
        console.error('❌ Error getting jobs status:', error);
        res.status(500).json({
            success: false,
            error: error?.message || 'Unknown error',
        });
    }
});
/**
 * POST /api/jobs/test-commission-system
 * הרצת בדיקות אינטגרציה מלאות למערכת העמלות
 */
r.post('/test-commission-system', async (req, res, next) => {
    try {
        console.log('🧪 Commission integration tests temporarily disabled');
        res.json({
            success: true,
            message: 'Commission integration tests temporarily disabled during development',
            data: { note: 'Tests will be re-enabled after pricing system deployment' },
        });
    }
    catch (error) {
        console.error('❌ Error running commission tests:', error);
        res.status(500).json({
            success: false,
            error: error?.message || 'Unknown error',
        });
    }
});
/**
 * POST /api/jobs/test-specific/:testName
 * הרצת בדיקה ספציפית
 */
r.post('/test-specific/:testName', async (req, res, next) => {
    try {
        const { testName } = req.params;
        console.log(`🧪 Specific test temporarily disabled: ${testName}`);
        const result = {
            success: true,
            message: `Test '${testName}' temporarily disabled during pricing system development`,
        };
        res.json({
            success: result.success,
            message: result.message,
        });
    }
    catch (error) {
        console.error('❌ Error running specific test:', error);
        res.status(500).json({
            success: false,
            error: error?.message || 'Unknown error',
        });
    }
});
exports.default = r;
