# 🧪 בדיקת פונקציות עזר זמן - Zpoto

## 📊 מטרת הבדיקה
וידוא שפונקציות העזר עובדות נכון עם המרות UTC ↔ Asia/Jerusalem

---

## 🗄️ בדיקות Backend Utils

### בדיקה 1: המרה בסיסית
```typescript
import { toUTC, fromUTC, formatIsraelTime } from '../utils/timezone';

// דוגמה: בעל חניה מגדיר זמינות עד 08:00 בבוקר (זמן ישראל)
const israelMorning = '2025-10-27T08:00:00'; // 08:00 בזמן ישראל
const utcTime = toUTC(israelMorning);
console.log('UTC:', utcTime.toISOString()); // צפוי: 2025-10-27T05:00:00.000Z (בחורף)

const backToIsrael = fromUTC(utcTime);
const displayTime = formatIsraelTime(utcTime, 'HH:mm');
console.log('Back to Israel:', displayTime); // צפוי: 08:00
```

### בדיקה 2: יום השבוע ושעה
```typescript
import { getIsraelDayOfWeek, getIsraelHour } from '../utils/timezone';

// בדיקה: יום שני 10:30 בזמן ישראל
const mondayMorning = toUTC('2025-10-27T10:30:00'); // יום שני
const dayOfWeek = getIsraelDayOfWeek(mondayMorning);
const hour = getIsraelHour(mondayMorning);

console.log('Day of week:', dayOfWeek); // צפוי: 1 (שני)
console.log('Hour:', hour); // צפוי: 10
```

### בדיקה 3: יצירת תאריך ישראלי
```typescript
import { createIsraelDate } from '../utils/timezone';

// יצירת 27/10/2025 10:30 בזמן ישראל
const israelDate = createIsraelDate(2025, 9, 27, 10, 30); // חודש 9 = אוקטובר
console.log('Created date UTC:', israelDate.toISOString());
console.log('Display:', formatIsraelTime(israelDate, 'yyyy-MM-dd HH:mm'));
```

---

## 📱 בדיקות Frontend Utils

### בדיקה 1: המרה לפני שליחה לשרת
```javascript
import { convertToUTC, formatForAPI } from '../utils/timezone';

// משתמש בוחר 27/10/2025 10:30 בזמן ישראל
const userSelection = new Date(2025, 9, 27, 10, 30); // זמן ישראל
const forAPI = formatForAPI(userSelection);
console.log('For API:', forAPI); // צפוי: 2025-10-27T07:30:00.000Z
```

### בדיקה 2: המרה אחרי קבלה מהשרת
```javascript
import { convertFromUTC, formatForDisplay } from '../utils/timezone';

// תגובה מהשרת (UTC)
const serverResponse = '2025-10-27T07:30:00.000Z';
const forDisplay = formatForDisplay(serverResponse, 'HH:mm');
console.log('For display:', forDisplay); // צפוי: 10:30
```

### בדיקה 3: חיפוש מיידי
```javascript
import { createImmediateSearchTimes } from '../utils/timezone';

// חיפוש מיידי לשעתיים
const searchTimes = createImmediateSearchTimes(2);
console.log('Search times:', {
  startUTC: searchTimes.startTime,
  endUTC: searchTimes.endTime,
  startDisplay: formatForDisplay(searchTimes.startTime),
  endDisplay: formatForDisplay(searchTimes.endTime)
});
```

---

## 🔍 תרחישי בדיקה קריטיים

### תרחיש 1: החניה בקרן קיימת לישראל
```javascript
// הגדרת זמינות בעל החניה (JSON)
const availability = {
  "monday": [0, 4, 8], // זמין 00:00-12:00
  "tuesday": [0, 4, 8, 12, 16, 20]
};

// חיפוש משתמש: יום שני 10:30-11:30
const searchStart = createIsraelDate(2025, 9, 27, 10, 30); // יום שני 10:30
const searchEnd = createIsraelDate(2025, 9, 27, 11, 30);   // יום שני 11:30

// בדיקה: האם השעה 10:30 נכללת בבלוק 8 (08:00-12:00)?
const startHour = getIsraelHour(searchStart); // צפוי: 10
const blockStart = Math.floor(startHour / 4) * 4; // צפוי: 8
const isAvailable = availability.monday.includes(blockStart); // צפוי: true

console.log('Search test:', {
  searchHour: startHour,
  block: blockStart,
  available: isAvailable
});
```

