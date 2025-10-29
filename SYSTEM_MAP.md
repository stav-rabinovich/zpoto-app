# 🗺️ מפת מערכת זפוטו - System Map

**תאריך:** 2025-10-29  
**גרסה:** 1.0  
**מטרה:** מיפוי מלא של המערכת הקיימת

---

## 🏗️ ארכיטקטורה כללית

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Frontend      │    │   Backend       │
│   Client        │◄──►│   Admin         │◄──►│   API Server    │
│   (React Native)│    │   (React Web)   │    │   (Node.js)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AsyncStorage  │    │   LocalStorage  │    │   PostgreSQL    │
│   (Mobile)      │    │   (Browser)     │    │   (Prisma ORM)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🎯 Frontend Client (React Native)

### 📱 מסכים עיקריים:
- **HomeScreen.js** (51KB) - מסך בית עם חיפוש וניווט
- **SearchResultsScreen.js** (67KB) - תוצאות חיפוש חניות
- **BookingScreen.js** (66KB) - יצירת הזמנה חדשה
- **PaymentScreen.js** (44KB) - תשלום והזמנה
- **ProfileScreen.js** (37KB) - פרופיל משתמש

### 👤 מסכי בעלי חניה:
- **OwnerIntroScreen.js** (32KB) - מבוא ורישום בעלי חניה
- **OwnerDashboardScreen.js** (14KB) - דשבורד בעל חניה
- **OwnerPendingScreen.js** (21KB) - הזמנות ממתינות לאישור
- **OwnerAvailabilityScreen.js** (17KB) - ניהול זמינות
- **OwnerAnalyticsScreen.js** (13KB) - אנליטיקה והכנסות

### 📋 מסכי ניהול:
- **BookingsScreen.js** (13KB) - רשימת הזמנות
- **BookingDetailScreen.js** (10KB) - פרטי הזמנה
- **FavoritesScreen.js** (10KB) - מועדפים
- **NotificationsScreen.js** (12KB) - התראות

### 🔧 מסכי מערכת:
- **LoginScreen.js** (9KB) - התחברות
- **RegisterScreen.js** (7KB) - רישום
- **MigrationScreen.js** (12KB) - העברת נתונים
- **DebugScreen.js** (13KB) - כלי debug

### ⚠️ מסכים זמניים/ישנים:
- **MigrationTestScreen.js** (16KB) - בדיקות migration
- **LegacyCleanupScreen.js** (15KB) - ניקוי נתונים ישנים
- **ServerOnly*** - מסכים לגרסה server-only

---

## 🖥️ Backend API (Node.js + Express)

### 🛣️ Routes עיקריים:

#### 👤 Authentication & Users:
- **auth.routes.ts** (4KB) - התחברות ורישום
- **profile.routes.ts** (9KB) - ניהול פרופיל
- **anonymous.routes.ts** (17KB) - APIs למשתמשים אורחים

#### 🚗 Parking & Bookings:
- **parkings.routes.ts** (4KB) - חיפוש וניהול חניות
- **bookings.routes.ts** (19KB) - יצירת וניהול הזמנות
- **extensions.routes.ts** (3KB) - הארכת חניות
- **payments.routes.ts** (7KB) - תשלומים

#### 🏠 Owner Management:
- **owner.routes.ts** (21KB) - ניהול בעלי חניה
- **commission.routes.ts** (9KB) - חישוב עמלות
- **operationalFees.routes.ts** (2KB) - דמי תפעול

#### 🎫 Features:
- **coupons.routes.ts** (2KB) - מערכת קופונים
- **favorites.routes.ts** (5KB) - מועדפים
- **saved-places.routes.ts** (5KB) - מקומות שמורים
- **recent-searches.routes.ts** (4KB) - חיפושים אחרונים
- **vehicles.routes.ts** (5KB) - ניהול רכבים

#### 🔧 Admin & System:
- **admin.routes.ts** (35KB) - ממשק אדמין מלא
- **migration.routes.ts** (12KB) - העברת נתונים
- **notifications.routes.ts** (3KB) - התראות
- **documents.routes.ts** (19KB) - ניהול מסמכים
- **jobs.routes.ts** (4KB) - משימות רקע

