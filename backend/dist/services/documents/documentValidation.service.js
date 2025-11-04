"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SENSITIVITY_LEVELS = exports.DOCUMENT_TYPES = void 0;
exports.validateDocument = validateDocument;
exports.generateFileHash = generateFileHash;
exports.generateUniqueFileName = generateUniqueFileName;
exports.getDocumentConfig = getDocumentConfig;
exports.requiresEncryption = requiresEncryption;
exports.getSensitivityLevel = getSensitivityLevel;
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
/**
 * שירות validation למסמכים
 */
// סוגי מסמכים מותרים
exports.DOCUMENT_TYPES = {
    IDENTITY_CARD: 'identity_card',
    OWNERSHIP_CERTIFICATE: 'ownership_certificate',
    PARKING_PHOTO: 'parking_photo',
    PARKING_ENTRANCE: 'parking_entrance',
    PARKING_EMPTY: 'parking_empty',
    PARKING_WITH_CAR: 'parking_with_car',
    PARKING_ADDITIONAL: 'parking_additional',
    COMMITTEE_APPROVAL: 'committee_approval',
    SERVICE_AGREEMENT: 'service_agreement',
    ACCOUNT_MANAGEMENT: 'account_management',
};
// רמות רגישות
exports.SENSITIVITY_LEVELS = {
    CRITICAL: 'critical', // תעודת זהות, דרכון
    CONFIDENTIAL: 'confidential', // תעודת בעלות
    PUBLIC: 'public', // תמונות חניה
};
// הגדרות validation לכל סוג מסמך
const DOCUMENT_CONFIGS = {
    [exports.DOCUMENT_TYPES.IDENTITY_CARD]: {
        name: 'תעודת זהות',
        allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeKB: 5120, // 5MB
        sensitivity: exports.SENSITIVITY_LEVELS.CRITICAL,
        requiresEncryption: false, // זמנית - בדיקת פונקציונליות
        autoDeleteAfterApproval: true,
        retentionDays: 7,
    },
    [exports.DOCUMENT_TYPES.OWNERSHIP_CERTIFICATE]: {
        allowedMimeTypes: ['application/pdf'],
        maxSizeKB: 10240, // 10MB
        sensitivity: exports.SENSITIVITY_LEVELS.CONFIDENTIAL,
        requiresEncryption: false, // זמנית - בדיקת פונקציונליות
        autoDeleteAfterApproval: false,
        retentionDays: 365,
    },
    [exports.DOCUMENT_TYPES.PARKING_PHOTO]: {
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maxSizeKB: 3072, // 3MB
        sensitivity: exports.SENSITIVITY_LEVELS.PUBLIC,
        requiresEncryption: false,
        autoDeleteAfterApproval: false,
        retentionDays: 730,
    },
    [exports.DOCUMENT_TYPES.PARKING_ENTRANCE]: {
        name: 'תמונת כניסה לחניה',
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maxSizeKB: 5120, // 5MB
        sensitivity: exports.SENSITIVITY_LEVELS.PUBLIC,
        requiresEncryption: false,
        autoDeleteAfterApproval: false,
        retentionDays: 730,
    },
    [exports.DOCUMENT_TYPES.PARKING_EMPTY]: {
        name: 'תמונת חניה ריקה',
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maxSizeKB: 5120, // 5MB
        sensitivity: exports.SENSITIVITY_LEVELS.PUBLIC,
        requiresEncryption: false,
        autoDeleteAfterApproval: false,
        retentionDays: 730,
    },
    [exports.DOCUMENT_TYPES.PARKING_WITH_CAR]: {
        name: 'תמונת רכב בחניה',
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maxSizeKB: 5120, // 5MB
        sensitivity: exports.SENSITIVITY_LEVELS.PUBLIC,
        requiresEncryption: false,
        autoDeleteAfterApproval: false,
        retentionDays: 730,
    },
    [exports.DOCUMENT_TYPES.PARKING_ADDITIONAL]: {
        name: 'תמונה נוספת',
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maxSizeKB: 5120, // 5MB
        sensitivity: exports.SENSITIVITY_LEVELS.PUBLIC,
        requiresEncryption: false,
        autoDeleteAfterApproval: false,
        retentionDays: 730,
    },
    [exports.DOCUMENT_TYPES.COMMITTEE_APPROVAL]: {
        allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeKB: 5120, // 5MB
        sensitivity: exports.SENSITIVITY_LEVELS.CONFIDENTIAL,
        requiresEncryption: false, // זמנית - בדיקת פונקציונליות
        autoDeleteAfterApproval: false,
        retentionDays: 365,
    },
    [exports.DOCUMENT_TYPES.SERVICE_AGREEMENT]: {
        allowedMimeTypes: ['application/pdf'],
        maxSizeKB: 5120, // 5MB
        sensitivity: exports.SENSITIVITY_LEVELS.PUBLIC,
        requiresEncryption: false,
        autoDeleteAfterApproval: false,
        retentionDays: 2555, // 7 שנים
    },
    [exports.DOCUMENT_TYPES.ACCOUNT_MANAGEMENT]: {
        name: 'אישור ניהול חשבון',
        allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeKB: 5120, // 5MB
        sensitivity: exports.SENSITIVITY_LEVELS.CONFIDENTIAL,
        requiresEncryption: false, // זמנית - בדיקת פונקציונליות
        autoDeleteAfterApproval: false,
        retentionDays: 365, // שנה
    },
};
/**
 * בדיקת תקינות קובץ לפי סוג המסמך
 */
