# 🛡️ **מדיניות אבטחה והגנת פרטיות - מערכת מסמכים**

## 📋 **מדיניות כללית**

### **עקרונות יסוד:**
1. **🔒 הגנה על פרטיות** - מסמכים אישיים מוצפנים ומוגנים
2. **👁️ שקיפות** - המשתמש יודע בדיוק מה נשמר ומי גושש
3. **⏰ מחיקה אוטומטית** - נתונים לא נשמרים יותר מהנדרש
4. **🎯 מטרה ברורה** - איסוף נתונים רק למטרת אישור בעלי חניה
5. **🔐 גישה מוגבלת** - רק אדמינים מורשים יכולים לצפות במסמכים

---

## 📄 **סיווג מסמכים לפי רמת רגישות**

### **🔴 רמה קריטית (TOP SECRET)**
**מסמכים:** תעודת זהות, דרכון, רישיון נהיגה
**הגנה נדרשת:**
- ✅ הצפנה חזקה (AES-256)
- ✅ גישה מוגבלת לאדמין בלבד
- ✅ יומן ביקורת מפורט
- ✅ מחיקה אוטומטית לאחר אישור
- ✅ חסימת צילום מסך (במידה האפשר)

```javascript
const CRITICAL_DOCUMENT_TYPES = [
  'identity_card',      // תעודת זהות
  'passport',           // דרכון  
  'driving_license',    // רישיון נהיגה
  'bank_statement'      // אישור בנק
];
```

### **🟡 רמה רגישה (CONFIDENTIAL)**
**מסמכים:** תעודת בעלות, חוזה שכירות, אישור ועד בית
**הגנה נדרשת:**
- ✅ הצפנה בסיסית
- ✅ בקרת גישה role-based
- ✅ יומן ביקורת
- ✅ שמירה זמנית (1 שנה)

```javascript
const CONFIDENTIAL_DOCUMENT_TYPES = [
  'ownership_certificate', // תעודת בעלות
  'rental_agreement',       // חוזה שכירות
  'committee_approval',     // אישור ועד בית
  'business_license'        // רישיון עסק
];
```

### **🟢 רמה ציבורית (PUBLIC)**
**מסמכים:** תמונות חניה, חתימה על הסכם שירות
**הגנה נדרשת:**
- ✅ גישה מבוקרת
- ✅ יומן ביקורת בסיסי
- ✅ אפשרות הצגה ציבורית (לאחר אישור)

```javascript
const PUBLIC_DOCUMENT_TYPES = [
  'parking_photo',      // תמונת החניה
  'service_agreement',  // הסכם שירות חתום
  'location_map'        // מפת מיקום
];
```

---

## 🔐 **פרוטוקולי אבטחה**

### **הצפנת נתונים:**
```javascript
// מערכת הצפנה מתקדמת לפי רמת רגישות
class DocumentEncryption {
  
  static getEncryptionLevel(documentType) {
    if (CRITICAL_DOCUMENT_TYPES.includes(documentType)) {
      return {
        algorithm: 'aes-256-gcm',
        keyDerivation: 'pbkdf2',
        iterations: 100000,
        saltLength: 32,
        compress: true,
        watermark: true  // סימן מים דיגיטלי
      };
    } 
    
    if (CONFIDENTIAL_DOCUMENT_TYPES.includes(documentType)) {
      return {
        algorithm: 'aes-256-cbc', 
        keyDerivation: 'pbkdf2',
        iterations: 50000,
        saltLength: 16,
        compress: true
      };
    }
    
    return {
      algorithm: 'aes-128-cbc',
      keyDerivation: 'scrypt',
      compress: false
    };
  }
  
  // הצפנה עם רמת אבטחה מותאמת
  static async encryptDocument(documentBuffer, documentType, userId) {
    const config = this.getEncryptionLevel(documentType);
    
    // יצירת מפתח ייחודי
    const masterKey = await this.generateMasterKey(userId, documentType);
    const fileKey = crypto.randomBytes(32);
    
    // הוספת מטאדאטה לביקורת
    const metadata = {
      userId,
      documentType,
      encryptedAt: new Date().toISOString(),
      encryptionVersion: '2.0',
      algorithm: config.algorithm
    };
    
    // הצפנה מרובת שכבות למסמכים קריטיים
    if (config.algorithm === 'aes-256-gcm') {
      return await this.encryptCriticalDocument(documentBuffer, fileKey, metadata);
    }
    
    return await this.encryptStandardDocument(documentBuffer, fileKey, metadata);
  }
}
```

