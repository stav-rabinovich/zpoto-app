# 🕐 תכנית מתאר - סנכרון שעון מושלם במערכת Zpoto

## 🎯 מטרה עליונה
ליצור סנכרון מושלם בין זמני השרת, בסיס הנתונים והאפליקציה – כדי למנוע טעויות בין שעון ישראל (Asia/Jerusalem) לשעון UTC.

## 🔹 עיקרון פעולה מוגדר
- **Backend + DB:** עובדים תמיד ב-UTC
- **Frontend:** מציג ומקליט לפי Asia/Jerusalem  
- **API:** מקבל ומחזיר תמיד בפורמט ISO עם Z (UTC)
- **אין offset קבוע:** רק אזור זמן אמיתי (Asia/Jerusalem)

## 📋 שלבי התכנית

---

## שלב 1: אוידט וניתוח מצב קיים 🔍

### 1.1 מיפוי נקודות זמן במערכת
- [ ] **1.1.1** סקירת כל השדות עם תאריכים/שעות בDB
  - [ ] בדיקת טבלת `parkings` (availability, createdAt, updatedAt)
  - [ ] בדיקת טבלת `bookings` (startTime, endTime, createdAt)
  - [ ] בדיקת טבלת `users` (createdAt, updatedAt)
  - [ ] רישום סוגי הנתונים ופורמטים קיימים

### 1.2 מיפוי פונקציות זמן בקוד
- [ ] **1.2.1** Backend - זיהוי כל הפונקציות שמטפלות בזמנים
  - [ ] `calculateAvailabilityFromSchedule` (bookings.service.ts)
  - [ ] `isParkingAvailableByOwnerSettings` (parkings.service.ts)
  - [ ] `hasActiveBookings` (parkings.service.ts)
  - [ ] `searchParkings` (parkings.service.ts)
  - [ ] פונקציות יצירה/עדכון של הזמנות

- [ ] **1.2.2** Frontend - זיהוי כל מקומות עיבוד זמנים
  - [ ] רכיבי בחירת תאריך/שעה
  - [ ] הצגת זמינות חניות
  - [ ] הצגת הזמנות קיימות
  - [ ] פילטרים לפי זמן

### 1.3 זיהוי בעיות קיימות
- [ ] **1.3.1** רישום כל הבעיות הידועות
  - [ ] בעיית תצוגה (05:00 במקום 08:00)
  - [ ] בעיות סינון זמינות
  - [ ] התנגשויות הזמנות
  - [ ] בעיות תצוגה בממשק

---

## שלב 2: הכנת תשתית לעבודה עם זמנים 🛠️

### 2.1 הגדרת ספריות וכלים
- [ ] **2.1.1** Backend - הוספת ספריות נדרשות
  - [ ] התקנת `moment-timezone` או `date-fns-tz`
  - [ ] יצירת utility functions לניהול זמנים

- [ ] **2.1.2** Frontend - הוספת ספריות נדרשות
  - [ ] התקנת `moment-timezone` או `date-fns-tz`
  - [ ] יצירת hooks לעבודה עם זמנים

### 2.2 יצירת פונקציות עזר (Utils)
- [ ] **2.2.1** Backend Utils (`/utils/timezone.ts`)
  ```typescript
  // פונקציות לניהול זמנים ב-UTC
  export const toUTC = (localTime: string, timezone = 'Asia/Jerusalem'): Date
  export const fromUTC = (utcTime: Date, timezone = 'Asia/Jerusalem'): string  
  export const isDateInTimezone = (date: Date, timezone = 'Asia/Jerusalem'): boolean
  export const validateTimeRange = (start: Date, end: Date): boolean
  ```

- [ ] **2.2.2** Frontend Utils (`/utils/timezone.js`)
  ```javascript
  // פונקציות לניהול זמנים בצד הלקוח
  export const convertToUTC = (localTime, timezone = 'Asia/Jerusalem')
  export const convertFromUTC = (utcTime, timezone = 'Asia/Jerusalem')
  export const formatForDisplay = (utcTime, format = 'HH:mm')
  export const formatForAPI = (localTime)
  ```

---

## שלב 3: תיקון שכבת הנתונים (Backend) 🗄️

### 3.1 תיקון שירותי בסיס הנתונים
- [ ] **3.1.1** תיקון `bookings.service.ts`
  - [ ] הסרת כל המרות זמן ידניות
  - [ ] שימוש בפונקציות עזר UTC בלבד
  - [ ] תיקון `calculateAvailabilityFromSchedule`
  - [ ] בדיקה שכל החישובים ב-UTC

- [ ] **3.1.2** תיקון `parkings.service.ts`  
  - [ ] תיקון `isParkingAvailableByOwnerSettings`
  - [ ] תיקון `searchParkings`
  - [ ] ודא שכל הזמנים מתקבלים ונשמרים ב-UTC

### 3.2 תיקון API endpoints
- [ ] **3.2.1** תיקון routes לקבלת זמנים
  - [ ] ודא שכל ה-startTime/endTime מתפרשים כ-UTC
  - [ ] הוספת validation לפורמט ISO
  - [ ] הוספת error handling לזמנים לא חוקיים

### 3.3 תיקון לוגיקת זמינות
- [ ] **3.3.1** תיקון חישוב בלוקי זמן
  - [ ] ודא שהבלוקים (0,4,8,12,16,20) מחושבים נכון ב-UTC
  - [ ] תיקון המרות יום השבוע
  - [ ] בדיקת תקינות לכל התרחישים

---

