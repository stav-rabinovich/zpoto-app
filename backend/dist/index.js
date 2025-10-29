"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const app_1 = __importDefault(require("./app"));
const approval_timeout_job_1 = require("./jobs/approval-timeout.job");
const notifications_job_1 = require("./jobs/notifications.job");
const scheduler_1 = require("./jobs/scheduler");
const websocket_service_1 = require("./services/websocket.service");
const port = Number(process.env.PORT || 4000);
// יצירת HTTP server עם WebSocket support
const httpServer = (0, http_1.createServer)(app_1.default);
// אתחול WebSocket
(0, websocket_service_1.initializeWebSocket)(httpServer);
httpServer.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Zpoto API running on http://0.0.0.0:${port}`);
    console.log(`📱 Mobile can connect via: http://10.0.0.23:${port}`);
    console.log(`🌐 WebSocket available on ws://0.0.0.0:${port}`);
    // הפעלת jobs
    (0, approval_timeout_job_1.startApprovalTimeoutJob)();
    (0, notifications_job_1.startAllNotificationJobs)();
    (0, scheduler_1.startJobScheduler)(); // מתזמן תשלומים חודשיים
});
