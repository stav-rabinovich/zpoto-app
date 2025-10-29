// utils/featureFlags.ts - מערכת Feature Flags למעבר בטוח למודל תמחור חדש
import { prisma } from '../lib/prisma';

export interface FeatureFlagConfig {
  PROPORTIONAL_PRICING: boolean;
  PROPORTIONAL_ROLLOUT_PERCENTAGE: number;
  ENABLE_PRICE_BREAKDOWN_LOGGING: boolean;
  ENABLE_PRICING_COMPARISON: boolean;
}

/**
 * קבלת הגדרות Feature Flags מ-environment variables
 */
export function getFeatureFlags(): FeatureFlagConfig {
  return {
    PROPORTIONAL_PRICING: process.env.ENABLE_PROPORTIONAL_PRICING === 'true',
    PROPORTIONAL_ROLLOUT_PERCENTAGE: parseInt(process.env.PROPORTIONAL_PRICING_PERCENTAGE || '0'),
    ENABLE_PRICE_BREAKDOWN_LOGGING: process.env.ENABLE_PRICE_BREAKDOWN_LOGGING === 'true',
    ENABLE_PRICING_COMPARISON: process.env.ENABLE_PRICING_COMPARISON === 'true',
  };
}

/**
 * בדיקה האם משתמש ספציפי אמור לקבל תמחור יחסי
 * @param userId ID של המשתמש
 * @returns true אם המשתמש אמור לקבל תמחור יחסי
 */
export function shouldUseProportionalPricing(userId?: number): boolean {
  // 🆕 הפעלה מלאה של המודל החדש - תמיד true
  console.log('🎛️ ✅ PROPORTIONAL PRICING ENABLED - using NEW proportional pricing for all users');
  return true;

  // 📝 LEGACY CODE - Feature flags system (Commented Out)
  // const flags = getFeatureFlags();
  //
  // // אם הfeature כבוי לגמרי
  // if (!flags.PROPORTIONAL_PRICING) {
  //   console.log('🎛️ Proportional pricing disabled globally');
  //   return false;
  // }
  //
  // // אם אין user ID (anonymous), לא משתמשים בתמחור חדש
  // if (!userId) {
  //   console.log('🎛️ No user ID provided, using legacy pricing');
  //   return false;
  // }
  //
  // // A/B testing based on user ID
  // if (flags.PROPORTIONAL_ROLLOUT_PERCENTAGE > 0 && flags.PROPORTIONAL_ROLLOUT_PERCENTAGE < 100) {
  //   const userBucket = userId % 100;
  //   const shouldUse = userBucket < flags.PROPORTIONAL_ROLLOUT_PERCENTAGE;
  //
  //   console.log(`🎛️ A/B Test - User ${userId} (bucket ${userBucket}): ${shouldUse ? 'NEW' : 'LEGACY'} pricing (${flags.PROPORTIONAL_ROLLOUT_PERCENTAGE}% rollout)`);
  //   return shouldUse;
  // }
  //
  // // 100% rollout
  // if (flags.PROPORTIONAL_ROLLOUT_PERCENTAGE >= 100) {
  //   console.log('🎛️ 100% rollout - using NEW proportional pricing');
  //   return true;
  // }
  //
  // // 0% rollout או כל מקרה אחר
  // console.log('🎛️ 0% rollout - using LEGACY pricing');
  // return false;
}

/**
 * לוגינג מפורט של חישוב מחיר (אם מופעל)
 */
export function logPriceCalculation(data: {
  userId?: number;
  parkingId: number;
  durationMs: number;
  method: 'legacy' | 'proportional';
  oldPrice?: number;
  newPrice?: number;
  breakdown?: any;
}) {
  const flags = getFeatureFlags();

  if (!flags.ENABLE_PRICE_BREAKDOWN_LOGGING) {
    return;
  }

  console.log('💰 📊 Price Calculation Log:', {
    timestamp: new Date().toISOString(),
    userId: data.userId,
    parkingId: data.parkingId,
    durationHours: (data.durationMs / (1000 * 60 * 60)).toFixed(2),
    method: data.method,
    oldPrice: data.oldPrice ? `₪${(data.oldPrice / 100).toFixed(2)}` : 'N/A',
    newPrice: data.newPrice ? `₪${(data.newPrice / 100).toFixed(2)}` : 'N/A',
    difference:
      data.oldPrice && data.newPrice
        ? `₪${((data.newPrice - data.oldPrice) / 100).toFixed(2)} (${((data.newPrice / data.oldPrice - 1) * 100).toFixed(1)}%)`
        : 'N/A',
    breakdown: data.breakdown,
  });
}

