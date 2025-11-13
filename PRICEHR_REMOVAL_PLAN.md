# תכנית מחיקת שדה priceHr - חזרה למקור אמת יחיד

## 🎯 מטרה
הסרת השדה `priceHr` והחזרת המערכת לשימוש במחירון המותאם אישית (`pricing` field) כמקור אמת יחיד.

## 📊 מצב נוכחי - בעיות שזוהו
1. **ברירות מחדל לא עקביות**: 15₪ בשרת, 0₪ בלקוח
2. **לוגיקה מסובכת**: הקוד בוחר בין שני מקורי מחיר
3. **מקור אמת לא ברור**: לא יודעים איזה מחיר הוא הנכון
4. **שגיאות בחישובים**: fallback למחיר שגוי

## 🔍 מיפוי שימושים קיימים

### Backend (צריך תיקון):
- `src/services/bookings.service.ts` - 9 מופעים של fallback ל-priceHr
- `src/services/parkings.service.ts` - 8 מופעים
- `src/services/extensions.service.ts` - 3 מופעים  
- `src/services/admin.service.ts` - ברירת מחדל 15₪
- `src/services/owner.service.ts` - 3 מופעים

### Frontend (צריך תיקון):
- `client/screens/SearchResultsScreen.js` - fallback בחיפוש
- `client/screens/OwnerListingDetailScreen.js` - תצוגה למשתמש
- `client/screens/OwnerMyListingsScreen.js` - רשימת חניות
- `client/screens/OwnerListingFormScreen.js` - ברירת מחדל 0₪
- `admin/src/Dashboard.jsx` - תצוגה באדמין

### Database Schema:
- `backend/prisma/schema.prisma` - שדה priceHr בטבלת Parking

## 🚀 תכנית ביצוע (5 שלבים)

### שלב 1: הכנת Migration לנתונים קיימים
```sql
-- וידוא שכל חניה יש לה מחירון תקין
UPDATE Parking 
SET pricing = JSON_OBJECT('hour1', priceHr, 'hour2', priceHr, 'hour3', priceHr) 
WHERE pricing IS NULL OR pricing = '';
```

### שלב 2: רפקטור Backend - הסרת fallbacks
1. עדכון `bookings.service.ts` - חישוב מחיר רק מ-pricing
2. עדכון `parkings.service.ts` - הסרת התייחסות ל-priceHr  
3. עדכון `extensions.service.ts` - שימוש רק במחירון
4. עדכון `admin.service.ts` - ברירת מחדל למחירון במקום priceHr
5. עדכון `owner.service.ts` - יצירה עם מחירון

### שלב 3: רפקטור Frontend  
1. עדכון חיפוש - הסרת fallback ל-priceHr
2. עדכון מסכי בעלי חניה - שימוש במחירון בלבד
3. עדכון אדמין - תצוגת המחירון במקום priceHr
4. עדכון טופס יצירה - מחירון במקום priceHr

### שלב 4: בדיקות מקיפות
1. וידוא שכל החישובים עובדים נכון
2. בדיקת תצוגה נכונה בממשק המשתמש  
3. בדיקת יצירת חניות חדשות
4. בדיקת הארכות ותשלומים

### שלב 5: הסרת השדה מהדאטאבייס
```sql
-- הסרת השדה מהטבלה (אחרי וידוא שהכל עובד)
ALTER TABLE Parking DROP COLUMN priceHr;
```

## ⚠️ סיכונים וטיפול בהם

### סיכון: מחירונים לא תקינים
- **פתרון**: migration שמוסיף מחירון ברירת מחדל
- **בדיקה**: סקריפט שבודק שכל חניה יש לה pricing תקין

### סיכון: שבירת תצוגה במסכים
- **פתרון**: עדכון הדרגתי של כל המסכים
- **בדיקה**: בדיקה מקיפה של כל הממשקים

### סיכון: שגיאות בחישובי מחיר
- **פתרון**: בדיקות מקיפות של כל תרחישי התמחור
- **בדיקה**: unit tests לכל פונקציות התמחור

## 📅 לוח זמנים מוצע
- **יום 1**: שלבים 1-2 (Migration + Backend)
- **יום 2**: שלב 3 (Frontend) 
- **יום 3**: שלב 4 (בדיקות מקיפות)
- **יום 4**: שלב 5 (הסרת השדה מDB)

## ✅ קריטריונים להצלחה
1. כל החישובים עובדים נכון ללא priceHr
2. כל התצוגות מציגות מחירים נכונים
3. יצירת חניות חדשות עובדת חלק
4. אין שגיאות בלוגים
5. ביצועים לא נפגעו

## 🎉 יתרונות צפויים
- **פשטות**: מקור אמת יחיד למחיר
- **עקביות**: כל המערכת משתמשת באותה לוגיקה  
- **גמישות**: תמיכה מלאה במחירון מותאם אישית
- **אמינות**: הסרת אי-עקביות ושגיאות חישוב
