// scripts/migrate-time-blocks-4h-to-3h.ts
// סקריפט מיגרציה מבלוקי 4 שעות לבלוקי 3 שעות

import { PrismaClient } from '@prisma/client';
import { migrate4HourBlocksTo3Hour, validateAvailabilityData } from '../utils/timeBlockMigration';
import { createBackup } from './backup-parking-availability';

const prisma = new PrismaClient();

interface MigrationResult {
  totalProcessed: number;
  successfulMigrations: number;
  alreadyMigrated: number;
  errors: number;
  errorDetails: Array<{
    parkingId: number;
    error: string;
  }>;
}

async function migrateAllParkings(dryRun: boolean = false): Promise<MigrationResult> {
  console.log(`🔄 Starting migration from 4-hour blocks to 3-hour blocks (${dryRun ? 'DRY RUN' : 'LIVE'})`);
  
  const result: MigrationResult = {
    totalProcessed: 0,
    successfulMigrations: 0,
    alreadyMigrated: 0,
    errors: 0,
    errorDetails: []
  };

  try {
    // שליפת כל החניות עם נתוני זמינות
    const parkings = await prisma.parking.findMany({
      where: {
        availability: { not: null }
      },
      select: { 
        id: true, 
        title: true, 
        availability: true,
        ownerId: true
      }
    });
    
    console.log(`📊 Found ${parkings.length} parkings with availability settings`);
    
    for (const parking of parkings) {
      result.totalProcessed++;
      
      try {
        console.log(`\n🔄 Processing parking ${parking.id}: ${parking.title}`);
        
        // פרסור נתוני הזמינות
        const oldAvailability = JSON.parse(parking.availability!);
        console.log(`📋 Current availability:`, oldAvailability);
        
        // וולידציה של הנתונים הקיימים
        const validation = validateAvailabilityData(oldAvailability);
        console.log(`🔍 Format detected: ${validation.format}`);
        
        if (!validation.isValid) {
          console.log(`❌ Invalid availability data:`, validation.errors);
          result.errors++;
          result.errorDetails.push({
            parkingId: parking.id,
            error: `Invalid data: ${validation.errors.join(', ')}`
          });
          continue;
        }
        
        // בדיקה אם כבר במצב 3 שעות
        if (validation.format === '3hour') {
          console.log(`✅ Parking ${parking.id} already in 3-hour format - skipping`);
          result.alreadyMigrated++;
          continue;
        }
        
        // בדיקה אם צריך מיגרציה מ-4 שעות
        if (validation.format !== '4hour') {
          console.log(`⚠️  Parking ${parking.id} has unknown format - skipping`);
          result.errors++;
          result.errorDetails.push({
            parkingId: parking.id,
            error: `Unknown format: ${validation.format}`
          });
          continue;
        }
        
        // ביצוע המיגרציה
        console.log(`🔄 Migrating parking ${parking.id} from 4-hour to 3-hour format`);
        const newAvailability = migrate4HourBlocksTo3Hour(oldAvailability);
        console.log(`📋 New availability:`, newAvailability);
        
        // וולידציה של התוצאה
        const newValidation = validateAvailabilityData(newAvailability);
        if (!newValidation.isValid || newValidation.format !== '3hour') {
          console.log(`❌ Migration result validation failed:`, newValidation.errors);
          result.errors++;
          result.errorDetails.push({
            parkingId: parking.id,
            error: `Migration validation failed: ${newValidation.errors.join(', ')}`
          });
          continue;
        }
        
        // שמירה בדאטה בייס (אם לא dry run)
        if (!dryRun) {
          await prisma.parking.update({
            where: { id: parking.id },
            data: {
              availability: JSON.stringify(newAvailability)
            }
          });
          console.log(`✅ Saved migrated data for parking ${parking.id}`);
        } else {
          console.log(`🔍 DRY RUN: Would save migrated data for parking ${parking.id}`);
        }
        
        result.successfulMigrations++;
        
      } catch (error) {
        console.error(`❌ Failed to migrate parking ${parking.id}:`, error);
        result.errors++;
        result.errorDetails.push({
          parkingId: parking.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
  
  return result;
}

async function showMigrationSummary(result: MigrationResult): Promise<void> {
  console.log('\n📊 Migration Summary:');
  console.log('=' .repeat(50));
  console.log(`📈 Total processed: ${result.totalProcessed}`);
  console.log(`✅ Successful migrations: ${result.successfulMigrations}`);
  console.log(`⏭️  Already migrated: ${result.alreadyMigrated}`);
  console.log(`❌ Errors: ${result.errors}`);
  console.log('=' .repeat(50));
  
  if (result.errorDetails.length > 0) {
    console.log('\n❌ Error Details:');
    result.errorDetails.forEach(error => {
      console.log(`  • Parking ${error.parkingId}: ${error.error}`);
    });
  }
  
  const successRate = result.totalProcessed > 0 
    ? ((result.successfulMigrations / result.totalProcessed) * 100).toFixed(1)
    : '0';
  
  console.log(`\n📊 Success Rate: ${successRate}%`);
  
  if (result.errors > 0) {
    console.log(`⚠️  ${result.errors} parkings require manual attention`);
  }
}

async function verifyMigration(): Promise<void> {
  console.log('\n🔍 Verifying migration results...');
  
  const parkings = await prisma.parking.findMany({
    where: { availability: { not: null } },
    select: { id: true, availability: true }
  });
  
  let format3Hour = 0;
  let format4Hour = 0;
  let formatOther = 0;
  
  for (const parking of parkings) {
    try {
      const validation = validateAvailabilityData(JSON.parse(parking.availability!));
      
      if (validation.format === '3hour') {
        format3Hour++;
      } else if (validation.format === '4hour') {
        format4Hour++;
      } else {
        formatOther++;
      }
    } catch {
      formatOther++;
    }
  }
  
  console.log('🔍 Post-migration format distribution:');
  console.log(`  • 3-hour format: ${format3Hour}`);
  console.log(`  • 4-hour format: ${format4Hour}`);
  console.log(`  • Other formats: ${formatOther}`);
  
  if (format4Hour > 0) {
    console.log(`⚠️  ${format4Hour} parkings still in 4-hour format - migration incomplete`);
  } else {
    console.log('✅ All parkings successfully migrated to 3-hour format');
  }
}

async function runMigration(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipBackup = args.includes('--skip-backup');
  
  console.log('🚀 Time Blocks Migration Tool');
  console.log('=' .repeat(50));
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
  console.log(`Backup: ${skipBackup ? 'SKIPPED' : 'ENABLED'}`);
  console.log('=' .repeat(50));
  
  try {
    // יצירת גיבוי (אם לא דרי ראן ולא דולג)
    if (!dryRun && !skipBackup) {
      console.log('\n📦 Creating backup before migration...');
      await createBackup();
      console.log('✅ Backup completed');
    }
    
    // ביצוע המיגרציה
    const result = await migrateAllParkings(dryRun);
    
    // הצגת סיכום
    await showMigrationSummary(result);
    
    // וולידציה (אם לא דרי ראן)
    if (!dryRun) {
      await verifyMigration();
    }
    
    if (result.errors === 0) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log(`\n⚠️  Migration completed with ${result.errors} errors`);
      console.log('Please review the error details above and handle manually if needed');
    }
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// הרצה ישירה אם הקובץ מופעל
if (require.main === module) {
  runMigration()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration process failed:', error);
      process.exit(1);
    });
}

export { migrateAllParkings, verifyMigration };
