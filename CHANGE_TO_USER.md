# 🔄 שינוי מ-OWNER ל-USER

## ✅ המייל שלך: `stav.rabinovich@gmail.com`

---

## 📋 כבר עשיתי את זה בשבילך!

שיניתי את המשתמש `stav.rabinovich@gmail.com` מ-OWNER ל-USER.

---

## 🔄 מה עכשיו?

### שלב 1: רענן את האפליקציה

לחץ `R` באפליקציה (או `r` בטרמינל של Expo)

### שלב 2: התנתק והתחבר מחדש (מומלץ)

1. באפליקציה → לך ל"פרופיל"
2. לחץ "התנתק"
3. התחבר מחדש עם:
   - Email: `stav.rabinovich@gmail.com`
   - Password: הסיסמה שלך

### שלב 3: בדוק שזה עבד

לך ל"בעל חניה - התחילו להשכיר"

אמור לראות: **"טרם נרשמת"** + כפתור "הגש בקשה"

---

## 📊 כל המשתמשים במערכת:

1. `owner@example.com` - USER
2. `admin@zpoto.com` - ADMIN
3. `demo@zpoto.com` - OWNER
4. `test@test.com` - USER
5. `stav.rabinovich@gmail.com` - USER ⬅️ **זה אתה!**

לחץ Enter

### שלב 3: בדוק שהצליח

אתה אמור לראות:

```
✅ Updated user owner@example.com:
   Role: OWNER → USER
```

---

## ✅ זהו! עכשיו אתה USER

### מה הלאה?

1. **באפליקציה**: התחבר עם `owner@example.com`
2. **לך ל**: "הפוך לבעל חניה"
3. **מלא את הטופס**: שם, מייל, טלפון, כתובת
4. **שלח בקשה**
5. **באדמין**: אשר את הבקשה שלך
6. **רענן את האפליקציה**: לחץ `R` בטרמינל של Expo

---

## 🔙 אם תרצה לחזור ל-OWNER

```bash
cd /Users/stavrabinovich/Desktop/Zpoto-app/backend
npx ts-node prisma/change-role.ts owner@example.com OWNER
```

---

## 🆘 אם משהו לא עובד

1. וודא שהשרת רץ (`npm run dev` בתיקיית backend)
2. וודא שהמייל נכון: `owner@example.com`
3. בדוק שאתה בתיקייה הנכונה (`pwd` צריך להראות: `/Users/stavrabinovich/Desktop/Zpoto-app/backend`)
