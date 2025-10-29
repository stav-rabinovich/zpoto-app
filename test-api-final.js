// בדיקה סופית של ה-API
const testAPI = async () => {
  console.log('🧪 Testing pricing API...');
  
  try {
    const response = await fetch('http://localhost:4000/api/bookings/calculate-price', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // נצטרך טוקן אמיתי
      },
      body: JSON.stringify({
        parkingId: 1, // רוטשילד 21 עם מחירון מדורג
        startTime: '2025-10-28T14:00:00.000Z',
        endTime: '2025-10-28T15:30:00.000Z' // 1.5 שעות
      })
    });
    
    console.log('📡 Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Success:', JSON.stringify(data, null, 2));
      
      if (data.method === 'proportional') {
        console.log('🎉 Proportional pricing working!');
        console.log(`💰 Price: ₪${data.totalPriceILS} (${data.exactHours} hours)`);
        console.log(`📋 Breakdown: ${data.formatted}`);
      }
    } else {
      const errorText = await response.text();
      console.log('❌ API Error:', response.status, errorText);
    }
    
  } catch (error) {
    console.error('❌ Network Error:', error.message);
  }
};

testAPI();
