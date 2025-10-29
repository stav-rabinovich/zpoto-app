import cron from 'node-cron';
import { expireOverdueApprovals } from '../services/approval-timeout.service';

/**
 * Cron job לטיפול בפקיעת זמן אישור בקשות
 * רץ כל דקה ובודק בקשות שפג זמנן
 */

let isJobRunning = false;

export function startApprovalTimeoutJob() {
  console.log('🚀 Starting approval timeout job - runs every minute');

  // רץ כל דקה: '* * * * *'
  cron.schedule('* * * * *', async () => {
    // מניעת הרצה כפולה
    if (isJobRunning) {
      console.log('⏳ Approval timeout job already running, skipping...');
      return;
    }

    isJobRunning = true;

    try {
      const result = await expireOverdueApprovals();

      if (result.expired > 0) {
        console.log(`⏰ Approval timeout job completed: ${result.expired} bookings expired`);
      }
    } catch (error) {
      console.error('❌ Approval timeout job failed:', error);
    } finally {
      isJobRunning = false;
    }
  });

  console.log('✅ Approval timeout job scheduled successfully');
}

export function stopApprovalTimeoutJob() {
  cron.getTasks().forEach(task => task.stop());
  console.log('🛑 Approval timeout job stopped');
}
