// scripts/rollback-to-4h-blocks.ts
// סקריפט rollback מבלוקי 3 שעות חזרה לבלוקי 4 שעות

import { PrismaClient } from '@prisma/client';
import { migrate3HourBlocksTo4Hour, validateAvailabilityData } from '../utils/timeBlockMigration';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface RollbackResult {
  totalProcessed: number;
  successfulRollbacks: number;
  alreadyRolledBack: number;
  errors: number;
  errorDetails: Array<{
    parkingId: number;
    error: string;
  }>;
}

async function rollbackFromBackup(backupFilePath: string): Promise<RollbackResult> {
  console.log(`🔄 Starting rollback from backup: ${backupFilePath}`);
  
  const result: RollbackResult = {
    totalProcessed: 0,
    successfulRollbacks: 0,
    alreadyRolledBack: 0,
    errors: 0,
    errorDetails: []
  };

  try {
    // קריאת קובץ הגיבוי
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`Backup file not found: ${backupFilePath}`);
    }

    const backupContent = fs.readFileSync(backupFilePath, 'utf8');
    const backupData = JSON.parse(backupContent);
    
    console.log(`📦 Backup created: ${backupData.timestamp}`);
    console.log(`📊 Backup contains ${backupData.parkings.length} parkings`);

    for (const backupParking of backupData.parkings) {
      if (!backupParking.availability) {
        continue; // דלג על חניות ללא נתוני זמינות
      }

      result.totalProcessed++;

      try {
        console.log(`\n🔄 Restoring parking ${backupParking.id}: ${backupParking.title}`);

        // בדיקה שהחניה עדיין קיימת
        const currentParking = await prisma.parking.findUnique({
          where: { id: backupParking.id },
          select: { id: true, availability: true }
        });

        if (!currentParking) {
          console.log(`⚠️  Parking ${backupParking.id} no longer exists - skipping`);
          result.errors++;
          result.errorDetails.push({
            parkingId: backupParking.id,
            error: 'Parking no longer exists'
          });
          continue;
        }

        // שחזור נתוני הזמינות מהגיבוי
        await prisma.parking.update({
          where: { id: backupParking.id },
          data: {
            availability: backupParking.availability
          }
        });

        console.log(`✅ Restored parking ${backupParking.id} from backup`);
        result.successfulRollbacks++;

      } catch (error) {
        console.error(`❌ Failed to restore parking ${backupParking.id}:`, error);
        result.errors++;
        result.errorDetails.push({
          parkingId: backupParking.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

  } catch (error) {
    console.error('❌ Rollback from backup failed:', error);
    throw error;
  }

  return result;
}

async function rollbackUsingMigration(): Promise<RollbackResult> {
  console.log('🔄 Starting rollback using reverse migration (3h -> 4h)');
  
  const result: RollbackResult = {
    totalProcessed: 0,
    successfulRollbacks: 0,
    alreadyRolledBack: 0,
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
        availability: true 
      }
    });
    
    console.log(`📊 Found ${parkings.length} parkings with availability settings`);
    
    for (const parking of parkings) {
      result.totalProcessed++;
      
      try {
        console.log(`\n🔄 Processing parking ${parking.id}: ${parking.title}`);
        
        // פרסור נתוני הזמינות
        const currentAvailability = JSON.parse(parking.availability!);
        console.log(`📋 Current availability:`, currentAvailability);
        
        // וולידציה של הנתונים הקיימים
        const validation = validateAvailabilityData(currentAvailability);
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
        
        // בדיקה אם כבר במצב 4 שעות
        if (validation.format === '4hour') {
          console.log(`✅ Parking ${parking.id} already in 4-hour format - skipping`);
          result.alreadyRolledBack++;
          continue;
        }
        
        // בדיקה אם במצב 3 שעות
        if (validation.format !== '3hour') {
          console.log(`⚠️  Parking ${parking.id} not in 3-hour format - skipping`);
          result.errors++;
          result.errorDetails.push({
            parkingId: parking.id,
            error: `Not in 3-hour format: ${validation.format}`
          });
          continue;
        }
        
        // ביצוע הרולבק
        console.log(`🔄 Rolling back parking ${parking.id} from 3-hour to 4-hour format`);
        const rolledBackAvailability = migrate3HourBlocksTo4Hour(currentAvailability);
        console.log(`📋 Rolled back availability:`, rolledBackAvailability);
        
        // וולידציה של התוצאה
        const newValidation = validateAvailabilityData(rolledBackAvailability);
        if (!newValidation.isValid || newValidation.format !== '4hour') {
          console.log(`❌ Rollback result validation failed:`, newValidation.errors);
          result.errors++;
          result.errorDetails.push({
            parkingId: parking.id,
            error: `Rollback validation failed: ${newValidation.errors.join(', ')}`
          });
          continue;
        }
        
        // שמירה בדאטה בייס
        await prisma.parking.update({
          where: { id: parking.id },
          data: {
            availability: JSON.stringify(rolledBackAvailability)
          }
        });
        
        console.log(`✅ Rolled back parking ${parking.id} successfully`);
        result.successfulRollbacks++;
        
      } catch (error) {
        console.error(`❌ Failed to rollback parking ${parking.id}:`, error);
        result.errors++;
        result.errorDetails.push({
          parkingId: parking.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Rollback migration failed:', error);
    throw error;
  }
  
  return result;
}

async function listAvailableBackups(): Promise<string[]> {
  const backupDir = path.join(__dirname, '..', '..', 'backups');
  
  if (!fs.existsSync(backupDir)) {
    return [];
  }
  
  const files = fs.readdirSync(backupDir);
  const backupFiles = files
    .filter(file => file.startsWith('parking-availability-backup-') && file.endsWith('.json'))
    .sort()
    .reverse(); // החדש ביותר ראשון
  
  return backupFiles.map(file => path.join(backupDir, file));
}

async function showRollbackSummary(result: RollbackResult): Promise<void> {
  console.log('\n📊 Rollback Summary:');
  console.log('=' .repeat(50));
  console.log(`📈 Total processed: ${result.totalProcessed}`);
  console.log(`✅ Successful rollbacks: ${result.successfulRollbacks}`);
  console.log(`⏭️  Already rolled back: ${result.alreadyRolledBack}`);
  console.log(`❌ Errors: ${result.errors}`);
  console.log('=' .repeat(50));
  
  if (result.errorDetails.length > 0) {
    console.log('\n❌ Error Details:');
    result.errorDetails.forEach(error => {
      console.log(`  • Parking ${error.parkingId}: ${error.error}`);
    });
  }
  
  const successRate = result.totalProcessed > 0 
    ? ((result.successfulRollbacks / result.totalProcessed) * 100).toFixed(1)
    : '0';
  
  console.log(`\n📊 Success Rate: ${successRate}%`);
}

async function runRollback(): Promise<void> {
  const args = process.argv.slice(2);
  const backupFile = args.find(arg => arg.startsWith('--backup='))?.split('=')[1];
  const useMigration = args.includes('--use-migration');
  
  console.log('🔙 Time Blocks Rollback Tool');
  console.log('=' .repeat(50));
  
  try {
    let result: RollbackResult;
    
    if (backupFile) {
      // רולבק מקובץ גיבוי ספציפי
      console.log(`Method: Restore from backup file`);
      console.log(`Backup: ${backupFile}`);
      result = await rollbackFromBackup(backupFile);
      
    } else if (useMigration) {
      // רולבק באמצעות מיגרציה הפוכה
      console.log(`Method: Reverse migration (3h -> 4h)`);
      result = await rollbackUsingMigration();
      
    } else {
      // הצגת גיבויים זמינים ובחירה
      const availableBackups = await listAvailableBackups();
      
      if (availableBackups.length === 0) {
        console.log('❌ No backup files found');
        console.log('Available options:');
        console.log('  1. Use --use-migration flag for reverse migration');
        console.log('  2. Specify backup file with --backup=/path/to/backup.json');
        process.exit(1);
      }
      
      console.log('\n📦 Available backup files:');
      availableBackups.forEach((backup, index) => {
        const fileName = path.basename(backup);
        console.log(`  ${index + 1}. ${fileName}`);
      });
      
      console.log('\nUsage:');
      console.log(`  --backup=${availableBackups[0]} (latest backup)`);
      console.log('  --use-migration (reverse migration)');
      process.exit(0);
    }
    
    console.log('=' .repeat(50));
    
    // הצגת סיכום
    await showRollbackSummary(result);
    
    if (result.errors === 0) {
      console.log('\n🎉 Rollback completed successfully!');
    } else {
      console.log(`\n⚠️  Rollback completed with ${result.errors} errors`);
    }
    
  } catch (error) {
    console.error('\n💥 Rollback failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// הרצה ישירה אם הקובץ מופעל
if (require.main === module) {
  runRollback()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Rollback process failed:', error);
      process.exit(1);
    });
}

export { rollbackFromBackup, rollbackUsingMigration };
