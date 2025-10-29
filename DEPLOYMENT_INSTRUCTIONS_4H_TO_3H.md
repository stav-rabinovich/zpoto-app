# הוראות Deploy - מעבר מ-4 שעות ל-3 שעות

## 📋 סקירה כללית
מסמך זה מכיל הוראות מפורטות לביצוע Deploy בטוח של המעבר מבלוקי זמינות של 4 שעות ל-3 שעות.

## ⚠️ אזהרות חשובות
- **גיבוי חובה:** יש לבצע גיבוי מלא של בסיס הנתונים לפני התחלה
- **זמן תחזוקה:** מומלץ לבצע בשעות פעילות נמוכה
- **בדיקות:** יש לבדוק בסביבת staging לפני ייצור
- **Rollback:** יש להכין תכנית rollback מוכנה

---

## 🚀 תהליך Deploy - 4 שלבים

### **שלב 1: הכנה וגיבוי** 📦
**משך צפוי:** 10 דקות

#### 1.1 גיבוי בסיס נתונים
```bash
# גיבוי מלא של בסיס הנתונים
sqlite3 /path/to/database.db ".backup /path/to/backup/backup-$(date +%Y%m%d-%H%M%S).db"

# או עם pg_dump אם PostgreSQL
pg_dump -h localhost -U username -d database_name > backup-$(date +%Y%m%d-%H%M%S).sql
```

#### 1.2 בדיקת מצב המערכת
```bash
# בדיקת שרת
curl -f http://localhost:3000/api/health || echo "Server not responding"

# בדיקת חניות עם זמינות
sqlite3 database.db "SELECT COUNT(*) FROM Parking WHERE availability IS NOT NULL;"
```

#### 1.3 הודעה למשתמשים (אופציונלי)
- הודעה באפליקציה על תחזוקה קצרה
- הודעה בערוצי תקשורת רלוונטיים

---

### **שלב 2: Deploy הקוד החדש** 🔄
**משך צפוי:** 15 דקות

#### 2.1 Deploy Backend
```bash
cd backend/

# עצירת השרת הנוכחי
pm2 stop zpoto-backend

# Pull הקוד החדש
git pull origin main

# התקנת dependencies (אם נדרש)
npm install

# הרצת בדיקות
npm test -- --testPathPattern=availability-migration

# הפעלת השרת
pm2 start zpoto-backend
pm2 logs zpoto-backend --lines 50
```

#### 2.2 Deploy Frontend
```bash
cd frontend/

# Pull הקוד החדש
git pull origin main

# Build האפליקציה
npm run build

# Deploy לשרת (לפי הסביבה)
# עבור Expo:
expo publish

# עבור web build:
cp -r build/* /var/www/html/
```

#### 2.3 בדיקת תקינות אחרי Deploy
```bash
# בדיקת health check
curl -f http://localhost:3000/api/health

# בדיקת endpoints חדשים
curl -H "Authorization: Bearer ADMIN_TOKEN" \
     -X POST http://localhost:3000/api/admin/migrate-single-parking/1
```

---

### **שלב 3: הרצת המיגרציה** 🔄
**משך צפוי:** 10-30 דקות (תלוי בכמות החניות)

#### 3.1 הרצת הסקריפט (אופציה 1 - מומלצת)
```bash
cd backend/

# הרצת סקריפט המיגרציה
node scripts/migrate-availability-4h-to-3h.js

# מעקב אחר הלוגים
tail -f logs/migration.log
```

#### 3.2 הרצה דרך API (אופציה 2)
```bash
# מיגרציה של כל החניות
curl -H "Authorization: Bearer ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -X POST http://localhost:3000/api/admin/migrate-availability-blocks

# מיגרציה של חניה יחידה (לבדיקה)
curl -H "Authorization: Bearer ADMIN_TOKEN" \
     -X POST http://localhost:3000/api/admin/migrate-single-parking/123
```

#### 3.3 מעקב אחר התקדמות
```bash
# בדיקת לוגי השרת
pm2 logs zpoto-backend --lines 100

# בדיקת מצב בסיס הנתונים
sqlite3 database.db "
SELECT 
  COUNT(*) as total_parkings,
  COUNT(CASE WHEN availability LIKE '%\"4\":%' OR availability LIKE '%\"8\":%' OR availability LIKE '%\"16\":%' OR availability LIKE '%\"20\":%' THEN 1 END) as old_format,
  COUNT(CASE WHEN availability LIKE '%\"3\":%' OR availability LIKE '%\"6\":%' OR availability LIKE '%\"9\":%' THEN 1 END) as new_format
FROM Parking 
WHERE availability IS NOT NULL;
"
```

---

### **שלב 4: בדיקות ואימות** ✅
**משך צפוי:** 15 דקות

#### 4.1 בדיקות אוטומטיות
```bash
# הרצת כל הבדיקות
cd backend/
npm test

# בדיקות ספציפיות למיגרציה
npm test -- --testPathPattern=availability-migration

# בדיקות integration
npm run test:integration
```

#### 4.2 בדיקות ידניות - Backend
```bash
# בדיקת זמינות חניה
curl "http://localhost:3000/api/bookings/availability/123?startDate=2024-01-01T10:00:00Z&endDate=2024-01-01T13:00:00Z"

# בדיקת חיפוש חניות
curl "http://localhost:3000/api/parkings/search?lat=32.0853&lng=34.7818&radius=1000&startDate=2024-01-01T10:00:00Z&endDate=2024-01-01T13:00:00Z"
```

