# 📄 **תכנון מבנה בסיס נתונים - מערכת מסמכים**

## 🎯 **מטרות המערכת**

### **דרישות פונקציונליות:**
- ✅ ניהול מסמכים לכל בעל חניה
- ✅ מעקב אחר סטטוס מסמכים (הועלה/נחתם/אושר)
- ✅ חתימה דיגיטלית על מסמכים
- ✅ גרסאות של מסמכים (אם נדרש עדכון)
- ✅ אבטחה ובקרת גישה
- ✅ אישור אוטומטי כשכל המסמכים מועלים

### **דרישות טכניות:**
- 🔐 הצפנת קבצים רגישים
- 📁 תמיכה ב-PDF, תמונות (JPG, PNG)
- 💾 אחסון מאובטח (מקומי + ענן)
- 📊 מעקב אחר פעולות (audit log)
- ⚡ ביצועים גבוהים
- 🛡️ עמידה בתקנות הגנת פרטיות

---

## 🗄️ **מבנה טבלאות מוצע**

### **1. טבלת DocumentTypes (סוגי מסמכים)**
```sql
CREATE TABLE DocumentTypes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,              -- "ת.ז.", "רישיון נהיגה", "תעודת בעלות"
  nameHe VARCHAR(100) NOT NULL,                   -- שם בעברית
  nameEn VARCHAR(100),                            -- שם באנגלית
  description TEXT,                               -- תיאור המסמך
  isRequired BOOLEAN DEFAULT false,               -- האם חובה לאישור
  allowedMimeTypes TEXT[],                        -- ["application/pdf", "image/jpeg"]
  maxFileSizeKB INTEGER DEFAULT 5120,             -- גודל מקסימלי 5MB
  requiresSignature BOOLEAN DEFAULT false,        -- האם דורש חתימה דיגיטלית
  displayOrder INTEGER DEFAULT 0,                -- סדר הצגה באדמין
  isActive BOOLEAN DEFAULT true,                  -- האם סוג המסמך פעיל
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **2. טבלת Documents (מסמכים)**
```sql
CREATE TABLE Documents (
  id SERIAL PRIMARY KEY,
  userId INTEGER NOT NULL,                        -- קישור לבעל החניה
  documentTypeId INTEGER NOT NULL,                -- סוג המסמך
  originalFileName VARCHAR(255) NOT NULL,         -- שם הקובץ המקורי
  storedFileName VARCHAR(255) NOT NULL UNIQUE,    -- שם הקובץ באחסון (UUID)
  filePath VARCHAR(500) NOT NULL,                 -- נתיב מלא לקובץ
  mimeType VARCHAR(100) NOT NULL,                 -- "application/pdf"
  fileSizeBytes INTEGER NOT NULL,                 -- גודל הקובץ
  fileHash VARCHAR(64),                          -- SHA-256 hash לוריפיקציה
  
  -- סטטוס המסמך
  status DocumentStatus DEFAULT 'UPLOADED',       -- UPLOADED/PROCESSING/APPROVED/REJECTED
  
  -- חתימה דיגיטלית
  requiresSignature BOOLEAN DEFAULT false,
  signatureRequestId VARCHAR(100),                -- ID מהשירות החתימה החיצוני
  signatureStatus SignatureStatus DEFAULT 'NONE', -- NONE/SENT/SIGNED/FAILED
  signedAt TIMESTAMP,
  signedDocumentPath VARCHAR(500),                -- נתיב למסמך החתום
  
  -- אבטחה
  isEncrypted BOOLEAN DEFAULT false,              -- האם הקובץ מוצפן
  encryptionKey VARCHAR(100),                     -- מפתח הצפנה (מוצפן בעצמו)
  
  -- מטא-דאטה
  uploadedByUserId INTEGER,                       -- מי העלה (אדמין או הבעלים)
  notes TEXT,                                     -- הערות אדמין
  rejectionReason TEXT,                           -- סיבת דחייה
  
  -- תאריכים
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approvedAt TIMESTAMP,
  expiresAt TIMESTAMP,                            -- תאריך תפוגה (למסמכים זמניים)
  
  -- אינדקסים וקישורים
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  FOREIGN KEY (documentTypeId) REFERENCES DocumentTypes(id),
  FOREIGN KEY (uploadedByUserId) REFERENCES User(id),
  
  -- אינדקסים לביצועים
  INDEX idx_documents_user_status (userId, status),
  INDEX idx_documents_type_status (documentTypeId, status),
  INDEX idx_documents_signature (signatureStatus),
  
  -- אילוצים
  CONSTRAINT chk_file_size CHECK (fileSizeBytes > 0 AND fileSizeBytes <= 10485760), -- מקס 10MB
  CONSTRAINT chk_status_logic CHECK (
    (status = 'APPROVED' AND approvedAt IS NOT NULL) OR 
    (status != 'APPROVED')
  )
);
```

### **3. טבלת DocumentVersions (גרסאות מסמכים)**
```sql
CREATE TABLE DocumentVersions (
  id SERIAL PRIMARY KEY,
  documentId INTEGER NOT NULL,                    -- המסמך הראשי
  versionNumber INTEGER NOT NULL DEFAULT 1,       -- מספר גרסה
  filePath VARCHAR(500) NOT NULL,                 -- נתיב לגרסה הספציפית
  changeReason TEXT,                              -- סיבת השינוי
  isActive BOOLEAN DEFAULT true,                  -- האם זו הגרסה הפעילה
  createdBy INTEGER NOT NULL,                     -- מי יצר את הגרסה
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (documentId) REFERENCES Documents(id) ON DELETE CASCADE,
  FOREIGN KEY (createdBy) REFERENCES User(id),
  
  -- אילוץ: רק גרסה אחת פעילה למסמך
  UNIQUE INDEX idx_document_active_version (documentId) 
    WHERE isActive = true
);
```

### **4. טבלת DocumentAuditLog (יומן ביקורת)**
```sql
CREATE TABLE DocumentAuditLog (
  id SERIAL PRIMARY KEY,
  documentId INTEGER,                             -- המסמך (יכול להיות NULL למבצעים כלליים)
  userId INTEGER NOT NULL,                        -- מי ביצע את הפעולה
  action DocumentAction NOT NULL,                 -- UPLOAD/APPROVE/REJECT/SIGN/VIEW/DOWNLOAD
  details JSONB,                                  -- פרטים נוספים (IP, User Agent, וכו')
  ipAddress INET,                                 -- כתובת IP
  userAgent TEXT,                                 -- דפדפן/אפליקציה
  success BOOLEAN DEFAULT true,                   -- האם הפעולה הצליחה
  errorMessage TEXT,                              -- הודעת שגיאה אם רלוונטי
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (documentId) REFERENCES Documents(id) ON DELETE SET NULL,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  
  -- אינדקס לחיפושים מהירים
  INDEX idx_audit_document_date (documentId, createdAt),
  INDEX idx_audit_user_date (userId, createdAt),
  INDEX idx_audit_action_date (action, createdAt)
);
```

### **5. ENUMs נדרשים**
```sql
CREATE TYPE DocumentStatus AS ENUM (
  'UPLOADED',      -- הועלה, ממתין לבדיקה
  'PROCESSING',    -- בבדיקה
  'APPROVED',      -- אושר
  'REJECTED',      -- נדחה
  'EXPIRED'        -- פג תוקף
);

CREATE TYPE SignatureStatus AS ENUM (
  'NONE',          -- לא דורש חתימה
  'PENDING',       -- ממתין לחתימה
  'SENT',          -- נשלח לחתימה
  'SIGNED',        -- נחתם
  'FAILED'         -- חתימה נכשלה
);

CREATE TYPE DocumentAction AS ENUM (
  'UPLOAD',        -- העלאה
  'VIEW',          -- צפייה
  'DOWNLOAD',      -- הורדה
  'APPROVE',       -- אישור
  'REJECT',        -- דחייה
  'SIGN_REQUEST',  -- בקשת חתימה
  'SIGN_COMPLETE', -- חתימה הושלמה
  'DELETE',        -- מחיקה
  'UPDATE'         -- עדכון
);
```

---

## 🔗 **קשרים וקישורים**

### **קישור לטבלת ListingRequest:**
```sql
-- הוספת קישור בין בקשת פרסום למסמכים
ALTER TABLE ListingRequest 
ADD COLUMN documentsStatus DocumentsCompletionStatus DEFAULT 'INCOMPLETE';

CREATE TYPE DocumentsCompletionStatus AS ENUM (
  'INCOMPLETE',    -- חסרים מסמכים
  'PENDING',       -- כל המסמכים הועלו, ממתינים לאישור
  'APPROVED'       -- כל המסמכים אושרו
);
```

### **טריגרים לעדכון אוטומטי:**
```sql
-- טריגר לעדכון סטטוס מסמכים ברקבשת פרסום
CREATE OR REPLACE FUNCTION update_listing_request_documents_status()
RETURNS TRIGGER AS $$
BEGIN
  -- לוגיקה לבדיקה אם כל המסמכים הנדרשים אושרו
  -- ועדכון הסטטוס בהתאם
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_documents_status
  AFTER UPDATE ON Documents
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_request_documents_status();
```

---

## 🎯 **תרחישי שימוש מתוכננים**

### **1. העלאת מסמך בפעם הראשונה:**
1. אדמין בוחר בעל חניה ותיק מסמך
2. מעלה קובץ PDF/תמונה  
3. המערכת יוצרת רשומה בטבלת Documents
4. מתבצע validation על סוג הקובץ וגודל
5. הקובץ נשמר באחסון מאובטח
6. נרשם ביומן הביקורת

### **2. אישור/דחיית מסמך:**
1. אדמין צופה במסמך
2. מאשר או דוחה עם הערות
3. עדכון סטטוס המסמך
4. אם כל המסמכים אושרו → עדכון סטטוס בקשת הפרסום
5. הודעה לבעל החניה (email/SMS)

### **3. חתימה דיגיטלית:**
1. מסמך מסומן כדורש חתימה
2. שליחה לשירות חתימה חיצוני
3. בעל החניה מקבל קישור לחתימה
4. אחרי חתימה → המערכת מקבלת webhook
5. עדכון סטטוס המסמך החתום

---

## 🔐 **שיקולי אבטחה וביצועים**

### **אבטחה:**
- 🔒 הצפנת קבצים רגישים (תעודות זהות)
- 🛡️ בקרת גישה מחמירה (role-based)
- 📝 יומן ביקורת מפורט לכל פעולה
- 🔐 חתימות דיגיטליות מאומתות
- 🌐 HTTPS חובה לכל העברות קבצים

### **ביצועים:**
- 📁 אחסון קבצים נפרד ממסד הנתונים
- 💾 CDN לקבצים שאושרו (אופציונלי)
- 🗜️ דחיסת תמונות אוטומטית
- 📊 אינדקסים מותאמים לחיפושים
- ⚡ Lazy loading למסכי צפייה

---

## 📋 **רשימת מסמכים נדרשים (דוגמאות)**

1. **תעודת זהות** (חובה, דורש הצפנה)
2. **רישיון נהיגה** (רצוי)
3. **תעודת בעלות על נכס/חוזה שכירות** (חובה)
4. **אישור ועד בית** (רצוי)
5. **תמונת החניה** (חובה)
6. **סכם הסכמה לשירות** (חובה, דורש חתימה דיגיטלית)

---

**✅ התכנון מכסה את כל הדרישות הפונקציונליות והטכניות ומתכונן לעתיד!**