### **בקרת גישה מחמירה:**
```javascript
// מערכת הרשאות מתקדמת
class DocumentAccessControl {
  
  // רמות גישה שונות
  static ACCESS_LEVELS = {
    OWNER_VIEW: 'owner_view',         // בעל המסמך - צפייה בלבד
    ADMIN_VIEW: 'admin_view',         // אדמין - צפייה
    ADMIN_APPROVE: 'admin_approve',   // אדמין - אישור/דחייה
    SYSTEM_PROCESS: 'system_process'  // מערכת - עיבוד אוטומטי
  };
  
  // בדיקת הרשאה מפורטת
  static async checkDocumentAccess(userId, documentId, requestedAction) {
    const document = await this.getDocumentWithSecurity(documentId);
    const user = await this.getUserWithPermissions(userId);
    
    // בדיקת חסימת משתמש
    if (user.isBlocked) {
      await this.logSecurityEvent('BLOCKED_USER_ACCESS_ATTEMPT', { userId, documentId });
      return { allowed: false, reason: 'User is blocked' };
    }
    
    // בדיקת IP מורשה (לאדמינים)
    if (user.role === 'ADMIN') {
      const isFromAllowedIP = await this.validateAdminIP(userId, this.getClientIP());
      if (!isFromAllowedIP) {
        await this.logSecurityEvent('UNAUTHORIZED_IP_ACCESS', { userId, ip: this.getClientIP() });
        return { allowed: false, reason: 'Access from unauthorized IP' };
      }
    }
    
    // בדיקת זמן גישה (שעות עבודה לאדמינים)
    if (user.role === 'ADMIN' && !this.isBusinessHours()) {
      await this.logSecurityEvent('AFTER_HOURS_ACCESS', { userId, documentId });
      // התראה אבל לא חסימה
    }
    
    // בדיקת הרשאה ספציפית למסמך
    return await this.validateDocumentPermission(user, document, requestedAction);
  }
  
  // יצירת session מאובטח למסמך
  static async createSecureSession(userId, documentId, purpose) {
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 דקות
    
    await this.storeSecureSession({
      token: sessionToken,
      userId,
      documentId,
      purpose,
      expiresAt,
      maxViews: purpose === 'view' ? 3 : 1,  // מקסימום צפיות
      currentViews: 0
    });
    
    return {
      sessionToken,
      secureUrl: `/api/documents/secure/${documentId}?session=${sessionToken}`,
      expiresAt
    };
  }
}
```

---

## 📝 **יומן ביקורת (Audit Log)**

### **רישום פעולות מפורט:**
```javascript
// מערכת לוגים מתקדמת
class DocumentAuditLogger {
  
  // רישום כל פעולה על מסמכים
  static async logDocumentAction(action, details) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action: action,
      userId: details.userId,
      documentId: details.documentId,
      documentType: details.documentType,
      
      // מידע טכני
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      sessionId: details.sessionId,
      
      // הקשר
      reason: details.reason,
      adminNotes: details.adminNotes,
      
      // תוצאה
      success: details.success,
      errorCode: details.errorCode,
      
      // אבטחה
      securityLevel: this.getDocumentSecurityLevel(details.documentType),
      accessMethod: details.accessMethod,
      
      // ביצועים
      processingTimeMs: details.processingTimeMs,
      fileSizeBytes: details.fileSizeBytes
    };
    
    // שמירה במסד נתונים
    await prisma.documentAuditLog.create({ data: logEntry });
    
    // התראה לאירועים חמורים
    if (this.isCriticalAction(action)) {
      await this.sendSecurityAlert(logEntry);
    }
    
    // ארכוב יומן (למסמכים קריטיים)
    if (details.documentType && CRITICAL_DOCUMENT_TYPES.includes(details.documentType)) {
      await this.archiveLogEntry(logEntry);
    }
  }
  
  // זיהוי פעילות חשודה
  static async detectSuspiciousActivity(userId) {
    const recentLogs = await this.getRecentUserLogs(userId, 24); // 24 שעות
    
    const suspiciousPatterns = [
      this.detectMassDownload(recentLogs),      // הורדות מסיביות
      this.detectOffHoursAccess(recentLogs),    // גישה בשעות חריגות  
      this.detectFailedAttempts(recentLogs),    // ניסיונות כישלון מרובים
      this.detectUnusualIPs(recentLogs)         // גישה מ-IP חריגים
    ];
    
    const detectedIssues = suspiciousPatterns.filter(p => p.detected);
    
    if (detectedIssues.length > 0) {
      await this.handleSuspiciousActivity(userId, detectedIssues);
    }
    
    return detectedIssues;
  }
}
```

