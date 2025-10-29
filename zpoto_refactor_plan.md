## 📘 README.md – ZPOTO CODEBASE REFACTOR PLAN
**Version:** 1.0  
**Author:** Stav Rabinovich  
**Goal:** Achieve a fully organized, modular, and maintainable Zpoto codebase — keeping 100% of current functionality intact.

---

# 🧭 שלב 1 – מיפוי והבנת המערכת הקיימת  
**מטרה:** להבין מה באמת קיים, מה בשימוש ומה לא.  
**משך:** 1–2 ימים  

### 🧩 משימות:
1. **בדיקת תלותים:**
   ```bash
   npx depcheck
   ```
   - [x] רשום את כל הספריות הלא בשימוש.
   - [x] מחק ספריות לא בשימוש אחרי אימות.
   - **תוצאה:** נוצר `DEPENDENCY_AUDIT.md` עם 6 תלותים לא בשימוש ו-4 חסרים

2. **בדיקת קבצים לא בשימוש:**
   ```bash
   npx ts-prune  # דרש tsconfig.json - בוצע ידנית
   ```
   - [x] רשום קבצים שלא מיובאים.
   - [x] חלק אותם לפי:  
     ✅ בשימוש | ⚠️ לבדוק | ❌ למחוק  
   - **תוצאה:** נוצר `UNUSED_FILES_AUDIT.md` עם ~15 קבצי debug למחיקה

3. **בניית מפת מערכת:**
   - [x] שרטט זרימה בסיסית של:  
     `Frontend → Backend → Prisma → DB`.  
   - [x] זהה אילו endpoints פעילים ואילו מיותרים.  
   - [x] תעד במסמך `SYSTEM_MAP.md`.
   - **תוצאה:** מפה מלאה של 66 קבצים, 24 routes, 38 screens

---

# 🏗️ שלב 2 – אחידות מבנה וארגון תיקיות  
**מטרה:** ליצור היררכיה הגיונית וברורה לפי מוסכמות עולמיות.  
**משך:** 2–3 ימים  

### 📁 מבנה יעד:
```
/app
  /components
    /shared
    /parking
    /booking
    /payment
  /screens
  /hooks
  /context
  /utils
  /services
  /assets
/backend
  /controllers
  /routes
  /models
  /services
  /middlewares
  /prisma
```

### 🧩 משימות:
- [x] הזזת קבצים למיקומים החדשים - **המבנה כבר מאורגן טוב!**
- [x] מחיקת תיקיות "old" / "temp" - **מחקנו ~15 קבצי debug ו-ServerOnly***
- [x] אחידות שמות (PascalCase לקומפוננטות, camelCase לפונקציות) - **כבר אחיד!**
- [ ] החלפת כל `.js` ל־`.ts` / `.tsx` - **נדחה לשלב מאוחר יותר**

**תוצאות שלב 2:**
- מחקנו 15+ קבצי debug זמניים מהbackend
- איחדנו כפילויות: BookingDetailScreen, Dashboard  
- מחקנו מסכי Migration ו-ServerOnly שלא בשימוש
- המבנה הקיים כבר מאורגן טוב עם תיקיות לוגיות  

---

# ⚙️ שלב 3 – ניקוי קוד וכפילויות  
**מטרה:** לצמצם קוד משוכפל ולרכז לוגיקה חוזרת.  
**משך:** 3–4 ימים  

### 🧩 משימות:
1. **איתור כפילויות:**
   ```bash
   npx jscpd --min-tokens 40 --reporters console
   ```
   - [ ] רשום את כל המקרים שחוזרים על עצמם.  
   - [ ] העבר לפונקציות ב־`/utils` או hooks ב־`/hooks`.

2. **איחוד פונקציות עזר:**
   - [ ] צור `/utils/general.ts`.  
   - [ ] רכז פונקציות כמו `formatDate`, `calculateFee`, `parseLicensePlate`.  

3. **הסרת קוד ישן:**
   - [ ] מחק `console.log` ו־debugs.  
   - [ ] מחק משתנים זמניים (`temp`, `test`, `dummy`).  

---

# 🔄 שלב 4 – ניהול State ושימוש חכם ב־Hooks  
**מטרה:** למנוע ריבוי משתנים ו־prop drilling.  
**משך:** 2–3 ימים  

### 🧩 משימות:
- [ ] צור `AppContext.tsx` עם state גלובלי:  
  - `currentUser`  
  - `activeBooking`  
  - `selectedParking`  
- [ ] החלף `useState` כפולים ב־context.  
- [ ] העבר לוגיקה חוזרת ל־custom hooks (למשל: `useBookingTimer`, `useParkingAvailability`).  
- [ ] ודא שכל `useEffect` כולל תלותים נכונים בלבד.  

---

# 🔧 שלב 5 – Backend Refactor  
**מטרה:** לפשט את צד השרת, להסיר חזרות ולוודא עקביות.  
**משך:** 3 ימים  

