# תכנית מערכת הזמנות - עתידית ומיידית

## 🎯 סקירת הדרישות

### **1. הזמנה עתידית**
- **דרך:** חיפוש בדף הבית עם זמנים מוגדרים
- **רדיוס:** 1.5 ק"מ
- **מסך הזמנה:** זמנים קבועים (לא ניתן לעריכה)
- **זרימה:** חיפוש → בחירת חניה → הזמנה עם זמנים קבועים

### **2. הזמנה מיידית**
- **דרך:** כפתור "סביבי" (כבר מיושם!)
- **רדיוס:** 700 מטר
- **מינימום זמינות:** שעתיים (עם עיגול לרבע שעה הבאה)
- **מסך הזמנה:** זמנים עריכים (מוגבלים לאותו היום, מקסימום 12 שעות)
- **זרימה:** סביבי → בחירת חניה → הזמנה עם אפשרות עריכה

---

## 📋 ניתוח המערכת הקיימת

### **✅ מה כבר עובד מצוין:**
1. **כפתור סביבי** - מיושם ועובד עם חיפוש מיידי
2. **BookingScreen** - מסך הזמנה מלא עם TimePickerWheel
3. **useAvailability** - מערכת בדיקת זמינות מתקדמת
4. **SearchResultsScreen** - סינון זמינות מתקדם
5. **roundTo15Minutes** - פונקציית עיגול לרבע שעה

### **🔧 מה צריך להוסיף/לשנות:**
1. **זיהוי סוג הזמנה** - הבחנה בין immediate ו-future
2. **ניווט מחיפוש עתידי** - העברת פרמטרי זמן ל-BookingScreen
3. **התנהגות דינמית ב-BookingScreen** - UI שונה לכל סוג הזמנה
4. **הגבלות זמן למיידי** - מקסימום 12 שעות, אותו יום בלבד

---

## 🚀 התכנית המסודרת

### **STEP 1: הכנת הבסיס - ניווט ופרמטרים**
**משך זמן משוער: 30 דקות**

#### 1.1 עדכון ניווט מ-SearchResultsScreen
```javascript
// הוספה ל-SearchResultsScreen.js
navigation.navigate('Booking', {
  spot: { ... },
  bookingType: isImmediate ? 'immediate' : 'future',
  searchStartDate: startDateFromParams,   // רק להזמנה עתידית
  searchEndDate: endDateFromParams,       // רק להזמנה עתידית
  immediateDuration: 2                    // רק להזמנה מיידית
});
```

#### 1.2 עדכון ניווט מ-HomeScreen (חיפוש עתידי)
```javascript
// הוספה ל-HomeScreen.js בפונקציית runSearch
// העברת פרמטרי זמן לחיפוש עתידי
searchParams.bookingType = 'future';
searchParams.searchStartDate = selectedDate;
searchParams.searchEndDate = endDate;
```

#### 1.3 יצירת קבועים
```javascript
// קובץ חדש: constants/bookingTypes.js
export const BOOKING_TYPES = {
  IMMEDIATE: 'immediate',
  FUTURE: 'future'
};

export const IMMEDIATE_CONSTRAINTS = {
  MAX_HOURS: 12,
  MIN_HOURS: 2
};
```

---

### **STEP 2: התאמת BookingScreen**
**משך זמן משוער: 45 דקות**

#### 2.1 זיהוי סוג הזמנה
```javascript
// בתחילת BookingScreen.js
const bookingType = route?.params?.bookingType || BOOKING_TYPES.IMMEDIATE;
const isImmediate = bookingType === BOOKING_TYPES.IMMEDIATE;
const isFuture = bookingType === BOOKING_TYPES.FUTURE;

// פרמטרי זמן מהחיפוש
const searchStartDate = route?.params?.searchStartDate;
const searchEndDate = route?.params?.searchEndDate;
```

#### 2.2 לוגיקת התחלתיות זמנים
```javascript
// הגדרת זמנים התחלתיים
const initializeBookingTimes = () => {
  if (isFuture && searchStartDate && searchEndDate) {
    // הזמנה עתידית: זמנים קבועים מהחיפוש
    return {
      start: new Date(searchStartDate),
      end: new Date(searchEndDate),
      isEditable: false
    };
  } else {
    // הזמנה מיידית: זמן נוכחי מעוגל + שעתיים
    const now = new Date();
    const roundedStart = roundTo15Minutes(now);
    const defaultEnd = new Date(roundedStart.getTime() + (2 * 60 * 60 * 1000));
    
    return {
      start: roundedStart,
      end: roundTo15Minutes(defaultEnd),
      isEditable: true
    };
  }
};
```

