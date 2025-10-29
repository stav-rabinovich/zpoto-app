# 🔧 **API Documentation - מערכת קופונים**

## 📋 **סיכום Endpoints**

### **🔐 Admin Endpoints (דורש הרשאות אדמין)**
- `GET /api/admin/coupons` - רשימת כל הקופונים
- `GET /api/admin/coupons/stats` - סטטיסטיקות קופונים
- `GET /api/admin/coupons/:id` - פרטי קופון בודד
- `POST /api/admin/coupons` - יצירת קופון חדש
- `PUT /api/admin/coupons/:id` - עדכון קופון
- `DELETE /api/admin/coupons/:id` - מחיקת קופון

### **🎟️ Public Endpoints (ללא הרשאות)**
- `POST /api/coupons/validate` - בדיקת תקינות קופון
- `POST /api/coupons/calculate-discount` - חישוב הנחה

---

## 🔐 **Admin Endpoints**

### **GET /api/admin/coupons**
רשימת כל הקופונים במערכת

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:**
```json
[
  {
    "id": 1,
    "code": "SAVE20",
    "discountType": "PERCENTAGE",
    "discountValue": 20.0,
    "applyTo": "TOTAL_AMOUNT",
    "validUntil": "2025-12-31T23:59:59.000Z",
    "isActive": true,
    "usageCount": 5,
    "maxUsage": 100,
    "createdAt": "2025-10-28T21:00:00.000Z",
    "updatedAt": "2025-10-28T21:00:00.000Z",
    "createdBy": {
      "id": 1,
      "name": "Admin User",
      "email": "admin@zpoto.com"
    },
    "usages": [
      {
        "id": 1,
        "usedAt": "2025-10-28T22:00:00.000Z",
        "discountAmountCents": 2000
      }
    ]
  }
]
```

---

### **GET /api/admin/coupons/stats**
סטטיסטיקות כלליות על הקופונים

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "totalCoupons": 10,
  "activeCoupons": 7,
  "totalUsages": 45,
  "totalDiscountAmount": 1250.50,
  "topCoupons": [
    {
      "id": 1,
      "code": "SAVE20",
      "usageCount": 15,
      "discountType": "PERCENTAGE",
      "discountValue": 20.0
    }
  ]
}
```

---

### **POST /api/admin/coupons**
יצירת קופון חדש

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Body:**
```json
{
  "code": "WELCOME10",
  "discountType": "PERCENTAGE",
  "discountValue": 10.0,
  "applyTo": "SERVICE_FEE",
  "validUntil": "2025-12-31T23:59:59.000Z",
  "maxUsage": 50
}
```

**Response (201):**
```json
{
  "id": 2,
  "code": "WELCOME10",
  "discountType": "PERCENTAGE",
  "discountValue": 10.0,
  "applyTo": "SERVICE_FEE",
  "validUntil": "2025-12-31T23:59:59.000Z",
  "isActive": true,
  "usageCount": 0,
  "maxUsage": 50,
  "createdById": 1,
  "createdAt": "2025-10-28T21:30:00.000Z",
  "updatedAt": "2025-10-28T21:30:00.000Z",
  "createdBy": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@zpoto.com"
  }
}
```

**Errors:**
- `400` - שדות חובה חסרים
- `409` - קוד קופון כבר קיים

---

### **PUT /api/admin/coupons/:id**
עדכון קופון קיים

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Body (כל השדות אופציונליים):**
```json
{
  "code": "UPDATED_CODE",
  "discountValue": 15.0,
  "isActive": false
}
```

**Response (200):**
```json
{
  "id": 2,
  "code": "UPDATED_CODE",
  "discountType": "PERCENTAGE",
  "discountValue": 15.0,
  "applyTo": "SERVICE_FEE",
  "validUntil": "2025-12-31T23:59:59.000Z",
  "isActive": false,
  "usageCount": 0,
  "maxUsage": 50,
  "createdById": 1,
  "createdAt": "2025-10-28T21:30:00.000Z",
  "updatedAt": "2025-10-28T21:35:00.000Z"
}
```

**Errors:**
- `400` - מזהה קופון לא תקין
- `404` - קופון לא נמצא
- `409` - קוד קופון כבר קיים

---

### **DELETE /api/admin/coupons/:id**
מחיקת קופון

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response (204):** No Content

**Errors:**
- `400` - מזהה קופון לא תקין
- `404` - קופון לא נמצא
- `409` - לא ניתן למחוק קופון שכבר נוצל

---

## 🎟️ **Public Endpoints**

### **POST /api/coupons/validate**
בדיקת תקינות קופון

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "code": "SAVE20"
}
```

