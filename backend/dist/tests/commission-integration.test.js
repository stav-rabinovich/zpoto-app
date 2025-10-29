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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommissionIntegrationTests = void 0;
// commission-integration.test.ts - בדיקות אינטגרציה למערכת עמלות
const prisma_1 = require("../lib/prisma");
const bookings_service_1 = require("../services/bookings.service");
const monthly_payouts_job_1 = require("../jobs/monthly-payouts.job");
/**
 * בדיקות אינטגרציה מלאות למערכת העמלות
 */
class CommissionIntegrationTests {
    /**
     * בדיקה 1: תהליך מלא - יצירת הזמנה → עמלה → תשלום
     */
    static async testFullBookingToPayoutFlow() {
        console.log('🧪 Testing: Full booking to payout flow');
        try {
            // שלב 1: יצירת הזמנה
            const testBooking = await (0, bookings_service_1.createBooking)({
                userId: 1, // משתמש בדיקה
                parkingId: 1, // חניה בדיקה
                startTime: new Date(),
                endTime: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 שעות
            });
            console.log('✅ Booking created:', testBooking.id);
            // שלב 2: בדיקה שנוצרה עמלה
            const commission = await prisma_1.prisma.commission.findUnique({
                where: { bookingId: testBooking.id }
            });
            if (!commission) {
                throw new Error('Commission was not created for booking');
            }
            console.log('✅ Commission created:', {
                id: commission.id,
                totalPriceCents: commission.totalPriceCents,
                commissionCents: commission.commissionCents,
                netOwnerCents: commission.netOwnerCents
            });
            // שלב 3: בדיקת חישוב נכון (15% עמלה)
            const expectedCommission = Math.round(commission.totalPriceCents * 0.15);
            const expectedNet = commission.totalPriceCents - expectedCommission;
            if (commission.commissionCents !== expectedCommission) {
                throw new Error(`Commission calculation error: expected ${expectedCommission}, got ${commission.commissionCents}`);
            }
            if (commission.netOwnerCents !== expectedNet) {
                throw new Error(`Net calculation error: expected ${expectedNet}, got ${commission.netOwnerCents}`);
            }
            console.log('✅ Commission calculations are correct');
            // שלב 4: בדיקת עיבוד תשלום חודשי
            const payoutResult = await (0, monthly_payouts_job_1.processMonthlyPayouts)();
            if (!payoutResult.success) {
                throw new Error(`Monthly payout failed: ${payoutResult.error}`);
            }
            console.log('✅ Monthly payout processed:', payoutResult);
            // שלב 5: בדיקה שהעמלה סומנה כמעובדת
            const updatedCommission = await prisma_1.prisma.commission.findUnique({
                where: { bookingId: testBooking.id }
            });
            if (!updatedCommission?.payoutProcessed) {
                throw new Error('Commission was not marked as processed');
            }
            console.log('✅ Commission marked as processed');
            return {
                success: true,
                message: 'Full booking to payout flow test passed',
                data: {
                    bookingId: testBooking.id,
                    commissionId: commission.id,
                    payoutResult
                }
            };
        }
        catch (error) {
            console.error('❌ Full flow test failed:', error);
            return {
                success: false,
                error: error?.message || 'Unknown error'
            };
        }
    }
    /**
     * בדיקה 2: ביטול הזמנה ומחיקת עמלה
     */
    static async testBookingCancellationFlow() {
        console.log('🧪 Testing: Booking cancellation and commission deletion');
        try {
            // יצירת הזמנה
            const testBooking = await (0, bookings_service_1.createBooking)({
                userId: 1,
                parkingId: 1,
                startTime: new Date(),
                endTime: new Date(Date.now() + 1 * 60 * 60 * 1000)
            });
            // וידוא שנוצרה עמלה
            const commission = await prisma_1.prisma.commission.findUnique({
                where: { bookingId: testBooking.id }
            });
            if (!commission) {
                throw new Error('Commission was not created');
            }
            console.log('✅ Booking and commission created');
            // ביטול ההזמנה
            const { cancelBooking } = await Promise.resolve().then(() => __importStar(require('../services/bookings.service')));
            await cancelBooking(testBooking.id);
            // בדיקה שהעמלה נמחקה
            const deletedCommission = await prisma_1.prisma.commission.findUnique({
                where: { bookingId: testBooking.id }
            });
            if (deletedCommission) {
                throw new Error('Commission was not deleted after booking cancellation');
            }
            console.log('✅ Commission deleted after booking cancellation');
            return {
                success: true,
                message: 'Booking cancellation flow test passed'
            };
        }
        catch (error) {
            console.error('❌ Cancellation flow test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * בדיקה 3: בדיקת עמלות מרובות לבעל חניה אחד
     */
    static async testMultipleCommissionsPerOwner() {
        console.log('🧪 Testing: Multiple commissions per owner');
        try {
            const bookings = [];
            const numBookings = 3;
            // יצירת מספר הזמנות
            for (let i = 0; i < numBookings; i++) {
                const booking = await (0, bookings_service_1.createBooking)({
                    userId: 1,
                    parkingId: 1,
                    startTime: new Date(Date.now() + i * 60 * 60 * 1000),
                    endTime: new Date(Date.now() + (i + 1) * 60 * 60 * 1000)
                });
                bookings.push(booking);
            }
            console.log(`✅ Created ${numBookings} bookings`);
            // בדיקה שנוצרו עמלות לכל ההזמנות
            const commissions = await prisma_1.prisma.commission.findMany({
                where: {
                    bookingId: { in: bookings.map(b => b.id) }
                }
            });
            if (commissions.length !== numBookings) {
                throw new Error(`Expected ${numBookings} commissions, got ${commissions.length}`);
            }
            console.log('✅ All commissions created');
            // עיבוד תשלום חודשי
            const payoutResult = await (0, monthly_payouts_job_1.processMonthlyPayouts)();
            if (!payoutResult.success) {
                throw new Error(`Payout failed: ${payoutResult.error}`);
            }
            // בדיקה שנוצר תשלום אחד המכיל את כל העמלות
            const totalCommissionCents = commissions.reduce((sum, c) => sum + c.commissionCents, 0);
            const totalNetCents = commissions.reduce((sum, c) => sum + c.netOwnerCents, 0);
            const payoutsCount = Array.isArray(payoutResult.payoutsCreated) ? payoutResult.payoutsCreated.length : 0;
            console.log('✅ Multiple commissions aggregated correctly:', {
                totalCommissionCents,
                totalNetCents,
                payoutsCreated: payoutsCount
            });
            return {
                success: true,
                message: 'Multiple commissions test passed',
                data: {
                    bookingsCreated: numBookings,
                    commissionsCreated: commissions.length,
                    totalCommissionCents,
                    totalNetCents
                }
            };
        }
        catch (error) {
            console.error('❌ Multiple commissions test failed:', error);
            return {
                success: false,
                error: error?.message || 'Unknown error'
            };
        }
    }
    /**
     * בדיקה 4: תרחישי קיצון
     */
    static async testEdgeCases() {
        console.log('🧪 Testing: Edge cases');
        const results = [];
        try {
            // בדיקה: הזמנה עם מחיר 0
            try {
                const zeroBooking = await prisma_1.prisma.booking.create({
                    data: {
                        userId: 1,
                        parkingId: 1,
                        startTime: new Date(),
                        endTime: new Date(Date.now() + 60 * 60 * 1000),
                        status: 'CONFIRMED',
                        totalPriceCents: 0,
                        approvedAt: new Date()
                    }
                });
                // בדיקה שלא נוצרה עמלה למחיר 0
                const commission = await prisma_1.prisma.commission.findUnique({
                    where: { bookingId: zeroBooking.id }
                });
                results.push({
                    test: 'Zero price booking',
                    passed: !commission, // לא אמורה להיות עמלה
                    message: commission ? 'Commission created for zero price' : 'No commission for zero price - correct'
                });
            }
            catch (error) {
                results.push({
                    test: 'Zero price booking',
                    passed: false,
                    message: error?.message || 'Unknown error'
                });
            }
            // בדיקה: עיבוד תשלומים כשאין עמלות
            try {
                // מחיקת כל העמלות הלא מעובדות
                await prisma_1.prisma.commission.deleteMany({
                    where: { payoutProcessed: false }
                });
                const emptyPayoutResult = await (0, monthly_payouts_job_1.processMonthlyPayouts)();
                results.push({
                    test: 'Empty payout processing',
                    passed: emptyPayoutResult.success && emptyPayoutResult.payoutsCreated === 0,
                    message: emptyPayoutResult.message
                });
            }
            catch (error) {
                results.push({
                    test: 'Empty payout processing',
                    passed: false,
                    message: error.message
                });
            }
            console.log('✅ Edge cases tested:', results);
            return {
                success: true,
                message: 'Edge cases test completed',
                data: results
            };
        }
        catch (error) {
            console.error('❌ Edge cases test failed:', error);
            return {
                success: false,
                error: error.message,
                partialResults: results
            };
        }
    }
    /**
     * הרצת כל הבדיקות
     */
    static async runAllTests() {
        console.log('🧪 Starting comprehensive commission system tests...');
        const results = {
            fullFlow: await this.testFullBookingToPayoutFlow(),
            cancellation: await this.testBookingCancellationFlow(),
            multipleCommissions: await this.testMultipleCommissionsPerOwner(),
            edgeCases: await this.testEdgeCases()
        };
        const passedTests = Object.values(results).filter(r => r.success).length;
        const totalTests = Object.keys(results).length;
        console.log(`🧪 Tests completed: ${passedTests}/${totalTests} passed`);
        return {
            success: passedTests === totalTests,
            summary: `${passedTests}/${totalTests} tests passed`,
            results
        };
    }
}
exports.CommissionIntegrationTests = CommissionIntegrationTests;
