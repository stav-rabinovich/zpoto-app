import { Router } from 'express';
import * as users from '../services/users.service';
import { auth } from '../middlewares/auth';
import { prisma } from '../lib/prisma';

const r = Router();

// POST /api/auth/register { email, password }
r.post('/register', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Invalid body: {email, password>=6}' });
  }
  try {
    const { user, token } = await users.register(email.toLowerCase(), password);
    res.status(201).json({ user, token });
  } catch (e: any) {
    if (e.message === 'EMAIL_TAKEN') return res.status(409).json({ error: 'Email already in use' });
    console.error(e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/auth/login { email, password }
r.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Invalid body: {email, password}' });
  }
  try {
    const { user, token } = await users.login(email.toLowerCase(), password);
    res.json({ user, token });
  } catch (e: any) {
    if (e.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    console.error(e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/auth/me - קבלת פרטי המשתמש המחובר
r.get('/me', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).userId },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default r;
