// בדיקה מהירה של API להזמנות משתמש
const testUserBookingsAPI = async () => {
  try {
    console.log('🔍 Testing user bookings API...');
    
    // נבדוק עם משתמש ID 1 (או כל ID שקיים)
    const userId = 1;
    const url = `http://localhost:4000/api/admin/users/${userId}?includeFullBookingHistory=true`;
    
    console.log('📡 Fetching:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer YOUR_ADMIN_TOKEN_HERE`, // צריך להחליף עם טוקן אמיתי
      },
    });
    
    console.log('📊 Response status:', response.status);
    
    if (!response.ok) {
      console.error('❌ API Error:', response.statusText);
      return;
    }
    
    const data = await response.json();
    console.log('📋 Full API Response:');
    console.log(JSON.stringify(data, null, 2));
    
    // בדיקת מבנה הנתונים
    if (data.data) {
      console.log('\n🎯 User data structure:');
      console.log('- User ID:', data.data.id);
      console.log('- User name:', data.data.name);
      console.log('- User email:', data.data.email);
      console.log('- Bookings count:', data.data.bookings ? data.data.bookings.length : 0);
      
      if (data.data.bookings && data.data.bookings.length > 0) {
        console.log('\n📝 First booking example:');
        console.log(JSON.stringify(data.data.bookings[0], null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

// הרץ את הבדיקה
testUserBookingsAPI();

console.log(`
🔧 הוראות שימוש:
1. הפעל את השרת: cd backend && npm run dev
2. קבל טוקן אדמין מהקונסול או מהדפדפן
3. החלף את YOUR_ADMIN_TOKEN_HERE בטוקן האמיתי
4. הרץ: node DEBUG_USER_BOOKINGS.js
`);