---

## ⏰ **מדיניות שמירה ומחיקה**

### **לוח זמנים לשמירת מסמכים:**

| סוג מסמך | תקופת שמירה | מחיקה אוטומטית | גיבוי |
|----------|-------------|----------------|-------|
| תעודת זהות | 7 ימים | ✅ לאחר אישור | ❌ לא |
| תעודת בעלות | 1 שנה | ✅ לאחר תפוגה | ✅ כן |
| תמונת חניה | 2 שנים | ✅ לאחר סגירת חשבון | ✅ כן |
| חוזה חתום | 7 שנים | ❌ שמירה קבועה | ✅ כן |
| יומן ביקורת | 3 שנים | ✅ ארכוב אוטומטי | ✅ כן |

### **יישום מחיקה אוטומטית:**
```javascript
// מערכת מחיקה אוטומטית
class DocumentRetentionManager {
  
  // מחיקה יומית של מסמכים שפג תוקפם
  static async performDailyCleanup() {
    console.log('🧹 Starting daily document cleanup...');
    
    // מסמכים קריטיים - מחיקה לאחר אישור
    await this.deleteApprovedCriticalDocuments();
    
    // מסמכים זמניים - מחיקה לאחר 7 ימים
    await this.deleteTempDocuments();
    
    // קבצים זמניים - מחיקה לאחר 24 שעות
    await this.cleanTempFiles();
    
    // יומני ביקורת ישנים - ארכוב
    await this.archiveOldAuditLogs();
    
    console.log('✅ Daily cleanup completed');
  }
  
  static async deleteApprovedCriticalDocuments() {
    const approvedCriticalDocs = await prisma.documents.findMany({
      where: {
        status: 'APPROVED',
        documentType: { in: CRITICAL_DOCUMENT_TYPES },
        approvedAt: {
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // לפני 7 ימים
        }
      }
    });
    
    for (const doc of approvedCriticalDocs) {
      // מחיקה פיזית של הקובץ
      await this.secureFileDelete(doc.filePath);
      
      // עדכון רשומה (לא מחיקה - לצורך ביקורת)
      await prisma.documents.update({
        where: { id: doc.id },
        data: {
          status: 'DELETED',
          filePath: null,
          deletedAt: new Date(),
          deletionReason: 'AUTO_DELETE_AFTER_APPROVAL'
        }
      });
      
      // רישום באוטיט
      await DocumentAuditLogger.logDocumentAction('DELETE', {
        documentId: doc.id,
        reason: 'Automatic deletion after approval period',
        success: true
      });
    }
  }
  
  // מחיקה מאובטחת של קבצים
  static async secureFileDelete(filePath) {
    if (!filePath || !fs.existsSync(filePath)) return;
    
    // overwrite הקובץ עם נתונים רנדומליים (3 פעמים)
    for (let i = 0; i < 3; i++) {
      const fileSize = fs.statSync(filePath).size;
      const randomData = crypto.randomBytes(fileSize);
      fs.writeFileSync(filePath, randomData);
      fs.fsyncSync(fs.openSync(filePath, 'r+'));
    }
    
    // מחיקה סופית
    fs.unlinkSync(filePath);
  }
}
```

---

## 🇮🇱 **עמידה בתקנות הגנת פרטיות הישראליות**

### **התאמה לחוק הגנת הפרטיות (תיקון 40):**

**1. עקרונות מנחים:**
- ✅ **מטרה לגיטימית** - אישור בעלי חניה בלבד
- ✅ **פרופורציונליות** - איסוף מינימלי של נתונים
- ✅ **זמניות** - מחיקה לאחר השגת המטרה
- ✅ **שקיפות** - הודעה למשתמש על איסוף ועיבוד

