# 🚗 מדריך בדיקת Zpoto - MVP Phase 1

## מצב נוכחי של השרתים

### ✅ שרתים שרצים:
1. **Backend API**: http://localhost:4000
2. **Admin Panel**: http://localhost:5173

---

## 📱 שלב 1: הפעלת האפליקציה (Expo)

### פתח טרמינל חדש והרץ:

```bash
cd /Users/stavrabinovich/Desktop/Zpoto-app/frontend/client
npm start
```

או אם אתה רוצה להריץ ישירות על סימולטור:

```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android
```

### אם Expo מתלונן על dependencies חסרים:
```bash
npm install
```

---

## 🧪 תרחיש בדיקה מלא

### **תרחיש 1: משתמש רגיל מבקש להיות בעל חניה**

#### 1️⃣ באפליקציה (Expo):

1. **פתח את האפליקציה** - תראה את מסך ה-Home
2. **לחץ על כפתור "בעל חניה"** או נווט ל-`OwnerIntro`
3. **הירשם/התחבר**:
   - אם אין לך משתמש: לחץ "הירשם"
   - מלא אימייל: `owner1@test.com`
   - סיסמה: `123456`
   - לחץ "הירשם"

4. **הגש בקשה להיות בעל חניה**:
   - נווט ל-`OwnerListingForm`
   - מלא פרטים:
     - **כותרת**: "חניה בתל אביב"
     - **כתובת**: "רחוב דיזנגוף 100"
     - **מחיר לשעה**: 15
     - **מיקום**: lat: 32.0853, lng: 34.7818 (תל אביב)
   - שלח את הבקשה

5. **בדוק סטטוס**:
   - נווט ל-`OwnerPending`
   - תראה את הבקשה שלך עם סטטוס "PENDING"

---

#### 2️⃣ בפאנל Admin (דפדפן):

1. **פתח דפדפן**: http://localhost:5173

2. **התחבר כאדמין**:
   - **אימייל**: `admin@zpoto.com`
   - **סיסמה**: `admin123`

3. **אשר את הבקשה**:
   - תראה את הבקשה של `owner1@test.com`
   - לחץ על כפתור "אשר" (ירוק)
   - הבקשה תשתנה לסטטוס "APPROVED"

---

#### 3️⃣ חזרה לאפליקציה:

1. **רענן את מסך ההמתנה** (`OwnerPending`)
   - תראה שהסטטוס השתנה ל-"APPROVED"

2. **נווט ל-Dashboard** (`OwnerDashboard`)
   - תראה את החניה שלך מופיעה ברשימה
   - תוכל לערוך אותה (שנה מחיר, כתובת וכו')

3. **צפה בסטטיסטיקות** (`OwnerOverview`)
   - תראה כמה חניות יש לך
   - כמה הזמנות קיבלת
   - הכנסות (אם יש)

---

### **תרחיש 2: משתמש מחפש חניה**

#### באפליקציה:

1. **התחבר כמשתמש אחר**:
   - התנתק מהמשתמש הנוכחי
   - הירשם עם: `user1@test.com` / `123456`

2. **חפש חניה**:
   - במסך הבית, השתמש בחיפוש
   - או נווט ל-`SearchResults`
   - תראה את החניה שיצרת קודם

3. **הזמן חניה**:
   - לחץ על החניה
   - בחר תאריכים ושעות
   - אשר את ההזמנה

4. **צפה בהזמנות שלך**:
   - נווט ל-`Bookings`
   - תראה את ההזמנה עם סטטוס "PENDING"

---

## 🔧 בדיקות API ידניות (אופציונלי)

אם אתה רוצה לבדוק את ה-API ישירות:

### 1. הרשמה:
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
```

### 2. התחברות:
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
```
**שמור את ה-token שמוחזר!**

### 3. הגשת בקשה (צריך token):
```bash
curl -X POST http://localhost:4000/api/owner/listing-requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "חניה בירושלים",
    "address": "רחוב יפו 1",
    "lat": 31.7683,
    "lng": 35.2137,
    "priceHr": 20,
    "description": "חניה נוחה במרכז העיר"
  }'
```

### 4. רשימת בקשות (Admin):
```bash
# קודם התחבר כאדמין וקבל token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@zpoto.com","password":"admin123"}'

# אז שלוף את הבקשות
curl http://localhost:4000/api/admin/listing-requests \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

### 5. אישור בקשה:
```bash
curl -X POST http://localhost:4000/api/admin/listing-requests/1/approve \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

### 6. חיפוש חניות:
```bash
# חיפוש בתל אביב ברדיוס 5 ק"מ
curl "http://localhost:4000/api/parkings/search?lat=32.0853&lng=34.7818&radius=5"
```

---

## 🐛 פתרון בעיות נפוצות

### האפליקציה לא מתחברת לשרת:
- **ב-iOS Simulator**: השתמש ב-`http://localhost:4000`
- **ב-Android Emulator**: שנה ל-`http://10.0.2.2:4000`
- **במכשיר פיזי**: שנה ל-IP של המחשב שלך (למשל `http://192.168.1.100:4000`)

### איך לשנות את כתובת השרת באפליקציה:
ערוך את הקובץ: `/frontend/client/consts.js`
```javascript
const API_BASE = 'http://YOUR_IP:4000';
```

### השרת לא רץ:
```bash
cd /Users/stavrabinovich/Desktop/Zpoto-app/backend
npm run dev
```

### פאנל Admin לא רץ:
```bash
cd /Users/stavrabinovich/Desktop/Zpoto-app/frontend/admin
npm run dev
```

---

## 📊 מה לבדוק בכל שלב:

### ✅ Backend:
- [x] הרשמה והתחברות עובדים
- [x] הגשת בקשה שומרת בDB
- [x] אדמין יכול לאשר/לדחות
- [x] חיפוש חניות עובד
- [x] יצירת הזמנות עובדת

### ✅ Admin Panel:
- [x] התחברות כאדמין
- [x] רשימת בקשות מוצגת
- [x] אישור/דחייה עובדים
- [x] סטטוס מתעדכן בזמן אמת

### ⏳ Mobile App (צריך חיבור):
- [ ] התחברות/הרשמה
- [ ] הגשת בקשה
- [ ] צפייה בסטטוס
- [ ] ניהול חניות
- [ ] חיפוש והזמנה

---

## 🎯 הצעדים הבאים (אחרי הבדיקה):

1. **חבר את מסכי Owner** - כדי שהאפליקציה תקרא מה-API
2. **חבר חיפוש והזמנות** - כדי שמשתמשים יוכלו למצוא ולהזמין
3. **הוסף תמונות** - העלאה לחניות
4. **התראות Push** - עדכונים על אישורים והזמנות

---

## 💡 טיפים:

- **Expo DevTools**: לחץ על `m` בטרמינל כדי לפתוח תפריט
- **Reload**: לחץ על `r` כדי לרענן את האפליקציה
- **Debug**: לחץ על `j` כדי לפתוח debugger
- **Console Logs**: יופיעו בטרמינל של Expo

---

**בהצלחה! 🚀**

אם משהו לא עובד - תגיד לי ואני אתקן!
