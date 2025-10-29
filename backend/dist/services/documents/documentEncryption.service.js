"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptDocument = encryptDocument;
exports.decryptDocument = decryptDocument;
exports.secureDeleteFile = secureDeleteFile;
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = __importDefault(require("fs/promises"));
const documentValidation_service_1 = require("./documentValidation.service");
/**
 * קבלת הגדרות הצפנה לפי רמת רגישות
 */
function getEncryptionConfig(documentType) {
    const sensitivity = (0, documentValidation_service_1.getSensitivityLevel)(documentType);
    switch (sensitivity) {
        case documentValidation_service_1.SENSITIVITY_LEVELS.CRITICAL:
            return {
                algorithm: 'aes-256-gcm',
                keyDerivation: 'pbkdf2',
                iterations: 100000,
                saltLength: 32,
                compress: true,
                watermark: true
            };
        case documentValidation_service_1.SENSITIVITY_LEVELS.CONFIDENTIAL:
            return {
                algorithm: 'aes-256-cbc',
                keyDerivation: 'pbkdf2',
                iterations: 50000,
                saltLength: 16,
                compress: true
            };
        default: // PUBLIC
            return {
                algorithm: 'aes-128-cbc',
                keyDerivation: 'scrypt',
                iterations: 0,
                saltLength: 16,
                compress: false
            };
    }
}
/**
 * הצפנת קובץ
 */
async function encryptDocument(filePath, documentType, userId) {
    const config = getEncryptionConfig(documentType);
    // קריאת הקובץ המקורי
    const fileBuffer = await promises_1.default.readFile(filePath);
    const originalSize = fileBuffer.length;
    // יצירת מפתח הצפנה
    const masterKey = await generateMasterKey(userId, documentType);
    const fileKey = crypto_1.default.randomBytes(32);
    const salt = crypto_1.default.randomBytes(config.saltLength);
    const iv = crypto_1.default.randomBytes(16);
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
    let encryptedData;
    let authTag;
    if (config.algorithm === 'aes-256-gcm') {
        const result = encryptWithGCM(dataToEncrypt, fileKey, iv, `${userId}:${documentType}`);
        encryptedData = result.encrypted;
        authTag = result.authTag;
    }
    else {
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
            watermarked: config.watermark || false
        }
    };
    // שמירת הקובץ המוצפן
    const encryptedFilePath = filePath + '.enc';
    await promises_1.default.writeFile(encryptedFilePath, JSON.stringify(encryptedFileData, null, 2));
    // הצפנת מפתח הקובץ עם המפתח הראשי
    const encryptedKey = encryptKey(fileKey, masterKey, salt);
    return {
        encryptedFilePath,
        encryptionKey: encryptedKey,
        originalSize,
        encryptedSize: JSON.stringify(encryptedFileData).length,
        algorithm: config.algorithm
    };
}
/**
 * פענוח קובץ
 */
async function decryptDocument(encryptedFilePath, encryptionKey, userId, documentType) {
    // קריאת הקובץ המוצפן
    const encryptedFileContent = await promises_1.default.readFile(encryptedFilePath, 'utf8');
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
    let decryptedData;
    if (encryptedFileData.algorithm === 'aes-256-gcm') {
        const authTag = Buffer.from(encryptedFileData.authTag, 'hex');
        decryptedData = decryptWithGCM(encryptedData, fileKey, iv, authTag, `${userId}:${documentType}`);
    }
    else {
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
        originalSize: encryptedFileData.metadata.originalSize
    };
}
/**
 * יצירת מפתח ראשי למשתמש
 */
async function generateMasterKey(userId, documentType) {
    const masterSecret = process.env.DOCUMENT_ENCRYPTION_MASTER_KEY;
    if (!masterSecret) {
        throw new Error('Master encryption key not configured');
    }
    const keyMaterial = `${masterSecret}:${userId}:${documentType}`;
    return crypto_1.default.pbkdf2Sync(keyMaterial, 'zpoto-documents-salt', 100000, 32, 'sha256');
}
/**
 * הצפנה עם GCM
 */
