# 🚀 הפעלה מהירה - Zpoto App

## ✅ הכל מוכן! השרת והאדמין רצים

### 📊 כתובות:
- **Backend**: http://localhost:4000
- **Admin**: http://localhost:5173

---

## 🔄 אם משהו לא עובד:

### 1️⃣ הפעל מחדש הכל:
```bash
cd /Users/stavrabinovich/Desktop/Zpoto-app
./START_ALL.sh
```

### 2️⃣ בדוק לוגים:
```bash
# Backend logs
tail -f /tmp/zpoto-backend.log

# Admin logs
tail -f /tmp/zpoto-admin.log
```

### 3️⃣ הפעל ידנית:

**Backend:**
```bash
cd /Users/stavrabinovich/Desktop/Zpoto-app/backend
npm run dev
```

**Admin:**
```bash
cd /Users/stavrabinovich/Desktop/Zpoto-app/frontend/admin
npm run dev
```

**Expo (Client):**
```bash
cd /Users/stavrabinovich/Desktop/Zpoto-app/frontend/client
npx expo start
```

---

## 🛑 עצירת השרתים:

```bash
# Kill all
pkill -f "ts-node-dev"
pkill -f "vite"
lsof -ti:4000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

---

## 📱 האפליקציה (Expo):

1. **פתח טרמינל חדש**
2. **הרץ:**
   ```bash
   cd /Users/stavrabinovich/Desktop/Zpoto-app/frontend/client
   npx expo start
   ```
3. **סרוק QR Code**

---

## ✅ מצב נוכחי:

- ✅ Backend רץ על פורט **4000**
- ✅ Admin רץ על פורט **5173**
- ✅ המייל שלך: `stav.rabinovich@gmail.com` - **USER**

---

## 🔄 החזרה ל-OWNER:

```bash
cd /Users/stavrabinovich/Desktop/Zpoto-app/backend
npx ts-node prisma/change-role.ts stav.rabinovich@gmail.com OWNER
```

---

**הכל רץ! פתח את האדמין ב-http://localhost:5173 🚀**
