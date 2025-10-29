// בדיקה מהירה של API החדש
const testAPI = async () => {
  console.log('🧪 Testing new pricing API...');
  
  try {
    const response = await fetch('http://localhost:4000/api/bookings/calculate-price', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // צריך טוקן אמיתי
      },
      body: JSON.stringify({
        parkingId: 1,
        startTime: '2025-10-28T14:00:00.000Z',
        endTime: '2025-10-28T15:30:00.000Z'
      })
    });
    
    console.log('📡 Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ API Error:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Network Error:', error.message);
  }
};

testAPI();
