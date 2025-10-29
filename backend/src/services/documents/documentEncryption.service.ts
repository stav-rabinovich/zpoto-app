import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { getSensitivityLevel, SENSITIVITY_LEVELS } from './documentValidation.service';

/**
 * שירות הצפנת מסמכים
 */

interface EncryptionConfig {
  algorithm: string;
  keyDerivation: string;
  iterations: number;
  saltLength: number;
  compress: boolean;
  watermark?: boolean;
}

interface EncryptionResult {
  encryptedFilePath: string;
  encryptionKey: string; // מוצפן בעצמו
  originalSize: number;
  encryptedSize: number;
  algorithm: string;
}

interface DecryptionResult {
  decryptedBuffer: Buffer;
  originalSize: number;
}

/**
 * קבלת הגדרות הצפנה לפי רמת רגישות
 */
function getEncryptionConfig(documentType: string): EncryptionConfig {
  const sensitivity = getSensitivityLevel(documentType);

  switch (sensitivity) {
    case SENSITIVITY_LEVELS.CRITICAL:
      return {
        algorithm: 'aes-256-gcm',
        keyDerivation: 'pbkdf2',
        iterations: 100000,
        saltLength: 32,
        compress: true,
        watermark: true,
      };

    case SENSITIVITY_LEVELS.CONFIDENTIAL:
      return {
        algorithm: 'aes-256-cbc',
        keyDerivation: 'pbkdf2',
        iterations: 50000,
        saltLength: 16,
        compress: true,
      };

    default: // PUBLIC
      return {
        algorithm: 'aes-128-cbc',
        keyDerivation: 'scrypt',
        iterations: 0,
        saltLength: 16,
        compress: false,
      };
  }
}

/**
 * הצפנת קובץ
 */
export async function encryptDocument(
  filePath: string,
  documentType: string,
  userId: number
): Promise<EncryptionResult> {
  const config = getEncryptionConfig(documentType);

  // קריאת הקובץ המקורי
  const fileBuffer = await fs.readFile(filePath);
  const originalSize = fileBuffer.length;

  // יצירת מפתח הצפנה
  const masterKey = await generateMasterKey(userId, documentType);
  const fileKey = crypto.randomBytes(32);
  const salt = crypto.randomBytes(config.saltLength);
  const iv = crypto.randomBytes(16);

  // הכנת הנתונים להצפנה
  let dataToEncrypt = fileBuffer;

  // דחיסה (אם נדרש)
  if (config.compress) {
    dataToEncrypt = await compressData(dataToEncrypt);
  }

  // הוספת watermark (למסמכים קריטיים)
  if (config.watermark) {
    dataToEncrypt = await addDigitalWatermark(dataToEncrypt, userId, documentType);
  }

  // הצפנה
  let encryptedData: Buffer;
  let authTag: Buffer | undefined;

  if (config.algorithm === 'aes-256-gcm') {
    const result = encryptWithGCM(dataToEncrypt, fileKey, iv, `${userId}:${documentType}`);
    encryptedData = result.encrypted;
    authTag = result.authTag;
  } else {
    encryptedData = encryptWithCBC(dataToEncrypt, fileKey, iv, config.algorithm);
  }

  // יצירת מבנה הקובץ המוצפן
  const encryptedFileData = {
    version: '2.0',
    algorithm: config.algorithm,
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag?.toString('hex'),
    data: encryptedData.toString('hex'),
    metadata: {
      userId,
      documentType,
      encryptedAt: new Date().toISOString(),
      originalSize,
      compressed: config.compress,
      watermarked: config.watermark || false,
    },
  };

  // שמירת הקובץ המוצפן
  const encryptedFilePath = filePath + '.enc';
  await fs.writeFile(encryptedFilePath, JSON.stringify(encryptedFileData, null, 2));

  // הצפנת מפתח הקובץ עם המפתח הראשי
  const encryptedKey = encryptKey(fileKey, masterKey, salt);

  return {
    encryptedFilePath,
    encryptionKey: encryptedKey,
    originalSize,
    encryptedSize: JSON.stringify(encryptedFileData).length,
    algorithm: config.algorithm,
  };
}

/**
 * פענוח קובץ
 */
export async function decryptDocument(
  encryptedFilePath: string,
  encryptionKey: string,
  userId: number,
  documentType: string
): Promise<DecryptionResult> {
  // קריאת הקובץ המוצפן
  const encryptedFileContent = await fs.readFile(encryptedFilePath, 'utf8');
  const encryptedFileData = JSON.parse(encryptedFileContent);

  // בדיקת גרסה
  if (encryptedFileData.version !== '2.0') {
    throw new Error('Unsupported encryption version');
  }

  // פענוח מפתח הקובץ
  const masterKey = await generateMasterKey(userId, documentType);
  const salt = Buffer.from(encryptedFileData.salt, 'hex');
  const fileKey = decryptKey(encryptionKey, masterKey, salt);

  // פענוח הנתונים
  const iv = Buffer.from(encryptedFileData.iv, 'hex');
  const encryptedData = Buffer.from(encryptedFileData.data, 'hex');

  let decryptedData: Buffer;

  if (encryptedFileData.algorithm === 'aes-256-gcm') {
    const authTag = Buffer.from(encryptedFileData.authTag, 'hex');
    decryptedData = decryptWithGCM(
      encryptedData,
      fileKey,
      iv,
      authTag,
      `${userId}:${documentType}`
    );
  } else {
    decryptedData = decryptWithCBC(encryptedData, fileKey, iv, encryptedFileData.algorithm);
  }

  // הסרת watermark (אם קיים)
  if (encryptedFileData.metadata.watermarked) {
    decryptedData = await removeDigitalWatermark(decryptedData);
  }

  // פירוק דחיסה (אם נדרש)
  if (encryptedFileData.metadata.compressed) {
    decryptedData = await decompressData(decryptedData);
  }

  return {
    decryptedBuffer: decryptedData,
    originalSize: encryptedFileData.metadata.originalSize,
  };
}

