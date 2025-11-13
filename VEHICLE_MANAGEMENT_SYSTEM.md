# מערכת ניהול רכבים וחניות - תכנית פיתוח

## סקירה כללית
מערכת מתקדמת לניהול התאמה בין סוגי רכבים וחניות, הכוללת היררכיית גדלים, סינון אינטליגנטי והצגה אלגנטית.

## מערכת תאימות רכבים לחניות - גודל מקסימלי
החניה מגדירה את **הרכב הגדול ביותר** שיכול להיכנס אליה.
כל רכב קטן יותר גם יכול להיכנס.

### היררכיית גדלים:
```
MINI < FAMILY < SUV
(קטן)  (בינוני)  (גדול)
```

### דוגמאות תאימות:
```
📍 חניה A: גודל מקסימלי MINI
   ✅ רכב מיני → מתאים (בדיוק הגודל המקסימלי)
   ❌ רכב משפחתי → לא מתאים (גדול מדי)
   ❌ רכב SUV → לא מתאים (גדול מדי)

📍 חניה B: גודל מקסימלי FAMILY  
   ✅ רכב מיני → מתאים (קטן יותר)
   ✅ רכב משפחתי → מתאים (בדיוק הגודל המקסימלי)
   ❌ רכב SUV → לא מתאים (גדול מדי)

📍 חניה C: גודל מקסימלי SUV
   ✅ רכב מיני → מתאים (קטן יותר)
   ✅ רכב משפחתי → מתאים (קטן יותר)
   ✅ רכב SUV → מתאים (בדיוק הגודל המקסימלי)
```

---

## Phase 1: תשתית ומסד נתונים

### 1.1 עדכון Prisma Schema
- [ ] **1.1.1** הוספת enum VehicleSize
  ```prisma
  enum VehicleSize {
    MINI
    FAMILY  
    SUV
  }
  ```

- [ ] **1.1.2** עדכון מודל Parking
  ```prisma
  model Parking {
    // שדות קיימים...
    supportedVehicleSizes VehicleSize[]
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
  }
  ```

- [ ] **1.1.3** יצירת מודל UserVehicle
  ```prisma
  model UserVehicle {
    id String @id @default(cuid())
    userId String
    licensePlate String
    vehicleSize VehicleSize
    vehicleModel String?
    vehicleColor String?
    isDefault Boolean @default(false)
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
    
    user User @relation(fields: [userId], references: [id], onDelete: Cascade)
    
    @@unique([userId, licensePlate])
    @@map("user_vehicles")
  }
  ```

- [ ] **1.1.4** עדכון מודל User
  ```prisma
  model User {
    // שדות קיימים...
    vehicles UserVehicle[]
    showOnlyCompatibleParkings Boolean @default(false)
  }
  ```

- [ ] **1.1.5** עדכון מודל Booking
  ```prisma
  model Booking {
    // שדות קיימים...
    vehicleId String?
    vehicleLicensePlate String?
    
    vehicle UserVehicle? @relation(fields: [vehicleId], references: [id])
  }
  ```

### 1.2 Migration ו-Database Updates
- [ ] **1.2.1** יצירת migration files
- [ ] **1.2.2** הרצת migrations על database
- [ ] **1.2.3** עדכון existing parkings עם default values
- [ ] **1.2.4** בדיקת data integrity

---

## Phase 2: Backend APIs

### 2.1 Vehicle Management APIs
- [ ] **2.1.1** POST `/api/user/vehicles` - הוספת רכב למשתמש
- [ ] **2.1.2** GET `/api/user/vehicles` - קבלת רכבים של משתמש
- [ ] **2.1.3** PUT `/api/user/vehicles/:id` - עדכון פרטי רכב
- [ ] **2.1.4** DELETE `/api/user/vehicles/:id` - מחיקת רכב
- [ ] **2.1.5** PATCH `/api/user/vehicles/:id/default` - הגדרת רכב ברירת מחדל

### 2.2 User Preferences APIs
- [ ] **2.2.1** PATCH `/api/user/preferences` - עדכון העדפות משתמש
  ```typescript
  interface UserPreferences {
    showOnlyCompatibleParkings: boolean;
  }
  ```

### 2.3 Parking Search Enhancement
- [ ] **2.3.1** עדכון GET `/api/parkings/search` 
  - הוספת פרמטר `vehicleSize?: VehicleSize`
  - הוספת פרמטר `onlyCompatible?: boolean`
  - לוגיקת סינון לפי גודל רכב

- [ ] **2.3.2** יצירת utility function לבדיקת תאימות
  ```typescript
  function isVehicleCompatibleWithParking(
    vehicleSize: VehicleSize, 
    supportedSizes: VehicleSize[]
  ): boolean
  ```

### 2.4 Admin APIs for Parking Management
- [ ] **2.4.1** PATCH `/api/admin/parkings/:id/vehicle-sizes`
- [ ] **2.4.2** GET `/api/admin/parkings/vehicle-compatibility-stats`

