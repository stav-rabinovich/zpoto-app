# 🔍 דוח אוידט זמנים - מערכת Zpoto

## 📊 סיכום כללי
**תאריך אוידט:** 26/10/2025  
**מטרה:** זיהוי כל נקודות הזמן במערכת לתיקון סנכרון UTC ↔ Asia/Jerusalem

---

## 🗄️ שלב 1.1.1 - סקירת שדות זמן בבסיס הנתונים

### 📋 טבלת `User` - שדות זמן
| שדה | סוג | ברירת מחדל | הערות |
|-----|-----|------------|-------|
| `lastLoginAt` | DateTime? | null | זמן התחברות אחרון |
| `migrationCompletedAt` | DateTime? | null | זמן השלמת מיגרציה |
| `createdAt` | DateTime | @default(now()) | **🔥 זמן יצירת משתמש** |
| `updatedAt` | DateTime | @updatedAt | **🔥 זמן עדכון אחרון** |

**⚠️ בעיות פוטנציאליות:**
- `lastLoginAt` - האם נשמר ב-UTC או זמן מקומי?
- `createdAt/updatedAt` - Prisma אמור לטפל ב-UTC אוטומטית

---

### 🏠 טבלת `Parking` - שדות זמן
| שדה | סוג | ברירת מחדל | הערות |
|-----|-----|------------|-------|
| `availability` | String? | null | **🔥 JSON עם בלוקי זמן** |
| `createdAt` | DateTime | @default(now()) | זמן יצירת חניה |

**⚠️ בעיות פוטנציאליות:**
- `availability` - **זו הבעיה העיקרית!** JSON עם בלוקי זמן (0,4,8,12,16,20)
- צריך לוודא שהבלוקים מתפרשים נכון לפי זמן ישראל

**דוגמת availability:**
```json
{
  "sunday": [16,20],
  "monday": [0,4,8],
  "tuesday": [0,4,8,12,16,20]
}
```

---

### 📅 טבלת `Booking` - שדות זמן
| שדה | סוג | ברירת מחדל | הערות |
|-----|-----|------------|-------|
| `startTime` | DateTime | - | **🔥 זמן התחלת הזמנה** |
| `endTime` | DateTime | - | **🔥 זמן סיום הזמנה** |
| `createdAt` | DateTime | @default(now()) | זמן יצירת הזמנה |
| `paidAt` | DateTime? | null | זמן תשלום |
| `approvalExpiresAt` | DateTime? | null | זמן פקיעת אישור |
| `approvedAt` | DateTime? | null | זמן אישור |
| `rejectedAt` | DateTime? | null | זמן דחייה |

**⚠️ בעיות קריטיות:**
- `startTime/endTime` - **אלו השדות הקריטיים ביותר!**
- צריך לוודא שהם נשמרים ב-UTC ומוצגים בזמן ישראל
- אינדקס על `[parkingId, startTime, endTime]` - חשוב לביצועים

---

### 📝 טבלת `ListingRequest` - שדות זמן
| שדה | סוג | ברירת מחדל | הערות |
|-----|-----|------------|-------|
| `createdAt` | DateTime | @default(now()) | זמן יצירת בקשה |
| `updatedAt` | DateTime | @updatedAt | זמן עדכון אחרון |

**⚠️ בעיות פוטנציאליות:**
- רק שדות מטאדטה, פחות קריטי

---

### 💬 טבלת `Chat` - שדות זמן
| שדה | סוג | ברירת מחדל | הערות |
|-----|-----|------------|-------|
| `createdAt` | DateTime | @default(now()) | זמן שליחת הודעה |

**⚠️ בעיות פוטנציאליות:**
- חשוב לתצוגה נכונה של זמני הודעות

---

### 🚗 טבלת `Vehicle` - שדות זמן
| שדה | סוג | ברירת מחדל | הערות |
|-----|-----|------------|-------|
| `createdAt` | DateTime | @default(now()) | זמן רישום רכב |

---

### 📍 טבלות מיקומים - שדות זמן
**`SavedPlace`, `RecentSearch`, `Favorite`:**
| שדה | סוג | ברירת מחדל | הערות |
|-----|-----|------------|-------|
| `createdAt` | DateTime | @default(now()) | זמן יצירה |

---

