"use strict";
// routes/notifications.routes.ts
// API להתראות
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const notificationService = __importStar(require("../services/notifications.service"));
const r = (0, express_1.Router)();
/**
 * GET /api/notifications
 * קבלת התראות של המשתמש
 */
r.get('/', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;
        const notifications = await notificationService.getUserNotifications(userId, limit);
        res.json({
            data: notifications.map(n => ({
                ...n,
                data: n.data ? JSON.parse(n.data) : null
            }))
        });
    }
    catch (e) {
        next(e);
    }
});
/**
 * GET /api/notifications/unread-count
 * מספר התראות לא נקראות
 */
r.get('/unread-count', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        const count = await notificationService.getUnreadNotificationsCount(userId);
        res.json({ count });
    }
    catch (e) {
        next(e);
    }
});
/**
 * PATCH /api/notifications/:id/read
 * סימון התראה כנקראה
 */
r.patch('/:id/read', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        const notificationId = parseInt(req.params.id);
        await notificationService.markNotificationAsRead(notificationId, userId);
        res.json({ success: true });
    }
    catch (e) {
        next(e);
    }
});
/**
 * PATCH /api/notifications/read-all
 * סימון כל ההתראות כנקראות
 */
r.patch('/read-all', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        await notificationService.markAllNotificationsAsRead(userId);
        res.json({ success: true });
    }
    catch (e) {
        next(e);
    }
});
/**
 * DELETE /api/notifications/:id
 * מחיקת התראה
 */
r.delete('/:id', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        const notificationId = parseInt(req.params.id);
        await notificationService.deleteNotification(notificationId, userId);
        res.json({ success: true });
    }
    catch (e) {
        next(e);
    }
});
/**
 * POST /api/notifications/test
 * יצירת התראת בדיקה (לפיתוח בלבד)
 */
r.post('/test', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        const notification = await notificationService.createNotification({
            userId,
            type: 'test',
            title: '🧪 התראת בדיקה',
            body: 'זוהי התראת בדיקה מהמערכת',
            data: { timestamp: new Date().toISOString() }
        });
        res.json({ data: notification });
    }
    catch (e) {
        next(e);
    }
});
exports.default = r;
