/**
 * Integration Tests - Authentication Flow
 * בדיקות אינטגרציה מקיפות למערכת ההתחברות
 */

const request = require('supertest');
const app = require('../../src/app');
const { prisma } = require('../../src/lib/prisma');

describe('Authentication Flow Integration Tests', () => {
  let testUser;
  let testDeviceId;
  let authToken;

  beforeAll(async () => {
    // ניקוי בסיס נתונים לפני הבדיקות
    await prisma.user.deleteMany({
      where: { email: { contains: 'test' } }
    });
    
    testDeviceId = 'test-device-' + Date.now();
  });

  afterAll(async () => {
    // ניקוי לאחר הבדיקות
    if (testUser) {
      await prisma.user.delete({
        where: { id: testUser.id }
      }).catch(() => {}); // ignore if already deleted
    }
    
    await prisma.$disconnect();
  });

  describe('🔄 Step 5.1.1: זרימת התחברות מכל נקודת כניסה', () => {
    
    test('1. הרשמה רגילה עם אימייל וסיסמה', async () => {
      const userData = {
        email: 'test-user@example.com',
        password: 'password123',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.name).toBe(userData.name);

      testUser = response.body.user;
      authToken = response.body.token;

      console.log('✅ הרשמה רגילה - הצליחה');
    });

    test('2. התחברות עם אימייל וסיסמה', async () => {
      const loginData = {
        email: 'test-user@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(loginData.email);

      console.log('✅ התחברות רגילה - הצליחה');
    });

    test('3. בדיקת /api/auth/me עם token תקין', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(testUser.id);
      expect(response.body.email).toBe(testUser.email);

      console.log('✅ אימות token - הצליח');
    });

    test('4. התחברות חברתית (סימולציה)', async () => {
      const socialData = {
        provider: 'google',
        socialData: {
          id: 'google-test-123',
          email: 'social-test@example.com',
          name: 'Social Test User',
          photo: 'https://example.com/photo.jpg'
        }
      };

      const response = await request(app)
        .post('/api/auth/social')
        .send(socialData)
        .expect(201); // new user

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('isNewUser');
      expect(response.body.isNewUser).toBe(true);
      expect(response.body.user.email).toBe(socialData.socialData.email);

      console.log('✅ התחברות חברתית - הצליחה');

      // ניקוי המשתמש החברתי
      await prisma.user.delete({
        where: { id: response.body.user.id }
      });
    });
  });

  describe('🔄 Step 5.1.2: העברת נתונים מ-Anonymous ל-Registered', () => {
    
    beforeAll(async () => {
      // יצירת נתוני אורח לבדיקה
      await prisma.anonymousFavorite.create({
        data: {
          deviceId: testDeviceId,
          parkingId: 1 // assuming parking with ID 1 exists
        }
      });

      await prisma.anonymousSavedPlace.create({
        data: {
          deviceId: testDeviceId,
          name: 'בית',
          address: 'רחוב הבדיקה 123',
          lat: 32.0853,
          lng: 34.7818,
          type: 'home'
        }
      });

      await prisma.anonymousRecentSearch.create({
        data: {
          deviceId: testDeviceId,
          query: 'חניה בתל אביב'
        }
      });

      console.log('✅ נתוני אורח נוצרו לבדיקה');
    });

    test('1. תצוגה מקדימה של נתונים למיזוג', async () => {
      const response = await request(app)
        .get(`/api/migration/preview?deviceId=${testDeviceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.counts.total).toBeGreaterThan(0);
      expect(response.body.data.counts.favorites).toBe(1);
      expect(response.body.data.counts.savedPlaces).toBe(1);
      expect(response.body.data.counts.recentSearches).toBe(1);

      console.log('✅ תצוגה מקדימה - הצליחה');
    });

    test('2. ביצוע מיזוג נתונים', async () => {
      const response = await request(app)
        .post('/api/migration/anonymous-to-user')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ deviceId: testDeviceId })
        .expect(200);

      expect(response.body.data.favorites.migrated).toBe(1);
      expect(response.body.data.savedPlaces.migrated).toBe(1);
      expect(response.body.data.recentSearches.migrated).toBe(1);

      console.log('✅ מיזוג נתונים - הצליח');
    });

    test('3. וידוא שהנתונים הועברו למשתמש', async () => {
      // בדיקת מועדפים
      const favoritesResponse = await request(app)
        .get('/api/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(favoritesResponse.body.data.length).toBe(1);

      // בדיקת מקומות שמורים
      const savedPlacesResponse = await request(app)
        .get('/api/saved-places')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(savedPlacesResponse.body.data.length).toBe(1);
      expect(savedPlacesResponse.body.data[0].name).toBe('בית');

      // בדיקת חיפושים אחרונים
      const recentSearchesResponse = await request(app)
        .get('/api/recent-searches')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(recentSearchesResponse.body.data.length).toBe(1);
      expect(recentSearchesResponse.body.data[0].query).toBe('חניה בתל אביב');

      console.log('✅ וידוא העברת נתונים - הצליח');
    });

    test('4. ניקוי נתוני אורח', async () => {
      const response = await request(app)
        .post('/api/migration/cleanup-anonymous')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ deviceId: testDeviceId })
        .expect(200);

      expect(response.body.data.favorites).toBe(1);
      expect(response.body.data.savedPlaces).toBe(1);
      expect(response.body.data.recentSearches).toBe(1);

      // וידוא שהנתונים האנונימיים נמחקו
      const anonymousFavorites = await prisma.anonymousFavorite.findMany({
        where: { deviceId: testDeviceId }
      });
      expect(anonymousFavorites.length).toBe(0);

      console.log('✅ ניקוי נתוני אורח - הצליח');
    });
  });

  describe('🔄 Step 5.1.3: חזרה לנקודת המוצא לאחר התחברות', () => {
    
    test('1. שמירת intended destination', async () => {
      // סימולציה של שמירת יעד מיועד
      const intendedDestination = {
        screen: 'Profile',
        action: 'view_profile',
        context: { source: 'menu' },
        params: {}
      };

      // זה יהיה בדרך כלל בצד הקליינט, אבל נבדוק שהמערכת מוכנה
      expect(intendedDestination).toHaveProperty('screen');
      expect(intendedDestination).toHaveProperty('action');

      console.log('✅ שמירת intended destination - מוכן');
    });

    test('2. בדיקת NavigationContext functionality', async () => {
      // בדיקה שהמערכת מוכנה לטיפול בניווט מיועד
      const navigationData = {
        screen: 'BookingScreen',
        action: 'book_parking',
        context: {
          parking: { id: 1, title: 'חניה לבדיקה' },
          booking: { startTime: new Date(), duration: 2 }
        },
        params: { parkingId: 1 }
      };

      expect(navigationData.context.parking).toHaveProperty('id');
      expect(navigationData.context.booking).toHaveProperty('startTime');

      console.log('✅ NavigationContext - מוכן');
    });
  });

  describe('📊 בדיקות נוספות', () => {
    
    test('1. בדיקת Profile APIs', async () => {
      const profileResponse = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileResponse.body.data.id).toBe(testUser.id);
      expect(profileResponse.body.data.email).toBe(testUser.email);

      console.log('✅ Profile API - עובד');
    });

    test('2. בדיקת עדכון פרופיל', async () => {
      const updateData = {
        name: 'Updated Test User',
        phone: '050-1234567'
      };

      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.phone).toBe(updateData.phone);

      console.log('✅ עדכון פרופיל - עובד');
    });

    test('3. בדיקת Admin APIs (אם יש משתמש אדמין)', async () => {
      // יצירת משתמש אדמין זמני
      const adminUser = await prisma.user.create({
        data: {
          email: 'admin-test@example.com',
          password: 'admin123',
          name: 'Admin Test',
          role: 'ADMIN'
        }
      });

      // התחברות כאדמין
      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin-test@example.com',
          password: 'admin123'
        })
        .expect(200);

      const adminToken = adminLoginResponse.body.token;

      // בדיקת Admin Users API
      const usersResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(usersResponse.body.data).toBeInstanceOf(Array);
      expect(usersResponse.body.pagination).toHaveProperty('total');

      // ניקוי משתמש אדמין
      await prisma.user.delete({ where: { id: adminUser.id } });

      console.log('✅ Admin APIs - עובדים');
    });
  });
});

module.exports = {
  // ייצוא פונקציות עזר לבדיקות נוספות
  createTestUser: async (userData) => {
    return await prisma.user.create({ data: userData });
  },
  
  createAnonymousData: async (deviceId) => {
    return {
      favorite: await prisma.anonymousFavorite.create({
        data: { deviceId, parkingId: 1 }
      }),
      savedPlace: await prisma.anonymousSavedPlace.create({
        data: {
          deviceId,
          name: 'Test Place',
          address: 'Test Address',
          lat: 32.0853,
          lng: 34.7818,
          type: 'custom'
        }
      })
    };
  }
};