/**
 * שמירת סטטיסטיקות השוואה (אם מופעל)
 */
export async function savePricingComparison(data: {
  userId: number;
  parkingId: number;
  durationMs: number;
  legacyPriceCents: number;
  proportionalPriceCents: number;
  methodUsed: 'legacy' | 'proportional';
  breakdown?: any;
}) {
  const flags = getFeatureFlags();

  if (!flags.ENABLE_PRICING_COMPARISON) {
    return;
  }

  try {
    // נשמור בטבלה חדשה לאנליטיקס (נוסיף אותה בהמשך)
    console.log('📈 Saving pricing comparison data:', {
      userId: data.userId,
      parkingId: data.parkingId,
      durationHours: (data.durationMs / (1000 * 60 * 60)).toFixed(2),
      legacyPrice: `₪${(data.legacyPriceCents / 100).toFixed(2)}`,
      proportionalPrice: `₪${(data.proportionalPriceCents / 100).toFixed(2)}`,
      difference: `₪${((data.proportionalPriceCents - data.legacyPriceCents) / 100).toFixed(2)}`,
      percentageDiff: `${((data.proportionalPriceCents / data.legacyPriceCents - 1) * 100).toFixed(1)}%`,
      methodUsed: data.methodUsed,
    });

    // TODO: שמירה בDB כשנוסיף את הטבלה
    // await prisma.pricingComparison.create({ data: ... });
  } catch (error) {
    console.error('❌ Failed to save pricing comparison:', error);
  }
}

/**
 * קבלת סטטיסטיקות feature flags לאדמין
 */
export function getFeatureFlagStats() {
  const flags = getFeatureFlags();

  return {
    proportionalPricing: {
      enabled: flags.PROPORTIONAL_PRICING,
      rolloutPercentage: flags.PROPORTIONAL_ROLLOUT_PERCENTAGE,
      status:
        flags.PROPORTIONAL_ROLLOUT_PERCENTAGE === 0
          ? 'disabled'
          : flags.PROPORTIONAL_ROLLOUT_PERCENTAGE === 100
            ? 'full_rollout'
            : 'a_b_testing',
    },
    logging: {
      priceBreakdown: flags.ENABLE_PRICE_BREAKDOWN_LOGGING,
      pricingComparison: flags.ENABLE_PRICING_COMPARISON,
    },
    environmentVariables: {
      ENABLE_PROPORTIONAL_PRICING: process.env.ENABLE_PROPORTIONAL_PRICING || 'false',
      PROPORTIONAL_PRICING_PERCENTAGE: process.env.PROPORTIONAL_PRICING_PERCENTAGE || '0',
      ENABLE_PRICE_BREAKDOWN_LOGGING: process.env.ENABLE_PRICE_BREAKDOWN_LOGGING || 'false',
      ENABLE_PRICING_COMPARISON: process.env.ENABLE_PRICING_COMPARISON || 'false',
    },
  };
}

/**
 * עדכון feature flags בזמן ריצה (לטסטים)
 */
export function setFeatureFlagForTesting(flag: keyof FeatureFlagConfig, value: boolean | number) {
  switch (flag) {
    case 'PROPORTIONAL_PRICING':
      process.env.ENABLE_PROPORTIONAL_PRICING = value.toString();
      break;
    case 'PROPORTIONAL_ROLLOUT_PERCENTAGE':
      process.env.PROPORTIONAL_PRICING_PERCENTAGE = value.toString();
      break;
    case 'ENABLE_PRICE_BREAKDOWN_LOGGING':
      process.env.ENABLE_PRICE_BREAKDOWN_LOGGING = value.toString();
      break;
    case 'ENABLE_PRICING_COMPARISON':
      process.env.ENABLE_PRICING_COMPARISON = value.toString();
      break;
  }

  console.log(`🧪 Test: Set ${flag} = ${value}`);
}

export default {
  getFeatureFlags,
  shouldUseProportionalPricing,
  logPriceCalculation,
  savePricingComparison,
  getFeatureFlagStats,
  setFeatureFlagForTesting,
};