## שלב 4: תיקון שכבת המצגת (Frontend) 📱

### 4.1 תיקון רכיבי בחירת זמן
- [ ] **4.1.1** רכיב בחירת תאריך ושעה
  - [ ] המרה אוטומטית ל-UTC לפני שליחה
  - [ ] הצגה בזמן ישראל למשתמש
  - [ ] validation של טווחי זמן

- [ ] **4.1.2** רכיב הגדרת זמינות (בעלי חניות)
  - [ ] המרת בלוקי זמן ל-UTC
  - [ ] הצגה נכונה של שעות זמינות
  - [ ] שמירה נכונה במסד הנתונים

### 4.2 תיקון הצגת זמנים
- [ ] **4.2.1** הצגת זמינות חניות
  - [ ] המרה מ-UTC לתצוגה בישראל
  - [ ] הצגה נכונה של שעות פנויות
  - [ ] סנכרון עם חיפוש

- [ ] **4.2.2** הצגת הזמנות
  - [ ] תצוגה נכונה של זמני הזמנות
  - [ ] חישוב נכון של זמן שנותר
  - [ ] הצגת היסטוריית הזמנות

### 4.3 תיקון חיפוש חניות
- [ ] **4.3.1** רכיב החיפוש
  - [ ] המרת זמני חיפוש ל-UTC
  - [ ] סינון נכון לפי זמינות
  - [ ] תצוגה נכונה של תוצאות

---

## שלב 5: בדיקות ו-QA מקיפות 🧪

### 5.1 בדיקות יחידה (Unit Tests)
- [ ] **5.1.1** בדיקות פונקציות עזר
  - [ ] בדיקת המרות UTC ↔ Asia/Jerusalem
  - [ ] בדיקת חישוב בלוקי זמן
  - [ ] ה validation פורמטים

- [ ] **5.1.2** בדיקות לוגיקה עסקית
  - [ ] בדיקת זמינות חניות
  - [ ] בדיקת התנגשויות הזמנות
  - [ ] בדיקת חיפוש וסינון

### 5.2 בדיקות אינטגרציה
- [ ] **5.2.1** בדיקות API
  - [ ] בדיקת עדכון זמינות → חיפוש → הזמנה
  - [ ] בדיקת סנכרון Frontend ↔ Backend
  - [ ] בדיקת edge cases (מעבר שעון קיץ/חורף)

### 5.3 בדיקות משתמש קצה (E2E)
- [ ] **5.3.1** זרימות מלאות
  - [ ] בעל חניה מגדיר זמינות
  - [ ] מחפש חניה מוצא ומזמין
  - [ ] הצגה נכונה בכל השלבים

---

## שלב 6: תיעוד ופריסה 📚

### 6.1 תיעוד טכני
- [ ] **6.1.1** עדכון תיעוד API
  - [ ] תיעוד פורמטי זמן נדרשים
  - [ ] דוגמאות לקריאות API
  - [ ] תיעוד error codes

- [ ] **6.1.2** תיעוד למפתחים
  - [ ] מדריך עבודה עם זמנים במערכת
  - [ ] best practices
  - [ ] troubleshooting נפוץ

### 6.2 פריסה מדורגת
- [ ] **6.2.1** פריסת שלב ראשון (Backend)
  - [ ] פריסה בסביבת בדיקות
  - [ ] מעקב אחר לוגים ו-metrics
  - [ ] אישור תקינות

- [ ] **6.2.2** פריסת שלב שני (Frontend)
  - [ ] פריסה בסביבת בדיקות
  - [ ] בדיקות משתמש
  - [ ] פריסה לייצור

---

## 🚨 כללי עבודה חשובים

### עקרונות ביצוע:
1. **אל תשבור פונקציונליות קיימת** - כל שינוי עם backward compatibility
2. **עבוד מסודר** - שלב אחר שלב, לא הכל ביחד
3. **תמיד עם בדיקות** - כל שינוי עם unit test
4. **לוגים מפורטים** - למעקב ודיבוג

### דוגמאות קוד נכונות:

**Backend (UTC only):**
```typescript
// ✅ נכון
const startTime = new Date(req.body.startTime); // מקבל UTC מהפרונטאנד
const endTime = new Date(req.body.endTime);     // מקבל UTC מהפרונטאנד

// ❌ לא נכון
const israelOffset = 3;
const startTimeIsrael = new Date(startTime.getTime() + (israelOffset * 60 * 60 * 1000));
```

**Frontend (המרה לפני שליחה):**
```javascript
// ✅ נכון
const utcStart = moment.tz("2025-10-26 09:00", "Asia/Jerusalem").utc().toISOString();
fetch('/api/parkings/search', {
  body: JSON.stringify({ startTime: utcStart })
});

// ❌ לא נכון  
const localStart = "2025-10-26 09:00";
fetch('/api/parkings/search', {
  body: JSON.stringify({ startTime: localStart })
});
```

## 📊 מדדי הצלחה
- [ ] 100% מהזמנים מסונכרנים בין שכבות
- [ ] 0 טעויות תצוגה של שעות
- [ ] 0 התנגשויות הזמנות שגויות
- [ ] זמן תגובה API ללא השפעה
- [ ] כיסוי בדיקות >90%

---

## 🎯 סיכום
תכנית זו מבטיחה סנכרון מושלם של זמנים במערכת Zpoto, תוך שמירה על פונקציונליות קיימת ושיפור האמינות והדיוק של המערכת.

**התחל מהשלב הראשון - אוידט מצב קיים, וקדם שלב אחר שלב!** 🚀
