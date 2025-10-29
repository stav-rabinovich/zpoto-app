"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.socialLogin = socialLogin;
const prisma_1 = require("../lib/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
async function register(email, password) {
    const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (existing) {
        throw new Error('EMAIL_TAKEN');
    }
    const hash = await bcryptjs_1.default.hash(password, 10);
    const user = await prisma_1.prisma.user.create({
        data: { email, password: hash },
        select: { id: true, email: true, role: true, createdAt: true },
    });
    const token = jsonwebtoken_1.default.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });
    return { user, token };
}
async function login(email, password) {
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (!user || !user.password)
        throw new Error('INVALID_CREDENTIALS');
    // בדיקת חסימה
    if (user.isBlocked) {
        throw new Error('USER_BLOCKED');
    }
    const ok = await bcryptjs_1.default.compare(password, user.password);
    if (!ok)
        throw new Error('INVALID_CREDENTIALS');
    const token = jsonwebtoken_1.default.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });
    return { user: { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt }, token };
}
/**
 * OAuth Social Login - יצירת או התחברות משתמש עם נתוני רשת חברתית
 */
async function socialLogin(provider, socialData) {
    const { id: socialId, email, name, photo } = socialData;
    // חיפוש משתמש קיים לפי provider ID
    const whereConditions = [];
    if (provider === 'google')
        whereConditions.push({ googleId: socialId });
    if (provider === 'facebook')
        whereConditions.push({ facebookId: socialId });
    if (provider === 'apple')
        whereConditions.push({ appleId: socialId });
    let user = await prisma_1.prisma.user.findFirst({
        where: {
            OR: whereConditions
        }
    });
    // אם לא נמצא משתמש לפי provider ID, חפש לפי email
    if (!user && email) {
        user = await prisma_1.prisma.user.findUnique({ where: { email } });
        // אם נמצא משתמש עם אותו email, עדכן אותו עם provider ID
        if (user) {
            const updateData = {};
            if (provider === 'google')
                updateData.googleId = socialId;
            if (provider === 'facebook')
                updateData.facebookId = socialId;
            if (provider === 'apple')
                updateData.appleId = socialId;
            // עדכן גם שם ותמונה אם זמינים
            if (name && !user.name)
                updateData.name = name;
            if (photo && !user.profilePicture)
                updateData.profilePicture = photo;
            user = await prisma_1.prisma.user.update({
                where: { id: user.id },
                data: updateData
            });
        }
    }
    // אם עדיין לא נמצא משתמש, צור חדש
    if (!user) {
        if (!email) {
            throw new Error('EMAIL_REQUIRED_FOR_NEW_USER');
        }
        const createData = {
            email,
            name: name || null,
            profilePicture: photo || null,
            // אין סיסמה למשתמשי OAuth
            password: await bcryptjs_1.default.hash(Math.random().toString(36), 10)
        };
        // הוסף provider ID
        if (provider === 'google')
            createData.googleId = socialId;
        if (provider === 'facebook')
            createData.facebookId = socialId;
        if (provider === 'apple')
            createData.appleId = socialId;
        user = await prisma_1.prisma.user.create({
            data: createData
        });
    }
    // יצירת JWT token
    const token = jsonwebtoken_1.default.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' });
    return {
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            profilePicture: user.profilePicture,
            createdAt: user.createdAt
        },
        token,
        isNewUser: user.createdAt.getTime() > Date.now() - 60000 // אם נוצר בדקה האחרונה
    };
}
