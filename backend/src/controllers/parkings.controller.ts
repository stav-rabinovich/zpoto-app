// ===== src/controllers/parkings.controller.ts =====
import { Request, Response } from 'express';
import * as service from '../services/parkings.service';

export async function list(_req: Request, res: Response) {
  const data = service.list();
  res.json({ data });
}

export async function create(req: Request, res: Response) {
  const { title, address, lat, lng, priceHr } = req.body ?? {};
  if (
    typeof title !== 'string' ||
    typeof address !== 'string' ||
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    typeof priceHr !== 'number'
  ) {
    return res.status(400).json({ error: 'Invalid body: {title, address, lat, lng, priceHr}' });
  }
  const created = service.create({ title, address, lat, lng, priceHr });
  res.status(201).json({ data: created });
}

export async function getById(req: Request, res: Response) {
  const id = Number(req.params.id);
  const item = service.getById(id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json({ data: item });
}

export async function update(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { title, address, lat, lng, priceHr, isActive } = req.body ?? {};
  const updated = service.update(id, { title, address, lat, lng, priceHr, isActive });
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json({ data: updated });
}

export async function remove(req: Request, res: Response) {
  const id = Number(req.params.id);
  const ok = service.remove(id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.status(204).send();
}
