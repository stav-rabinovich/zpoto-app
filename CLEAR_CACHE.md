# 🧹 ניקוי Cache באפליקציה

## הבעיה:
האפליקציה עדיין חושבת שאתה OWNER כי יש נתונים ישנים ב-AsyncStorage (זיכרון מקומי).

## הפתרון:

### אופציה 1: ניקוי Cache מהאפליקציה (מומלץ)

1. **באפליקציה פתוחה**, לחץ על התפריט (שלוש נקודות למעלה)
2. בחר **"Settings"** או **"הגדרות"**
3. לחץ על **"Clear Cache"** או **"נקה זיכרון"**
4. סגור את האפליקציה לגמרי
5. פתח מחדש

### אופציה 2: התנתקות והתחברות מחדש

1. באפליקציה, לך ל**"פרופיל"**
2. לחץ על **"התנתק"** או **"Logout"**
3. התחבר מחדש עם:
   - Email: `owner@example.com`
   - Password: הסיסמה שלך

### אופציה 3: ניקוי Cache מ-Expo (הכי יעיל)

בטרמינל של Expo (שם שרץ `npx expo start`), לחץ:

```
c
```

זה ינקה את כל ה-cache. אחר כך:

```
r
```

זה יעשה reload לאפליקציה.

### אופציה 4: מחיקה מלאה והתקנה מחדש (אם כל השאר לא עובד)

1. מחק את האפליקציה מהמכשיר
2. בטרמינל:
```bash
cd /Users/stavrabinovich/Desktop/Zpoto-app/frontend/client
npx expo start --clear
```
3. סרוק את ה-QR Code מחדש

---

## ✅ איך לדעת שזה עבד?

לאחר הניקוי, כשתיכנס ל**"בעל חניה - התחילו להשכיר"**:

- ❌ **לא אמור** להיות: "ברוך הבא" + כפתורים לניהול
- ✅ **אמור** להיות: "טרם נרשמת" + כפתור "הגש בקשה"

---

## 🔍 בדיקה נוספת - וודא שה-role שונה

```bash
cd /Users/stavrabinovich/Desktop/Zpoto-app/backend
npx ts-node prisma/change-role.ts owner@example.com USER
```

אמור להדפיס:
```
✅ Updated user owner@example.com:
   Role: OWNER → USER
```

או:
```
✅ Updated user owner@example.com:
   Role: USER → USER
```

אם זה אומר `USER → USER`, אז ה-role כבר נכון והבעיה היא רק ב-cache של האפליקציה.
