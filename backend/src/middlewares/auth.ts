import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export interface AuthedRequest extends Request {
  userId?: number;
  userRole?: string;
  file?: Express.Multer.File;
}

export async function auth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  console.log('🔐 Auth middleware - URL:', req.method, req.path);
  console.log('🔐 Auth header:', header ? `${header.substring(0, 30)}...` : 'none');
  console.log('🔐 Extracted token:', token ? `${token.substring(0, 20)}...` : 'none');

  if (!token) {
    console.log('❌ Missing token');
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub?: number };
    if (!payload?.sub) return res.status(401).json({ error: 'Invalid token' });

    // בדיקה שהמשתמש קיים בדאטאבייס ולא חסום
    const user = await prisma.user.findUnique({
      where: { id: Number(payload.sub) },
      select: { id: true, role: true, isBlocked: true },
    });

    if (!user) {
      console.log('❌ User not found in database for ID:', payload.sub);
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isBlocked) {
      console.log('🚫 User is blocked - ID:', user.id);
      return res.status(403).json({ error: 'המשתמש חסום על ידי המנהל' });
    }

    console.log('✅ User authenticated successfully - ID:', user.id, 'Role:', user.role);
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
      select: { id: true, role: true, isBlocked: true },
    });

    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.isBlocked) return res.status(403).json({ error: 'המשתמש חסום על ידי המנהל' });
    if (user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });

    req.userId = user.id;
    req.userRole = user.role;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Middleware לבעלי חניה בלבד
export async function requireOwner(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  console.log('🏠 Owner middleware - URL:', req.method, req.path);

  if (!token) {
    console.log('❌ Missing token for owner endpoint');
    return res.status(401).json({ error: 'נדרשת התחברות לגישה לאזור בעלי החניה' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub?: number };
    if (!payload?.sub) return res.status(401).json({ error: 'Invalid token' });

    const user = await prisma.user.findUnique({
      where: { id: Number(payload.sub) },
      select: { id: true, role: true, isBlocked: true, ownershipBlocked: true },
    });

    if (!user) {
      console.log('❌ User not found for owner endpoint - ID:', payload.sub);
      return res.status(404).json({ error: 'משתמש לא נמצא' });
    }

    if (user.isBlocked) {
      console.log('🚫 Blocked user tried to access owner endpoint - ID:', user.id);
      return res.status(403).json({ error: 'המשתמש חסום על ידי המנהל' });
    }

    if (user.ownershipBlocked) {
      console.log('🚫 Ownership-blocked user tried to access owner endpoint - ID:', user.id);
      return res.status(403).json({
        error: 'בקשתך להיות בעל חניה נדחתה על ידי המנהל',
        hint: 'אתה יכול להמשיך להשתמש באפליקציה כמחפש חניה',
      });
    }

    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      console.log('🚫 Non-owner tried to access owner endpoint - ID:', user.id, 'Role:', user.role);
      return res.status(403).json({
        error: 'גישה מוגבלת לבעלי חניה בלבד',
        hint: 'יש להגיש בקשה להיות בעל חניה דרך האפליקציה',
      });
    }

    console.log('✅ Owner authenticated successfully - ID:', user.id, 'Role:', user.role);
    req.userId = user.id;
    req.userRole = user.role;
    next();
  } catch (error) {
    console.error('Owner middleware error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Alias לauth (לתאימות)
export const requireAuth = auth;
