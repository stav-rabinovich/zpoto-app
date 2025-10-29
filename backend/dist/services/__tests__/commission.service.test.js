"use strict";
/**
 * Commission Service Tests
 * בדיקות יחידה למנוע חישוב העמלות
 */
Object.defineProperty(exports, "__esModule", { value: true });
const commission_service_1 = require("../commission.service");
describe('Commission Service', () => {
    describe('calculateCommission', () => {
        test('should calculate simple commission without hourly breakdown', async () => {
            const result = await (0, commission_service_1.calculateCommission)(1, 2100); // ₪21.00
            expect(result.totalPriceCents).toBe(2100);
            expect(result.commissionCents).toBe(315); // 15% = ₪3.15
            expect(result.netOwnerCents).toBe(1785); // ₪17.85
            expect(result.commissionRate).toBe(0.15);
            expect(result.hourlyBreakdown).toEqual([]);
        });
        test('should apply minimum commission rule (1 NIS per paid hour)', async () => {
            const hourlyPricing = [
                { hour: 1, priceCents: 1000, isFree: false }, // ₪10 → ₪1.5 commission
                { hour: 2, priceCents: 700, isFree: false }, // ₪7 → ₪1.05 commission  
                { hour: 3, priceCents: 400, isFree: false }, // ₪4 → ₪0.6 → ₪1 (minimum)
                { hour: 4, priceCents: 0, isFree: true } // Free → ₪0 commission
            ];
            const result = await (0, commission_service_1.calculateCommission)(1, 2100, hourlyPricing);
            expect(result.totalPriceCents).toBe(2100);
            expect(result.commissionCents).toBe(355); // ₪1.5 + ₪1.05 + ₪1 + ₪0 = ₪3.55
            expect(result.netOwnerCents).toBe(1745); // ₪21 - ₪3.55 = ₪17.45
            expect(result.hourlyBreakdown).toHaveLength(4);
            // בדיקת פירוט לפי שעות
            expect(result.hourlyBreakdown[0].priceCents).toBe(150); // ₪1.5 commission
            expect(result.hourlyBreakdown[1].priceCents).toBe(105); // ₪1.05 commission
            expect(result.hourlyBreakdown[2].priceCents).toBe(100); // ₪1 minimum applied
            expect(result.hourlyBreakdown[3].priceCents).toBe(0); // Free hour
        });
        test('should handle all free hours', async () => {
            const hourlyPricing = [
                { hour: 1, priceCents: 0, isFree: true },
                { hour: 2, priceCents: 0, isFree: true }
            ];
            const result = await (0, commission_service_1.calculateCommission)(1, 0, hourlyPricing);
            expect(result.totalPriceCents).toBe(0);
            expect(result.commissionCents).toBe(0);
            expect(result.netOwnerCents).toBe(0);
            expect(result.hourlyBreakdown).toHaveLength(2);
            expect(result.hourlyBreakdown.every(h => h.priceCents === 0)).toBe(true);
        });
        test('should handle mixed free and paid hours', async () => {
            const hourlyPricing = [
                { hour: 1, priceCents: 1500, isFree: false }, // ₪15 → ₪2.25 commission
                { hour: 2, priceCents: 0, isFree: true }, // Free
                { hour: 3, priceCents: 800, isFree: false } // ₪8 → ₪1.2 commission
            ];
            const result = await (0, commission_service_1.calculateCommission)(1, 2300, hourlyPricing);
            expect(result.totalPriceCents).toBe(2300);
            expect(result.commissionCents).toBe(345); // ₪2.25 + ₪0 + ₪1.2 = ₪3.45
            expect(result.netOwnerCents).toBe(1955); // ₪23 - ₪3.45 = ₪19.55
        });
        test('should handle edge case with very low prices', async () => {
            const hourlyPricing = [
                { hour: 1, priceCents: 50, isFree: false }, // ₪0.5 → ₪0.075 → ₪1 (minimum)
                { hour: 2, priceCents: 100, isFree: false }, // ₪1 → ₪0.15 → ₪1 (minimum)
                { hour: 3, priceCents: 200, isFree: false } // ₪2 → ₪0.3 → ₪1 (minimum)
            ];
            const result = await (0, commission_service_1.calculateCommission)(1, 350, hourlyPricing);
            expect(result.totalPriceCents).toBe(350);
            expect(result.commissionCents).toBe(300); // ₪1 + ₪1 + ₪1 = ₪3 (all minimum)
            expect(result.netOwnerCents).toBe(50); // ₪3.5 - ₪3 = ₪0.5
            // וודא שכל השעות קיבלו את המינימום
            expect(result.hourlyBreakdown.every(h => h.priceCents === 100)).toBe(true);
        });
        test('should handle high-value bookings correctly', async () => {
            const hourlyPricing = [
                { hour: 1, priceCents: 5000, isFree: false }, // ₪50 → ₪7.5 commission
                { hour: 2, priceCents: 3000, isFree: false } // ₪30 → ₪4.5 commission
            ];
            const result = await (0, commission_service_1.calculateCommission)(1, 8000, hourlyPricing);
            expect(result.totalPriceCents).toBe(8000);
            expect(result.commissionCents).toBe(1200); // ₪7.5 + ₪4.5 = ₪12
            expect(result.netOwnerCents).toBe(6800); // ₪80 - ₪12 = ₪68
        });
        test('should round commission correctly', async () => {
            const result = await (0, commission_service_1.calculateCommission)(1, 1001); // ₪10.01
            // 15% של ₪10.01 = ₪1.5015 → מעוגל ל-₪1.50 (150 עגורות)
            expect(result.commissionCents).toBe(150);
            expect(result.netOwnerCents).toBe(851);
        });
    });
});
// דוגמאות לשימוש במערכת
describe('Commission Examples', () => {
    test('Example from requirements: 10-7-4-0 pricing', async () => {
        const hourlyPricing = [
            { hour: 1, priceCents: 1000, isFree: false }, // ₪10
            { hour: 2, priceCents: 700, isFree: false }, // ₪7
            { hour: 3, priceCents: 400, isFree: false }, // ₪4
            { hour: 4, priceCents: 0, isFree: true } // Free
        ];
        const result = await (0, commission_service_1.calculateCommission)(1, 2100, hourlyPricing);
        // Expected: ₪1.5 + ₪1.05 + ₪1 (minimum) + ₪0 = ₪3.55
        expect(result.commissionCents).toBe(355);
        expect(result.netOwnerCents).toBe(1745); // ₪21 - ₪3.55 = ₪17.45
        console.log('📊 Example calculation:');
        console.log(`Total: ₪${result.totalPriceCents / 100}`);
        console.log(`Commission: ₪${result.commissionCents / 100}`);
        console.log(`Net to owner: ₪${result.netOwnerCents / 100}`);
    });
});
