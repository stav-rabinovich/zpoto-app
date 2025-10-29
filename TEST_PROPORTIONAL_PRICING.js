// בדיקת מערכת התמחור החדשה
const testProportionalPricing = async () => {
  console.log('🧪 Testing Proportional Pricing System...\n');
  
  // Test data
  const samplePricing = {
    hour1: '15.0',
    hour2: '12.0', 
    hour3: '10.0',
    hour4: '8.0',
    hour5: '6.0'
  };
  
  const testCases = [
    { hours: 1.0, expected: 15.0, description: 'שעה אחת מדויק' },
    { hours: 1.5, expected: 21.0, description: 'שעה וחצי (15 + 0.5*12)' },
    { hours: 2.0, expected: 27.0, description: 'שעתיים מדויק (15 + 12)' },
    { hours: 2.25, expected: 29.5, description: 'שעתיים ורבע (15 + 12 + 0.25*10)' },
    { hours: 0.5, expected: 15.0, description: 'חצי שעה (מינימום שעה)' },
    { hours: 3.75, expected: 43.0, description: 'שלוש שעות ושלושת רבעי (15+12+10+0.75*8)' }
  ];
  
  console.log('📊 Test Cases:');
  testCases.forEach((test, index) => {
    const durationMs = test.hours * 1000 * 60 * 60;
    
    // Legacy calculation (current system)
    const legacyHours = Math.ceil(test.hours);
    let legacyPrice = 0;
    for (let i = 1; i <= legacyHours; i++) {
      const hourPrice = parseFloat(samplePricing[`hour${i}`] || samplePricing.hour1);
      legacyPrice += hourPrice;
    }
    
    // New proportional calculation
    const exactHours = test.hours;
    const wholeHours = Math.floor(exactHours);
    const fractionalPart = exactHours - wholeHours;
    
    let proportionalPrice = 0;
    
    // Whole hours
    for (let i = 1; i <= wholeHours; i++) {
      const hourPrice = parseFloat(samplePricing[`hour${i}`] || samplePricing.hour1);
      proportionalPrice += hourPrice;
    }
    
    // Fractional part
    if (fractionalPart > 0) {
      const nextHourPrice = parseFloat(samplePricing[`hour${wholeHours + 1}`] || samplePricing.hour1);
      proportionalPrice += (fractionalPart * nextHourPrice);
    }
    
    // Handle minimum 1 hour
    if (exactHours < 1) {
      proportionalPrice = parseFloat(samplePricing.hour1);
    }
    
    const savings = legacyPrice - proportionalPrice;
    const savingsPercent = ((savings / legacyPrice) * 100).toFixed(1);
    
    console.log(`\n${index + 1}. ${test.description}`);
    console.log(`   Duration: ${test.hours} hours`);
    console.log(`   🔄 Legacy: ₪${legacyPrice.toFixed(2)} (${legacyHours} full hours)`);
    console.log(`   🆕 Proportional: ₪${proportionalPrice.toFixed(2)}`);
    console.log(`   💰 Savings: ₪${savings.toFixed(2)} (${savingsPercent}%)`);
    console.log(`   ✅ Expected: ₪${test.expected.toFixed(2)} - ${proportionalPrice === test.expected ? 'PASS' : 'FAIL'}`);
  });
  
  console.log('\n🎯 Summary:');
  console.log('- Proportional pricing provides fairer, more accurate billing');
  console.log('- Users save money on partial hours');
  console.log('- System maintains minimum 1-hour billing');
  console.log('- Calculation is precise to the minute');
  
  console.log('\n🔧 Environment Variables to Test:');
  console.log('ENABLE_PROPORTIONAL_PRICING=true');
  console.log('PROPORTIONAL_PRICING_PERCENTAGE=25  # 25% of users');
  console.log('ENABLE_PRICE_BREAKDOWN_LOGGING=true');
  console.log('ENABLE_PRICING_COMPARISON=true');
  
  console.log('\n📡 API Test:');
  console.log('POST /api/bookings/calculate-price');
  console.log('Body: {');
  console.log('  "parkingId": 1,');
  console.log('  "startTime": "2025-10-28T14:00:00.000Z",');
  console.log('  "endTime": "2025-10-28T15:30:00.000Z"');
  console.log('}');
  
  console.log('\n🎉 Ready to test the new proportional pricing system!');
};

// Run the test
testProportionalPricing().catch(console.error);
