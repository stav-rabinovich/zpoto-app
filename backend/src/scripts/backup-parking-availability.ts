// scripts/backup-parking-availability.ts
// סקריפט גיבוי לנתוני זמינות חניות לפני מיגרציה

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface BackupData {
  timestamp: string;
  totalParkings: number;
  parkingsWithAvailability: number;
  parkings: Array<{
    id: number;
    title: string;
    availability: string | null;
    ownerId: number;
  }>;
}

async function createBackup(): Promise<void> {
  console.log('🔄 Starting parking availability backup...');
  
  try {
    // שליפת כל החניות עם נתוני זמינות
    const allParkings = await prisma.parking.findMany({
      select: {
        id: true,
        title: true,
        availability: true,
        ownerId: true,
      },
      orderBy: { id: 'asc' }
    });

    const parkingsWithAvailability = allParkings.filter(p => p.availability !== null);

    console.log(`📊 Found ${allParkings.length} total parkings`);
    console.log(`📊 Found ${parkingsWithAvailability.length} parkings with availability settings`);

    // יצירת אובייקט הגיבוי
    const backupData: BackupData = {
      timestamp: new Date().toISOString(),
      totalParkings: allParkings.length,
      parkingsWithAvailability: parkingsWithAvailability.length,
      parkings: allParkings
    };

    // יצירת שם קובץ עם תאריך ושעה
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `parking-availability-backup-${timestamp}.json`;
    const backupDir = path.join(__dirname, '..', '..', 'backups');
    const backupPath = path.join(backupDir, backupFileName);

    // יצירת תיקיית backups אם לא קיימת
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log(`📁 Created backup directory: ${backupDir}`);
    }

    // שמירת הגיבוי
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    
    console.log(`✅ Backup created successfully: ${backupPath}`);
    console.log(`📄 Backup file size: ${(fs.statSync(backupPath).size / 1024).toFixed(2)} KB`);

    // יצירת גיבוי נוסף בפורמט SQL לביטחון
    await createSQLBackup(backupDir, timestamp);

    // הצגת סטטיסטיקות
    await showBackupStatistics(parkingsWithAvailability);

  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function createSQLBackup(backupDir: string, timestamp: string): Promise<void> {
  console.log('🔄 Creating SQL backup...');
  
  try {
    const parkings = await prisma.parking.findMany({
      where: { availability: { not: null } },
      select: {
        id: true,
        availability: true,
      }
    });

    const sqlStatements = [
      '-- Parking Availability Backup',
      `-- Created: ${new Date().toISOString()}`,
      `-- Total parkings with availability: ${parkings.length}`,
      '',
      'CREATE TABLE IF NOT EXISTS parking_availability_backup (',
      '  id INTEGER PRIMARY KEY,',
      '  availability TEXT,',
      '  updated_at TIMESTAMP,',
      '  backup_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
      ');',
      '',
      '-- Insert statements',
      ...parkings.map(p => 
        `INSERT INTO parking_availability_backup (id, availability, updated_at) VALUES (${p.id}, '${p.availability?.replace(/'/g, "''")}', CURRENT_TIMESTAMP);`
      )
    ];

    const sqlFileName = `parking-availability-backup-${timestamp}.sql`;
    const sqlPath = path.join(backupDir, sqlFileName);
    
    fs.writeFileSync(sqlPath, sqlStatements.join('\n'));
    console.log(`✅ SQL backup created: ${sqlPath}`);
    
  } catch (error) {
    console.error('❌ SQL backup failed:', error);
  }
}

async function showBackupStatistics(parkingsWithAvailability: any[]): Promise<void> {
  console.log('\n📊 Backup Statistics:');
  console.log('=' .repeat(50));

  // ניתוח פורמטים
  let format6Hour = 0;
  let format4Hour = 0;
  let format3Hour = 0;
  let formatUnknown = 0;

  parkingsWithAvailability.forEach(parking => {
    try {
      const availability = JSON.parse(parking.availability);
      const allSlots = Object.values(availability).flat() as number[];
      
      if (allSlots.some(slot => [6, 18].includes(slot))) {
        format6Hour++;
      } else if (allSlots.some(slot => [4, 8, 16, 20].includes(slot))) {
        format4Hour++;
      } else if (allSlots.some(slot => [3, 6, 9, 15, 18, 21].includes(slot))) {
        format3Hour++;
      } else {
        formatUnknown++;
      }
    } catch {
      formatUnknown++;
    }
  });

  console.log(`📈 6-hour format parkings: ${format6Hour}`);
  console.log(`📈 4-hour format parkings: ${format4Hour}`);
  console.log(`📈 3-hour format parkings: ${format3Hour}`);
  console.log(`📈 Unknown format parkings: ${formatUnknown}`);
  console.log('=' .repeat(50));

  if (format4Hour > 0) {
    console.log(`⚠️  ${format4Hour} parkings will be migrated from 4-hour to 3-hour format`);
  }
  if (format6Hour > 0) {
    console.log(`⚠️  ${format6Hour} parkings will be migrated from 6-hour to 3-hour format`);
  }
  if (format3Hour > 0) {
    console.log(`✅ ${format3Hour} parkings are already in 3-hour format`);
  }
}

async function verifyBackup(backupPath: string): Promise<boolean> {
  console.log('🔍 Verifying backup integrity...');
  
  try {
    if (!fs.existsSync(backupPath)) {
      console.error('❌ Backup file not found');
      return false;
    }

    const backupContent = fs.readFileSync(backupPath, 'utf8');
    const backupData: BackupData = JSON.parse(backupContent);

    // בדיקות בסיסיות
    if (!backupData.timestamp || !backupData.parkings || !Array.isArray(backupData.parkings)) {
      console.error('❌ Invalid backup structure');
      return false;
    }

    // בדיקת תאימות עם הדאטה בייס
    const currentCount = await prisma.parking.count();
    if (Math.abs(currentCount - backupData.totalParkings) > 5) {
      console.warn(`⚠️  Parking count difference: DB=${currentCount}, Backup=${backupData.totalParkings}`);
    }

    console.log('✅ Backup verification passed');
    return true;

  } catch (error) {
    console.error('❌ Backup verification failed:', error);
    return false;
  }
}

// הרצה ישירה אם הקובץ מופעל
if (require.main === module) {
  createBackup()
    .then(() => {
      console.log('🎉 Backup process completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Backup process failed:', error);
      process.exit(1);
    });
}

export { createBackup, verifyBackup };