#### 🛠️ Utilities:
- **public.routes.ts** (2KB) - APIs ציבוריים
- **quick-fix.routes.ts** (4KB) - תיקונים מהירים
- **payment-methods.routes.ts** (6KB) - אמצעי תשלום
- **chat.routes.ts** (1KB) - צ'אט (לא פעיל?)

---

## 🗄️ מסד נתונים (PostgreSQL + Prisma)

### 📊 טבלאות עיקריות:
- **User** - משתמשים (לקוחות ובעלי חניה)
- **Parking** - חניות
- **Booking** - הזמנות
- **Commission** - עמלות
- **OperationalFee** - דמי תפעול
- **Coupon** / **CouponUsage** - מערכת קופונים
- **Vehicle** - רכבים
- **Favorite** - מועדפים
- **SavedPlace** - מקומות שמורים
- **RecentSearch** - חיפושים אחרונים
- **Notification** - התראות
- **ListingRequest** - בקשות רישום בעלי חניה

---

## 🌐 Frontend Admin (React Web)

### 📊 דפים עיקריים:
- **Dashboard.jsx** - דשבורד ראשי עם סטטיסטיקות
- **DashboardNew.jsx** - דשבורד מחודש
- **CouponsSection.jsx** - ניהול קופונים
- **SignaturePage.jsx** - חתימות דיגיטליות

---

## 🔄 זרימת נתונים עיקרית

### 1. חיפוש חניה:
```
HomeScreen → SearchResultsScreen → BookingScreen → PaymentScreen
     ↓              ↓                    ↓             ↓
/api/parkings  /api/bookings    /api/bookings   /api/payments
   /search     /availability      /create       /process
```

### 2. ניהול הזמנות:
```
BookingsScreen → BookingDetailScreen → Extensions/Cancellation
      ↓                ↓                        ↓
/api/bookings    /api/bookings/:id    /api/extensions/execute
```

### 3. בעל חניה:
```
OwnerIntroScreen → OwnerDashboardScreen → OwnerPendingScreen
       ↓                  ↓                     ↓
/api/owner/apply   /api/owner/stats    /api/bookings/pending
```

---

## ⚠️ נקודות בעייתיות שזוהו

### 🔴 קבצים זמניים:
- ~15 קבצי debug בbackend
- מסכי MigrationTest ו-LegacyCleanup
- קבצי fallback-old

### 🟡 תלותים לא בשימוש:
- expo-file-system, expo-image-picker
- react-native-reanimated
- @react-navigation/native-stack

### 🟠 תלותים חסרים:
- @expo/vector-icons
- @react-native-netinfo/netinfo
- supertest (backend tests)
- react-router-dom (admin)

### 🔵 כפילויות אפשריות:
- BookingDetailScreen vs BookingDetailScreenNew
- ServerOnly* screens מול regular screens
- Dashboard vs DashboardNew

---

## 📈 סטטיסטיקות

| רכיב | קבצים | גודל כולל | הערות |
|------|-------|-----------|-------|
| Frontend Client | 38 screens | ~500KB | כולל מסכים זמניים |
| Backend Routes | 24 routes | ~200KB | מערכת מלאה |
| Frontend Admin | 4 דפים | ~50KB | ממשק בסיסי |
| **סה"כ** | **66 קבצים** | **~750KB** | לפני ניקוי |

---

## 🎯 המלצות לשלב הבא

1. **ניקוי מיידי:** מחיקת קבצי debug וזמניים
2. **איחוד כפילויות:** החלטה על גרסה אחת לכל מסך
3. **תיקון תלותים:** התקנת חסרים, מחיקת מיותרים
4. **ארגון מבנה:** העברה למבנה תיקיות אחיד

**הערה:** המערכת מורכבת אך מאורגנת יחסית. העיקר הוא ניקוי הקבצים הזמניים וארגון מחדש.