---

## Phase 3: Frontend - User Experience

### 3.1 Vehicle Management Screen
- [ ] **3.1.1** יצירת `VehicleManagementScreen.js`
  - רשימת רכבים של המשתמש
  - כפתור הוספת רכב חדש
  - אפשרות עריכה ומחיקה
  - הגדרת רכב ברירת מחדל

- [ ] **3.1.2** יצירת `AddVehicleModal.js`
  - טופס הוספת רכב
  - בחירת גודל רכב עם אייקונים
  - וולידציה למספר רכב ישראלי

- [ ] **3.1.3** יצירת `VehicleCard.js` component
  - הצגת פרטי רכב
  - סטטוס רכב ברירת מחדל
  - אפשרויות עריכה ומחיקה

### 3.2 Profile Screen Enhancement
- [ ] **3.2.1** הוספת קטגוריית "הרכב שלי" לפרופיל
- [ ] **3.2.2** הוספת toggle "הצג רק חניות מתאימות לרכב שלי"
- [ ] **3.2.3** הצגת רכב ברירת מחדל בפרופיל
- [ ] **3.2.4** ניווט למסך ניהול רכבים

### 3.3 Search & Results Enhancement
- [ ] **3.3.1** עדכון `SearchResultsScreen.js`
  - הוספת badge לכל חניה עם סוגי רכבים נתמכים
  - סינון אוטומטי לפי העדפות משתמש
  - הוספת כפתור "הצג גם חניות לא מתאימות"

- [ ] **3.3.2** יצירת `VehicleCompatibilityBadge.js` component
  - הצגת סוגי רכבים נתמכים
  - אייקונים אלגנטיים לכל סוג רכב
  - אינדיקטור תאימות לרכב הנוכחי

### 3.4 Booking Screen Enhancement
- [ ] **3.4.1** עדכון `BookingScreen.js`
  - בחירת רכב להזמנה (dropdown של רכבי המשתמש)
  - הצגת תאימות החניה לרכב הנבחר
  - הזנת מספר רכב ידנית אם אין רכבים שמורים

- [ ] **3.4.2** יצירת `VehicleSelector.js` component
  - בחירת רכב מרשימה
  - אפשרות הזנה ידנית
  - וולידציה וUIהדגמה

- [ ] **3.4.3** יצירת `ParkingCompatibilityInfo.js` component
  - הצגה דיסקרטית של סוגי רכבים נתמכים
  - אייקונים קטנים ואלגנטיים
  - הודעת אזהרה אם הרכב לא מתאים

---

## Phase 4: Admin Panel Enhancement

### 4.1 Parking Management Enhancement
- [ ] **4.1.1** הוספת קטגוריית "תאימות רכבים" לעמוד עריכת חניה
- [ ] **4.1.2** Multi-select component לבחירת סוגי רכבים נתמכים
- [ ] **4.1.3** תצוגה מקדימה של הגבלות רכב
- [ ] **4.1.4** סטטיסטיקות תאימות רכבים

### 4.2 Onboarding Process Enhancement
- [ ] **4.2.1** הוספת שלב "תאימות רכבים" לתהליך האונבורדינג
- [ ] **4.2.2** הסבר ויזואלי על סוגי הרכבים
- [ ] **4.2.3** ברירת מחדל חכמה לפי תיאור החניה

### 4.3 Analytics & Reporting
- [ ] **4.3.1** דוח תאימות רכבים לחניות
- [ ] **4.3.2** סטטיסטיקות ביקושים לפי סוג רכב
- [ ] **4.3.3** המלצות לבעלי חניות

---

## Phase 5: User Experience Enhancements

### 5.1 Smart Defaults & Automation
- [ ] **5.1.1** זיהוי אוטומטי של גודל רכב לפי מודל
- [ ] **5.1.2** הצעת רכב ברירת מחדל בהזמנה
- [ ] **5.1.3** שמירת העדפות סינון בזיכרון מקומי

### 5.2 Advanced Filtering
- [ ] **5.2.1** סינון מתקדם בחיפוש לפי סוג רכב
- [ ] **5.2.2** מיון תוצאות לפי רמת תאימות
- [ ] **5.2.3** הצגת מרחק מהמיקום הנוכחי

### 5.3 Visual Improvements
- [ ] **5.3.1** יצירת אייקונים מותאמים לכל סוג רכב
- [ ] **5.3.2** עיצוב אלגנטי לbadges של תאימות
- [ ] **5.3.3** אנימציות חלקות במעברים

---

## Phase 6: Testing & Quality Assurance

### 6.1 Backend Testing
- [ ] **6.1.1** Unit tests למודלי נתונים
- [ ] **6.1.2** Integration tests ל-APIs
- [ ] **6.1.3** בדיקת לוגיקת תאימות רכבים
- [ ] **6.1.4** Performance testing לחיפושים