function encryptWithGCM(data, key, iv, aad) {
    const cipher = crypto_1.default.createCipher('aes-256-gcm', key);
    cipher.setAAD(Buffer.from(aad));
    const encrypted = Buffer.concat([
        cipher.update(data),
        cipher.final()
    ]);
    const authTag = cipher.getAuthTag();
    return { encrypted, authTag };
}
/**
 * פענוח עם GCM
 */
function decryptWithGCM(encryptedData, key, iv, authTag, aad) {
    const decipher = crypto_1.default.createDecipher('aes-256-gcm', key);
    decipher.setAAD(Buffer.from(aad));
    decipher.setAuthTag(authTag);
    return Buffer.concat([
        decipher.update(encryptedData),
        decipher.final()
    ]);
}
/**
 * הצפנה עם CBC
 */
function encryptWithCBC(data, key, iv, algorithm) {
    const cipher = crypto_1.default.createCipher(algorithm, key);
    return Buffer.concat([
        cipher.update(data),
        cipher.final()
    ]);
}
/**
 * פענוח עם CBC
 */
function decryptWithCBC(encryptedData, key, iv, algorithm) {
    const decipher = crypto_1.default.createDecipher(algorithm, key);
    return Buffer.concat([
        decipher.update(encryptedData),
        decipher.final()
    ]);
}
/**
 * הצפנת מפתח
 */
function encryptKey(fileKey, masterKey, salt) {
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipher('aes-256-cbc', masterKey);
    const encrypted = Buffer.concat([
        cipher.update(fileKey),
        cipher.final()
    ]);
    return JSON.stringify({
        salt: salt.toString('hex'),
        iv: iv.toString('hex'),
        data: encrypted.toString('hex')
    });
}
/**
 * פענוח מפתח
 */
function decryptKey(encryptedKey, masterKey, salt) {
    const keyData = JSON.parse(encryptedKey);
    const iv = Buffer.from(keyData.iv, 'hex');
    const encrypted = Buffer.from(keyData.data, 'hex');
    const decipher = crypto_1.default.createDecipher('aes-256-cbc', masterKey);
    return Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
    ]);
}
/**
 * דחיסת נתונים (פשוטה)
 */
async function compressData(data) {
    // TODO: יישום דחיסה אמיתית עם zlib
    // לעכשיו מחזיר את הנתונים כמו שהם
    return data;
}
/**
 * פירוק דחיסה
 */
async function decompressData(data) {
    // TODO: יישום פירוק דחיסה אמיתית
    return data;
}
/**
 * הוספת watermark דיגיטלי
 */
async function addDigitalWatermark(data, userId, documentType) {
    // TODO: יישום watermark אמיתי
    // לעכשיו מחזיר את הנתונים כמו שהם
    console.log(`Adding watermark for user ${userId}, document ${documentType}`);
    return data;
}
/**
 * הסרת watermark דיגיטלי
 */
async function removeDigitalWatermark(data) {
    // TODO: יישום הסרת watermark
    return data;
}
/**
 * מחיקה מאובטחת של קובץ
 */
async function secureDeleteFile(filePath) {
    try {
        const stats = await promises_1.default.stat(filePath);
        const fileSize = stats.size;
        // overwrite הקובץ עם נתונים רנדומליים (3 פעמים)
        for (let i = 0; i < 3; i++) {
            const randomData = crypto_1.default.randomBytes(fileSize);
            await promises_1.default.writeFile(filePath, randomData);
        }
        // מחיקה סופית
        await promises_1.default.unlink(filePath);
        console.log(`Securely deleted file: ${filePath}`);
    }
    catch (error) {
        console.error(`Failed to securely delete file ${filePath}:`, error);
        throw error;
    }
}
