import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateParkingVehicleSizes() {
  console.log('🚗 Starting parking vehicle size update...');

  try {
    // שליפת כל החניות עם בקשות האונבורדינג שלהן
    const parkings = await prisma.parking.findMany({
      include: {
        owner: {
          include: {
            listingRequests: {
              where: { status: 'APPROVED' },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      }
    });

    console.log(`📋 Found ${parkings.length} parkings to check`);

    let updatedCount = 0;

    for (const parking of parkings) {
      const listingRequest = parking.owner?.listingRequests?.[0];
      
      if (!listingRequest?.onboarding) {
        console.log(`⚠️  Parking ${parking.id} - No onboarding data found`);
        continue;
      }

      try {
        const onboardingData = JSON.parse(listingRequest.onboarding);
        
        if (!onboardingData.vehicleTypes || !Array.isArray(onboardingData.vehicleTypes)) {
          console.log(`⚠️  Parking ${parking.id} - No vehicleTypes in onboarding`);
          continue;
        }

        // מיפוי מהטקסט בעברית לערכי enum
        const vehicleTypeMapping = {
          'רכב מיני (קטן)': 'MINI',
          'רכב משפחתי (סטנדרטי)': 'FAMILY', 
          'SUV / קרוסאובר': 'SUV',
          'רכב גדול (וואן / מסחרי)': 'SUV' // גם רכב גדול נחשב SUV
        };
        
        // מציאת הגודל המקסימלי מהרשימה
        const sizeOrder = ['MINI', 'FAMILY', 'SUV'];
        let maxSizeIndex = -1;
        let maxVehicleSize = null;
        
        for (const vehicleType of onboardingData.vehicleTypes) {
          const mappedSize = vehicleTypeMapping[vehicleType as keyof typeof vehicleTypeMapping];
          if (mappedSize) {
            const sizeIndex = sizeOrder.indexOf(mappedSize);
            if (sizeIndex > maxSizeIndex) {
              maxSizeIndex = sizeIndex;
              maxVehicleSize = mappedSize;
            }
          }
        }

        if (maxVehicleSize) {
          // עדכון החניה
          await prisma.parking.update({
            where: { id: parking.id },
            data: { maxVehicleSize } as any
          });

          console.log(`✅ Parking ${parking.id} updated: maxVehicleSize = ${maxVehicleSize} (from: ${onboardingData.vehicleTypes.join(', ')})`);
          updatedCount++;
        } else {
          console.log(`⚠️  Parking ${parking.id} - Could not determine maxVehicleSize from: ${onboardingData.vehicleTypes.join(', ')}`);
        }

      } catch (error) {
        console.error(`❌ Error processing parking ${parking.id}:`, error);
      }
    }

    console.log(`🎉 Update completed! ${updatedCount} parkings updated.`);

  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// הרצת הסקריפט
updateParkingVehicleSizes();
