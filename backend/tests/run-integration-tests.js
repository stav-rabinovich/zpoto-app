/**
 * Integration Tests Runner
 * מריץ את כל בדיקות האינטגרציה למערכת ההתחברות
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 מתחיל בדיקות אינטגרציה למערכת ההתחברות\n');

const testFiles = [
  'auth-flow.test.js',
  'social-login.test.js'
];

const testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

async function runTests() {
  for (const testFile of testFiles) {
    console.log(`\n📋 מריץ בדיקות: ${testFile}`);
    console.log('='.repeat(50));
    
    try {
      const testPath = path.join(__dirname, 'integration', testFile);
      
      // הרצת הבדיקה
      execSync(`npm test -- ${testPath}`, { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
      
      console.log(`✅ ${testFile} - הצליח`);
      testResults.passed++;
      
    } catch (error) {
      console.log(`❌ ${testFile} - נכשל`);
      console.error(error.message);
      testResults.failed++;
    }
    
    testResults.total++;
  }
  
  // סיכום תוצאות
  console.log('\n' + '='.repeat(60));
  console.log('📊 סיכום בדיקות אינטגרציה');
  console.log('='.repeat(60));
  console.log(`✅ הצליחו: ${testResults.passed}/${testResults.total}`);
  console.log(`❌ נכשלו: ${testResults.failed}/${testResults.total}`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 כל הבדיקות עברו בהצלחה!');
    console.log('המערכת מוכנה לשימוש בפרודקציה.');
  } else {
    console.log('\n⚠️ יש בדיקות שנכשלו - יש לתקן לפני המעבר לפרודקציה.');
    process.exit(1);
  }
}

// הרצת הבדיקות
runTests().catch(error => {
  console.error('💥 שגיאה בהרצת הבדיקות:', error);
  process.exit(1);
});