#### 2.3 UI דינמי
```javascript
// הוספת באנר זיהוי
{bookingType === BOOKING_TYPES.IMMEDIATE && (
  <View style={styles.immediateBookingBanner}>
    <Text style={styles.bannerText}>⚡ הזמנה מיידית</Text>
    <Text style={styles.bannerSubtext}>ניתן לבחור עד 12 שעות מהיום</Text>
  </View>
)}

{bookingType === BOOKING_TYPES.FUTURE && (
  <View style={styles.futureBookingBanner}>
    <Text style={styles.bannerText}>📅 הזמנה עתידית</Text>
    <Text style={styles.bannerSubtext}>זמנים קבועים מהחיפוש</Text>
  </View>
)}
```

---

### **STEP 3: הגבלות זמן למיידי**
**משך זמן משוער: 40 דקות**

#### 3.1 עדכון TimePickerWheel
```javascript
// הוספה ל-TimePickerWheel.js
const getDateConstraints = (bookingType, baseDate) => {
  if (bookingType === BOOKING_TYPES.IMMEDIATE) {
    const today = new Date();
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 45, 0, 0); // עד 23:45 של אותו היום
    
    return {
      minimumDate: new Date(), // מעכשיו
      maximumDate: endOfDay,   // עד סוף היום
      maxHours: 12
    };
  }
  
  return {
    minimumDate: baseDate || new Date(),
    maximumDate: null,
    maxHours: null
  };
};
```

#### 3.2 ולידציה מתקדמת
```javascript
// ב-BookingScreen.js
const validateImmediateBooking = (startTime, endTime) => {
  const now = new Date();
  const maxTime = new Date(now);
  maxTime.setHours(23, 45, 0, 0);
  
  // בדיקה שההתחלה לא בעבר
  if (startTime <= now) {
    return {
      isValid: false,
      error: 'זמן ההתחלה חייב להיות בעתיד'
    };
  }
  
  // בדיקה שלא עובר את סוף היום
  if (endTime > maxTime) {
    return {
      isValid: false,
      error: 'ניתן להזמין רק עד סוף היום הנוכחי'
    };
  }
  
  // בדיקת מקסימום 12 שעות
  const diffHours = (endTime - startTime) / (1000 * 60 * 60);
  if (diffHours > 12) {
    return {
      isValid: false,
      error: 'ניתן להזמין מקסימום 12 שעות'
    };
  }
  
  return { isValid: true };
};
```

---

### **STEP 4: קיבוע זמנים לעתידי**
**משך זמן משוער: 20 דקות**

#### 4.1 ביטול עריכה בהזמנה עתידית
```javascript
// ב-BookingScreen.js
const handleTimePress = (type) => {
  if (bookingType === BOOKING_TYPES.FUTURE) {
    // הזמנה עתידית - אין אפשרות עריכה
    Alert.alert(
      'זמנים קבועים', 
      'בהזמנה עתידית לא ניתן לשנות את הזמנים. הזמנים נקבעו לפי החיפוש שביצעת.'
    );
    return;
  }
  
  // הזמנה מיידית - אפשר עריכה
  setPanelMode(type);
  setPanelVisible(true);
};
```

#### 4.2 UI מותאם
```javascript
// כפתורי זמן מותאמים
<TouchableOpacity
  style={[
    styles.timeButton,
    bookingType === BOOKING_TYPES.FUTURE && styles.timeButtonDisabled
  ]}
  onPress={() => handleTimePress('start')}
  disabled={bookingType === BOOKING_TYPES.FUTURE}
>
  <Text style={[
    styles.timeText,
    bookingType === BOOKING_TYPES.FUTURE && styles.timeTextDisabled
  ]}>
    {dayjs(start).format('DD/MM/YYYY HH:mm')}
  </Text>
  {bookingType === BOOKING_TYPES.IMMEDIATE && (
    <Ionicons name="pencil" size={16} color="#666" />
  )}
</TouchableOpacity>
```

---

### **STEP 5: שיפורי UX והודעות**
**משך זמן משוער: 25 דקות**