#### 4.3 בדיקות ידניות - Frontend
- [ ] פתיחת מסך זמינות בעלים - וידוא 8 בלוקים
- [ ] יצירת זמינות חדשה - וידוא שמירה נכונה
- [ ] עריכת זמינות קיימת - וידוא מיגרציה אוטומטית
- [ ] חיפוש חניות - וידוא תוצאות נכונות
- [ ] יצירת הזמנה - וידוא validation נכון

#### 4.4 בדיקת נתונים
```sql
-- בדיקת פורמט הנתונים החדש
SELECT 
  id, 
  title, 
  availability,
  CASE 
    WHEN availability LIKE '%"4":%' OR availability LIKE '%"8":%' OR availability LIKE '%"16":%' OR availability LIKE '%"20":%' 
    THEN 'OLD_FORMAT' 
    ELSE 'NEW_FORMAT' 
  END as format_status
FROM Parking 
WHERE availability IS NOT NULL
LIMIT 10;

-- בדיקת סטטיסטיקות
SELECT 
  COUNT(*) as total_with_availability,
  COUNT(CASE WHEN availability LIKE '%"3":%' OR availability LIKE '%"6":%' OR availability LIKE '%"9":%' THEN 1 END) as migrated_count
FROM Parking 
WHERE availability IS NOT NULL;
```

---

## 🔧 פתרון בעיות נפוצות

### בעיה: המיגרציה נכשלת
**פתרון:**
```bash
# בדיקת לוגי שגיאות
pm2 logs zpoto-backend --err --lines 50

# מיגרציה של חניה יחידה לבדיקה
curl -H "Authorization: Bearer ADMIN_TOKEN" \
     -X POST http://localhost:3000/api/admin/migrate-single-parking/1

# בדיקת פורמט JSON
sqlite3 database.db "SELECT id, availability FROM Parking WHERE id = 1;"
```

### בעיה: Frontend לא מציג 8 בלוקים
**פתרון:**
```bash
# בדיקת cache
# נקה cache האפליקציה או עשה hard refresh

# בדיקת קובץ availability.js
grep -n "TIME_BLOCKS" frontend/client/utils/availability.js

# בדיקת build
cd frontend/
npm run build
```

### בעיה: הזמנות לא עובדות
**פתרון:**
```bash
# בדיקת API validation
curl -X POST "http://localhost:3000/api/bookings/validate-slot" \
     -H "Content-Type: application/json" \
     -d '{"parkingId": 1, "startDate": "2024-01-01T10:00:00Z", "endDate": "2024-01-01T13:00:00Z"}'

# בדיקת לוגיקת זמינות
grep -n "Math.floor.*3.*3" backend/src/services/
```

---

## 🔄 תכנית Rollback

במקרה של בעיה קריטית, יש לבצע rollback מיידי:

### שלב 1: עצירת השרת
```bash
pm2 stop zpoto-backend
```

### שלב 2: שחזור קוד ישן
```bash
cd backend/
git checkout HEAD~1  # או commit ספציפי

cd frontend/
git checkout HEAD~1
```

### שלב 3: שחזור בסיס נתונים
```bash
# SQLite
cp /path/to/backup/backup-TIMESTAMP.db /path/to/database.db

# PostgreSQL
psql -h localhost -U username -d database_name < backup-TIMESTAMP.sql
```

### שלב 4: הפעלה מחדש
```bash
pm2 start zpoto-backend
pm2 logs zpoto-backend --lines 50
```

---

## 📊 מדדי הצלחה

### KPIs לבדיקה:
- [ ] **100%** חניות הומרו בהצלחה
- [ ] **0** שגיאות בלוגי השרת
- [ ] **< 3 שניות** זמן תגובה ממוצע
- [ ] **100%** הזמנות חדשות עובדות
- [ ] **100%** מסכי זמינות מציגים 8 בלוקים

### בדיקות לאחר Deploy:
- [ ] יצירת הזמנה חדשה
- [ ] עריכת זמינות בעל חניה
- [ ] חיפוש חניות עם זמנים
- [ ] הארכת הזמנה קיימת
- [ ] מיגרציה אוטומטית בפרונטנד

---

## 📞 אנשי קשר

### במקרה של בעיות:
- **מפתח ראשי:** [שם] - [טלפון]
- **DevOps:** [שם] - [טלפון]
- **מנהל מוצר:** [שם] - [טלפון]

### ערוצי תקשורת:
- **Slack:** #zpoto-tech
- **WhatsApp:** קבוצת מפתחים
- **Email:** tech@zpoto.co.il

---

## 📝 רישום הפעילות

### לוג Deploy:
- [ ] **תאריך ושעה:** ___________
- [ ] **מבצע Deploy:** ___________
- [ ] **גרסת קוד:** ___________
- [ ] **מספר חניות לפני:** ___________
- [ ] **מספר חניות אחרי:** ___________
- [ ] **זמן כולל:** ___________
- [ ] **בעיות שהתגלו:** ___________
- [ ] **פתרונות שיושמו:** ___________

### חתימות:
- **מפתח:** ___________
- **QA:** ___________
- **מנהל מוצר:** ___________

---

**🎉 בהצלחה עם ה-Deploy!**
