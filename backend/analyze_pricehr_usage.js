/**
 * סקריפט ניתוח שימוש בשדה priceHr
 * בודק את המצב הנוכחי של הנתונים ומציג המלצות
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyzePriceHrUsage() {
  console.log('🔍 מתחיל ניתוח שימוש בשדה priceHr...\n');
  
  try {
    // שליפת כל החניות
    const allParkings = await prisma.parking.findMany({
      select: {
        id: true,
        title: true,
        priceHr: true,
        pricing: true,
        isActive: true,
        ownerId: true,
      },
    });

    console.log(`📊 נמצאו ${allParkings.length} חניות במערכת\n`);

    // ניתוח נתונים
    let stats = {
      total: allParkings.length,
      withPricing: 0,
      withoutPricing: 0,
      priceHrValues: {},
      inconsistencies: [],
      zeroPrice: 0,
      highPrice: 0,
    };

    allParkings.forEach(parking => {
      // ספירת חניות עם מחירון
      if (parking.pricing && parking.pricing !== '' && parking.pricing !== '{}') {
        stats.withPricing++;
        
        // בדיקת עקביות
        try {
          const pricingData = typeof parking.pricing === 'string' 
            ? JSON.parse(parking.pricing) 
            : parking.pricing;
            
          if (pricingData.hour1 && pricingData.hour1 !== parking.priceHr) {
            stats.inconsistencies.push({
              id: parking.id,
              title: parking.title,
              priceHr: parking.priceHr,
              hour1: pricingData.hour1,
              difference: Math.abs(pricingData.hour1 - parking.priceHr)
            });
          }
        } catch (error) {
          console.warn(`⚠️ שגיאה בפענוח pricing עבור חניה ${parking.id}:`, error.message);
        }
      } else {
        stats.withoutPricing++;
      }

      // ספירת ערכי priceHr
      const priceKey = parking.priceHr.toString();
      stats.priceHrValues[priceKey] = (stats.priceHrValues[priceKey] || 0) + 1;

      // זיהוי מחירים חריגים
      if (parking.priceHr === 0) stats.zeroPrice++;
      if (parking.priceHr > 50) stats.highPrice++;
    });

    // הצגת תוצאות
    console.log('📈 סטטיסטיקות כלליות:');
    console.log(`   חניות עם מחירון מותאם: ${stats.withPricing} (${((stats.withPricing/stats.total)*100).toFixed(1)}%)`);
    console.log(`   חניות ללא מחירון: ${stats.withoutPricing} (${((stats.withoutPricing/stats.total)*100).toFixed(1)}%)`);
    console.log(`   חניות עם מחיר 0₪: ${stats.zeroPrice}`);
    console.log(`   חניות עם מחיר גבוה (>50₪): ${stats.highPrice}\n`);

    console.log('💰 התפלגות ערכי priceHr:');
    Object.entries(stats.priceHrValues)
      .sort((a, b) => parseInt(b[1]) - parseInt(a[1]))
      .slice(0, 10)
      .forEach(([price, count]) => {
        console.log(`   ${price}₪: ${count} חניות`);
      });

    if (stats.inconsistencies.length > 0) {
      console.log(`\n⚠️ אי-עקביות בין priceHr ו-pricing (${stats.inconsistencies.length} חניות):`);
      stats.inconsistencies
        .sort((a, b) => b.difference - a.difference)
        .slice(0, 5)
        .forEach(item => {
          console.log(`   חניה #${item.id}: priceHr=${item.priceHr}₪, hour1=${item.hour1}₪ (הפרש: ${item.difference.toFixed(1)}₪)`);
        });
      
      if (stats.inconsistencies.length > 5) {
        console.log(`   ...ועוד ${stats.inconsistencies.length - 5} חניות`);
      }
    }

    // המלצות
    console.log('\n💡 המלצות לפעולה:');
    
    if (stats.withoutPricing > 0) {
      console.log(`   🔧 יש ליצור מחירון עבור ${stats.withoutPricing} חניות שאין להן pricing`);
    }
    
    if (stats.inconsistencies.length > 0) {
      console.log(`   🔧 יש לתקן ${stats.inconsistencies.length} אי-עקביות בין priceHr ו-pricing`);
    }
    
    if (stats.zeroPrice > 0) {
      console.log(`   🔧 יש לבדוק ${stats.zeroPrice} חניות עם מחיר 0₪`);
    }

    if (stats.inconsistencies.length === 0 && stats.withoutPricing === 0) {
      console.log(`   ✅ המערכת מוכנה למחיקת priceHr - אין אי-עקביות`);
    } else {
      console.log(`   ⚠️ יש לתקן בעיות לפני מחיקת priceHr`);
    }

    // בדיקת הזמנות שהשתמשו בpriceHr
    console.log('\n🔍 בדיקת השפעה על הזמנות קיימות...');
    
    const bookingsWithPossibleIssues = await prisma.booking.findMany({
      where: {
        totalPriceCents: null, // הזמנות שלא שמרו מחיר מדויק
      },
      include: {
        parking: {
          select: {
            priceHr: true,
            pricing: true,
          }
        }
      }
    });

    if (bookingsWithPossibleIssues.length > 0) {
      console.log(`   ⚠️ נמצאו ${bookingsWithPossibleIssues.length} הזמנות שייתכן ותלויות בpriceHr`);
    } else {
      console.log(`   ✅ כל ההזמנות שמרו מחיר מדויק - לא תלויות בpriceHr`);
    }

  } catch (error) {
    console.error('❌ שגיאה בניתוח:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// הרצת הסקריפט
analyzePriceHrUsage()
  .then(() => {
    console.log('\n✅ ניתוח הושלם בהצלחה');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ שגיאה:', error);
    process.exit(1);
  });
