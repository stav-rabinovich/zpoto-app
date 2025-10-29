"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startJobScheduler = startJobScheduler;
// scheduler.ts - מתזמן עבודות רקע
const node_cron_1 = __importDefault(require("node-cron"));
const monthly_payouts_job_1 = require("./monthly-payouts.job");
/**
 * התחלת מתזמן העבודות הרקע
 */
function startJobScheduler() {
    console.log('🕐 Starting job scheduler...');
    // תשלומים חודשיים - ב-1 לכל חודש בשעה 09:00
    node_cron_1.default.schedule('0 9 1 * *', async () => {
        console.log('💰 Running scheduled monthly payouts job...');
        try {
            const result = await (0, monthly_payouts_job_1.processMonthlyPayouts)();
            console.log('💰 Scheduled monthly payouts completed:', result);
        }
        catch (error) {
            console.error('❌ Error in scheduled monthly payouts:', error);
        }
    }, {
        timezone: 'Asia/Jerusalem'
    });
    // בדיקת בריאות מערכת - כל יום בשעה 08:00
    node_cron_1.default.schedule('0 8 * * *', async () => {
        console.log('🏥 Running daily health check...');
        try {
            await performHealthCheck();
        }
        catch (error) {
            console.error('❌ Error in health check:', error);
        }
    }, {
        timezone: 'Asia/Jerusalem'
    });
    console.log('✅ Job scheduler started successfully');
    console.log('📅 Monthly payouts: 1st of every month at 09:00 IST');
    console.log('🏥 Health check: Every day at 08:00 IST');
}
/**
 * בדיקת בריאות מערכת
 */
async function performHealthCheck() {
    const { prisma } = await Promise.resolve().then(() => __importStar(require('../lib/prisma')));
    try {
        // בדיקת חיבור למסד נתונים
        await prisma.$queryRaw `SELECT 1`;
        // בדיקת עמלות שלא עובדו (אזהרה אם יש יותר מ-100)
        const unpaidCommissions = await prisma.commission.count({
            where: { payoutProcessed: false }
        });
        if (unpaidCommissions > 100) {
            console.warn(`⚠️ High number of unpaid commissions: ${unpaidCommissions}`);
        }
        // בדיקת תשלומים שנכשלו
        const failedPayouts = await prisma.ownerPayout.count({
            where: { status: 'FAILED' }
        });
        if (failedPayouts > 0) {
            console.warn(`⚠️ Failed payouts detected: ${failedPayouts}`);
        }
        console.log('✅ Health check passed', {
            unpaidCommissions,
            failedPayouts,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Health check failed:', error);
    }
}
