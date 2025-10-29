import { Router } from 'express';
import multer from 'multer';
import { requireAdmin, requireAuth, AuthedRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import {
  validateDocument,
  FileInfo,
  DOCUMENT_TYPES,
} from '../services/documents/documentValidation.service';
import {
  storeDocument,
  retrieveDocument,
  deleteDocument,
} from '../services/documents/documentStorage.service';

const r = Router();

/**
 * עדכון תמונות החניה כשתמונות מאושרות
 */
async function updateParkingImages(userId: number, documentTypeName: string, imageUrl: string) {
  try {
    // מצא את החניה של המשתמש
    const parking = await prisma.parking.findFirst({
      where: { ownerId: userId },
    });

    if (!parking) {
      console.log(`⚠️ No parking found for user ${userId}`);
      return;
    }

    // עדכן את השדה המתאים לפי סוג התמונה
    const updateData: any = {};

    switch (documentTypeName) {
      case 'parking_entrance':
        updateData.entranceImageUrl = imageUrl;
        break;
      case 'parking_empty':
        updateData.emptyImageUrl = imageUrl;
        break;
      case 'parking_with_car':
        updateData.withCarImageUrl = imageUrl;
        break;
      case 'parking_additional':
        updateData.additionalImageUrl = imageUrl;
        break;
      default:
        // לא תמונת חניה, לא צריך לעדכן
        return;
    }

    await prisma.parking.update({
      where: { id: parking.id },
      data: updateData,
    });

    console.log(`📸 Updated parking ${parking.id} with ${documentTypeName}: ${imageUrl}`);
  } catch (error) {
    console.error('Error updating parking images:', error);
  }
}

// הגדרת multer להעלאת קבצים
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB מקסימום
    files: 1, // קובץ אחד בכל פעם
  },
  fileFilter: (req, file, cb) => {
    // בדיקות בסיסיות
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

/**
 * POST /api/documents/upload
 * העלאת מסמך חדש (אדמין בלבד)
 */
r.post(
  '/upload',
  requireAdmin,
  upload.single('document'),
  async (req: AuthedRequest, res, next) => {
    try {
      console.log('📄 Document upload request received');
      console.log('👤 Admin user ID:', req.userId);
      console.log('📝 Request body:', req.body);
      console.log(
        '📎 File info:',
        req.file
          ? {
              originalname: req.file.originalname,
              mimetype: req.file.mimetype,
              size: req.file.size,
            }
          : 'No file'
      );

      const { userId, documentType } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      if (!userId || !documentType) {
        return res.status(400).json({ error: 'userId and documentType are required' });
      }

      // בדיקה שהמשתמש קיים
      const user = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // בדיקה שסוג המסמך קיים
      const docType = await prisma.documentType.findUnique({
        where: { name: documentType },
      });

      if (!docType) {
        return res.status(400).json({ error: 'Invalid document type' });
      }

      // יצירת אובייקט FileInfo
      const fileInfo: FileInfo = {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      };

      console.log('🔍 Validating document:', {
        originalName: fileInfo.originalName,
        mimeType: fileInfo.mimeType,
        size: fileInfo.size,
        documentType,
      });

      // אימות הקובץ
      const validation = validateDocument(fileInfo, documentType);
      console.log('📝 Validation result:', validation);

      if (!validation.valid) {
        console.log('❌ Validation failed:', validation.errors);
        return res.status(400).json({
          error: 'File validation failed',
          details: validation.errors,
        });
      }

      // שמירת הקובץ
      const storageResult = await storeDocument(fileInfo, documentType, parseInt(userId));

      // יצירת רשומה במסד הנתונים
      const document = await prisma.document.create({
        data: {
          userId: parseInt(userId),
          documentTypeId: docType.id,
          originalFileName: file.originalname,
          storedFileName: storageResult.storedFileName,
          filePath: storageResult.filePath,
          mimeType: file.mimetype,
          fileSizeBytes: file.size,
          fileHash: storageResult.fileHash,
          isEncrypted: storageResult.isEncrypted,
          encryptionKey: storageResult.encryptionKey,
          uploadedByUserId: req.userId,
          requiresSignature: docType.requiresSignature,
        },
        include: {
          documentType: true,
          user: { select: { name: true, email: true } },
        },
      });

      // רישום באוטיט
      await prisma.documentAuditLog.create({
        data: {
          documentId: document.id,
          userId: req.userId!,
          action: 'UPLOAD',
          details: {
            originalFileName: file.originalname,
            fileSize: file.size,
            documentType: documentType,
            targetUserId: parseInt(userId),
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          success: true,
        },
      });

      console.log(`📄 Document uploaded: ${document.id} for user ${userId} by admin ${req.userId}`);

      res.json({
        success: true,
        document: {
          id: document.id,
          originalFileName: document.originalFileName,
          documentType: document.documentType.nameHe,
          status: document.status,
          createdAt: document.createdAt,
          user: document.user,
        },
        warnings: validation.warnings,
      });
    } catch (error) {
      console.error('Document upload error:', error);

      // רישום שגיאה באוטיט
      if (req.body.userId) {
        await prisma.documentAuditLog
          .create({
            data: {
              userId: req.userId!,
              action: 'UPLOAD',
              details: {
                error: error instanceof Error ? error.message : 'Unknown error',
                targetUserId: parseInt(req.body.userId),
                documentType: req.body.documentType,
              },
              success: false,
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
            },
          })
          .catch(console.error);
      }

      next(error);
    }
  }
);

/**
 * GET /api/documents/user/:userId
 * קבלת כל המסמכים של משתמש (אדמין בלבד)
 */
r.get('/user/:userId', requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const userId = parseInt(req.params.userId);

    const documents = await prisma.document.findMany({
      where: { userId },
      include: {
        documentType: true,
        uploadedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // רישום באוטיט
    await prisma.documentAuditLog.create({
      data: {
        userId: req.userId!,
        action: 'VIEW',
        details: {
          targetUserId: userId,
          documentsCount: documents.length,
        },
        success: true,
      },
    });

    res.json({
      success: true,
      documents: documents.map(doc => ({
        id: doc.id,
        originalFileName: doc.originalFileName,
        documentType: doc.documentType.nameHe,
        status: doc.status,
        requiresSignature: doc.requiresSignature,
        signatureStatus: doc.signatureStatus,
        notes: doc.notes,
        rejectionReason: doc.rejectionReason,
        createdAt: doc.createdAt,
        approvedAt: doc.approvedAt,
        uploadedBy: doc.uploadedBy?.name,
      })),
    });
  } catch (error) {
    console.error('Get user documents error:', error);
    next(error);
  }
});

/**
 * GET /api/documents/parking-image/:documentId
 * צפייה בתמונת חניה (ללא authentication - תמונות חניה הן public)
 */
r.get('/parking-image/:documentId', async (req, res, next) => {
  try {
    console.log('📸 Parking image request:', req.params.documentId);
    const documentId = parseInt(req.params.documentId);

    if (isNaN(documentId)) {
      console.log('❌ Invalid document ID:', req.params.documentId);
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    // וודא שזו תמונת חניה (public)
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { documentType: true },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // וודא שזו תמונת חניה
    const parkingImageTypes = [
      'parking_entrance',
      'parking_empty',
      'parking_with_car',
      'parking_additional',
      'parking_photo',
    ];
    if (!parkingImageTypes.includes(document.documentType.name)) {
      return res.status(403).json({ error: 'Not a parking image' });
    }

    // וודא שהמסמך אושר
    if (document.status !== 'APPROVED') {
      return res.status(404).json({ error: 'Document not approved' });
    }

    // החזר את התמונה
    const fileBuffer = await retrieveDocument(
      document.filePath,
      document.isEncrypted,
      document.encryptionKey || undefined
    );

    res.set({
      'Content-Type': document.mimeType,
      'Content-Length': fileBuffer.length.toString(),
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Content-Disposition': 'inline',
    });

    res.send(fileBuffer);
  } catch (error) {
    console.error('Error serving parking image:', error);
    next(error);
  }
});

/**
 * GET /api/documents/secure/:documentId
 * צפייה במסמך (עם בקרת גישה)
 */
r.get('/secure/:documentId', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const documentId = parseInt(req.params.documentId);

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        user: true,
        documentType: true,
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // בדיקת הרשאות
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    const canAccess =
      user?.role === 'ADMIN' || // אדמין יכול לראות הכל
      document.userId === req.userId; // בעל המסמך יכול לראות את שלו

    if (!canAccess) {
      await prisma.documentAuditLog.create({
        data: {
          documentId: document.id,
          userId: req.userId!,
          action: 'VIEW',
          success: false,
          errorMessage: 'Access denied',
        },
      });

      return res.status(403).json({ error: 'Access denied' });
    }

    // קריאת הקובץ
    const fileBuffer = await retrieveDocument(
      document.filePath,
      document.isEncrypted,
      document.encryptionKey || undefined,
      document.userId,
      document.documentType.name
    );

    // רישום באוטיט
    await prisma.documentAuditLog.create({
      data: {
        documentId: document.id,
        userId: req.userId!,
        action: 'VIEW',
        details: {
          fileSize: fileBuffer.length,
          mimeType: document.mimeType,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success: true,
      },
    });

    // החזרת הקובץ
    res.set({
      'Content-Type': document.mimeType,
      'Content-Length': fileBuffer.length.toString(),
      'Content-Disposition': `inline; filename="${document.originalFileName}"`,
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });

    res.send(fileBuffer);
  } catch (error) {
    console.error('Document view error:', error);
    next(error);
  }
});

/**
 * POST /api/documents/:documentId/approve
 * אישור מסמך (אדמין בלבד)
 */
r.post('/:documentId/approve', requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const { notes } = req.body;

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { user: true, documentType: true },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.status === 'APPROVED') {
      return res.status(400).json({ error: 'Document already approved' });
    }

    // עדכון הסטטוס
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        notes: notes || null,
      },
    });

    // רישום באוטיט
    await prisma.documentAuditLog.create({
      data: {
        documentId: document.id,
        userId: req.userId!,
        action: 'APPROVE',
        details: {
          notes: notes,
          previousStatus: document.status,
        },
        success: true,
      },
    });

    // אם זו תמונת חניה, עדכן את החניה
    await updateParkingImages(
      document.userId,
      document.documentType.name,
      `/api/documents/parking-image/${documentId}`
    );

    // בדיקה אם כל המסמכים הנדרשים אושרו
    await checkAndUpdateListingRequestStatus(document.userId);

    console.log(`✅ Document approved: ${documentId} by admin ${req.userId}`);

    res.json({
      success: true,
      document: {
        id: updatedDocument.id,
        status: updatedDocument.status,
        approvedAt: updatedDocument.approvedAt,
        notes: updatedDocument.notes,
      },
    });
  } catch (error) {
    console.error('Document approval error:', error);
    next(error);
  }
});

