/**
 * תיקון אי-עקביות בין priceHr למחירון האמיתי
 * עדכון priceHr להתאים לשעה הראשונה במחירון
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixPriceHrInconsistencies() {
  console.log('🔧 מתחיל תיקון אי-עקביות בין priceHr למחירון...\n');
  
  try {
    // שליפת חניות עם אי-עקביות
    const parkings = await prisma.parking.findMany({
      select: {
        id: true,
        title: true,
        priceHr: true,
        pricing: true,
      },
    });

    let fixedCount = 0;
    let errors = 0;

    for (const parking of parkings) {
      try {
        if (!parking.pricing || parking.pricing === '' || parking.pricing === '{}') {
          console.log(`⚠️ חניה #${parking.id}: אין מחירון - משאיר priceHr=${parking.priceHr}`);
          continue;
        }

        const pricingData = typeof parking.pricing === 'string' 
          ? JSON.parse(parking.pricing) 
          : parking.pricing;

        if (!pricingData.hour1) {
          console.log(`⚠️ חניה #${parking.id}: אין hour1 במחירון - משאיר priceHr=${parking.priceHr}`);
          continue;
        }

        const correctPrice = parseFloat(pricingData.hour1);
        
        if (parking.priceHr !== correctPrice) {
          console.log(`🔧 חניה #${parking.id}: מעדכן priceHr מ-${parking.priceHr}₪ ל-${correctPrice}₪`);
          
          await prisma.parking.update({
            where: { id: parking.id },
            data: { priceHr: correctPrice }
          });
          
          fixedCount++;
        } else {
          console.log(`✅ חניה #${parking.id}: priceHr=${parking.priceHr}₪ כבר תואם למחירון`);
        }

      } catch (error) {
        console.error(`❌ שגיאה בעדכון חניה #${parking.id}:`, error.message);
        errors++;
      }
    }

    console.log(`\n📊 סיכום:`);
    console.log(`   חניות שתוקנו: ${fixedCount}`);
    console.log(`   שגיאות: ${errors}`);
    console.log(`   סה"כ חניות שנבדקו: ${parkings.length}`);

    if (fixedCount > 0) {
      console.log(`\n✅ תיקון הושלם בהצלחה! priceHr עכשיו עקבי עם המחירון`);
    } else {
      console.log(`\n✅ כל החניות כבר היו עקביות`);
    }

  } catch (error) {
    console.error('❌ שגיאה בתיקון:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// הרצת התיקון
fixPriceHrInconsistencies()
  .then(() => {
    console.log('\n🎉 תיקון הושלם בהצלחה');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ שגיאה:', error);
    process.exit(1);
  });
