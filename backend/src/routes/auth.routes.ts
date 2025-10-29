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
    console.log('✅ Login successful - user ID:', user.id, 'token generated:', !!token);
    res.json({ user, token });
  } catch (e: any) {
    if (e.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (e.message === 'USER_BLOCKED') {
      return res.status(403).json({ error: 'המשתמש חסום על ידי המנהל' });
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

// POST /api/auth/social - Social Login (Google/Facebook/Apple)
r.post('/social', async (req, res) => {
  const { provider, socialData } = req.body ?? {};

  // ולידציה בסיסית
  if (!provider || !socialData || !socialData.id) {
    return res.status(400).json({
      error:
        'Invalid body: {provider: "google"|"facebook"|"apple", socialData: {id, email?, name?, photo?}}',
    });
  }

  if (!['google', 'facebook', 'apple'].includes(provider)) {
    return res.status(400).json({ error: 'Invalid provider. Must be google, facebook, or apple' });
  }

  try {
    console.log(`🔐 Social login attempt - Provider: ${provider}, ID: ${socialData.id}`);

    const result = await users.socialLogin(provider, socialData);

    console.log(
      `✅ Social login successful - User ID: ${result.user.id}, New user: ${result.isNewUser}`
    );

    res.status(result.isNewUser ? 201 : 200).json({
      user: result.user,
      token: result.token,
      isNewUser: result.isNewUser,
    });
  } catch (e: any) {
    console.error(`❌ Social login error (${provider}):`, e);

    if (e.message === 'EMAIL_REQUIRED_FOR_NEW_USER') {
      return res.status(400).json({
        error: 'Email is required for new user registration',
      });
    }

    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/auth/social/verify - אימות token מרשתות חברתיות (אופציונלי)
r.post('/social/verify', async (req, res) => {
  const { provider, token } = req.body ?? {};

  if (!provider || !token) {
    return res.status(400).json({ error: 'Invalid body: {provider, token}' });
  }

  try {
    // TODO: כאן ניתן להוסיף אימות של token מול שרתי Google/Facebook/Apple
    // לעכשיו רק מחזירים success

    res.json({
      valid: true,
      message: 'Token verification not implemented yet',
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default r;
