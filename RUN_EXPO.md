# 🚀 הרצת Expo עם QR Code

## פקודות להעתקה

### שלב 1: פתח טרמינל חדש

לחץ `Command + Space`, כתוב `Terminal`, לחץ Enter

### שלב 2: נווט לתיקיית הפרויקט

```bash
cd /Users/stavrabinovich/Desktop/Zpoto-app/frontend/client
```

### שלב 3: הרץ את Expo

```bash
npx expo start
```

או אם זה לא עובד:

```bash
npm start
```

### שלב 4: סרוק את ה-QR Code

1. **באייפון**: פתח את אפליקציית המצלמה וסרוק את ה-QR Code
2. **באנדרואיד**: פתח את אפליקציית Expo Go וסרוק את ה-QR Code

---

## 🔄 פקודות שימושיות

כשהאפליקציה רצה, תוכל ללחוץ:

- **`r`** - Reload (רענון)
- **`m`** - תפריט
- **`c`** - ניקוי cache
- **`q`** - יציאה

---

## 🆘 אם משהו לא עובד

### אם אין QR Code:

```bash
cd /Users/stavrabinovich/Desktop/Zpoto-app/frontend/client
npx expo start --tunnel
```

### אם יש שגיאות:

```bash
cd /Users/stavrabinovich/Desktop/Zpoto-app/frontend/client
rm -rf node_modules
npm install
npx expo start
```
