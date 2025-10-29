# 🔐 אסטרטגיית Authentication Gates

## 📱 **Client App (Frontend)**

### 🚪 **Authentication Gates בקליינט:**

#### 1. **Guest Users (אורחים)**
- ✅ **שוטטות חופשית** באפליקציה ללא התחברות
- ✅ **חיפוש חניות** עם Anonymous APIs
- ✅ **שמירת מועדפים** ומקומות עם Device ID
- 🚪 **התחברות נדרשת רק לפני הזמנת חניה**

#### 2. **Registered Users (USER)**
- ✅ **כל הפונקציות של אורחים**
- ✅ **הזמנת חניות** עם פרופיל שמור
- ✅ **היסטוריית הזמנות**
- ✅ **הגשת בקשה להיות בעל חניה**

#### 3. **Owners (OWNER)**
- ✅ **כל הפונקציות של משתמשים רגילים**
- 🔒 **ניהול החניות שלהם** (דורש התחברות)
- 🔒 **צפייה בהזמנות** (דורש התחברות)
- 🔒 **עדכון זמינות** (דורש התחברות)

---

## 🖥️ **Admin Panel (Backend)**

### 🚪 **Authentication Gates באדמין:**

#### 1. **Admin Only (ADMIN)**
- 🔒 **כל הפונקציות** דורשות התחברות כאדמין
- 🔒 **ניהול בקשות בעלי חניה**
- 🔒 **ניהול מסמכים ואישורים**
- 🔒 **חסימת/ביטול חסימת משתמשים**

---

## 🛡️ **Backend Security**

### 📊 **רמות הגנה:**

| Endpoint | Permission | Middleware |
|----------|------------|------------|
| `/api/public/*` | כולם | None |
| `/api/auth/*` | כולם | None |
| `/api/user/*` | USER+ | `requireAuth` |
| `/api/owner/*` | OWNER | `requireOwner` (חדש!) |
| `/api/admin/*` | ADMIN | `requireAdmin` |

### 🔒 **Authorization Logic:**

```javascript
// רמות הרשאה:
// 1. Guest (no token) - רק Public APIs
// 2. USER - Public + User APIs  
// 3. OWNER - Public + User + Owner APIs
// 4. ADMIN - הכל
```

---

## 🎯 **Implementation Plan**

### Phase 3.2: Backend Security
1. **יצירת `requireOwner` middleware**
2. **הגנה על Owner endpoints**
3. **JWT tokens עם role information**

### Phase 3.3: Frontend Gates
1. **Authentication guards במסכי Owner**
2. **הודעות שגיאה ברורות**
3. **הפניה למסך התחברות**

### Phase 3.4: Dual-Role Support
1. **תמיכה במשתמש שהוא גם USER וגם OWNER**
2. **מעבר בין מודים**

---

## 🔍 **Testing Strategy**

- ✅ **Guest access** - חיפוש ושמירת מועדפים
- ✅ **User access** - הזמנות והגשת בקשות
- ✅ **Owner access** - ניהול חניות
- ✅ **Admin access** - כל הפונקציות
- ❌ **Blocked access** - זריקה נקייה של משתמשים חסומים
