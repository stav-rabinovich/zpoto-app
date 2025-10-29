import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import {
  generateUniqueFileName,
  generateFileHash,
  requiresEncryption,
  FileInfo,
} from './documentValidation.service';
import { encryptDocument, secureDeleteFile } from './documentEncryption.service';

/**
 * שירות אחסון מסמכים
 */

interface StorageResult {
  storedFileName: string;
  filePath: string;
  fileHash: string;
  isEncrypted: boolean;
  encryptionKey?: string;
  originalSize: number;
  storedSize: number;
}

interface StorageConfig {
  baseDir: string;
  encryptedDir: string;
  publicDir: string;
  tempDir: string;
  backupDir: string;
}

// הגדרות אחסון
const STORAGE_CONFIG: StorageConfig = {
  baseDir: process.env.ZPOTO_FILES_BASE_PATH || path.join(process.cwd(), 'zpoto-files'),
  encryptedDir: 'documents/encrypted',
  publicDir: 'documents/public',
  tempDir: 'documents/temp',
  backupDir: 'documents/backups',
};

/**
 * יצירת נתיב אחסון לפי סוג מסמך ומשתמש
 */
function generateStoragePath(userId: number, documentType: string, isEncrypted: boolean): string {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');

  const securityPath = isEncrypted ? STORAGE_CONFIG.encryptedDir : STORAGE_CONFIG.publicDir;

  return path.join(
    STORAGE_CONFIG.baseDir,
    securityPath,
    year.toString(),
    month,
    `user-${userId}`,
    documentType
  );
}

/**
 * וידוא שתיקיה קיימת
 */
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

/**
 * שמירת קובץ באחסון
 */
export async function storeDocument(
  file: FileInfo,
  documentType: string,
  userId: number
): Promise<StorageResult> {
  const needsEncryption = requiresEncryption(documentType);
  const storedFileName = generateUniqueFileName(file.originalName);
  const fileHash = generateFileHash(file.buffer);

  // יצירת נתיב אחסון
  const storagePath = generateStoragePath(userId, documentType, needsEncryption);
  await ensureDirectoryExists(storagePath);

  const filePath = path.join(storagePath, storedFileName);

  // שמירה זמנית
  const tempPath = path.join(STORAGE_CONFIG.baseDir, STORAGE_CONFIG.tempDir, storedFileName);
  await ensureDirectoryExists(path.dirname(tempPath));
  await fs.writeFile(tempPath, file.buffer);

  let finalPath = filePath;
  let encryptionKey: string | undefined;
  let storedSize = file.size;

  try {
    if (needsEncryption) {
      console.log(`Encrypting document for user ${userId}, type ${documentType}`);

      const encryptionResult = await encryptDocument(tempPath, documentType, userId);

      // העברת הקובץ המוצפן למיקום הסופי
      await fs.rename(encryptionResult.encryptedFilePath, filePath + '.enc');

      finalPath = filePath + '.enc';
      encryptionKey = encryptionResult.encryptionKey;
      storedSize = encryptionResult.encryptedSize;

      console.log(`Document encrypted and stored: ${finalPath}`);
    } else {
      // העברת הקובץ הרגיל למיקום הסופי
      await fs.rename(tempPath, filePath);
      console.log(`Document stored: ${finalPath}`);
    }

    // מחיקת הקובץ הזמני
    try {
      await secureDeleteFile(tempPath);
    } catch (error) {
      console.warn(`Failed to delete temp file ${tempPath}:`, error);
    }

    return {
      storedFileName: needsEncryption ? storedFileName + '.enc' : storedFileName,
      filePath: finalPath,
      fileHash,
      isEncrypted: needsEncryption,
      encryptionKey,
      originalSize: file.size,
      storedSize,
    };
  } catch (error) {
    // ניקוי במקרה של שגיאה
    try {
      await secureDeleteFile(tempPath);
      if (await fileExists(finalPath)) {
        await secureDeleteFile(finalPath);
      }
    } catch (cleanupError) {
      console.warn('Cleanup failed:', cleanupError);
    }

    throw error;
  }
}

/**
 * קריאת קובץ מהאחסון
 */
export async function retrieveDocument(
  filePath: string,
  isEncrypted: boolean,
  encryptionKey?: string,
  userId?: number,
  documentType?: string
): Promise<Buffer> {
  if (!(await fileExists(filePath))) {
    throw new Error(`File not found: ${filePath}`);
  }

  if (isEncrypted) {
    if (!encryptionKey || !userId || !documentType) {
      throw new Error('Encryption key, userId and documentType required for encrypted files');
    }

    const { decryptDocument } = await import('./documentEncryption.service');
    const decryptionResult = await decryptDocument(filePath, encryptionKey, userId, documentType);
    return decryptionResult.decryptedBuffer;
  } else {
    return await fs.readFile(filePath);
  }
}

/**
 * מחיקת מסמך מהאחסון
 */
