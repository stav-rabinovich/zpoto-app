# 📊 בדיקת תלותים - Zpoto Refactor

**תאריך:** 2025-10-29  
**כלי:** npx depcheck  

## 🎯 Frontend Client

### ❌ תלותים לא בשימוש:
- `@react-navigation/native-stack` - ייתכן שמשתמשים ב-stack navigator אחר
- `expo-file-system` - לא בשימוש פעיל
- `expo-image-picker` - לא בשימוש פעיל  
- `expo-updates` - לא בשימוש פעיל
- `react-native-reanimated` - לא בשימוש פעיל
- `react-native-vector-icons` - לא בשימוש פעיל

### ❌ Dev Dependencies לא בשימוש:
- `@babel/core` - ייתכן שנדרש לבניה
- `expo-module-scripts` - ייתכן שנדרש לבניה

### ⚠️ תלותים חסרים:
- `@expo/vector-icons` - נדרש ב-App.js
- `@react-native-netinfo/netinfo` - נדרש ב-services/fallback-old.js

## 🎯 Backend

### ⚠️ תלותים חסרים:
- `supertest` - נדרש לבדיקות integration

## 🎯 Frontend Admin

### ❌ Dev Dependencies לא בשימוש:
- `@types/react` - ייתכן שנדרש לTypeScript
- `@types/react-dom` - ייתכן שנדרש לTypeScript

### ⚠️ תלותים חסרים:
- `react-router-dom` - נדרש ב-SignaturePage.jsx

## 📋 פעולות מומלצות:

### ✅ לבדיקה נוספת:
1. לוודא שהתלותים "לא בשימוש" באמת לא נדרשים
2. לבדוק אם dev dependencies נדרשים לבניה
3. להתקין תלותים חסרים

### ❌ למחיקה (אחרי אימות):
- expo-file-system
- expo-image-picker  
- expo-updates
- react-native-reanimated (אם לא בשימוש)
- react-native-vector-icons (אם משתמשים ב-@expo/vector-icons)

### ➕ להתקנה:
```bash
# Frontend Client
npm install @expo/vector-icons @react-native-netinfo/netinfo

# Backend  
npm install --save-dev supertest

# Frontend Admin
npm install react-router-dom
```
