/**
 * Integration Tests - Social Login
 * בדיקות אינטגרציה למערכת התחברות חברתית
 */

const request = require('supertest');
const app = require('../../src/app');
const { prisma } = require('../../src/lib/prisma');

describe('Social Login Integration Tests', () => {
  let createdUsers = [];

  afterAll(async () => {
    // ניקוי כל המשתמשים שנוצרו בבדיקות
    for (const user of createdUsers) {
      await prisma.user.delete({
        where: { id: user.id }
      }).catch(() => {}); // ignore if already deleted
    }
    
    await prisma.$disconnect();
  });

  describe('🔄 Step 5.2.1: בדיקת התחברות Google', () => {
    
    test('1. התחברות Google - משתמש חדש', async () => {
      const googleData = {
        provider: 'google',
        socialData: {
          id: 'google-test-new-user',
          email: 'google-new@example.com',
          name: 'Google New User',
          photo: 'https://lh3.googleusercontent.com/test'
        }
      };

      const response = await request(app)
        .post('/api/auth/social')
        .send(googleData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('isNewUser');
      expect(response.body.isNewUser).toBe(true);
      expect(response.body.user.email).toBe(googleData.socialData.email);
      expect(response.body.user.name).toBe(googleData.socialData.name);
      expect(response.body.user.googleId).toBe(googleData.socialData.id);
      expect(response.body.user.profilePicture).toBe(googleData.socialData.photo);

      createdUsers.push(response.body.user);
      console.log('✅ Google - משתמש חדש - הצליח');
    });

    test('2. התחברות Google - משתמש קיים', async () => {
      const googleData = {
        provider: 'google',
        socialData: {
          id: 'google-test-new-user', // אותו ID מהבדיקה הקודמת
          email: 'google-new@example.com',
          name: 'Google New User Updated',
          photo: 'https://lh3.googleusercontent.com/test-updated'
        }
      };

      const response = await request(app)
        .post('/api/auth/social')
        .send(googleData)
        .expect(200); // existing user

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('isNewUser');
      expect(response.body.isNewUser).toBe(false);
      expect(response.body.user.email).toBe(googleData.socialData.email);

      console.log('✅ Google - משתמש קיים - הצליח');
    });

    test('3. Google - בדיקת שגיאות', async () => {
      // נתונים לא תקינים
      const invalidData = {
        provider: 'google',
        socialData: {
          // חסר ID
          email: 'invalid@example.com'
        }
      };

      await request(app)
        .post('/api/auth/social')
        .send(invalidData)
        .expect(400);

      console.log('✅ Google - טיפול בשגיאות - עובד');
    });
  });

  describe('🔄 Step 5.2.2: בדיקת התחברות Facebook', () => {
    
    test('1. התחברות Facebook - משתמש חדש', async () => {
      const facebookData = {
        provider: 'facebook',
        socialData: {
          id: 'facebook-test-123',
          email: 'facebook-test@example.com',
          name: 'Facebook Test User',
          photo: 'https://graph.facebook.com/test/picture'
        }
      };

      const response = await request(app)
        .post('/api/auth/social')
        .send(facebookData)
        .expect(201);

      expect(response.body.isNewUser).toBe(true);
      expect(response.body.user.facebookId).toBe(facebookData.socialData.id);
      expect(response.body.user.email).toBe(facebookData.socialData.email);

      createdUsers.push(response.body.user);
      console.log('✅ Facebook - משתמש חדש - הצליח');
    });

    test('2. Facebook - משתמש ללא אימייל', async () => {
      const facebookDataNoEmail = {
        provider: 'facebook',
        socialData: {
          id: 'facebook-no-email-123',
          name: 'Facebook No Email User'
          // אין אימייל
        }
      };

      const response = await request(app)
        .post('/api/auth/social')
        .send(facebookDataNoEmail)
        .expect(400);

      expect(response.body.error).toContain('Email is required');

      console.log('✅ Facebook - ללא אימייל - טופל נכון');
    });
  });

  describe('🔄 Step 5.2.3: בדיקת התחברות Apple', () => {
    
    test('1. התחברות Apple - משתמש חדש', async () => {
      const appleData = {
        provider: 'apple',
        socialData: {
          id: 'apple-test-user-123',
          email: 'apple-test@privaterelay.appleid.com',
          name: 'Apple Test User'
        }
      };

      const response = await request(app)
        .post('/api/auth/social')
        .send(appleData)
        .expect(201);

      expect(response.body.isNewUser).toBe(true);
      expect(response.body.user.appleId).toBe(appleData.socialData.id);
      expect(response.body.user.email).toBe(appleData.socialData.email);

      createdUsers.push(response.body.user);
      console.log('✅ Apple - משתמש חדש - הצליח');
    });

    test('2. Apple - עם אימייל מוסתר', async () => {
      const appleDataHiddenEmail = {
        provider: 'apple',
        socialData: {
          id: 'apple-hidden-email-123',
          email: 'hidden-email@privaterelay.appleid.com',
          name: null // Apple לפעמים לא מחזיר שם
        }
      };

      const response = await request(app)
        .post('/api/auth/social')
        .send(appleDataHiddenEmail)
        .expect(201);

      expect(response.body.user.appleId).toBe(appleDataHiddenEmail.socialData.id);
      expect(response.body.user.name).toBeNull();

      createdUsers.push(response.body.user);
      console.log('✅ Apple - אימייל מוסתר - הצליח');
    });
  });

  describe('🔄 Step 5.3: בדיקות Profile Auto-Fill', () => {
    
    test('1. מילוי אוטומטי מלא - Google', async () => {
      const completeGoogleData = {
        provider: 'google',
        socialData: {
          id: 'google-complete-profile',
          email: 'complete-profile@gmail.com',
          name: 'Complete Profile User',
          photo: 'https://lh3.googleusercontent.com/complete'
        }
      };

      const response = await request(app)
        .post('/api/auth/social')
        .send(completeGoogleData)
        .expect(201);

      const user = response.body.user;
      expect(user.name).toBe(completeGoogleData.socialData.name);
      expect(user.email).toBe(completeGoogleData.socialData.email);
      expect(user.profilePicture).toBe(completeGoogleData.socialData.photo);
      expect(user.googleId).toBe(completeGoogleData.socialData.id);

      createdUsers.push(user);
      console.log('✅ מילוי אוטומטי מלא - הצליח');
    });

    test('2. מילוי חלקי - חסרים שדות', async () => {
      const partialData = {
        provider: 'facebook',
        socialData: {
          id: 'facebook-partial-123',
          email: 'partial@example.com'
          // חסרים name ו-photo
        }
      };

      const response = await request(app)
        .post('/api/auth/social')
        .send(partialData)
        .expect(201);

      const user = response.body.user;
      expect(user.email).toBe(partialData.socialData.email);
      expect(user.name).toBeNull();
      expect(user.profilePicture).toBeNull();

      createdUsers.push(user);
      console.log('✅ מילוי חלקי - הצליח');
    });

    test('3. עדכון פרופיל קיים', async () => {
      // יצירת משתמש קיים
      const existingUser = await prisma.user.create({
        data: {
          email: 'existing-social@example.com',
          name: 'Old Name',
          googleId: 'google-existing-123'
        }
      });

      createdUsers.push(existingUser);

      // התחברות עם נתונים מעודכנים
      const updatedData = {
        provider: 'google',
        socialData: {
          id: 'google-existing-123',
          email: 'existing-social@example.com',
          name: 'Updated Name',
          photo: 'https://new-photo.com/pic.jpg'
        }
      };

      const response = await request(app)
        .post('/api/auth/social')
        .send(updatedData)
        .expect(200);

      expect(response.body.isNewUser).toBe(false);
      
      // בדיקה שהפרופיל עודכן
      const updatedUser = await prisma.user.findUnique({
        where: { id: existingUser.id }
      });

      expect(updatedUser.name).toBe('Updated Name');
      expect(updatedUser.profilePicture).toBe('https://new-photo.com/pic.jpg');

      console.log('✅ עדכון פרופיל קיים - הצליח');
    });
  });

  describe('🔄 בדיקות מתקדמות', () => {
    
    test('1. מיזוג נתונים עם התחברות חברתית', async () => {
      const deviceId = 'social-test-device-' + Date.now();
      
      // יצירת נתוני אורח
      await prisma.anonymousFavorite.create({
        data: {
          deviceId,
          parkingId: 1
        }
      });

      // התחברות חברתית
      const socialData = {
        provider: 'google',
        socialData: {
          id: 'google-migration-test',
          email: 'migration-test@gmail.com',
          name: 'Migration Test User'
        }
      };

      const authResponse = await request(app)
        .post('/api/auth/social')
        .send(socialData)
        .expect(201);

      const token = authResponse.body.token;
      createdUsers.push(authResponse.body.user);

      // ביצוע מיזוג
      const migrationResponse = await request(app)
        .post('/api/migration/anonymous-to-user')
        .set('Authorization', `Bearer ${token}`)
        .send({ deviceId })
        .expect(200);

      expect(migrationResponse.body.data.favorites.migrated).toBe(1);

      console.log('✅ מיזוג עם התחברות חברתית - הצליח');
    });

    test('2. בדיקת provider לא תקין', async () => {
      const invalidProvider = {
        provider: 'invalid-provider',
        socialData: {
          id: 'test-123',
          email: 'test@example.com'
        }
      };

      await request(app)
        .post('/api/auth/social')
        .send(invalidProvider)
        .expect(400);

      console.log('✅ provider לא תקין - טופל נכון');
    });

    test('3. בדיקת אבטחה - ID כפול', async () => {
      // יצירת משתמש Google
      const googleUser = await prisma.user.create({
        data: {
          email: 'security-test@gmail.com',
          googleId: 'google-security-123'
        }
      });

      createdUsers.push(googleUser);

      // ניסיון יצירת משתמש אחר עם אותו Google ID
      const duplicateData = {
        provider: 'google',
        socialData: {
          id: 'google-security-123', // אותו ID
          email: 'different-email@gmail.com'
        }
      };

      const response = await request(app)
        .post('/api/auth/social')
        .send(duplicateData)
        .expect(200); // אמור לחזור למשתמש הקיים

      expect(response.body.user.id).toBe(googleUser.id);
      expect(response.body.isNewUser).toBe(false);

      console.log('✅ אבטחה - ID כפול - טופל נכון');
    });
  });
});

// פונקציות עזר לבדיקות
const TestHelpers = {
  createSocialUserData: (provider, customData = {}) => {
    const baseData = {
      google: {
        id: `google-${Date.now()}`,
        email: `google-test-${Date.now()}@gmail.com`,
        name: 'Google Test User',
        photo: 'https://lh3.googleusercontent.com/test'
      },
      facebook: {
        id: `facebook-${Date.now()}`,
        email: `facebook-test-${Date.now()}@facebook.com`,
        name: 'Facebook Test User',
        photo: 'https://graph.facebook.com/test/picture'
      },
      apple: {
        id: `apple-${Date.now()}`,
        email: `apple-test-${Date.now()}@privaterelay.appleid.com`,
        name: 'Apple Test User'
      }
    };

    return {
      provider,
      socialData: { ...baseData[provider], ...customData }
    };
  },

  cleanupTestUsers: async (userIds) => {
    for (const id of userIds) {
      await prisma.user.delete({ where: { id } }).catch(() => {});
    }
  }
};

module.exports = TestHelpers;