/**
 * POST /api/documents/:documentId/reject
 * דחיית מסמך (אדמין בלבד)
 */
r.post('/:documentId/reject', requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const { reason, notes } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { user: true },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // עדכון הסטטוס
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        notes: notes || null,
      },
    });

    // רישום באוטיט
    await prisma.documentAuditLog.create({
      data: {
        documentId: document.id,
        userId: req.userId!,
        action: 'REJECT',
        details: {
          reason: reason,
          notes: notes,
          previousStatus: document.status,
        },
        success: true,
      },
    });

    console.log(`❌ Document rejected: ${documentId} by admin ${req.userId}`);

    res.json({
      success: true,
      document: {
        id: updatedDocument.id,
        status: updatedDocument.status,
        rejectionReason: updatedDocument.rejectionReason,
        notes: updatedDocument.notes,
      },
    });
  } catch (error) {
    console.error('Document rejection error:', error);
    next(error);
  }
});

/**
 * GET /api/documents/types
 * קבלת רשימת סוגי מסמכים
 */
r.get('/types', requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const documentTypes = await prisma.documentType.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    res.json({
      success: true,
      documentTypes: documentTypes.map(type => ({
        id: type.id,
        name: type.name,
        nameHe: type.nameHe,
        nameEn: type.nameEn,
        description: type.description,
        isRequired: type.isRequired,
        allowedMimeTypes: type.allowedMimeTypes,
        maxFileSizeKB: type.maxFileSizeKB,
        requiresSignature: type.requiresSignature,
      })),
    });
  } catch (error) {
    console.error('Get document types error:', error);
    next(error);
  }
});

