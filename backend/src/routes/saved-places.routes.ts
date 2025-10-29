import { Router } from 'express';
import { auth, AuthedRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';

const r = Router();

/**
 * GET /api/saved-places
 * קבלת כל המקומות השמורים של המשתמש
 */
r.get('/', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const savedPlaces = await prisma.savedPlace.findMany({
      where: { userId },
      orderBy: [
        { type: 'asc' }, // home, work, custom
        { createdAt: 'desc' },
      ],
    });

    res.json({ data: savedPlaces });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/saved-places
 * יצירת מקום שמור חדש
 */
r.post('/', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { name, address, lat, lng, type } = req.body;

    // ולידציה
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!address?.trim()) {
      return res.status(400).json({ error: 'Address is required' });
    }
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'Valid lat and lng coordinates are required' });
    }
    if (!['home', 'work', 'custom'].includes(type)) {
      return res.status(400).json({ error: 'Type must be home, work, or custom' });
    }

    // בדיקה שאין כבר מקום מאותו סוג (עבור home/work)
    if (type === 'home' || type === 'work') {
      const existing = await prisma.savedPlace.findFirst({
        where: { userId, type },
      });

      if (existing) {
        return res.status(400).json({
          error: `You already have a ${type} location saved. Please update it instead.`,
        });
      }
    }

    const savedPlace = await prisma.savedPlace.create({
      data: {
        userId,
        name: name.trim(),
        address: address.trim(),
        lat,
        lng,
        type,
      },
    });

    res.status(201).json({ data: savedPlace });
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/saved-places/:id
 * עדכון מקום שמור
 */
r.put('/:id', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const placeId = parseInt(req.params.id);
    const { name, address, lat, lng, type } = req.body;

    if (isNaN(placeId)) {
      return res.status(400).json({ error: 'Invalid place ID' });
    }

    // וידוא שהמקום שייך למשתמש
    const existingPlace = await prisma.savedPlace.findFirst({
      where: { id: placeId, userId },
    });

    if (!existingPlace) {
      return res.status(404).json({ error: 'Saved place not found' });
    }

    // ולידציה
    if (name && !name.trim()) {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }
    if (address && !address.trim()) {
      return res.status(400).json({ error: 'Address cannot be empty' });
    }
    if (type && !['home', 'work', 'custom'].includes(type)) {
      return res.status(400).json({ error: 'Type must be home, work, or custom' });
    }

    // בדיקה שאין כבר מקום מאותו סוג (אם משנים סוג)
    if (type && type !== existingPlace.type && (type === 'home' || type === 'work')) {
      const existing = await prisma.savedPlace.findFirst({
        where: { userId, type, id: { not: placeId } },
      });

      if (existing) {
        return res.status(400).json({
          error: `You already have a ${type} location saved.`,
        });
      }
    }

    const updatedPlace = await prisma.savedPlace.update({
      where: { id: placeId },
      data: {
        ...(name && { name: name.trim() }),
        ...(address && { address: address.trim() }),
        ...(lat !== undefined && { lat }),
        ...(lng !== undefined && { lng }),
        ...(type && { type }),
      },
    });

    res.json({ data: updatedPlace });
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/saved-places/:id
 * מחיקת מקום שמור
 */
r.delete('/:id', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const placeId = parseInt(req.params.id);

    if (isNaN(placeId)) {
      return res.status(400).json({ error: 'Invalid place ID' });
    }

    // וידוא שהמקום שייך למשתמש
    const existingPlace = await prisma.savedPlace.findFirst({
      where: { id: placeId, userId },
    });

    if (!existingPlace) {
      return res.status(404).json({ error: 'Saved place not found' });
    }

    await prisma.savedPlace.delete({
      where: { id: placeId },
    });

    res.json({ message: 'Saved place deleted successfully' });
  } catch (e) {
    next(e);
  }
});

export default r;
