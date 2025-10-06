import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

async function debugUsers() {
  console.log('🔍 בודק משתמשים בדאטאבייס...\n');
  
  try {
    // קבלת כל המשתמשים
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });
    
    console.log(`📊 נמצאו ${users.length} משתמשים:`);
    console.log('================================');
    
    users.forEach(user => {
      console.log(`👤 ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Created: ${user.createdAt}`);
      
      // יצירת טוקן לכל משתמש
      const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });
      console.log(`   Token: ${token.substring(0, 50)}...`);
      console.log('');
    });
    
    // יצירת טוקן בדיקה למשתמש הראשון
    if (users.length > 0) {
      const testUser = users[0];
      const testToken = jwt.sign({ sub: testUser.id }, JWT_SECRET, { expiresIn: '7d' });
      
      console.log('🧪 טוקן בדיקה:');
      console.log('================');
      console.log(`User ID: ${testUser.id}`);
      console.log(`Email: ${testUser.email}`);
      console.log(`Token: ${testToken}`);
      console.log('');
      console.log('📋 בדיקת API עם הטוקן הזה:');
      console.log(`curl -X GET http://10.0.0.23:4000/api/bookings -H "Authorization: Bearer ${testToken}"`);
    }
    
  } catch (error) {
    console.error('❌ שגיאה:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUsers();