**2. זכויות הפרט:**
```javascript
// מימוש זכויות הפרט
class PrivacyRightsManager {
  
  // זכות עיון - המשתמש רואה מה נשמר עליו
  static async getUserDataReport(userId) {
    const documents = await prisma.documents.findMany({
      where: { userId },
      select: {
        id: true,
        documentType: true,
        originalFileName: true,
        status: true,
        createdAt: true,
        approvedAt: true,
        // לא כוללים נתיב קובץ או תוכן
      }
    });
    
    const auditLogs = await prisma.documentAuditLog.findMany({
      where: { userId },
      select: {
        action: true,
        createdAt: true,
        success: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // 50 פעולות אחרונות
    });
    
    return {
      personalInfo: {
        userId,
        totalDocuments: documents.length,
        approvedDocuments: documents.filter(d => d.status === 'APPROVED').length
      },
      documents: documents,
      recentActivity: auditLogs,
      dataRetentionPolicy: await this.getRetentionPolicyForUser(userId)
    };
  }
  
  // זכות למחיקה - מחיקת נתונים על פי בקשה
  static async deleteUserData(userId, reason) {
    // בדיקה שהמשתמש לא בתהליך פעיל
    const activeRequests = await prisma.listingRequest.count({
      where: { userId, status: 'PENDING' }
    });
    
    if (activeRequests > 0) {
      throw new Error('Cannot delete data while active requests exist');
    }
    
    // מחיקה מאובטחת של כל המסמכים
    const userDocuments = await prisma.documents.findMany({
      where: { userId }
    });
    
    for (const doc of userDocuments) {
      if (doc.filePath) {
        await DocumentRetentionManager.secureFileDelete(doc.filePath);
      }
    }
    
    // עדכון רשומות (לא מחיקה מוחלטת לצורך ביקורת)
    await prisma.documents.updateMany({
      where: { userId },
      data: {
        status: 'DELETED',
        filePath: null,
        deletedAt: new Date(),
        deletionReason: reason
      }
    });
    
    // רישום מחיקה
    await DocumentAuditLogger.logDocumentAction('USER_DATA_DELETION', {
      userId,
      reason,
      documentsCount: userDocuments.length,
      success: true
    });
    
    return {
      deletedDocuments: userDocuments.length,
      deletionDate: new Date(),
      confirmation: `All user data deleted per request: ${reason}`
    };
  }
}
```

**3. הודעת פרטיות לבעלי חניה:**
```markdown
## הודעת פרטיות - מערכת מסמכים

**איסוף מידע:**
אנחנו אוספים מסמכים אישיים רק לצורך אישור זהותך כבעל חניה.

**מסמכים הנאספים:**
- תעודת זהות (להזדהות)
- תעודת בעלות (לאימות בעלות על החניה)  
- תמונת החניה (לאימות מיקום)

**אבטחת המידע:**
- כל המסמכים מוצפנים ומאובטחים
- גישה מוגבלת לצוות המורשה בלבד
- מחיקה אוטומטית לאחר אישור

**זכויותיך:**
- זכות עיון במידע שנשמר
- זכות לתיקון מידע שגוי
- זכות למחיקת מידע (בתנאים מסוימים)

**יצירת קשר:**
privacy@zpoto.co.il
```

---

## 🚨 **תגובה לאירועי אבטחה**

### **פרוטוקול התגובה:**
```javascript
// מערכת תגובה לאירועי אבטחה
class SecurityIncidentResponse {
  
  static SEVERITY_LEVELS = {
    LOW: 'low',           // ניסיון גישה בודד
    MEDIUM: 'medium',     // מספר ניסיונות כישלון
    HIGH: 'high',         // גישה מ-IP חשוד
    CRITICAL: 'critical'  // חשד לדליפת נתונים
  };
  
  // טיפול באירוע אבטחה
  static async handleSecurityIncident(incident) {
    const severity = this.assessSeverity(incident);
    
    // רישום מיידי
    await this.logSecurityIncident(incident, severity);
    
    // הקפאת משתמש במקרה חמור
    if (severity === 'CRITICAL' || severity === 'HIGH') {
      await this.freezeUserAccount(incident.userId);
    }
    
    // התראה לאדמין
    await this.alertAdministrators(incident, severity);
    
    // בדיקת נזק
    if (severity === 'CRITICAL') {
      await this.performDamageAssessment(incident);
    }
    
    return {
      incidentId: incident.id,
      severity,
      actionsToken: await this.getResponseActions(severity)
    };
  }
  
  // הודעה לרשויות במקרה חמור
  static async notifyAuthoritiesIfRequired(incident) {
    if (incident.severity === 'CRITICAL' && incident.type === 'DATA_BREACH') {
      // הודעה למגן הפרטיות (בהתאם לחוק הישראלי)
      await this.notifyPrivacyAuthority({
        incidentTime: incident.createdAt,
        dataTypes: incident.affectedDataTypes,
        usersCount: incident.affectedUsersCount,
        mitigationSteps: incident.mitigationSteps
      });
    }
  }
}
```

---

**✅ המדיניות מבטיחה הגנה מקסימלית על פרטיות המשתמשים תוך עמידה בכל התקנות!**
