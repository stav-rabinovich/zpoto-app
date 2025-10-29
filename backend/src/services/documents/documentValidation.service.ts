import crypto from 'crypto';
import path from 'path';

/**
 * שירות validation למסמכים
 */

// סוגי מסמכים מותרים
export const DOCUMENT_TYPES = {
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
} as const;

// רמות רגישות
export const SENSITIVITY_LEVELS = {
  CRITICAL: 'critical', // תעודת זהות, דרכון
  CONFIDENTIAL: 'confidential', // תעודת בעלות
  PUBLIC: 'public', // תמונות חניה
} as const;

// הגדרות validation לכל סוג מסמך
const DOCUMENT_CONFIGS = {
  [DOCUMENT_TYPES.IDENTITY_CARD]: {
    name: 'תעודת זהות',
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeKB: 5120, // 5MB
    sensitivity: SENSITIVITY_LEVELS.CRITICAL,
    requiresEncryption: false, // זמנית - בדיקת פונקציונליות
    autoDeleteAfterApproval: true,
    retentionDays: 7,
  },

  [DOCUMENT_TYPES.OWNERSHIP_CERTIFICATE]: {
    allowedMimeTypes: ['application/pdf'],
    maxSizeKB: 10240, // 10MB
    sensitivity: SENSITIVITY_LEVELS.CONFIDENTIAL,
    requiresEncryption: false, // זמנית - בדיקת פונקציונליות
    autoDeleteAfterApproval: false,
    retentionDays: 365,
  },

  [DOCUMENT_TYPES.PARKING_PHOTO]: {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeKB: 3072, // 3MB
    sensitivity: SENSITIVITY_LEVELS.PUBLIC,
    requiresEncryption: false,
    autoDeleteAfterApproval: false,
    retentionDays: 730,
  },

  [DOCUMENT_TYPES.PARKING_ENTRANCE]: {
    name: 'תמונת כניסה לחניה',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeKB: 5120, // 5MB
    sensitivity: SENSITIVITY_LEVELS.PUBLIC,
    requiresEncryption: false,
    autoDeleteAfterApproval: false,
    retentionDays: 730,
  },

  [DOCUMENT_TYPES.PARKING_EMPTY]: {
    name: 'תמונת חניה ריקה',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeKB: 5120, // 5MB
    sensitivity: SENSITIVITY_LEVELS.PUBLIC,
    requiresEncryption: false,
    autoDeleteAfterApproval: false,
    retentionDays: 730,
  },

  [DOCUMENT_TYPES.PARKING_WITH_CAR]: {
    name: 'תמונת רכב בחניה',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeKB: 5120, // 5MB
    sensitivity: SENSITIVITY_LEVELS.PUBLIC,
    requiresEncryption: false,
    autoDeleteAfterApproval: false,
    retentionDays: 730,
  },

  [DOCUMENT_TYPES.PARKING_ADDITIONAL]: {
    name: 'תמונה נוספת',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeKB: 5120, // 5MB
    sensitivity: SENSITIVITY_LEVELS.PUBLIC,
    requiresEncryption: false,
    autoDeleteAfterApproval: false,
    retentionDays: 730,
  },

  [DOCUMENT_TYPES.COMMITTEE_APPROVAL]: {
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeKB: 5120, // 5MB
    sensitivity: SENSITIVITY_LEVELS.CONFIDENTIAL,
    requiresEncryption: false, // זמנית - בדיקת פונקציונליות
    autoDeleteAfterApproval: false,
    retentionDays: 365,
  },

  [DOCUMENT_TYPES.SERVICE_AGREEMENT]: {
    allowedMimeTypes: ['application/pdf'],
    maxSizeKB: 5120, // 5MB
    sensitivity: SENSITIVITY_LEVELS.PUBLIC,
    requiresEncryption: false,
    autoDeleteAfterApproval: false,
    retentionDays: 2555, // 7 שנים
  },

  [DOCUMENT_TYPES.ACCOUNT_MANAGEMENT]: {
    name: 'אישור ניהול חשבון',
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeKB: 5120, // 5MB
    sensitivity: SENSITIVITY_LEVELS.CONFIDENTIAL,
    requiresEncryption: false, // זמנית - בדיקת פונקציונליות
    autoDeleteAfterApproval: false,
    retentionDays: 365, // שנה
  },
};

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config: (typeof DOCUMENT_CONFIGS)[keyof typeof DOCUMENT_CONFIGS];
}

export interface FileInfo {
  originalName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
}

/**
 * בדיקת תקינות קובץ לפי סוג המסמך
 */
export function validateDocument(file: FileInfo, documentType: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // בדיקה שסוג המסמך קיים
  const config = DOCUMENT_CONFIGS[documentType as keyof typeof DOCUMENT_CONFIGS];
  if (!config) {
    return {
      valid: false,
      errors: [`Unknown document type: ${documentType}`],
      warnings: [],
      config: DOCUMENT_CONFIGS[DOCUMENT_TYPES.PARKING_PHOTO], // fallback
    };
  }

  // בדיקת סוג קובץ
  if (!config.allowedMimeTypes.includes(file.mimeType)) {
    errors.push(
      `File type ${file.mimeType} not allowed for ${documentType}. Allowed types: ${config.allowedMimeTypes.join(', ')}`
    );
  }

  // בדיקת גודל קובץ
  const maxSizeBytes = config.maxSizeKB * 1024;
  if (file.size > maxSizeBytes) {
    errors.push(
      `File size ${Math.round(file.size / 1024)}KB exceeds limit of ${config.maxSizeKB}KB`
    );
  }

  // בדיקת שם קובץ
  const ext = path.extname(file.originalName).toLowerCase();
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

  if (!expectedExts.includes(ext as any)) {
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
function validateFileContent(
  buffer: Buffer,
  mimeType: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

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
function validateImageFile(buffer: Buffer, mimeType: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

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
function performSecurityChecks(file: FileInfo): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

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
export function generateFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * יצירת שם קובץ ייחודי
 */
export function generateUniqueFileName(originalName: string): string {
  const ext = path.extname(originalName);
  const uuid = crypto.randomUUID();
  return `${uuid}${ext}`;
}

/**
 * קבלת הגדרות לסוג מסמך
 */
export function getDocumentConfig(documentType: string) {
  return DOCUMENT_CONFIGS[documentType as keyof typeof DOCUMENT_CONFIGS] || null;
}

/**
 * בדיקה האם מסמך דורש הצפנה
 */
export function requiresEncryption(documentType: string): boolean {
  const config = getDocumentConfig(documentType);
  return config?.requiresEncryption || false;
}

/**
 * קבלת רמת רגישות
 */
export function getSensitivityLevel(documentType: string): string {
  const config = getDocumentConfig(documentType);
  return config?.sensitivity || SENSITIVITY_LEVELS.PUBLIC;
}