**Response - קופון תקין (200):**
```json
{
  "isValid": true,
  "coupon": {
    "id": 1,
    "code": "SAVE20",
    "discountType": "PERCENTAGE",
    "discountValue": 20.0,
    "applyTo": "TOTAL_AMOUNT",
    "validUntil": "2025-12-31T23:59:59.000Z",
    "isActive": true,
    "usageCount": 5,
    "maxUsage": 100
  }
}
```

**Response - קופון לא תקין (200):**
```json
{
  "isValid": false,
  "error": "קופון פג תוקף",
  "errorCode": "EXPIRED"
}
```

**Error Codes:**
- `NOT_FOUND` - קופון לא נמצא
- `EXPIRED` - קופון פג תוקף
- `INACTIVE` - קופון לא פעיל
- `MAX_USAGE_REACHED` - הגיע למגבלת השימושים

---

### **POST /api/coupons/calculate-discount**
חישוב הנחה לקופון

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "code": "SAVE20",
  "parkingCostCents": 10000,
  "operationalFeeCents": 1000
}
```

**Response - הצלחה (200):**
```json
{
  "isValid": true,
  "coupon": {
    "id": 1,
    "code": "SAVE20",
    "discountType": "PERCENTAGE",
    "discountValue": 20.0,
    "applyTo": "TOTAL_AMOUNT"
  },
  "discount": {
    "discountAmountCents": 2200,
    "originalAmountCents": 11000,
    "finalAmountCents": 8800,
    "discountPercentage": 20.0
  }
}
```

**Response - שגיאה (400):**
```json
{
  "error": "קופון פג תוקף",
  "errorCode": "EXPIRED"
}
```

---

## 🎯 **דוגמאות שימוש**

### **דוגמה 1: יצירת קופון 20% הנחה על דמי תפעול**
```bash
curl -X POST http://localhost:3000/api/admin/coupons \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SERVICE20",
    "discountType": "PERCENTAGE",
    "discountValue": 20.0,
    "applyTo": "SERVICE_FEE",
    "validUntil": "2025-12-31T23:59:59.000Z"
  }'
```

### **דוגמה 2: בדיקת קופון ממשק המשתמש**
```bash
curl -X POST http://localhost:3000/api/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SERVICE20"
  }'
```

### **דוגמה 3: חישוב הנחה**
```bash
curl -X POST http://localhost:3000/api/coupons/calculate-discount \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SERVICE20",
    "parkingCostCents": 10000,
    "operationalFeeCents": 1000
  }'
```

---

## 🔍 **Types & Enums**

### **CouponDiscountType**
```typescript
type CouponDiscountType = 'PERCENTAGE' | 'FIXED';
```

### **CouponApplyTo**
```typescript
type CouponApplyTo = 'SERVICE_FEE' | 'TOTAL_AMOUNT';
```

### **Coupon Object**
```typescript
interface Coupon {
  id: number;
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  applyTo: CouponApplyTo;
  validUntil: Date;
  isActive: boolean;
  usageCount: number;
  maxUsage: number | null;
  createdById: number;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## ✅ **Status Codes**

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | בקשה הצליחה |
| 201 | Created | קופון נוצר בהצלחה |
| 204 | No Content | קופון נמחק בהצלחה |
| 400 | Bad Request | נתונים לא תקינים |
| 401 | Unauthorized | לא מחובר |
| 403 | Forbidden | אין הרשאות |
| 404 | Not Found | קופון לא נמצא |
| 409 | Conflict | קוד קופון כבר קיים |

---

## 🚀 **Backend מוכן לשימוש!**

**מה יש לנו עכשיו:**
- ✅ **5 Admin Endpoints** - ניהול מלא של קופונים
- ✅ **2 Public Endpoints** - בדיקה וחישוב הנחות
- ✅ **Validation מלא** - בדיקות שגיאות מקיפות
- ✅ **Error Handling** - הודעות ברורות בעברית
- ✅ **Type Safety** - TypeScript מלא

**השלב הבא:** ממשק אדמין לניהול קופונים
