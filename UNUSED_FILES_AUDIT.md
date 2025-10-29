# 🗂️ בדיקת קבצים לא בשימוש - Zpoto Refactor

**תאריך:** 2025-10-29  
**שיטה:** בדיקה ידנית (ts-prune דרש tsconfig.json)

## 🎯 Frontend Client

### ⚠️ לבדיקה נוספת:
- `services/fallback-old.js` - שירות fallback ישן, ייתכן שלא בשימוש
- `screens/MigrationTestScreen.js` - מסך בדיקות migration, ייתכן שזמני
- `utils/deviceId.test.js` - קובץ בדיקות

### ✅ בשימוש (נראה):
- כל שאר הקבצים נראים פעילים

## 🎯 Backend

### ❌ קבצים זמניים למחיקה:
- `check-admin.js` - סקריפט debug
- `check-all-users.js` - סקריפט debug  
- `check-existing-bookings.js` - סקריפט debug
- `check-parkings.js` - סקריפט debug
- `clear-bookings.js` - סקריפט debug
- `create-admin.js` - סקריפט debug
- `debug-users.ts` - סקריפט debug
- `debug_parking.js` - סקריפט debug
- `delete-booking-11.js` - סקריפט debug ספציפי
- `delete-booking.js` - סקריפט debug
- `fix-user.js` - סקריפט debug
- `test-availability.js` - בדיקה זמנית
- `test-pricing-api.js` - בדיקה זמנית  
- `test-pricing-function.js` - בדיקה זמנית

### ⚠️ קבצים ריקים:
- `backup_20251011_195446.db` - גיבוי ריק
- `dayAgo` - קובץ ריק
- `dev.db` - DB ריק

### ⚠️ תיקיות ריקות:
- `scripts/` - תיקייה ריקה

### ✅ לשמירה:
- `tests/` - בדיקות integration רשמיות
- `dist/` - קבצים מקומפלים
- `docs/` - תיעוד
- `prisma/` - schema ו-migrations
- `src/` - קוד מקור
- `zpoto-files/` - קבצי מערכת

## 🎯 Frontend Admin

### ✅ נקי:
- לא נמצאו קבצים חשודים

## 📊 סיכום:

### 📈 סטטיסטיקות:
- **Backend:** ~15 קבצי debug/test זמניים למחיקה
- **Frontend Client:** 2-3 קבצים לבדיקה נוספת
- **Frontend Admin:** נקי

### 🎯 פעולות מומלצות:

#### ✅ בדיקה נוספת נדרשת:
1. לוודא שהקבצים הבאים לא בשימוש:
   - `services/fallback-old.js`
   - `screens/MigrationTestScreen.js`
   - `utils/deviceId.test.js`

#### ❌ למחיקה מיידית:
```bash
# Backend - קבצי debug
rm check-*.js debug-*.js debug_*.js delete-*.js fix-*.js test-*.js
rm backup_*.db dayAgo dev.db
rmdir scripts
```

#### 📁 ארגון מחדש:
- להעביר בדיקות רשמיות לתיקיית `tests/`
- לרכז סקריפטים שימושיים בתיקיית `scripts/`
