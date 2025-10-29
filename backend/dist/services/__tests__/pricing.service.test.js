"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// __tests__/pricing.service.test.ts
const pricing_service_1 = require("../pricing.service");
describe('Proportional Pricing Service', () => {
    const samplePricing = {
        hour1: '15.0',
        hour2: '12.0',
        hour3: '10.0',
        hour4: '8.0',
        hour5: '6.0'
    };
    describe('calculateProportionalPrice', () => {
        test('should handle exact hours correctly', () => {
            const oneHour = 1000 * 60 * 60; // 1 hour in ms
            const result = (0, pricing_service_1.calculateProportionalPrice)(oneHour, samplePricing, 10);
            expect(result.exactHours).toBe(1);
            expect(result.wholeHours).toBe(1);
            expect(result.fractionalHours).toBe(0);
            expect(result.totalPriceCents).toBe(1500); // ₪15 = 1500 cents
            expect(result.calculationMethod).toBe('proportional');
            expect(result.breakdown).toHaveLength(1);
            expect(result.breakdown[0].isFractional).toBe(false);
        });
        test('should handle fractional hours correctly - 1.5 hours', () => {
            const oneAndHalfHours = 1.5 * 1000 * 60 * 60; // 1.5 hours in ms
            const result = (0, pricing_service_1.calculateProportionalPrice)(oneAndHalfHours, samplePricing, 10);
            expect(result.exactHours).toBe(1.5);
            expect(result.wholeHours).toBe(1);
            expect(result.fractionalHours).toBe(0.5);
            // hour1 (15) + 0.5 * hour2 (12) = 15 + 6 = 21
            expect(result.totalPriceCents).toBe(2100); // ₪21 = 2100 cents
            expect(result.breakdown).toHaveLength(2);
            expect(result.breakdown[0].isFractional).toBe(false);
            expect(result.breakdown[0].price).toBe(15);
            expect(result.breakdown[1].isFractional).toBe(true);
            expect(result.breakdown[1].price).toBe(6); // 0.5 * 12
            expect(result.breakdown[1].fractionalPart).toBe(0.5);
        });
        test('should handle fractional hours correctly - 2.25 hours', () => {
            const twoAndQuarterHours = 2.25 * 1000 * 60 * 60; // 2.25 hours in ms
            const result = (0, pricing_service_1.calculateProportionalPrice)(twoAndQuarterHours, samplePricing, 10);
            expect(result.exactHours).toBe(2.25);
            expect(result.wholeHours).toBe(2);
            expect(result.fractionalHours).toBe(0.25);
            // hour1 (15) + hour2 (12) + 0.25 * hour3 (10) = 15 + 12 + 2.5 = 29.5
            expect(result.totalPriceCents).toBe(2950); // ₪29.5 = 2950 cents
            expect(result.breakdown).toHaveLength(3);
            expect(result.breakdown[2].isFractional).toBe(true);
            expect(result.breakdown[2].price).toBe(2.5); // 0.25 * 10
            expect(result.breakdown[2].fractionalPart).toBe(0.25);
        });
        test('should enforce minimum 1 hour', () => {
            const halfHour = 0.5 * 1000 * 60 * 60; // 0.5 hours in ms
            const result = (0, pricing_service_1.calculateProportionalPrice)(halfHour, samplePricing, 10);
            expect(result.exactHours).toBe(1); // Should be bumped to 1
            expect(result.totalPriceCents).toBe(1500); // ₪15 = 1500 cents
        });
        test('should fallback to legacy pricing when no tiered pricing available', () => {
            const oneAndHalfHours = 1.5 * 1000 * 60 * 60;
            const result = (0, pricing_service_1.calculateProportionalPrice)(oneAndHalfHours, null, 10);
            expect(result.calculationMethod).toBe('legacy');
            expect(result.wholeHours).toBe(2); // Ceiling of 1.5
            expect(result.totalPriceCents).toBe(2000); // 2 hours * ₪10 = ₪20
        });
        test('should fallback to hour1 price for missing hours', () => {
            const limitedPricing = { hour1: '20.0' }; // Only hour1 defined
            const threeHours = 3 * 1000 * 60 * 60;
            const result = (0, pricing_service_1.calculateProportionalPrice)(threeHours, limitedPricing, 10);
            expect(result.totalPriceCents).toBe(6000); // 3 * ₪20 = ₪60
            result.breakdown.forEach(item => {
                expect(item.price).toBe(20);
            });
        });
        test('should handle string and number prices correctly', () => {
            const mixedPricing = {
                hour1: 15, // number
                hour2: '12.5', // string
                hour3: 10.0 // number with decimal
            };
            const twoAndHalfHours = 2.5 * 1000 * 60 * 60;
            const result = (0, pricing_service_1.calculateProportionalPrice)(twoAndHalfHours, mixedPricing, 10);
            // hour1 (15) + hour2 (12.5) + 0.5 * hour3 (10) = 15 + 12.5 + 5 = 32.5
            expect(result.totalPriceCents).toBe(3250);
        });
    });
    describe('validatePricingData', () => {
        test('should validate correct pricing data', () => {
            const result = (0, pricing_service_1.validatePricingData)(samplePricing);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
        test('should require hour1', () => {
            const invalidPricing = { hour2: '10' };
            const result = (0, pricing_service_1.validatePricingData)(invalidPricing);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('מחיר שעה ראשונה חסר או לא תקין');
        });
        test('should reject negative prices', () => {
            const invalidPricing = { hour1: '15', hour2: '-5' };
            const result = (0, pricing_service_1.validatePricingData)(invalidPricing);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('מחיר שעה 2 לא תקין: -5');
        });
        test('should reject non-numeric prices', () => {
            const invalidPricing = { hour1: '15', hour2: 'abc' };
            const result = (0, pricing_service_1.validatePricingData)(invalidPricing);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('מחיר שעה 2 לא תקין: abc');
        });
        test('should handle null/undefined pricing data', () => {
            expect((0, pricing_service_1.validatePricingData)(null).isValid).toBe(false);
            expect((0, pricing_service_1.validatePricingData)(undefined).isValid).toBe(false);
        });
    });
    describe('formatPriceBreakdown', () => {
        test('should format whole hours correctly', () => {
            const twoHours = 2 * 1000 * 60 * 60;
            const result = (0, pricing_service_1.calculateProportionalPrice)(twoHours, samplePricing, 10);
            const formatted = (0, pricing_service_1.formatPriceBreakdown)(result);
            expect(formatted).toBe('שעה 1: ₪15.00 + שעה 2: ₪12.00 = ₪27.00');
        });
        test('should format fractional hours correctly', () => {
            const oneAndHalfHours = 1.5 * 1000 * 60 * 60;
            const result = (0, pricing_service_1.calculateProportionalPrice)(oneAndHalfHours, samplePricing, 10);
            const formatted = (0, pricing_service_1.formatPriceBreakdown)(result);
            expect(formatted).toBe('שעה 1: ₪15.00 + שעה 2: ₪6.00 (50%) = ₪21.00');
        });
        test('should handle quarter hours correctly', () => {
            const oneAndQuarterHours = 1.25 * 1000 * 60 * 60;
            const result = (0, pricing_service_1.calculateProportionalPrice)(oneAndQuarterHours, samplePricing, 10);
            const formatted = (0, pricing_service_1.formatPriceBreakdown)(result);
            expect(formatted).toBe('שעה 1: ₪15.00 + שעה 2: ₪3.00 (25%) = ₪18.00');
        });
    });
    describe('Edge Cases', () => {
        test('should handle very small durations', () => {
            const oneMinute = 1000 * 60; // 1 minute
            const result = (0, pricing_service_1.calculateProportionalPrice)(oneMinute, samplePricing, 10);
            expect(result.exactHours).toBe(1); // Bumped to minimum
            expect(result.totalPriceCents).toBe(1500);
        });
        test('should handle very long durations beyond hour12', () => {
            const fifteenHours = 15 * 1000 * 60 * 60;
            const result = (0, pricing_service_1.calculateProportionalPrice)(fifteenHours, samplePricing, 10);
            // Should use hour1 price for hours beyond hour12
            expect(result.breakdown).toHaveLength(15);
            expect(result.breakdown[14].price).toBe(15); // hour15 uses hour1 fallback
        });
        test('should handle zero duration', () => {
            const result = (0, pricing_service_1.calculateProportionalPrice)(0, samplePricing, 10);
            expect(result.exactHours).toBe(1); // Bumped to minimum
            expect(result.totalPriceCents).toBe(1500);
        });
        test('should round cents correctly', () => {
            const pricingWithDecimals = {
                hour1: '10.333', // Will create fractional cents
                hour2: '5.666'
            };
            const oneAndThirdHours = (1 + 1 / 3) * 1000 * 60 * 60;
            const result = (0, pricing_service_1.calculateProportionalPrice)(oneAndThirdHours, pricingWithDecimals, 10);
            // Should round to nearest cent
            expect(Number.isInteger(result.totalPriceCents)).toBe(true);
        });
    });
});
// Performance test
describe('Performance', () => {
    test('should calculate pricing for 1000 different durations quickly', () => {
        const start = Date.now();
        for (let i = 1; i <= 1000; i++) {
            const randomHours = Math.random() * 12 + 0.1; // 0.1 to 12.1 hours
            const durationMs = randomHours * 1000 * 60 * 60;
            (0, pricing_service_1.calculateProportionalPrice)(durationMs, samplePricing, 10);
        }
        const end = Date.now();
        const duration = end - start;
        console.log(`Calculated 1000 prices in ${duration}ms`);
        expect(duration).toBeLessThan(1000); // Should be very fast
    });
});
