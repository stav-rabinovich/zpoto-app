import { Router } from 'express';
import { auth, AuthedRequest } from '../middlewares/auth';
import * as chatService from '../services/chat.service';

const r = Router();

/**
 * GET /api/chat
 * קבלת צ'אטים של המשתמש המחובר
 */
r.get('/', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const chats = await chatService.getChatsByUser(userId);
    res.json({ data: chats });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/chat
 * שליחת הודעה חדשה
 */
r.post('/', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { message, parkingId } = req.body;
    
    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const chat = await chatService.sendMessage({
      userId,
      message: message.trim(),
      isFromUser: true,
      parkingId: parkingId || undefined,
    });
    
    res.json({ data: chat });
  } catch (e) {
    next(e);
  }
});

export default r;
