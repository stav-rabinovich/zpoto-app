# מדריך Deployment - מיגרציה לבלוקי 3 שעות

## 🚨 **חשוב לקרוא לפני התחלה!**

מיגרציה זו משנה את מבנה הנתונים הבסיסי של המערכת. **חובה לבצע גיבוי מלא לפני התחלה**.

---

## 📋 **רשימת בדיקות לפני Deployment**

### ✅ בדיקות קוד
- [ ] כל הבדיקות עוברות בהצלחה
- [ ] אין שגיאות TypeScript או JavaScript
- [ ] הקוד עבר code review
- [ ] כל ההודעות עודכנו ל-3 שעות

### ✅ בדיקות פונקציונליות
- [ ] מיגרציה אוטומטית ב-Frontend עובדת
- [ ] Backend APIs עובדים עם פורמט 3 שעות
- [ ] בדיקת התנגשויות עובדת נכון
- [ ] WebSocket עדכונים עובדים

### ✅ בדיקות גיבוי ושחזור
- [ ] סקריפט הגיבוי עובד
- [ ] סקריפט המיגרציה עובד (dry run)
- [ ] סקריפט ה-rollback עובד
- [ ] נבדק שחזור מגיבוי

---

## 🚀 **תהליך Deployment המומלץ**

### **שלב 1: הכנות**
```bash
# 1. גיבוי מלא של הדאטה בייס
cd backend
npx ts-node src/scripts/backup-parking-availability.ts

# 2. בדיקה יבשה של המיגרציה
npx ts-node src/scripts/migrate-time-blocks-4h-to-3h.ts --dry-run

# 3. בדיקת הפונקציות
npx ts-node src/scripts/test-migration-functions.ts
```

### **שלב 2: Deployment לסביבת Staging**
```bash
# 1. פריסת הקוד החדש
git checkout main
git pull origin main

# 2. הרצת המיגרציה על staging
npx ts-node src/scripts/migrate-time-blocks-4h-to-3h.ts

# 3. בדיקות אינטגרציה
npm test
```

### **שלב 3: בדיקות Staging**
- [ ] בדיקת UI - מסך זמינות בעלים
- [ ] בדיקת חיפוש חניות
- [ ] בדיקת הזמנות חדשות
- [ ] בדיקת עדכוני זמינות
- [ ] בדיקת WebSocket

### **שלב 4: Deployment ל-Production**

#### **4.1 הכנות Production**
```bash
# גיבוי production
npx ts-node src/scripts/backup-parking-availability.ts

# בדיקה יבשה על production data
npx ts-node src/scripts/migrate-time-blocks-4h-to-3h.ts --dry-run
```

#### **4.2 פריסה מדורגת**
```bash
# שלב א': פריסת קוד ללא מיגרציה
# הקוד החדש תומך בשני הפורמטים
git deploy production

# שלב ב': מיגרציה של 10% מהחניות (בדיקה)
# TODO: יצירת סקריפט מיגרציה חלקית

# שלב ג': מיגרציה מלאה
npx ts-node src/scripts/migrate-time-blocks-4h-to-3h.ts
```

---

## 📊 **מעקב ומטריקות**

### **מטריקות לפני המיגרציה**
```bash
# ספירת חניות לפי פורמט
SELECT 
  COUNT(*) as total_parkings,
  SUM(CASE WHEN availability IS NOT NULL THEN 1 ELSE 0 END) as with_availability
FROM parking;

# דוגמאות נתוני זמינות
SELECT id, title, availability 
FROM parking 
WHERE availability IS NOT NULL 
LIMIT 5;
```

### **מטריקות אחרי המיגרציה**
```bash
# וידוא שכל הנתונים במצב 3 שעות
npx ts-node src/scripts/verify-migration.ts

# בדיקת ביצועים
npx ts-node src/scripts/performance-test.ts
```

---

## 🚨 **תכנית Rollback**

### **מתי לבצע Rollback:**
- שגיאות קריטיות במערכת
- ביצועים ירודים משמעותית
- בעיות עם הזמנות חדשות
- תלונות רבות ממשתמשים

### **תהליך Rollback:**

#### **אופציה 1: שחזור מגיבוי**
```bash
# שחזור מקובץ הגיבוי האחרון
npx ts-node src/scripts/rollback-to-4h-blocks.ts --backup=/path/to/backup.json
```