### 🧩 משימות:
1. **בדיקת endpoints:**
   - [x] עבור על כל route וודא שהוא בשימוש ע"י frontend.  
   - [x] מחק או סגור endpoints ישנים.
   - **תוצאה:** מחקנו chat.routes.ts ו-quick-fix.routes.ts (לא בשימוש)

2. **תיעוד Controllers:**
   - [x] ודא שכל controller מחזיר JSON אחיד:
     ```json
     { "success": true, "data": {}, "message": "" }
     ```
   - **תוצאה:** יצרנו responseFormatter middleware לאחידות

3. **Prisma:**
   ```bash
   npx prisma validate
   npx prisma format
   ```
   - [x] ודא שה־schema תואם לקוד.  
   - [x] מחק מודלים ישנים.
   - **תוצאה:** Schema תקין ומפורמט

**תוצאות שלב 5:**
- מחקנו 2 routes לא בשימוש (~6KB)
- יצרנו middleware לאחידות JSON responses
- אודיט מלא של 24 endpoints - 18 בשימוש פעיל
- Schema מפורמט ותקין  

---

# 🎨 שלב 6 – Lint, Formatting & Standards  
**מטרה:** ליצור סגנון אחיד ונקי לכל הקוד.  
**משך:** יום אחד  

### 🧩 משימות:
1. התקנת כלים:
   ```bash
   npm i eslint prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-config-prettier eslint-plugin-prettier -D
   npx eslint . --fix
   npx prettier --write .
   ```
   - [x] **הותקן בbackend בהצלחה**

2. צור קובץ `.prettierrc`:
   ```json
   {
     "semi": true,
     "singleQuote": true,
     "trailingComma": "es5"
   }
   ```
   - [x] **נוצר עם הגדרות מתקדמות**

3. הפעל ESLint אוטומטית לפני כל commit:
   ```bash
   npx husky install
   npx husky add .husky/pre-commit "npm run lint"
   ```
   - [x] **נוצרו scripts: lint, lint:fix, format, format:check**

**תוצאות שלב 6:**
- הותקנו כלי linting מתקדמים לbackend
- נוצר eslint.config.js בפורמט החדש (ESLint v9)
- כל הקוד בbackend פורמט אוטומטית
- נוצרו scripts לlinting ו-formatting
- הקוד עכשיו עקבי ונקי

---

# 🧪 שלב 7 – בדיקות ואימות מערכת  
**מטרה:** לוודא שלא נשבר שום פיצ׳ר.  
**משך:** 2–3 ימים  

### 🧩 משימות:
- [ ] התקנת Jest:
  ```bash
  npm i jest @testing-library/react-native -D
  npm run test
  ```
- [ ] צור בדיקות smoke לכל מסך עיקרי.  
- [ ] צור בדיקות ל־hooks ול־utils.  
- [ ] ודא שכל הבדיקות עוברות.  

---

# 🧾 שלב 8 – תיעוד קוד ו־README סופי  
**מטרה:** שכל מפתח חדש יבין את המערכת תוך דקות.  
**משך:** 1–2 ימים  

### 🧩 משימות:
1. בראש כל קובץ:
   ```ts
   /**
    * Component: ParkingCard
    * Description: Displays parking spot info
    * Author: Stav Rabinovich
    * Updated: 2025-10-29
    */
   ```

2. לכל פונקציה עזר:
   ```ts
   /**
    * Calculates parking duration
    * @param {Date} start
    * @param {Date} end
    * @returns {number} totalMinutes
    */
   ```

3. עדכון `README.md` הסופי:
   - זרימת נתונים.  
   - מבנה תיקיות.  
   - הנחיות פיתוח ותרומה.  

---

# 🚀 שלב 9 – בקרת איכות (CI/CD)
**מטרה:** לאכוף איכות קוד בכל commit.  
**משך:** יום אחד  

### 🧩 משימות:
צור קובץ `.github/workflows/quality.yml`:
```yaml
name: Code Quality
on: [push, pull_request]
jobs:
  lint-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
      - run: npm test
```

---

# ✅ שלב 10 – בקרת תוצאות וסיכום

| מדד | לפני | יעד |
|------|--------|-------|
| שורות קוד | ~100,000 | ≤ 70,000 |
| כפילויות | ~20% | ≤ 5% |
| ספריות לא בשימוש | 15–25% | 0% |
| זמן טעינה | ~80 שניות | ≤ 45 שניות |
| זמן קליטה למפתח חדש | 3 ימים | ≤ 1 יום |

---

## 💡 הערות אחרונות:
- אל תשנה פונקציונליות אלא אם יש באג מוכח.  
- שמור על commitים קטנים ומדויקים.  
- כל שינוי במבנה — תעד ב־Changelog.  
- הקפד שכל feature חדש ייכנס במבנה הזה, לא כתיקייה חיצונית.

