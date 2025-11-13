import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export async function register(
  email: string, 
  password: string, 
  name: string, 
  phone: string
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error('EMAIL_TAKEN');
  }
  
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { 
      email, 
      password: hash,
      name: name.trim(),
      phone: phone.trim()
    },
    select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
  });
  
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });
  return { user, token };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) throw new Error('INVALID_CREDENTIALS');

  // בדיקת חסימה
  if (user.isBlocked) {
    throw new Error('USER_BLOCKED');
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new Error('INVALID_CREDENTIALS');
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });
  return {
    user: { 
      id: user.id, 
      email: user.email, 
      name: user.name,
      phone: user.phone,
      role: user.role, 
      createdAt: user.createdAt 
    },
    token,
  };
}

/**
 * OAuth Social Login - יצירת או התחברות משתמש עם נתוני רשת חברתית
 */
export async function socialLogin(
  provider: 'google' | 'facebook' | 'apple',
  socialData: {
    id: string;
    email?: string;
    name?: string;
    photo?: string;
  }
) {
  const { id: socialId, email, name, photo } = socialData;

  // חיפוש משתמש קיים לפי provider ID
  const whereConditions = [];
  if (provider === 'google') whereConditions.push({ googleId: socialId });
  if (provider === 'facebook') whereConditions.push({ facebookId: socialId });
  if (provider === 'apple') whereConditions.push({ appleId: socialId });

  let user = await prisma.user.findFirst({
    where: {
      OR: whereConditions,
    },
  });

  // אם לא נמצא משתמש לפי provider ID, חפש לפי email
  if (!user && email) {
    user = await prisma.user.findUnique({ where: { email } });

    // אם נמצא משתמש עם אותו email, עדכן אותו עם provider ID
    if (user) {
      const updateData: any = {};
      if (provider === 'google') updateData.googleId = socialId;
      if (provider === 'facebook') updateData.facebookId = socialId;
      if (provider === 'apple') updateData.appleId = socialId;

      // עדכן גם שם ותמונה אם זמינים
      if (name && !user.name) updateData.name = name;
      if (photo && !user.profilePicture) updateData.profilePicture = photo;

      user = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
    }
  }

  // אם עדיין לא נמצא משתמש, צור חדש
  if (!user) {
    if (!email) {
      throw new Error('EMAIL_REQUIRED_FOR_NEW_USER');
    }

    const createData: any = {
      email,
      name: name || null,
      profilePicture: photo || null,
      // אין סיסמה למשתמשי OAuth
      password: await bcrypt.hash(Math.random().toString(36), 10),
    };

    // הוסף provider ID
    if (provider === 'google') createData.googleId = socialId;
    if (provider === 'facebook') createData.facebookId = socialId;
    if (provider === 'apple') createData.appleId = socialId;

    user = await prisma.user.create({
      data: createData,
    });
  }

  // יצירת JWT token
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      profilePicture: user.profilePicture,
      createdAt: user.createdAt,
    },
    token,
    isNewUser: user.createdAt.getTime() > Date.now() - 60000, // אם נוצר בדקה האחרונה
  };
}
