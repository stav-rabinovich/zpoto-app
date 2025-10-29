// סקריפט לבדיקת זמינות החניה של "מנדלי מוכר ספרים 16"
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugParkingAvailability() {
  try {
    console.log('🔍 חיפוש החניה של "מנדלי מוכר ספרים 16"...');
    
    // חיפוש החניה
    const parking = await prisma.parking.findFirst({
      where: {
        title: {
          contains: 'מנדלי מוכר ספרים 16'
        }
      },
      select: {
        id: true,
        title: true,
        availability: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!parking) {
      console.log('❌ לא נמצאה חניה עם השם "מנדלי מוכר ספרים 16"');
      
      // בואו נחפש חניות דומות
      const similarParkings = await prisma.parking.findMany({
        where: {
          title: {
            contains: 'מנדלי'
          }
        },
        select: {
          id: true,
          title: true,
          availability: true,
          isActive: true
        }
      });
      
      console.log('🔍 חניות דומות שנמצאו:');
      similarParkings.forEach(p => {
        console.log(`- ID: ${p.id}, Title: "${p.title}", Active: ${p.isActive}`);
      });
      
      return;
    }

    console.log('✅ נמצאה החניה:');
    console.log(`- ID: ${parking.id}`);
    console.log(`- Title: "${parking.title}"`);
    console.log(`- Active: ${parking.isActive}`);
    console.log(`- Created: ${parking.createdAt}`);
    console.log(`- Updated: ${parking.updatedAt}`);
    
    console.log('\n🔍 הגדרות זמינות:');
    if (!parking.availability) {
      console.log('❌ אין הגדרות זמינות (null)');
    } else {
      console.log('Raw availability:', parking.availability);
      
      try {
        const parsed = JSON.parse(parking.availability);
        console.log('✅ Parsed availability:');
        console.log(JSON.stringify(parsed, null, 2));
        
        // בדיקה ספציפית ליום שלישי
        const tuesdaySlots = parsed.tuesday || [];
        console.log(`\n🔍 זמינות ביום שלישי: [${tuesdaySlots.join(', ')}]`);
        
        if (tuesdaySlots.length === 0) {
          console.log('❌ אין זמינות ביום שלישי');
        } else {
          console.log('✅ יש זמינות ביום שלישי בבלוקים:');
          tuesdaySlots.forEach(slot => {
            const endSlot = slot + 4;
            console.log(`- ${slot}:00-${endSlot}:00`);
          });
          
          // בדיקה אם 14:00-15:00 אמור להיות זמין
          const hour14Block = Math.floor(14 / 4) * 4; // 12
          const isAvailable = tuesdaySlots.includes(hour14Block);
          console.log(`\n🎯 בדיקה עבור 14:00-15:00:`);
          console.log(`- שעה 14 שייכת לבלוק: ${hour14Block}:00-${hour14Block + 4}:00`);
          console.log(`- הבלוק ${hour14Block} זמין: ${isAvailable ? '✅ כן' : '❌ לא'}`);
        }
      } catch (error) {
        console.log('❌ שגיאה בפרסור JSON:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ שגיאה:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugParkingAvailability();
