// routes/notifications.routes.ts
// API להתראות

import { Router } from 'express';
import { auth, AuthedRequest } from '../middlewares/auth';
import * as notificationService from '../services/notifications.service';

const r = Router();

/**
 * GET /api/notifications
 * קבלת התראות של המשתמש
 */
r.get('/', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const notifications = await notificationService.getUserNotifications(userId, limit);

    res.json({
      data: notifications.map(n => ({
        ...n,
        data: n.data ? JSON.parse(n.data) : null,
      })),
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/notifications/unread-count
 * מספר התראות לא נקראות
 */
r.get('/unread-count', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const count = await notificationService.getUnreadNotificationsCount(userId);

    res.json({ count });
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /api/notifications/:id/read
 * סימון התראה כנקראה
 */
r.patch('/:id/read', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const notificationId = parseInt(req.params.id);

    await notificationService.markNotificationAsRead(notificationId, userId);

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /api/notifications/read-all
 * סימון כל ההתראות כנקראות
 */
r.patch('/read-all', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;

    await notificationService.markAllNotificationsAsRead(userId);

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/notifications/:id
 * מחיקת התראה
 */
r.delete('/:id', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const notificationId = parseInt(req.params.id);

    await notificationService.deleteNotification(notificationId, userId);

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/notifications/test
 * יצירת התראת בדיקה (לפיתוח בלבד)
 */
r.post('/test', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;

    const notification = await notificationService.createNotification({
      userId,
      type: 'test',
      title: '🧪 התראת בדיקה',
      body: 'זוהי התראת בדיקה מהמערכת',
      data: { timestamp: new Date().toISOString() },
    });

    res.json({ data: notification });
  } catch (e) {
    next(e);
  }
});

export default r;