### 💳 טבלת `PaymentMethod` - שדות זמן
| שדה | סוג | ברירת מחדל | הערות |
|-----|-----|------------|-------|
| `createdAt` | DateTime | @default(now()) | זמן הוספת אמצעי תשלום |

---

### 📄 טבלות מסמכים - שדות זמן
**`Document`:**
| שדה | סוג | ברירת מחדל | הערות |
|-----|-----|------------|-------|
| `signedAt` | DateTime? | null | זמן חתימה |
| `createdAt` | DateTime | @default(now()) | זמן העלאה |
| `updatedAt` | DateTime | @updatedAt | זמן עדכון |
| `approvedAt` | DateTime? | null | זמן אישור |
| `expiresAt` | DateTime? | null | **🔥 זמן פקיעה** |

---

### 🔔 טבלת `Notification` - שדות זמן
| שדה | סוג | ברירת מחדל | הערות |
|-----|-----|------------|-------|
| `sentAt` | DateTime? | null | זמן שליחה |
| `scheduledFor` | DateTime? | null | **🔥 זמן מתוזמן לשליחה** |
| `createdAt` | DateTime | @default(now()) | זמן יצירה |
| `updatedAt` | DateTime | @updatedAt | זמן עדכון |

---

### 💰 טבלות עמלות - שדות זמן
**`Commission`:**
| שדה | סוג | ברירת מחדל | הערות |
|-----|-----|------------|-------|
| `calculatedAt` | DateTime | @default(now()) | זמן חישוב עמלה |
| `createdAt` | DateTime | @default(now()) | זמן יצירה |
| `updatedAt` | DateTime | @updatedAt | זמן עדכון |

**`OwnerPayout`:**
| שדה | סוג | ברירת מחדל | הערות |
|-----|-----|------------|-------|
| `periodStart` | DateTime | - | **🔥 תחילת תקופה** |
| `periodEnd` | DateTime | - | **🔥 סוף תקופה** |
| `processedAt` | DateTime? | null | זמן עיבוד תשלום |
| `createdAt` | DateTime | @default(now()) | זמן יצירה |
| `updatedAt` | DateTime | @updatedAt | זמן עדכון |

---

## 🚨 שדות קריטיים לתיקון (עדיפות גבוהה)

### 1. **`Booking.startTime` & `Booking.endTime`** 🔥🔥🔥
- **הבעיה הקריטית ביותר**
- משפיע על כל החיפושים והזמנות
- חייב להיות ב-UTC במסד הנתונים

### 2. **`Parking.availability`** 🔥🔥
- JSON עם בלוקי זמן
- משפיע על זמינות חניות
- צריך לוודא פרשנות נכונה

### 3. **`Notification.scheduledFor`** 🔥
- הודעות מתוזמנות
- חשוב לשליחה בזמן הנכון

### 4. **`Document.expiresAt`** 🔥
- פקיעת מסמכים
- חשוב לתקינות משפטית

### 5. **`OwnerPayout.periodStart/periodEnd`** 🔥
- תקופות תשלום
- חשוב לחישובי עמלות

---

## 📋 שדות בעדיפות בינונית

- כל שדות ה-`createdAt/updatedAt`
- `User.lastLoginAt`
- `Chat.createdAt` (לתצוגה)

---

## 📋 שדות בעדיפות נמוכה

- שדות מטאדטה כלליים
- לוגי אוידט
- שדות היסטוריים

---

## 🎯 המלצות לשלב הבא

### 1. **תיקון מיידי נדרש:**
- בדיקת איך `startTime/endTime` נשמרים כרגע
- בדיקת פרשנות `availability` JSON

### 2. **כלים נדרשים:**
- פונקציות המרה UTC ↔ Asia/Jerusalem
- validation לפורמטי זמן

### 3. **בדיקות נדרשות:**
- בדיקת נתונים קיימים במסד הנתונים
- בדיקת התנהגות Prisma עם זמנים

---

## ✅ סטטוס השלמה - שלב 1.1.1

- [x] **סקירת טבלת `User`** - הושלם
- [x] **סקירת טבלת `Parking`** - הושלם  
- [x] **סקירת טבלת `Booking`** - הושלם
- [x] **סקירת כל הטבלות הנוספות** - הושלם
- [x] **זיהוי שדות קריטיים** - הושלם
- [x] **תעדוף לפי חשיבות** - הושלם

**🚀 מוכן לעבור לשלב 1.2 - מיפוי פונקציות זמן בקוד!**
