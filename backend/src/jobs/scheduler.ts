// scheduler.ts - מתזמן עבודות רקע
import cron from 'node-cron';
import { processMonthlyPayouts } from './monthly-payouts.job';

/**
 * התחלת מתזמן העבודות הרקע
 */
export function startJobScheduler() {
  console.log('🕐 Starting job scheduler...');

  // תשלומים חודשיים - ב-1 לכל חודש בשעה 09:00
  cron.schedule(
    '0 9 1 * *',
    async () => {
      console.log('💰 Running scheduled monthly payouts job...');
      try {
        const result = await processMonthlyPayouts();
        console.log('💰 Scheduled monthly payouts completed:', result);
      } catch (error) {
        console.error('❌ Error in scheduled monthly payouts:', error);
      }
    },
    {
      timezone: 'Asia/Jerusalem',
    }
  );

  // בדיקת בריאות מערכת - כל יום בשעה 08:00
  cron.schedule(
    '0 8 * * *',
    async () => {
      console.log('🏥 Running daily health check...');
      try {
        await performHealthCheck();
      } catch (error) {
        console.error('❌ Error in health check:', error);
      }
    },
    {
      timezone: 'Asia/Jerusalem',
    }
  );

  console.log('✅ Job scheduler started successfully');
  console.log('📅 Monthly payouts: 1st of every month at 09:00 IST');
  console.log('🏥 Health check: Every day at 08:00 IST');
}

/**
 * בדיקת בריאות מערכת
 */
async function performHealthCheck() {
  const { prisma } = await import('../lib/prisma');

  try {
    // בדיקת חיבור למסד נתונים
    await prisma.$queryRaw`SELECT 1`;

    // בדיקת עמלות שלא עובדו (אזהרה אם יש יותר מ-100)
    const unpaidCommissions = await prisma.commission.count({
      where: { payoutProcessed: false },
    });

    if (unpaidCommissions > 100) {
      console.warn(`⚠️ High number of unpaid commissions: ${unpaidCommissions}`);
    }

    // בדיקת תשלומים שנכשלו
    const failedPayouts = await prisma.ownerPayout.count({
      where: { status: 'FAILED' },
    });

    if (failedPayouts > 0) {
      console.warn(`⚠️ Failed payouts detected: ${failedPayouts}`);
    }

    console.log('✅ Health check passed', {
      unpaidCommissions,
      failedPayouts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
  }
}
