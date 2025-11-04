"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateProportionalPrice = calculateProportionalPrice;
exports.formatPriceBreakdown = formatPriceBreakdown;
exports.validatePricingData = validatePricingData;
/**
 * חישוב מחיר יחסי מדויק לפי משך זמן
 * @param durationMs משך הזמן במילישניות
 * @param pricingData מחירון לפי שעות
 * @param legacyPricePerHour מחיר ישן לשעה (fallback)
 * @returns פירוט מחיר מלא
 */
function calculateProportionalPrice(durationMs, pricingData, legacyPricePerHour = 10) {
    console.log('💰 🎯 calculateProportionalPrice called:', {
        durationMs,
        pricingData,
        legacyPricePerHour,
    });
    // המרה לשעות מדויקות (לא עיגול!)
    const exactHours = durationMs / (1000 * 60 * 60);
    // מינימום שעה אחת
    if (exactHours < 1) {
        console.log('💰 ⚠️ Duration less than 1 hour, setting to 1 hour minimum');
        return calculateProportionalPrice(1000 * 60 * 60, pricingData, legacyPricePerHour);
    }
    // בדיקה אם יש מחירון מדורג תקין
    if (!pricingData || !pricingData.hour1) {
        console.log('💰 ⚠️ No valid tiered pricing, using legacy calculation');
        return calculateLegacyPrice(exactHours, legacyPricePerHour);
    }
    return calculateTieredProportionalPrice(exactHours, pricingData);
}
/**
 * חישוב מחיר מדורג יחסי
 */
function calculateTieredProportionalPrice(exactHours, pricingData) {
    console.log('💰 ✅ Using PROPORTIONAL tiered pricing calculation');
    const wholeHours = Math.floor(exactHours); // שעות שלמות
    const fractionalPart = exactHours - wholeHours; // חלק שברי (0-0.99)
    let totalPriceCents = 0;
    const breakdown = [];
    // חישוב שעות שלמות
    for (let i = 1; i <= wholeHours; i++) {
        const hourPrice = parseHourPrice(pricingData[`hour${i}`], pricingData.hour1);
        const hourPriceCents = Math.round(hourPrice * 100);
        totalPriceCents += hourPriceCents;
        breakdown.push({
            hour: i,
            price: hourPrice,
            priceCents: hourPriceCents,
            isFractional: false,
        });
        console.log(`💰 ✅ Hour ${i}: ₪${hourPrice} (${hourPriceCents} cents)`);
    }
    // חישוב חלק שברי (אם קיים)
    if (fractionalPart > 0) {
        const nextHourIndex = wholeHours + 1;
        const nextHourPrice = parseHourPrice(pricingData[`hour${nextHourIndex}`], pricingData.hour1 // fallback לשעה ראשונה
        );
        const fractionalPrice = fractionalPart * nextHourPrice;
        const fractionalPriceCents = Math.round(fractionalPrice * 100);
        totalPriceCents += fractionalPriceCents;
        breakdown.push({
            hour: nextHourIndex,
            price: fractionalPrice,
            priceCents: fractionalPriceCents,
            isFractional: true,
            fractionalPart,
        });
        console.log(`💰 ✅ Hour ${nextHourIndex} (${(fractionalPart * 100).toFixed(0)}%): ₪${fractionalPrice.toFixed(2)} (${fractionalPriceCents} cents)`);
    }
    const result = {
        totalPriceCents,
        totalPriceILS: (totalPriceCents / 100).toFixed(2),
        exactHours,
        wholeHours,
        fractionalHours: fractionalPart,
        breakdown,
        calculationMethod: 'proportional',
    };
    console.log('💰 ✅ Proportional calculation result:', result);
    return result;
}
/**
 * חישוב מחיר ישן (legacy) - לתאימות לאחור
 */
function calculateLegacyPrice(exactHours, pricePerHour) {
    console.log('💰 ⚠️ Using LEGACY pricing calculation');
    // בשיטה הישנה: עיגול כלפי מעלה
    const ceiledHours = Math.ceil(exactHours);
    const totalPrice = ceiledHours * pricePerHour;
    const totalPriceCents = Math.round(totalPrice * 100);
    const breakdown = [];
    for (let i = 1; i <= ceiledHours; i++) {
        breakdown.push({
            hour: i,
            price: pricePerHour,
            priceCents: Math.round(pricePerHour * 100),
            isFractional: false,
        });
    }
    const result = {
        totalPriceCents,
        totalPriceILS: (totalPriceCents / 100).toFixed(2),
        exactHours,
        wholeHours: ceiledHours,
        fractionalHours: 0,
        breakdown,
        calculationMethod: 'legacy',
    };
    console.log('💰 ⚠️ Legacy calculation result:', result);
    return result;
}
/**
 * המרת מחיר שעה מ-string ל-number עם fallback
 */
function parseHourPrice(hourPrice, fallback) {
    if (hourPrice !== undefined && hourPrice !== null) {
        const parsed = typeof hourPrice === 'string' ? parseFloat(hourPrice) : hourPrice;
        if (!isNaN(parsed) && parsed >= 0) {
            return parsed;
        }
    }
    // fallback
    if (fallback !== undefined && fallback !== null) {
        const parsedFallback = typeof fallback === 'string' ? parseFloat(fallback) : fallback;
        if (!isNaN(parsedFallback) && parsedFallback >= 0) {
            return parsedFallback;
        }
    }
    // fallback אחרון
    console.warn('💰 ⚠️ Could not parse hour price, using default ₪10');
    return 10;
}
/**
 * יצירת תיאור טקסטואלי של החישוב
 */
function formatPriceBreakdown(breakdown) {
    const parts = [];
    breakdown.breakdown.forEach(item => {
        if (item.isFractional && item.fractionalPart) {
            parts.push(`שעה ${item.hour}: ₪${item.price.toFixed(2)} (${(item.fractionalPart * 100).toFixed(0)}%)`);
        }
        else {
            parts.push(`שעה ${item.hour}: ₪${item.price.toFixed(2)}`);
        }
    });
    return `${parts.join(' + ')} = ₪${breakdown.totalPriceILS}`;
}
/**
 * בדיקת תקינות מחירון
 */
function validatePricingData(pricingData) {
    const errors = [];
    if (!pricingData || typeof pricingData !== 'object') {
        errors.push('מחירון חסר או לא תקין');
        return { isValid: false, errors };
    }
    // בדיקת שעה ראשונה (חובה)
    if (!pricingData.hour1 || isNaN(parseFloat(pricingData.hour1))) {
        errors.push('מחיר שעה ראשונה חסר או לא תקין');
    }
    // בדיקת שאר השעות
    for (let i = 1; i <= 12; i++) {
        const hourKey = `hour${i}`;
        const hourPrice = pricingData[hourKey];
        if (hourPrice !== undefined && hourPrice !== null) {
            const parsed = parseFloat(hourPrice);
            if (isNaN(parsed) || parsed < 0) {
                errors.push(`מחיר שעה ${i} לא תקין: ${hourPrice}`);
            }
        }
    }
    return { isValid: errors.length === 0, errors };
}
exports.default = {
    calculateProportionalPrice,
    formatPriceBreakdown,
    validatePricingData,
};
