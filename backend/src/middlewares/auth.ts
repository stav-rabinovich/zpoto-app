import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export interface AuthedRequest extends Request {
  userId?: number;
}

export function auth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub?: number };
    if (!payload?.sub) return res.status(401).json({ error: 'Invalid token' });
    req.userId = Number(payload.sub);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