### 6.2 Frontend Testing
- [ ] **6.2.1** Component testing לכל הקומפוננטים החדשים
- [ ] **6.2.2** User flow testing לתהליך הזמנה
- [ ] **6.2.3** Cross-platform testing (iOS/Android)
- [ ] **6.2.4** Accessibility testing

### 6.3 Data Migration Testing
- [ ] **6.3.1** בדיקת העברת נתונים קיימים
- [ ] **6.3.2** Rollback procedures
- [ ] **6.3.3** Data consistency checks

---

## Phase 7: Deployment & Monitoring

### 7.1 Production Deployment
- [ ] **7.1.1** Staged rollout למשתמשים
- [ ] **7.1.2** Database migration בפרודקשן
- [ ] **7.1.3** Feature flags למפתח הדרגתי

### 7.2 Monitoring & Analytics
- [ ] **7.2.1** מעקב שימוש בתכונות רכב
- [ ] **7.2.2** ניטור ביצועי חיפוש
- [ ] **7.2.3** אלרטים על שגיאות

### 7.3 User Feedback & Iteration
- [ ] **7.3.1** איסוף משוב ממשתמשים
- [ ] **7.3.2** A/B testing למשפך הרכבים
- [ ] **7.3.3** תכנון iterationים עתידיים

---

## Technical Specifications

### Database Schema
```sql
-- הוספת עמודות לטבלת parkings
ALTER TABLE parkings ADD COLUMN supported_vehicle_sizes TEXT[];

-- יצירת טבלת רכבי משתמשים
CREATE TABLE user_vehicles (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  license_plate TEXT NOT NULL,
  vehicle_size TEXT NOT NULL,
  vehicle_model TEXT,
  vehicle_color TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, license_plate)
);

-- הוספת עמודה למשתמשים
ALTER TABLE users ADD COLUMN show_only_compatible_parkings BOOLEAN DEFAULT FALSE;
```

### API Endpoints Summary
```
Vehicle Management:
- GET    /api/user/vehicles
- POST   /api/user/vehicles
- PUT    /api/user/vehicles/:id
- DELETE /api/user/vehicles/:id
- PATCH  /api/user/vehicles/:id/default

Search Enhancement:
- GET    /api/parkings/search?vehicleSize=SUV&onlyCompatible=true

Admin Management:
- PATCH  /api/admin/parkings/:id/vehicle-sizes
- GET    /api/admin/analytics/vehicle-compatibility
```

### Component Architecture
```
├── screens/
│   ├── VehicleManagementScreen.js
│   ├── BookingScreen.js (enhanced)
│   └── SearchResultsScreen.js (enhanced)
├── components/
│   ├── VehicleCard.js
│   ├── AddVehicleModal.js
│   ├── VehicleSelector.js
│   ├── VehicleCompatibilityBadge.js
│   └── ParkingCompatibilityInfo.js
└── utils/
    ├── vehicleCompatibility.js
    └── vehicleValidation.js
```

---

## Success Metrics

### Technical KPIs
- [ ] טעינת תוצאות חיפוש < 2 שניות
- [ ] 99.9% uptime למערכת הרכבים
- [ ] 0% data loss במהלך migration

### Business KPIs
- [ ] שיפור של 15% בהתאמת הזמנות
- [ ] צמצום של 20% בביטולי הזמנות
- [ ] עלייה של 25% בשביעות רצון משתמשים

### User Experience KPIs
- [ ] 90% מהמשתמשים מוסיפים רכב לפרופיל
- [ ] 80% מהמשתמשים משתמשים בסינון חכם
- [ ] 95% הצלחה בתהליך הזמנה

---

## Timeline Estimation

| Phase | משך זמן משוער | משאבים נדרשים |
|-------|-------------|---------------|
| Phase 1 | 3-4 ימים | Backend Developer |
| Phase 2 | 5-7 ימים | Backend Developer |
| Phase 3 | 8-10 ימים | Frontend Developer |
| Phase 4 | 4-5 ימים | Full-stack Developer |
| Phase 5 | 3-4 ימים | Frontend Developer |
| Phase 6 | 5-6 ימים | QA Engineer |
| Phase 7 | 2-3 ימים | DevOps Engineer |

**סה"כ: 30-39 ימי עבודה (6-8 שבועות)**

---

## Risk Assessment & Mitigation

### High Risk
- **Data Migration** - תכנון מדויק וגיבויים
- **Performance Impact** - אופטימיזציה ומוניטורינג

### Medium Risk  
- **User Adoption** - הדרכה וממשק אינטואיטיבי
- **Admin Complexity** - כלים פשוטים וברורים

### Low Risk
- **Technical Implementation** - שימוש בטכנולוגיות מוכרות

---

## Next Steps
1. ✅ אישור התכנית עם הצוות
2. 📝 הכנת PRD מפורט
3. 🎨 עיצוב UI/UX למסכים חדשים
4. 🚀 התחלת Phase 1

---

*תכנית זו נכתבה ברמת Senior Developer ומספקת מסלול מלא ומקצועי ליישום מערכת ניהול רכבים מתקדמת.*
