const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteAllBookings() {
  try {
    console.log('🗑️ Starting deletion of all bookings...');
    
    // ספירת הזמנות לפני המחיקה
    const totalBookings = await prisma.booking.count();
    console.log(`📊 Total bookings found: ${totalBookings}`);
    
    if (totalBookings === 0) {
      console.log('✅ No bookings to delete');
      return;
    }
    
    // מחיקת נתונים קשורים לפני מחיקת ההזמנות
    console.log('🧹 Deleting related data...');
    
    // מחיקת דמי תפעול
    const deletedOperationalFees = await prisma.operationalFee.deleteMany({});
    console.log(`🗑️ Deleted ${deletedOperationalFees.count} operational fees`);
    
    // מחיקת עמלות
    const deletedCommissions = await prisma.commission.deleteMany({});
    console.log(`🗑️ Deleted ${deletedCommissions.count} commissions`);
    
    // מחיקת שימושי קופונים
    const deletedCouponUsages = await prisma.couponUsage.deleteMany({});
    console.log(`🗑️ Deleted ${deletedCouponUsages.count} coupon usages`);
    
    // מחיקת כל ההזמנות
    console.log('🗑️ Deleting all bookings...');
    const deletedBookings = await prisma.booking.deleteMany({});
    console.log(`✅ Successfully deleted ${deletedBookings.count} bookings`);
    
    // אימות שהמחיקה הצליחה
    const remainingBookings = await prisma.booking.count();
    console.log(`📊 Remaining bookings: ${remainingBookings}`);
    
    if (remainingBookings === 0) {
      console.log('🎉 All bookings deleted successfully!');
    } else {
      console.log('⚠️ Some bookings may still remain');
    }
    
  } catch (error) {
    console.error('❌ Error deleting bookings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// הרצת הסקריפט
deleteAllBookings()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
