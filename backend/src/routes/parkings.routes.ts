import { Router } from 'express';
import * as svc from '../services/parkings.service';
import { auth, AuthedRequest } from '../middlewares/auth';

const r = Router();

// GET /api/parkings — פתוח
r.get('/', async (_req, res, next) => {
  try {
    const data = await svc.listParkings();
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

// POST /api/parkings — מחייב התחברות, משייך ownerId מה-JWT
r.post('/', auth, async (req: AuthedRequest, res, next) => {
  try {
    const { title, address, lat, lng, priceHr } = req.body ?? {};
    if (
      typeof title !== 'string' ||
      typeof address !== 'string' ||
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      typeof priceHr !== 'number'
    ) {
      return res
        .status(400)
        .json({ error: 'Invalid body: {title, address, lat, lng, priceHr}' });
    }

    const data = await svc.createParking({
      title,
      address,
      lat,
      lng,
      priceHr,
      ownerId: Number(req.userId),
    });

    res.status(201).json({ data });
  } catch (e) {
    next(e);
  }
});

// GET /api/parkings/:id — פתוח
r.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await svc.getParking(id);
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

// PUT /api/parkings/:id — רק הבעלים
r.put('/:id', auth, async (req: AuthedRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const current = await svc.getParking(id);
    if (!current) return res.status(404).json({ error: 'Not found' });
    if (current.ownerId !== Number(req.userId)) {
      return res.status(403).json({ error: 'Forbidden: not the owner' });
    }
    const patch = req.body ?? {};
    const data = await svc.updateParking(id, patch);
    res.json({ data });
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    next(e);
  }
});

// DELETE /api/parkings/:id — רק הבעלים
r.delete('/:id', auth, async (req: AuthedRequest, res, next) => {
  try {
    const id = Number(req.params.id);
    const current = await svc.getParking(id);
    if (!current) return res.status(404).json({ error: 'Not found' });
    if (current.ownerId !== Number(req.userId)) {
      return res.status(403).json({ error: 'Forbidden: not the owner' });
    }
    await svc.deleteParking(id);
    res.status(204).send();
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    next(e);
  }
});

export default r;