#### 5.1 הודעות הנחיה
```javascript
// הודעות דינמיות לפי סוג הזמנה
const getBookingInstructions = (bookingType) => {
  if (bookingType === BOOKING_TYPES.IMMEDIATE) {
    return {
      title: 'הזמנה מיידית',
      subtitle: 'ניתן לבחור זמן התחלה וסיום עד סוף היום (מקסימום 12 שעות)',
      icon: '⚡'
    };
  } else {
    return {
      title: 'הזמנה עתידית', 
      subtitle: 'הזמנים נקבעו לפי החיפוש שביצעת ולא ניתן לשנותם',
      icon: '📅'
    };
  }
};
```

#### 5.2 סטיילינג מותאם
```javascript
// סטיילים חדשים
const styles = StyleSheet.create({
  immediateBookingBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    margin: 16,
  },
  futureBookingBanner: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: '#3B82F6',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    margin: 16,
  },
  timeButtonDisabled: {
    opacity: 0.6,
    backgroundColor: '#f5f5f5',
  },
  timeTextDisabled: {
    color: '#999',
  }
});
```

---

### **STEP 6: בדיקות ותיקונים**
**משך זמן משוער: 30 דקות**

#### 6.1 בדיקות פונקציונליות
- [ ] **הזמנה מיידית:** וודא שזמנים מעוגלים ועריכים
- [ ] **הזמנה עתידית:** וודא שזמנים קבועים ולא עריכים
- [ ] **הגבלות זמן:** וודא מקסימום 12 שעות במיידי
- [ ] **ולידציות:** וודא שכל השגיאות מטופלות כהלכה

#### 6.2 בדיקות UX
- [ ] **באנרים:** וודא שמוצגים כהלכה לכל סוג
- [ ] **הודעות:** וודא שההודעות ברורות ומועילות
- [ ] **ניווט:** וודא שהמעבר בין מסכים חלק

#### 6.3 בדיקות edge cases
- [ ] **מעבר יום:** וודא שלא ניתן להזמין מעבר לחצות
- [ ] **זמן עבר:** וודא שלא ניתן להזמין בעבר
- [ ] **זמינות חניה:** וודא שהמערכת מכבדת זמינות החניה

---

## 🎯 תוצאה צפויה

### **חיפוש עתידי (מדף הבית)**
1. משתמש מזין מיקום + זמנים
2. רואה חניות זמינות ברדיוס 1.5 ק"מ
3. בוחר חניה → מועבר למסך הזמנה
4. **זמנים קבועים (לא ניתן לעריכה)**
5. מאשר הזמנה

### **חיפוש מיידי (כפתור סביבי)**
1. משתמש לוחץ "סביבי"
2. רואה חניות זמינות ברדיוס 700 מטר לשעתיים
3. בוחר חניה → מועבר למסך הזמנה  
4. **זמנים עריכים (מעוגלים לרבע שעה, מקסימום 12 שעות)**
5. יכול לשנות זמנים ומאשר הזמנה

---

## 📊 סיכום טכני

### **קבצים לעדכון:**
1. **SearchResultsScreen.js** - עדכון ניווט עם פרמטרים
2. **HomeScreen.js** - הוספת bookingType לחיפוש עתידי  
3. **BookingScreen.js** - לוגיקה דינמית לפי סוג הזמנה
4. **TimePickerWheel.js** - הגבלות זמן למיידי
5. **constants/bookingTypes.js** - קבועים חדשים

### **פיצ'רים חדשים:**
- ✅ זיהוי אוטומטי של סוג הזמנה
- ✅ זמנים קבועים בהזמנה עתידית
- ✅ זמנים עריכים בהזמנה מיידית (עם הגבלות)
- ✅ באנרים והודעות מותאמים
- ✅ ולידציות מתקדמות

### **יתרונות:**
- 🚀 **פשטות:** המשתמש יודע בדיוק מה הוא עושה
- 🎯 **דיוק:** אין בלבול בין סוגי הזמנה  
- 🛡️ **בטיחות:** הגבלות ברורות וולידציות
- 📱 **UX מעולה:** UI מותאם לכל מקרה שימוש

---

## 🚀 סדר יישום מומלץ

### **Week 1:**
- **יום 1-2:** STEP 1-2 (בסיס וזיהוי)
- **יום 3:** STEP 3 (הגבלות זמן)  
- **יום 4:** STEP 4 (קיבוע זמנים)
- **יום 5:** STEP 5-6 (UX ובדיקות)

### **תוצאה:**
מערכת הזמנות מושלמת עם הבחנה ברורה בין הזמנה מיידית לעתידית, UX מותאם וולידציות מתקדמות! 🎉
