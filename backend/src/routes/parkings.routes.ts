import { Router } from 'express';
import * as svc from '../services/parkings.service';
import { auth, AuthedRequest } from '../middlewares/auth';

const r = Router();

/**
 * GET /api/parkings/search
 * חיפוש חניות לפי מיקום, זמן וגודל רכב
 * Query params: lat, lng, radius (km), startTime (ISO), endTime (ISO), vehicleSize (MINI/FAMILY/SUV), onlyCompatible (boolean)
 */
r.get('/search', async (req, res, next) => {
  try {
    const { lat, lng, radius, startTime, endTime, vehicleSize, onlyCompatible } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Missing required params: lat, lng' });
    }

    const params: any = {
      lat: Number(lat),
      lng: Number(lng),
      radiusKm: radius ? Number(radius) : undefined,
    };

    if (startTime && endTime) {
      params.startTime = new Date(String(startTime));
      params.endTime = new Date(String(endTime));

      if (isNaN(params.startTime.getTime()) || isNaN(params.endTime.getTime())) {
        return res.status(400).json({ error: 'Invalid date format for startTime/endTime' });
      }
    }

    // הוספת פרמטרי סינון רכב
    if (vehicleSize) {
      params.vehicleSize = String(vehicleSize);
    }

    if (onlyCompatible) {
      params.onlyCompatible = String(onlyCompatible).toLowerCase() === 'true';
    }

    const data = await svc.searchParkings(params);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

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
    const { address, lat, lng, pricing } = req.body ?? {};
    if (
      typeof address !== 'string' ||
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      typeof pricing !== 'string'
    ) {
      return res.status(400).json({ error: 'Invalid body: {address, lat, lng, pricing}' });
    }

    const data = await svc.createParking({
      title: address, // נשתמש בכתובת כתיטל
      address,
      lat,
      lng,
      pricing,
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