/**
 * פונקציה לבדיקת סטטוס מסמכים ועדכון בקשת הפרסום
 */
async function checkAndUpdateListingRequestStatus(userId: number): Promise<void> {
  try {
    // מציאת בקשת הפרסום הפעילה
    const listingRequest = await prisma.listingRequest.findFirst({
      where: {
        userId,
        status: 'PENDING',
      },
    });

    if (!listingRequest) {
      return; // אין בקשה פעילה
    }

    // בדיקת מסמכים נדרשים
    const requiredDocTypes = await prisma.documentType.findMany({
      where: {
        isRequired: true,
        isActive: true,
      },
    });

    const approvedDocs = await prisma.document.findMany({
      where: {
        userId,
        status: 'APPROVED',
      },
      include: { documentType: true },
    });

    const approvedTypeIds = approvedDocs.map(doc => doc.documentTypeId);
    const allRequiredApproved = requiredDocTypes.every(type => approvedTypeIds.includes(type.id));

    // עדכון סטטוס בהתאם
    let newDocumentsStatus: 'INCOMPLETE' | 'PENDING' | 'APPROVED' = 'INCOMPLETE';

    if (allRequiredApproved) {
      newDocumentsStatus = 'APPROVED';
    } else {
      // בדיקה אם יש מסמכים בהמתנה
      const pendingDocs = await prisma.document.count({
        where: {
          userId,
          status: 'UPLOADED',
        },
      });

      if (pendingDocs > 0) {
        newDocumentsStatus = 'PENDING';
      }
    }

    await prisma.listingRequest.update({
      where: { id: listingRequest.id },
      data: { documentsStatus: newDocumentsStatus },
    });

    console.log(
      `Updated listing request ${listingRequest.id} documents status to: ${newDocumentsStatus}`
    );
  } catch (error) {
    console.error('Error updating listing request status:', error);
  }
}

export default r;
