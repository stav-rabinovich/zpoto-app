# 🗃️ **עיצוב מסד נתונים - מערכת קופונים**

## 📊 **סיכום המבנה שנוצר**

### **🎟️ טבלת Coupon - קופונים**

| שדה | סוג | תיאור | דוגמה |
|-----|-----|--------|--------|
| `id` | INT (PK) | מזהה ייחודי | 1 |
| `code` | STRING (UNIQUE) | קוד הקופון | "SAVE20", "WELCOME10" |
| `discountType` | ENUM | סוג הנחה | PERCENTAGE, FIXED |
| `discountValue` | FLOAT | ערך ההנחה | 20.0 (20% או ₪20) |
| `applyTo` | ENUM | על מה להחיל | SERVICE_FEE, TOTAL_AMOUNT |
| `validUntil` | DATETIME | תפוגה | 2025-12-31 23:59:59 |
| `isActive` | BOOLEAN | פעיל/לא פעיל | true |
| `usageCount` | INT | מספר שימושים | 5 |
| `maxUsage` | INT (NULL) | מגבלת שימושים | 100 (או null) |
| `createdById` | INT (FK) | מי יצר | User.id |
| `createdAt` | DATETIME | תאריך יצירה | auto |
| `updatedAt` | DATETIME | תאריך עדכון | auto |

### **📈 טבלת CouponUsage - מעקב שימושים**

| שדה | סוג | תיאור | דוגמה |
|-----|-----|--------|--------|
| `id` | INT (PK) | מזהה ייחודי | 1 |
| `couponId` | INT (FK) | איזה קופון | Coupon.id |
| `bookingId` | INT (FK) | איזו הזמנה | Booking.id |
| `userId` | INT (FK) | איזה משתמש | User.id |
| `discountAmountCents` | INT | סכום הנחה (עגורות) | 2000 (₪20) |
| `originalAmountCents` | INT | סכום מקורי (עגורות) | 10000 (₪100) |
| `finalAmountCents` | INT | סכום סופי (עגורות) | 8000 (₪80) |
| `usedAt` | DATETIME | מתי נוצל | auto |

---

## 🔗 **קשרים בין טבלאות**

### **User → Coupon (יוצר קופונים)**
```
User.id → Coupon.createdById (1:N)
```
**משמעות:** משתמש אדמין יכול ליצור מספר קופונים

### **User → CouponUsage (משתמש בקופונים)**
```
User.id → CouponUsage.userId (1:N)
```
**משמעות:** משתמש יכול להשתמש במספר קופונים

### **Coupon → CouponUsage (קופון נוצל)**
```
Coupon.id → CouponUsage.couponId (1:N)
```
**משמעות:** קופון יכול להיות מנוצל מספר פעמים

### **Booking → CouponUsage (הזמנה עם קופון)**
```
Booking.id → CouponUsage.bookingId (1:N)
```
**משמעות:** הזמנה יכולה להשתמש במספר קופונים (עתידי)

---

## 📝 **Enums שנוצרו**

### **CouponDiscountType**
```typescript
enum CouponDiscountType {
  PERCENTAGE = "PERCENTAGE"  // אחוז הנחה (5%, 10%, 20%)
  FIXED = "FIXED"           // סכום קבוע (₪10, ₪50)
}
```

### **CouponApplyTo**
```typescript
enum CouponApplyTo {
  SERVICE_FEE = "SERVICE_FEE"      // רק על דמי תפעול (10%)
  TOTAL_AMOUNT = "TOTAL_AMOUNT"    // על הסכום הכולל
}
```

---

## 🎯 **דוגמאות לשימוש**

### **דוגמה 1: קופון 20% הנחה על דמי תפעול**
```json
{
  "code": "SERVICE20",
  "discountType": "PERCENTAGE",
  "discountValue": 20.0,
  "applyTo": "SERVICE_FEE",
  "validUntil": "2025-12-31T23:59:59Z"
}
```

**תוצאה:**
- עלות חניה: ₪100
- דמי תפעול: ₪10
- הנחה: ₪2 (20% מ-₪10)
- **סה"כ: ₪108** (במקום ₪110)

### **דוגמה 2: קופון ₪15 הנחה על הסכום הכולל**
```json
{
  "code": "SAVE15",
  "discountType": "FIXED",
  "discountValue": 15.0,
  "applyTo": "TOTAL_AMOUNT",
  "validUntil": "2025-12-31T23:59:59Z"
}
```

**תוצאה:**
- עלות חניה: ₪100
- דמי תפעול: ₪10
- הנחה: ₪15
- **סה"כ: ₪95** (במקום ₪110)

---

## 🔍 **אינדקסים לביצועים**

### **טבלת Coupon:**
- `code` (UNIQUE) - חיפוש מהיר לפי קוד
- `validUntil` - סינון קופונים פעילים
- `isActive` - סינון קופונים זמינים
- `createdById` - קופונים לפי יוצר

### **טבלת CouponUsage:**
- `couponId` - מעקב שימושים לפי קופון
- `bookingId` - קופונים לפי הזמנה
- `userId` - היסטוריית שימוש למשתמש
- `usedAt` - מיון כרונולוגי

---

## ✅ **בדיקות תקינות**

### **בדיקות שדות חובה:**
- [x] `code` - ייחודי ולא ריק
- [x] `discountType` - רק PERCENTAGE או FIXED
- [x] `discountValue` - חיובי וגדול מ-0
- [x] `applyTo` - רק SERVICE_FEE או TOTAL_AMOUNT
- [x] `validUntil` - תאריך עתידי
- [x] `createdById` - משתמש קיים

### **בדיקות לוגיות:**
- [x] אחוז הנחה: 0-100%
- [x] סכום קבוע: לא יעלה על הסכום המקורי
- [x] תאריך תפוגה: עתידי
- [x] מגבלת שימושים: אופציונלי

---

## 🚀 **המבנה מוכן לשלב הבא!**

**מה יש לנו עכשיו:**
- ✅ טבלאות מעוצבות ומוכנות
- ✅ קשרים נכונים בין הטבלאות
- ✅ אינדקסים לביצועים
- ✅ Enums מוגדרים
- ✅ Migration מוכן להרצה

**השלב הבא:** פיתוח Backend API
