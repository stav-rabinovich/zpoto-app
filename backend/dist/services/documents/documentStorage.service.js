"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeDocument = storeDocument;
exports.retrieveDocument = retrieveDocument;
exports.deleteDocument = deleteDocument;
exports.archiveDocument = archiveDocument;
exports.performDailyBackup = performDailyBackup;
exports.cleanupTempFiles = cleanupTempFiles;
exports.getStorageStats = getStorageStats;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const documentValidation_service_1 = require("./documentValidation.service");
const documentEncryption_service_1 = require("./documentEncryption.service");
// הגדרות אחסון
const STORAGE_CONFIG = {
    baseDir: process.env.ZPOTO_FILES_BASE_PATH || path_1.default.join(process.cwd(), 'zpoto-files'),
    encryptedDir: 'documents/encrypted',
    publicDir: 'documents/public',
    tempDir: 'documents/temp',
    backupDir: 'documents/backups',
};
/**
 * יצירת נתיב אחסון לפי סוג מסמך ומשתמש
 */
function generateStoragePath(userId, documentType, isEncrypted) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const securityPath = isEncrypted ? STORAGE_CONFIG.encryptedDir : STORAGE_CONFIG.publicDir;
    return path_1.default.join(STORAGE_CONFIG.baseDir, securityPath, year.toString(), month, `user-${userId}`, documentType);
}
/**
 * וידוא שתיקיה קיימת
 */
async function ensureDirectoryExists(dirPath) {
    try {
        await promises_1.default.access(dirPath);
    }
    catch {
        await promises_1.default.mkdir(dirPath, { recursive: true });
        console.log(`Created directory: ${dirPath}`);
    }
}
/**
 * שמירת קובץ באחסון
 */
