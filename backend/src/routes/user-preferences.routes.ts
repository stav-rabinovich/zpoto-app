import { Router } from 'express';
import { auth, AuthedRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';

const r = Router();

/**
 * GET /api/user/preferences
 * קבלת העדפות המשתמש
 */
r.get('/', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        showOnlyCompatibleParkings: true,
      } as any,
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ data: user });
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /api/user/preferences
 * עדכון העדפות המשתמש
 */
r.patch('/', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { showOnlyCompatibleParkings } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        showOnlyCompatibleParkings: Boolean(showOnlyCompatibleParkings),
      } as any,
      select: {
        showOnlyCompatibleParkings: true,
      } as any,
    });

    res.json({ data: user });
  } catch (e) {
    next(e);
  }
});

export default r;