#### **אופציה 2: מיגרציה הפוכה**
```bash
# המרה חזרה מ-3 שעות ל-4 שעות
npx ts-node src/scripts/rollback-to-4h-blocks.ts --use-migration
```

#### **אופציה 3: שחזור מלא מדאטה בייס**
```sql
-- שחזור מטבלת הגיבוי
UPDATE parking 
SET availability = backup.availability 
FROM parking_availability_backup backup 
WHERE parking.id = backup.id;
```

---

## 🔍 **בדיקות Post-Deployment**

### **בדיקות אוטומטיות**
```bash
# הרצת כל הבדיקות
npm test

# בדיקות אינטגרציה ספציפיות
npm run test:integration

# בדיקת ביצועים
npm run test:performance
```

### **בדיקות ידניות**
1. **מסך בעל חניה:**
   - [ ] פתיחת מסך זמינות
   - [ ] רואה 8 בלוקים של 3 שעות
   - [ ] שמירת זמינות עובדת
   - [ ] הודעות נכונות (3 שעות)

2. **חיפוש חניות:**
   - [ ] חיפוש מחזיר תוצאות נכונות
   - [ ] סינון זמינות עובד
   - [ ] חניות לא זמינות לא מוצגות

3. **הזמנות:**
   - [ ] הזמנה חדשה עובדת
   - [ ] בדיקת זמינות נכונה
   - [ ] אין התנגשויות

### **בדיקות ביצועים**
- [ ] זמן טעינת מסך זמינות < 2 שניות
- [ ] זמן תגובה API < 500ms
- [ ] זמן מיגרציה נתונים < 1 דקה לכל 1000 חניות

---

## 📞 **אנשי קשר ותמיכה**

### **בעיות טכניות:**
- **מפתח ראשי:** [שם] - [טלפון] - [אימייל]
- **DevOps:** [שם] - [טלפון] - [אימייל]

### **בעיות עסקיות:**
- **מנהל מוצר:** [שם] - [טלפון] - [אימייל]
- **שירות לקוחות:** [שם] - [טלפון] - [אימייל]

---

## 📝 **לוג שינויים**

### **גרסה 1.0 - מיגרציה לבלוקי 3 שעות**
- ✅ שינוי מבנה נתונים מ-4 שעות ל-3 שעות
- ✅ מיגרציה אוטומטית ב-Frontend
- ✅ עדכון כל ההודעות והטקסטים
- ✅ שיפור דיוק זמינות חניות
- ✅ תמיכה מלאה ב-rollback

### **שינויים עיקריים:**
1. **Frontend:**
   - `OwnerAvailabilityScreen.js` - 8 בלוקים במקום 6
   - `AvailabilityEditor.js` - הודעות מעודכנות
   - `utils/availability.js` - בלוקי 3 שעות
   - `utils/timezone.js` - קבועים מעודכנים

2. **Backend:**
   - `services/parkings.service.ts` - חישוב בלוק 3 שעות
   - `services/bookings.service.ts` - חישוב בלוק 3 שעות
   - `services/owner.service.ts` - בדיקת התנגשויות 3 שעות
   - `config/timeBlocks.ts` - תצורה חדשה
   - `utils/timeBlockMigration.ts` - פונקציות מיגרציה

3. **סקריפטים:**
   - `scripts/backup-parking-availability.ts` - גיבוי
   - `scripts/migrate-time-blocks-4h-to-3h.ts` - מיגרציה
   - `scripts/rollback-to-4h-blocks.ts` - rollback
   - `scripts/test-migration-functions.ts` - בדיקות

---

## ✅ **Checklist סופי לפני Go-Live**

### **טכני:**
- [ ] כל הבדיקות עוברות
- [ ] גיבוי מלא בוצע
- [ ] סקריפט rollback נבדק
- [ ] מטריקות ביצועים תקינות
- [ ] לוגים מפורטים פעילים

### **עסקי:**
- [ ] צוות שירות לקוחות הוכשר
- [ ] הודעה למשתמשים נשלחה
- [ ] תמיכה 24/7 זמינה
- [ ] תכנית תקשורת מוכנה

### **אבטחה:**
- [ ] בדיקת אבטחה בוצעה
- [ ] גישות מוגבלות לסקריפטים
- [ ] גיבויים מוצפנים
- [ ] לוגים מאובטחים

---

**🎯 המטרה: מיגרציה חלקה ללא הפרעה לשירות!**
