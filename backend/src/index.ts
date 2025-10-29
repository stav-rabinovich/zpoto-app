import { createServer } from 'http';
import app from './app';
import { startApprovalTimeoutJob } from './jobs/approval-timeout.job';
import { startAllNotificationJobs } from './jobs/notifications.job';
import { startJobScheduler } from './jobs/scheduler';
import { initializeWebSocket } from './services/websocket.service';

const port = Number(process.env.PORT || 4000);

// יצירת HTTP server עם WebSocket support
const httpServer = createServer(app);

// אתחול WebSocket
initializeWebSocket(httpServer);

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Zpoto API running on http://0.0.0.0:${port}`);
  console.log(`📱 Mobile can connect via: http://10.0.0.23:${port}`);
  console.log(`🌐 WebSocket available on ws://0.0.0.0:${port}`);

  // הפעלת jobs
  startApprovalTimeoutJob();
  startAllNotificationJobs();
  startJobScheduler(); // מתזמן תשלומים חודשיים
});
