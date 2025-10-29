"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startApprovalTimeoutJob = startApprovalTimeoutJob;
exports.stopApprovalTimeoutJob = stopApprovalTimeoutJob;
const node_cron_1 = __importDefault(require("node-cron"));
const approval_timeout_service_1 = require("../services/approval-timeout.service");
/**
 * Cron job לטיפול בפקיעת זמן אישור בקשות
 * רץ כל דקה ובודק בקשות שפג זמנן
 */
let isJobRunning = false;
function startApprovalTimeoutJob() {
    console.log('🚀 Starting approval timeout job - runs every minute');
    // רץ כל דקה: '* * * * *'
    node_cron_1.default.schedule('* * * * *', async () => {
        // מניעת הרצה כפולה
        if (isJobRunning) {
            console.log('⏳ Approval timeout job already running, skipping...');
            return;
        }
        isJobRunning = true;
        try {
            const result = await (0, approval_timeout_service_1.expireOverdueApprovals)();
            if (result.expired > 0) {
                console.log(`⏰ Approval timeout job completed: ${result.expired} bookings expired`);
            }
        }
        catch (error) {
            console.error('❌ Approval timeout job failed:', error);
        }
        finally {
            isJobRunning = false;
        }
    });
    console.log('✅ Approval timeout job scheduled successfully');
}
function stopApprovalTimeoutJob() {
    node_cron_1.default.getTasks().forEach(task => task.stop());
    console.log('🛑 Approval timeout job stopped');
}