function validateDocument(file, documentType) {
    const errors = [];
    const warnings = [];
    // בדיקה שסוג המסמך קיים
    const config = DOCUMENT_CONFIGS[documentType];
    if (!config) {
        return {
            valid: false,
            errors: [`Unknown document type: ${documentType}`],
            warnings: [],
            config: DOCUMENT_CONFIGS[exports.DOCUMENT_TYPES.PARKING_PHOTO], // fallback
        };
    }
    // בדיקת סוג קובץ
    if (!config.allowedMimeTypes.includes(file.mimeType)) {
        errors.push(`File type ${file.mimeType} not allowed for ${documentType}. Allowed types: ${config.allowedMimeTypes.join(', ')}`);
    }
    // בדיקת גודל קובץ
    const maxSizeBytes = config.maxSizeKB * 1024;
    if (file.size > maxSizeBytes) {
        errors.push(`File size ${Math.round(file.size / 1024)}KB exceeds limit of ${config.maxSizeKB}KB`);
    }
    // בדיקת שם קובץ
    const ext = path_1.default.extname(file.originalName).toLowerCase();
    const expectedExts = config.allowedMimeTypes.map(mime => {
        switch (mime) {
            case 'application/pdf':
                return '.pdf';
            case 'image/jpeg':
                return '.jpg';
            case 'image/png':
                return '.png';
            case 'image/webp':
                return '.webp';
            default:
                return '';
        }
    });
    if (!expectedExts.includes(ext)) {
        warnings.push(`File extension ${ext} might not match MIME type ${file.mimeType}`);
    }
    // בדיקת תוכן קובץ בסיסית
    const contentValidation = validateFileContent(file.buffer, file.mimeType);
    if (!contentValidation.valid) {
        errors.push(...contentValidation.errors);
    }
    // בדיקות אבטחה
    const securityValidation = performSecurityChecks(file);
    if (!securityValidation.valid) {
        errors.push(...securityValidation.errors);
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        config,
    };
}
/**
 * בדיקת תוכן קובץ בסיסית
 */
function validateFileContent(buffer, mimeType) {
    const errors = [];
    if (buffer.length === 0) {
        errors.push('File is empty');
        return { valid: false, errors };
    }
    // בדיקת PDF
    if (mimeType === 'application/pdf') {
        const pdfHeader = buffer.slice(0, 4).toString();
        if (pdfHeader !== '%PDF') {
            errors.push('Invalid PDF file - missing PDF header');
        }
    }
    // בדיקת תמונות
    if (mimeType.startsWith('image/')) {
        const imageValidation = validateImageFile(buffer, mimeType);
        if (!imageValidation.valid) {
            errors.push(...imageValidation.errors);
        }
    }
    return { valid: errors.length === 0, errors };
}
/**
 * בדיקת תמונה
 */
function validateImageFile(buffer, mimeType) {
    const errors = [];
    // בדיקת JPEG
    if (mimeType === 'image/jpeg') {
        const jpegHeader = buffer.slice(0, 2);
        if (jpegHeader[0] !== 0xff || jpegHeader[1] !== 0xd8) {
            errors.push('Invalid JPEG file - missing JPEG header');
        }
    }
    // בדיקת PNG
    if (mimeType === 'image/png') {
        const pngHeader = buffer.slice(0, 8);
        const expectedPngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        if (!pngHeader.equals(expectedPngHeader)) {
            errors.push('Invalid PNG file - missing PNG header');
        }
    }
    return { valid: errors.length === 0, errors };
}
/**
 * בדיקות אבטחה
 */
function performSecurityChecks(file) {
    const errors = [];
    // בדיקת שמות קבצים חשודים
    const suspiciousPatterns = [
        /\.exe$/i,
        /\.bat$/i,
        /\.cmd$/i,
        /\.scr$/i,
        /\.pif$/i,
        /\.com$/i,
        /\.js$/i,
        /\.vbs$/i,
        /\.jar$/i,
    ];
    if (suspiciousPatterns.some(pattern => pattern.test(file.originalName))) {
        errors.push('Suspicious file extension detected');
    }
    // בדיקת תוכן חשוד (בדיקה בסיסית)
    const suspiciousContent = ['javascript:', '<script', 'eval(', 'document.cookie'];
    const fileContent = file.buffer.toString('utf8', 0, Math.min(1024, file.buffer.length));
    if (suspiciousContent.some(pattern => fileContent.toLowerCase().includes(pattern))) {
        errors.push('Suspicious content detected in file');
    }
    return { valid: errors.length === 0, errors };
}
/**
 * יצירת hash לקובץ
 */
function generateFileHash(buffer) {
    return crypto_1.default.createHash('sha256').update(buffer).digest('hex');
}
/**
 * יצירת שם קובץ ייחודי
 */
function generateUniqueFileName(originalName) {
    const ext = path_1.default.extname(originalName);
    const uuid = crypto_1.default.randomUUID();
    return `${uuid}${ext}`;
}
/**
 * קבלת הגדרות לסוג מסמך
 */
function getDocumentConfig(documentType) {
    return DOCUMENT_CONFIGS[documentType] || null;
}
/**
 * בדיקה האם מסמך דורש הצפנה
 */
function requiresEncryption(documentType) {
    const config = getDocumentConfig(documentType);
    return config?.requiresEncryption || false;
}
/**
 * קבלת רמת רגישות
 */
function getSensitivityLevel(documentType) {
    const config = getDocumentConfig(documentType);
    return config?.sensitivity || exports.SENSITIVITY_LEVELS.PUBLIC;
}