### תרחיש 2: מעבר שעון קיץ/חורף
```javascript
// בדיקה בחורף (UTC+2)
const winterTime = createIsraelDate(2025, 0, 15, 10, 0); // 15 ינואר 10:00
console.log('Winter UTC:', winterTime.toISOString()); // צפוי: 08:00 UTC

// בדיקה בקיץ (UTC+3) 
const summerTime = createIsraelDate(2025, 6, 15, 10, 0); // 15 יולי 10:00
console.log('Summer UTC:', summerTime.toISOString()); // צפוי: 07:00 UTC
```

### תרחיש 3: זמנים על גבול ימים
```javascript
// בדיקה: 23:30 יום א' -> 01:30 יום ב'
const sundayNight = createIsraelDate(2025, 9, 26, 23, 30); // יום א' 23:30
const mondayMorning = createIsraelDate(2025, 9, 27, 1, 30); // יום ב' 01:30

const sundayDay = getIsraelDayOfWeek(sundayNight); // צפוי: 0 (ראשון)
const mondayDay = getIsraelDayOfWeek(mondayMorning); // צפוי: 1 (שני)

console.log('Day boundary test:', {
  sundayDay,
  mondayDay,
  sundayUTC: sundayNight.toISOString(),
  mondayUTC: mondayMorning.toISOString()
});
```

---

## 🚀 הרצת הבדיקות

### Backend Test
```bash
cd /Users/stavrabinovich/Desktop/Zpoto-app/backend
node -e "
const { toUTC, fromUTC, formatIsraelTime, createIsraelDate, getIsraelHour } = require('./src/utils/timezone.ts');

console.log('🧪 Testing Backend Utils...');

// בדיקה בסיסית
const testTime = createIsraelDate(2025, 9, 27, 10, 30);
console.log('Test time UTC:', testTime.toISOString());
console.log('Display:', formatIsraelTime(testTime, 'HH:mm'));
console.log('Hour:', getIsraelHour(testTime));

console.log('✅ Backend tests completed');
"
```

### Frontend Test  
```bash
cd /Users/stavrabinovich/Desktop/Zpoto-app/frontend/client
node -e "
const { formatForAPI, formatForDisplay, createImmediateSearchTimes } = require('./utils/timezone.js');

console.log('🧪 Testing Frontend Utils...');

// בדיקה בסיסית
const now = new Date();
const forAPI = formatForAPI(now);
const forDisplay = formatForDisplay(forAPI);

console.log('Now for API:', forAPI);
console.log('Back for display:', forDisplay);

console.log('✅ Frontend tests completed');
"
```

---

## 📋 רשימת בדיקות

### ✅ בדיקות שהושלמו
- [ ] המרה בסיסית UTC ↔ Israel
- [ ] יום השבוע ושעה בזמן ישראל  
- [ ] יצירת תאריכים ישראליים
- [ ] פורמט לAPI ולתצוגה
- [ ] חיפוש מיידי ועתידי
- [ ] תרחיש החניה בקרן קיימת
- [ ] מעבר שעון קיץ/חורף
- [ ] זמנים על גבול ימים

### 🎯 קריטריוני הצלחה
1. **המרה נכונה:** 10:30 Israel → 07:30 UTC (קיץ) או 08:30 UTC (חורף)
2. **יום נכון:** יום שני בישראל = יום שני ב-UTC (לא יום ראשון)
3. **בלוק נכון:** שעה 10:30 → בלוק 8 (08:00-12:00)
4. **זמינות נכונה:** בלוק 8 ביום שני = זמין ✅

---

## 🚨 בעיות צפויות ופתרונות

### בעיה 1: שגיאת import ב-Node.js
```bash
# פתרון: השתמש ב-ts-node או babel
npm install -g ts-node
ts-node -e "import { toUTC } from './src/utils/timezone'; console.log(toUTC('2025-10-27T10:00:00'));"
```

### בעיה 2: אזור זמן לא זוהה
```javascript
// פתרון: וידוא שהספרייה מותקנת
npm install date-fns date-fns-tz
```

### בעיה 3: תוצאות לא צפויות
```javascript
// השתמש בפונקציית debugTime
import { debugTime } from './utils/timezone';
debugTime(someDate, 'Problematic time');
```

**🎯 אחרי שכל הבדיקות עוברות - נוכל לעבור לשלב 3: תיקון שירותי Backend!**
