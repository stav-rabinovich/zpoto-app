# 🚗 Zpoto - פלטפורמת שיתוף חניות

## 📖 תיאור הפרויקט

Zpoto היא פלטפורמה חדשנית המאפשרת לבעלי חניות פרטיות להשכיר את החניות שלהם למחפשי חניה. המערכת כוללת אפליקציית מובייל ללקוחות, ממשק ניהול לבעלי חניות, ופאנל אדמין למנהלי המערכת.

## 🏗️ ארכיטקטורת המערכת

### Backend
- **Framework:** Node.js + Express + TypeScript
- **Database:** SQLite + Prisma ORM
- **Authentication:** JWT + bcrypt
- **API:** RESTful API עם middleware לאבטחה

### Frontend
- **Mobile App:** React Native + Expo
- **Admin Panel:** React + Vite + TypeScript
- **State Management:** Context API
- **UI Components:** Custom components + Shopify Restyle

### Database Schema
- **Users:** משתמשים (לקוחות + בעלי חניות + אדמינים)
- **Parkings:** חניות עם מיקום, מחיר וזמינות
- **Bookings:** הזמנות עם סטטוס ותשלום
- **ListingRequests:** בקשות רישום בעלי חניות

## 🚀 התקנה והרצה

### דרישות מקדימות
- Node.js 18+
- npm או yarn
- Expo CLI (לאפליקציית המובייל)

### התקנת Backend
```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npx prisma generate
npm run dev
```

### התקנת Admin Panel
```bash
cd frontend/admin
npm install
npm run dev
```

### התקנת Mobile App
```bash
cd frontend/client
npm install
npx expo start
```

## 🔧 הגדרת Environment

### Backend (.env)
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
PORT=4000
```

### Admin Panel (.env)
```
VITE_API_URL=http://localhost:4000
```

## 📱 תכונות עיקריות

### לקוחות (Mobile App)
- 🔍 **חיפוש חניות** לפי מיקום ותאריכים
- 📍 **מפה אינטראקטיבית** עם חניות זמינות
- 💳 **הזמנה ותשלום** מאובטח
- ⭐ **דירוגים וביקורות** של חניות
- 📱 **ניהול הזמנות** - פעילות והיסטוריה
- 🔔 **התראות** על הזמנות וזמני תפוגה

### בעלי חניות (Mobile App)
- 📋 **הגשת בקשה** להצטרפות למערכת
- 🏠 **ממשק ניהול** לחניות ולהזמנות
- 💰 **ניהול מחירים** וזמינות
- 📊 **דוחות הכנסות** וסטטיסטיקות
- ⚙️ **הגדרות אישיות** ועדיפות

### מנהלי מערכת (Admin Panel)
- 👥 **ניהול משתמשים** וחסימות
- 🏗️ **ניהול חניות** ואישורים
- 📋 **אישור בקשות** בעלי חניות חדשים
- 📊 **דוחות ואנליטיקס** מפורטים
- 🔧 **כלי תחזוקה** ומעקב מערכת

## 🔐 מערכת אבטחה

### Authentication & Authorization
- **JWT Tokens** לאימות משתמשים
- **Role-based access** (USER, OWNER, ADMIN)
- **Password hashing** עם bcrypt
- **Middleware protection** לכל ה-APIs

### מערכת חסימות
- **חסימת משתמשים** על ידי אדמין
- **זריקה אוטומטית** ממסכי ניהול
- **השבתת חניות** של משתמשים חסומים
- **הסרה מחיפוש** אוטומטית

## 📊 API Documentation

### Authentication Endpoints
```
POST /api/auth/login - התחברות
POST /api/auth/register - הרשמה
POST /api/auth/logout - התנתקות
```

### Owner Endpoints
```
GET /api/owner/parkings - רשימת חניות
POST /api/owner/parkings - יצירת חניה חדשה
GET /api/owner/bookings - הזמנות בעלי חניה
PATCH /api/owner/bookings/:id/status - עדכון סטטוס הזמנה
```

### Admin Endpoints
```
GET /api/admin/users - רשימת משתמשים
PATCH /api/admin/users/:id/block - חסימת משתמש
GET /api/admin/listing-requests - בקשות בעלי חניה
PATCH /api/admin/listing-requests/:id - אישור/דחיית בקשה
```

## 🗂️ מבנה הפרויקט

```
zpoto-app/
├── backend/                 # שרת Node.js
│   ├── src/
│   │   ├── routes/         # נתיבי API
│   │   ├── middlewares/    # middleware functions
│   │   ├── services/       # לוגיקה עסקית
│   │   └── utils/          # כלי עזר
│   ├── prisma/             # סכמת בסיס נתונים
│   └── package.json
├── frontend/
│   ├── client/             # אפליקציית React Native
│   │   ├── screens/        # מסכי האפליקציה
│   │   ├── components/     # רכיבים משותפים
│   │   ├── services/       # קריאות API
│   │   └── contexts/       # Context providers
│   └── admin/              # פאנל אדמין React
│       ├── src/
│       │   ├── components/ # רכיבי UI
│       │   ├── pages/      # דפי הממשק
│       │   └── services/   # API calls
│       └── package.json
├── docs/                   # תיעוד ומדריכים
│   ├── OWNER_USER_GUIDE.md
│   ├── ADMIN_USER_GUIDE.md
│   └── API_DOCS.md
└── README.md
```

## 🧪 בדיקות

### הרצת בדיקות Backend
```bash
cd backend
npm test
```

### בדיקות ידניות
- **Mobile App:** Expo Go או אמולטור
- **Admin Panel:** דפדפן בכתובת localhost:5173
- **API:** Postman או כלי דומה

## 🚀 פריסה לפרודקשן

### הכנת Backend
```bash
npm run build
npm start
```

### הכנת Admin Panel
```bash
npm run build
# העלה את תיקיית dist לשרת
```

### הכנת Mobile App
```bash
npx expo build:android
npx expo build:ios
```

## 📚 מדריכים ותיעוד

- **[מדריך בעלי חניות](./OWNER_USER_GUIDE.md)** - הוראות שימוש לבעלי חניות
- **[מדריך מנהלי מערכת](./ADMIN_USER_GUIDE.md)** - ניהול המערכת
- **[תיעוד API](./API_DOCS.md)** - מדריך מפתחים
- **[מדריך פריסה](./DEPLOYMENT_GUIDE.md)** - הוראות פריסה

## 🤝 תרומה לפרויקט

1. **Fork** את הפרויקט
2. **צור branch** חדש (`git checkout -b feature/amazing-feature`)
3. **Commit** את השינויים (`git commit -m 'Add amazing feature'`)
4. **Push** ל-branch (`git push origin feature/amazing-feature`)
5. **פתח Pull Request**

## 📄 רישיון

הפרויקט מוגן בזכויות יוצרים. כל הזכויות שמורות.

## 📞 יצירת קשר

- **אימייל:** support@zpoto.co.il
- **טלפון:** 03-1234567
- **אתר:** https://zpoto.co.il

---

**גרסה:** 1.0.0  
**עדכון אחרון:** אוקטובר 2024