async function storeDocument(file, documentType, userId) {
    const needsEncryption = (0, documentValidation_service_1.requiresEncryption)(documentType);
    const storedFileName = (0, documentValidation_service_1.generateUniqueFileName)(file.originalName);
    const fileHash = (0, documentValidation_service_1.generateFileHash)(file.buffer);
    // יצירת נתיב אחסון
    const storagePath = generateStoragePath(userId, documentType, needsEncryption);
    await ensureDirectoryExists(storagePath);
    const filePath = path_1.default.join(storagePath, storedFileName);
    // שמירה זמנית
    const tempPath = path_1.default.join(STORAGE_CONFIG.baseDir, STORAGE_CONFIG.tempDir, storedFileName);
    await ensureDirectoryExists(path_1.default.dirname(tempPath));
    await promises_1.default.writeFile(tempPath, file.buffer);
    let finalPath = filePath;
    let encryptionKey;
    let storedSize = file.size;
    try {
        if (needsEncryption) {
            console.log(`Encrypting document for user ${userId}, type ${documentType}`);
            const encryptionResult = await (0, documentEncryption_service_1.encryptDocument)(tempPath, documentType, userId);
            // העברת הקובץ המוצפן למיקום הסופי
            await promises_1.default.rename(encryptionResult.encryptedFilePath, filePath + '.enc');
            finalPath = filePath + '.enc';
            encryptionKey = encryptionResult.encryptionKey;
            storedSize = encryptionResult.encryptedSize;
            console.log(`Document encrypted and stored: ${finalPath}`);
        }
        else {
            // העברת הקובץ הרגיל למיקום הסופי
            await promises_1.default.rename(tempPath, filePath);
            console.log(`Document stored: ${finalPath}`);
        }
        // מחיקת הקובץ הזמני
        try {
            await (0, documentEncryption_service_1.secureDeleteFile)(tempPath);
        }
        catch (error) {
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
    }
    catch (error) {
        // ניקוי במקרה של שגיאה
        try {
            await (0, documentEncryption_service_1.secureDeleteFile)(tempPath);
            if (await fileExists(finalPath)) {
                await (0, documentEncryption_service_1.secureDeleteFile)(finalPath);
            }
        }
        catch (cleanupError) {
            console.warn('Cleanup failed:', cleanupError);
        }
        throw error;
    }
}
/**
 * קריאת קובץ מהאחסון
 */
async function retrieveDocument(filePath, isEncrypted, encryptionKey, userId, documentType) {
    if (!(await fileExists(filePath))) {
        throw new Error(`File not found: ${filePath}`);
    }
    if (isEncrypted) {
        if (!encryptionKey || !userId || !documentType) {
            throw new Error('Encryption key, userId and documentType required for encrypted files');
        }
        const { decryptDocument } = await Promise.resolve().then(() => __importStar(require('./documentEncryption.service')));
        const decryptionResult = await decryptDocument(filePath, encryptionKey, userId, documentType);
        return decryptionResult.decryptedBuffer;
    }
    else {
        return await promises_1.default.readFile(filePath);
    }
}
/**
 * מחיקת מסמך מהאחסון
 */
async function deleteDocument(filePath) {
    if (await fileExists(filePath)) {
        await (0, documentEncryption_service_1.secureDeleteFile)(filePath);
        console.log(`Document deleted: ${filePath}`);
    }
}
/**
 * העברת מסמך לארכיון
 */
async function archiveDocument(filePath, userId, documentType, reason) {
    if (!(await fileExists(filePath))) {
        throw new Error(`File not found for archiving: ${filePath}`);
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivePath = path_1.default.join(STORAGE_CONFIG.baseDir, STORAGE_CONFIG.backupDir, 'archived', `user-${userId}`, documentType, `${timestamp}-${path_1.default.basename(filePath)}`);
    await ensureDirectoryExists(path_1.default.dirname(archivePath));
    // העתקה לארכיון
    const fileContent = await promises_1.default.readFile(filePath);
    await promises_1.default.writeFile(archivePath, fileContent);
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
    await promises_1.default.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`Document archived: ${archivePath}`);
    return archivePath;
}
/**
 * יצירת גיבוי יומי
 */
async function performDailyBackup() {
    console.log('Starting daily backup...');
    const today = new Date().toISOString().split('T')[0];
    const backupPath = path_1.default.join(STORAGE_CONFIG.baseDir, STORAGE_CONFIG.backupDir, 'daily', today);
    await ensureDirectoryExists(backupPath);
    // גיבוי קבצים מוצפנים
    const encryptedDir = path_1.default.join(STORAGE_CONFIG.baseDir, STORAGE_CONFIG.encryptedDir);
    if (await fileExists(encryptedDir)) {
        await copyDirectory(encryptedDir, path_1.default.join(backupPath, 'encrypted'));
    }
    // גיבוי קבצים ציבוריים
    const publicDir = path_1.default.join(STORAGE_CONFIG.baseDir, STORAGE_CONFIG.publicDir);
    if (await fileExists(publicDir)) {
        await copyDirectory(publicDir, path_1.default.join(backupPath, 'public'));
    }
    console.log(`Daily backup completed: ${backupPath}`);
}
/**
 * ניקוי קבצים זמניים
 */
async function cleanupTempFiles() {
    const tempDir = path_1.default.join(STORAGE_CONFIG.baseDir, STORAGE_CONFIG.tempDir);
    if (!(await fileExists(tempDir))) {
        return;
    }
    const files = await promises_1.default.readdir(tempDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 שעות
    for (const file of files) {
        const filePath = path_1.default.join(tempDir, file);
        const stats = await promises_1.default.stat(filePath);
        if (now - stats.mtime.getTime() > maxAge) {
            await (0, documentEncryption_service_1.secureDeleteFile)(filePath);
            console.log(`Cleaned up old temp file: ${filePath}`);
        }
    }
}
/**
 * קבלת סטטיסטיקות אחסון
 */
async function getStorageStats() {
    const stats = {
        totalFiles: 0,
        totalSize: 0,
        encryptedFiles: 0,
        publicFiles: 0,
        storageByType: {},
    };
    // סריקת תיקיות
    const encryptedDir = path_1.default.join(STORAGE_CONFIG.baseDir, STORAGE_CONFIG.encryptedDir);
    const publicDir = path_1.default.join(STORAGE_CONFIG.baseDir, STORAGE_CONFIG.publicDir);
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
async function fileExists(filePath) {
    try {
        await promises_1.default.access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
async function copyDirectory(src, dest) {
    await ensureDirectoryExists(dest);
    const entries = await promises_1.default.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path_1.default.join(src, entry.name);
        const destPath = path_1.default.join(dest, entry.name);
        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath);
        }
        else {
            await promises_1.default.copyFile(srcPath, destPath);
        }
    }
}
async function scanDirectory(dirPath) {
    let fileCount = 0;
    let totalSize = 0;
    const entries = await promises_1.default.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path_1.default.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            const subStats = await scanDirectory(fullPath);
            fileCount += subStats.fileCount;
            totalSize += subStats.totalSize;
        }
        else {
            const stats = await promises_1.default.stat(fullPath);
            fileCount++;
            totalSize += stats.size;
        }
    }
    return { fileCount, totalSize };
}