/**
 * יצירת מפתח ראשי למשתמש
 */
async function generateMasterKey(userId: number, documentType: string): Promise<Buffer> {
  const masterSecret = process.env.DOCUMENT_ENCRYPTION_MASTER_KEY;
  if (!masterSecret) {
    throw new Error('Master encryption key not configured');
  }

  const keyMaterial = `${masterSecret}:${userId}:${documentType}`;
  return crypto.pbkdf2Sync(keyMaterial, 'zpoto-documents-salt', 100000, 32, 'sha256');
}

/**
 * הצפנה עם GCM
 */
function encryptWithGCM(
  data: Buffer,
  key: Buffer,
  iv: Buffer,
  aad: string
): { encrypted: Buffer; authTag: Buffer } {
  const cipher = crypto.createCipher('aes-256-gcm', key);
  cipher.setAAD(Buffer.from(aad));

  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);

  const authTag = cipher.getAuthTag();

  return { encrypted, authTag };
}

/**
 * פענוח עם GCM
 */
function decryptWithGCM(
  encryptedData: Buffer,
  key: Buffer,
  iv: Buffer,
  authTag: Buffer,
  aad: string
): Buffer {
  const decipher = crypto.createDecipher('aes-256-gcm', key);
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
}

/**
 * הצפנה עם CBC
 */
function encryptWithCBC(data: Buffer, key: Buffer, iv: Buffer, algorithm: string): Buffer {
  const cipher = crypto.createCipher(algorithm, key);
  return Buffer.concat([cipher.update(data), cipher.final()]);
}

/**
 * פענוח עם CBC
 */
function decryptWithCBC(encryptedData: Buffer, key: Buffer, iv: Buffer, algorithm: string): Buffer {
  const decipher = crypto.createDecipher(algorithm, key);
  return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
}

/**
 * הצפנת מפתח
 */
function encryptKey(fileKey: Buffer, masterKey: Buffer, salt: Buffer): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher('aes-256-cbc', masterKey);

  const encrypted = Buffer.concat([cipher.update(fileKey), cipher.final()]);

  return JSON.stringify({
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    data: encrypted.toString('hex'),
  });
}

/**
 * פענוח מפתח
 */
function decryptKey(encryptedKey: string, masterKey: Buffer, salt: Buffer): Buffer {
  const keyData = JSON.parse(encryptedKey);
  const iv = Buffer.from(keyData.iv, 'hex');
  const encrypted = Buffer.from(keyData.data, 'hex');

  const decipher = crypto.createDecipher('aes-256-cbc', masterKey);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

/**
 * דחיסת נתונים (פשוטה)
 */
async function compressData(data: Buffer): Promise<Buffer> {
  // TODO: יישום דחיסה אמיתית עם zlib
  // לעכשיו מחזיר את הנתונים כמו שהם
  return data;
}

/**
 * פירוק דחיסה
 */
async function decompressData(data: Buffer): Promise<Buffer> {
  // TODO: יישום פירוק דחיסה אמיתית
  return data;
}

/**
 * הוספת watermark דיגיטלי
 */
async function addDigitalWatermark(
  data: Buffer,
  userId: number,
  documentType: string
): Promise<Buffer> {
  // TODO: יישום watermark אמיתי
  // לעכשיו מחזיר את הנתונים כמו שהם
  console.log(`Adding watermark for user ${userId}, document ${documentType}`);
  return data;
}

/**
 * הסרת watermark דיגיטלי
 */
async function removeDigitalWatermark(data: Buffer): Promise<Buffer> {
  // TODO: יישום הסרת watermark
  return data;
}

/**
 * מחיקה מאובטחת של קובץ
 */
export async function secureDeleteFile(filePath: string): Promise<void> {
  try {
    const stats = await fs.stat(filePath);
    const fileSize = stats.size;

    // overwrite הקובץ עם נתונים רנדומליים (3 פעמים)
    for (let i = 0; i < 3; i++) {
      const randomData = crypto.randomBytes(fileSize);
      await fs.writeFile(filePath, randomData);
    }

    // מחיקה סופית
    await fs.unlink(filePath);
    console.log(`Securely deleted file: ${filePath}`);
  } catch (error) {
    console.error(`Failed to securely delete file ${filePath}:`, error);
    throw error;
  }
}