export async function deleteDocument(filePath: string): Promise<void> {
  if (await fileExists(filePath)) {
    await secureDeleteFile(filePath);
    console.log(`Document deleted: ${filePath}`);
  }
}

/**
 * העברת מסמך לארכיון
 */
export async function archiveDocument(
  filePath: string,
  userId: number,
  documentType: string,
  reason: string
): Promise<string> {
  if (!(await fileExists(filePath))) {
    throw new Error(`File not found for archiving: ${filePath}`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archivePath = path.join(
    STORAGE_CONFIG.baseDir,
    STORAGE_CONFIG.backupDir,
    'archived',
    `user-${userId}`,
    documentType,
    `${timestamp}-${path.basename(filePath)}`
  );

  await ensureDirectoryExists(path.dirname(archivePath));

  // העתקה לארכיון
  const fileContent = await fs.readFile(filePath);
  await fs.writeFile(archivePath, fileContent);

  // יצירת metadata
  const metadataPath = archivePath + '.meta.json';
  const metadata = {
    originalPath: filePath,
    archivedAt: new Date().toISOString(),
    userId,
    documentType,
    reason,
    fileSize: fileContent.length,
  };

  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

  console.log(`Document archived: ${archivePath}`);
  return archivePath;
}

/**
 * יצירת גיבוי יומי
 */
export async function performDailyBackup(): Promise<void> {
  console.log('Starting daily backup...');

  const today = new Date().toISOString().split('T')[0];
  const backupPath = path.join(STORAGE_CONFIG.baseDir, STORAGE_CONFIG.backupDir, 'daily', today);

  await ensureDirectoryExists(backupPath);

  // גיבוי קבצים מוצפנים
  const encryptedDir = path.join(STORAGE_CONFIG.baseDir, STORAGE_CONFIG.encryptedDir);
  if (await fileExists(encryptedDir)) {
    await copyDirectory(encryptedDir, path.join(backupPath, 'encrypted'));
  }

  // גיבוי קבצים ציבוריים
  const publicDir = path.join(STORAGE_CONFIG.baseDir, STORAGE_CONFIG.publicDir);
  if (await fileExists(publicDir)) {
    await copyDirectory(publicDir, path.join(backupPath, 'public'));
  }

  console.log(`Daily backup completed: ${backupPath}`);
}

/**
 * ניקוי קבצים זמניים
 */
export async function cleanupTempFiles(): Promise<void> {
  const tempDir = path.join(STORAGE_CONFIG.baseDir, STORAGE_CONFIG.tempDir);

  if (!(await fileExists(tempDir))) {
    return;
  }

  const files = await fs.readdir(tempDir);
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 שעות

  for (const file of files) {
    const filePath = path.join(tempDir, file);
    const stats = await fs.stat(filePath);

    if (now - stats.mtime.getTime() > maxAge) {
      await secureDeleteFile(filePath);
      console.log(`Cleaned up old temp file: ${filePath}`);
    }
  }
}

/**
 * קבלת סטטיסטיקות אחסון
 */
export async function getStorageStats(): Promise<{
  totalFiles: number;
  totalSize: number;
  encryptedFiles: number;
  publicFiles: number;
  storageByType: Record<string, { count: number; size: number }>;
}> {
  const stats = {
    totalFiles: 0,
    totalSize: 0,
    encryptedFiles: 0,
    publicFiles: 0,
    storageByType: {} as Record<string, { count: number; size: number }>,
  };

  // סריקת תיקיות
  const encryptedDir = path.join(STORAGE_CONFIG.baseDir, STORAGE_CONFIG.encryptedDir);
  const publicDir = path.join(STORAGE_CONFIG.baseDir, STORAGE_CONFIG.publicDir);

  if (await fileExists(encryptedDir)) {
    const encryptedStats = await scanDirectory(encryptedDir);
    stats.encryptedFiles = encryptedStats.fileCount;
    stats.totalFiles += encryptedStats.fileCount;
    stats.totalSize += encryptedStats.totalSize;
  }

  if (await fileExists(publicDir)) {
    const publicStats = await scanDirectory(publicDir);
    stats.publicFiles = publicStats.fileCount;
    stats.totalFiles += publicStats.fileCount;
    stats.totalSize += publicStats.totalSize;
  }

  return stats;
}

// פונקציות עזר

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function copyDirectory(src: string, dest: string): Promise<void> {
  await ensureDirectoryExists(dest);

  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function scanDirectory(dirPath: string): Promise<{ fileCount: number; totalSize: number }> {
  let fileCount = 0;
  let totalSize = 0;

  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const subStats = await scanDirectory(fullPath);
      fileCount += subStats.fileCount;
      totalSize += subStats.totalSize;
    } else {
      const stats = await fs.stat(fullPath);
      fileCount++;
      totalSize += stats.size;
    }
  }

  return { fileCount, totalSize };
}
