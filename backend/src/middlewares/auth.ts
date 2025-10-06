import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export interface AuthedRequest extends Request {
  userId?: number;
  userRole?: string;
}

export async function auth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Missing token' });
  
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub?: number };
    if (!payload?.sub) return res.status(401).json({ error: 'Invalid token' });
    
    // בדיקה שהמשתמש קיים בדאטאבייס
    const user = await prisma.user.findUnique({
      where: { id: Number(payload.sub) },
      select: { id: true, role: true },
    });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    req.userId = user.id;
    req.userRole = user.role;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Missing token' });
  
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub?: number };
    if (!payload?.sub) return res.status(401).json({ error: 'Invalid token' });
    
    const user = await prisma.user.findUnique({
      where: { id: Number(payload.sub) },
      select: { id: true, role: true },
    });
    
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
    
    req.userId = user.id;
    req.userRole = user.role;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
