"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const prisma_1 = require("../lib/prisma");
const svc = __importStar(require("../services/owner.service"));
const websocket_service_1 = require("../services/websocket.service");
const r = (0, express_1.Router)();
/**
 * GET /api/owner/status?email={email}
 * בדיקת סטטוס בעל חניה לפי אימייל (ללא התחברות)
 */
r.get('/status', async (req, res, next) => {
    try {
        const { email } = req.query;
        if (!email)
            return res.status(400).json({ error: 'Missing email' });
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: String(email).toLowerCase() },
            select: { id: true, role: true, password: true, ownershipBlocked: true }
        });
        if (!user)
            return res.json({ status: 'none' });
        // בדיקת בקשה ממתינה
        const pending = await prisma_1.prisma.listingRequest.findFirst({ where: { userId: user.id, status: 'PENDING' } });
        if (pending)
            return res.json({ status: 'pending' });
        // בדיקת בקשה שנדחתה
        const rejected = await prisma_1.prisma.listingRequest.findFirst({
            where: { userId: user.id, status: 'REJECTED' },
            orderBy: { createdAt: 'desc' }
        });
        if (rejected || user.ownershipBlocked) {
            return res.json({ status: 'rejected', message: 'בקשתך נדחתה - אתה יכול להמשיך כמחפש חניה' });
        }
        const parkings = await prisma_1.prisma.parking.count({ where: { ownerId: user.id } });
        const hasPassword = !!user.password;
        if (parkings > 0 && user.role === 'OWNER' && hasPassword) {
            return res.json({ status: 'approved', canLogin: true });
        }
        else if (parkings > 0) {
            return res.json({ status: 'approved', canLogin: false });
        }
        else {
            return res.json({ status: 'none' });
        }
    }
    catch (e) {
        next(e);
    }
});
/**
 * POST /api/owner/check-existing
 * בדיקת בקשות קיימות לפי אימייל או טלפון
 * Body: { email?, phone? }
 */
r.post('/check-existing', async (req, res, next) => {
    try {
        const { email, phone } = req.body || {};
        if (!email && !phone) {
            return res.status(400).json({ error: 'Missing email or phone' });
        }
        // בדיקה אם יש בקשה קיימת
        const whereConditions = [];
        if (email)
            whereConditions.push({ user: { email: String(email).toLowerCase() } });
        if (phone)
            whereConditions.push({ phone: String(phone) });
        const existingRequest = await prisma_1.prisma.listingRequest.findFirst({
            where: {
                OR: whereConditions
            },
            include: {
                user: {
                    select: { email: true, name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        if (existingRequest) {
            return res.json({
                exists: true,
                status: existingRequest.status,
                createdAt: existingRequest.createdAt,
                message: existingRequest.status === 'PENDING'
                    ? 'קיימת בקשה בהמתנה לאישור עם פרטים אלה'
                    : existingRequest.status === 'APPROVED'
                        ? 'הבקשה עם פרטים אלה כבר אושרה'
                        : 'קיימת בקשה עם פרטים אלה'
            });
        }
        return res.json({ exists: false });
    }
    catch (e) {
        console.error('❌ Check existing request error:', e);
        next(e);
    }
});
/**
 * POST /api/owner/apply
 * הגשת בקשה להיות בעל חניה (ללא התחברות)
 * Body: { name, email, phone, address, city }
 */
r.post('/apply', async (req, res, next) => {
    try {
        console.log('🔥 OWNER APPLY REQUEST:', req.body);
        const { name, email, phone, address, city } = req.body || {};
        // בדיקות בסיסיות
        if (!name || typeof name !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid name' });
        }
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid email' });
        }
        if (!phone || typeof phone !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid phone' });
        }
        if (!address || typeof address !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid address' });
        }
        if (!city || typeof city !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid city' });
        }
        console.log('🚀 Creating owner application:', {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            address: address.trim(),
            city: city.trim(),
        });
        // יצירת משתמש זמני (או שימוש במשתמש קיים עם אימייל זה)
        let user = await prisma_1.prisma.user.findUnique({
            where: { email: email.trim() }
        });
        if (!user) {
            // יצירת משתמש זמני עבור הבקשה
            console.log('📝 Creating new user for owner application');
            user = await prisma_1.prisma.user.create({
                data: {
                    email: email.trim(),
                    name: name.trim(),
                    phone: phone.trim(),
                    password: 'temp_password_' + Date.now(), // סיסמה זמנית
                    role: 'USER'
                }
            });
        }
        else {
            // עדכון פרטי המשתמש הקיים עם הנתונים החדשים מהטופס
            console.log('🔄 Updating existing user info for owner application');
            user = await prisma_1.prisma.user.update({
                where: { id: user.id },
                data: {
                    name: name.trim(), // עדכון שם אם השתנה
                    phone: phone.trim() || user.phone, // עדכון טלפון אם סופק, אחרת שמירה על הקיים
                    // לא עדכנים אימייל או סיסמה - רק שם וטלפון
                }
            });
        }
        // שמירה בטבלת ListingRequest
        const application = await prisma_1.prisma.listingRequest.create({
            data: {
                userId: user.id,
                title: `בקשת בעלות חניה - ${name.trim()}`,
                address: address.trim(),
                fullAddress: address.trim(),
                city: city.trim(),
                phone: phone.trim(),
                lat: 32.0853, // ברירת מחדל - תל אביב
                lng: 34.7818,
                priceHr: 0, // ישוטח במהלך האונבורדינג
                description: `בקשה מ-${name.trim()}`,
                status: 'PENDING',
            }
        });
        console.log('✅ Owner application created:', application);
        res.status(201).json({
            success: true,
            message: 'הבקשה נשלחה בהצלחה',
            data: application
        });
    }
    catch (e) {
        console.error('❌ Owner apply error:', e);
        next(e);
    }
});
// כל ה-routes הבאים דורשים התחברות כבעל חניה
r.use(auth_1.requireOwner);
/**
 * POST /api/owner/listing-requests
 * הגשת בקשה חדשה להיות בעל חניה
 * Body: { title, address, lat, lng, priceHr, description? }
 */
r.post('/listing-requests', async (req, res, next) => {
    try {
        console.log('🔥 LISTING REQUEST:', req.body, 'User ID:', req.userId);
        const { title, address, fullAddress, city, phone, lat, lng, priceHr, description, onboarding } = req.body || {};
        // בדיקות בסיסיות
        if (!address || typeof address !== 'string') {
            return res.status(400).json({
                error: 'Missing or invalid address',
            });
        }
        // המרת lat/lng למספרים אם הם מגיעים כמחרוזות
        const latitude = typeof lat === 'number' ? lat : parseFloat(lat);
        const longitude = typeof lng === 'number' ? lng : parseFloat(lng);
        if (isNaN(latitude) || isNaN(longitude)) {
            return res.status(400).json({
                error: 'Invalid coordinates: lat and lng must be valid numbers',
            });
        }
        console.log('🚀 Creating listing request with:', {
            userId: Number(req.userId),
            title: title || address,
            address,
            fullAddress,
            city,
            phone,
            lat: latitude,
            lng: longitude,
            priceHr: priceHr || 0,
            description,
            onboarding
        });
        const data = await svc.createListingRequest({
            userId: Number(req.userId),
            title: title || address,
            address,
            fullAddress,
            city,
            phone,
            lat: latitude,
            lng: longitude,
            priceHr: priceHr || 0,
            description,
            onboarding,
        });
        console.log('✅ Listing request created successfully:', data);
        res.status(201).json({ data });
    }
    catch (e) {
        console.error('❌ Listing request error:', e);
        next(e);
    }
});
/**
 * GET /api/owner/listing-requests
 * רשימת הבקשות שלי
 */
r.get('/listing-requests', async (req, res, next) => {
    try {
        const data = await svc.getMyListingRequests(Number(req.userId));
        res.json(data);
    }
    catch (e) {
        next(e);
    }
});
/**
 * GET /api/owner/parkings
 * רשימת החניות שלי (מאושרות)
 */
r.get('/parkings', async (req, res, next) => {
    try {
        const parkings = await svc.getMyParkings(req.userId);
        res.json(parkings);
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /api/owner/parkings/:id
 * קבלת חניה בודדת
 */
r.get('/parkings/:id', async (req, res, next) => {
    try {
        const parking = await svc.getMyParking(Number(req.params.id), req.userId);
        res.json(parking);
    }
    catch (err) {
        next(err);
    }
});
/**
 * PATCH /api/owner/parkings/:id
 * Body: { title?, address?, lat?, lng?, priceHr?, isActive?, availability? }
 */
r.patch('/parkings/:id', async (req, res, next) => {
    try {
        console.log(`🔄 PATCH /api/owner/parkings/${req.params.id} - User: ${req.userId}`);
        console.log('📤 Request body:', req.body);
        const id = Number(req.params.id);
        const patch = req.body || {};
        const data = await svc.updateMyParking(id, Number(req.userId), patch);
        // אם עודכנה זמינות - שליחת עדכון WebSocket
        if (patch.availability !== undefined) {
            console.log('📡 Broadcasting availability update via WebSocket');
            try {
                const parsedAvailability = typeof patch.availability === 'string'
                    ? JSON.parse(patch.availability)
                    : patch.availability;
                (0, websocket_service_1.broadcastAvailabilityUpdate)(id, parsedAvailability);
            }
            catch (wsError) {
                console.error('WebSocket broadcast error:', wsError);
                // לא נכשיל את הבקשה בגלל שגיאת WebSocket
            }
        }
        res.json(data);
    }
    catch (e) {
        if (e?.message === 'PARKING_NOT_FOUND') {
            return res.status(404).json({ error: 'Parking not found' });
        }
        if (e?.message === 'FORBIDDEN') {
            return res.status(403).json({ error: 'Not your parking' });
        }
        next(e);
    }
});
/**
 * GET /api/owner/bookings
 * רשימת הזמנות לחניות שלי
 */
r.get('/bookings', async (req, res, next) => {
    try {
        const ownerId = req.userId;
        const bookings = await prisma_1.prisma.booking.findMany({
            where: {
                parking: { ownerId }
            },
            include: {
                user: {
                    select: { id: true, email: true, name: true }
                },
                parking: {
                    select: { id: true, title: true, address: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ data: bookings });
    }
    catch (e) {
        next(e);
    }
});
/**
 * PATCH /api/owner/parkings/:id/approval-mode
 * שינוי מצב אישור החניה (AUTO/MANUAL)
 */
r.patch('/parkings/:id/approval-mode', async (req, res, next) => {
    try {
        const ownerId = req.userId;
        const parkingId = parseInt(req.params.id);
        const { approvalMode } = req.body;
        if (!['AUTO', 'MANUAL'].includes(approvalMode)) {
            return res.status(400).json({ error: 'Invalid approval mode' });
        }
        // וודא שהחניה שייכת לבעלים
        const parking = await prisma_1.prisma.parking.findFirst({
            where: { id: parkingId, ownerId }
        });
        if (!parking) {
            return res.status(404).json({ error: 'parking not found' });
        }
        console.log(`🎛️ Updating approval mode for parking #${parkingId}:`);
        console.log(`👤 Owner: #${ownerId}`);
        console.log(`🔄 Old mode: ${parking.approvalMode} -> New mode: ${approvalMode}`);
        const updated = await prisma_1.prisma.parking.update({
            where: { id: parkingId },
            data: { approvalMode }
        });
        console.log(`✅ Approval mode updated successfully:`, {
            parkingId: updated.id,
            title: updated.title,
            approvalMode: updated.approvalMode
        });
        res.json({ data: updated });
    }
    catch (e) {
        next(e);
    }
});
/**
 * GET /api/owner/bookings
 * קבלת הזמנות של החניות של הבעלים
 */
r.get('/bookings', async (req, res, next) => {
    try {
        const ownerId = req.userId;
        const bookings = await prisma_1.prisma.booking.findMany({
            where: {
                parking: { ownerId }
            },
            include: {
                parking: {
                    select: { id: true, title: true, address: true }
                },
                user: {
                    select: { id: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ data: bookings });
    }
    catch (e) {
        next(e);
    }
});
/**
 * GET /api/owner/stats/:parkingId
 * סטטיסטיקות לחניה ספציפית של הבעלים
 */
r.get('/stats/:parkingId', async (req, res, next) => {
    try {
        const ownerId = req.userId;
        const parkingId = parseInt(req.params.parkingId);
        if (isNaN(parkingId)) {
            return res.status(400).json({ error: 'Invalid parking ID' });
        }
        // וידוא שהחניה שייכת לבעלים
        const parking = await prisma_1.prisma.parking.findFirst({
            where: { id: parkingId, ownerId }
        });
        if (!parking) {
            return res.status(404).json({ error: 'Parking not found or not owned by user' });
        }
        // פרמטרים לטווח תאריכים (ברירת מחדל: 30 יום אחרונים)
        const { from, to, days = '30' } = req.query;
        const daysNum = parseInt(days) || 30;
        const fromDate = from ? new Date(from) : new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : new Date();
        // שליפת הזמנות בטווח
        const bookings = await prisma_1.prisma.booking.findMany({
            where: {
                parkingId,
                createdAt: {
                    gte: fromDate,
                    lte: toDate
                }
            },
            include: {
                user: {
                    select: { id: true, email: true }
                }
            }
        });
        // חישוב סטטיסטיקות
        const totalBookings = bookings.length;
        const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED');
        const totalRevenue = confirmedBookings.reduce((sum, b) => sum + (b.totalPriceCents || 0), 0);
        const totalHours = confirmedBookings.reduce((sum, b) => {
            const start = new Date(b.startTime);
            const end = new Date(b.endTime);
            const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            return sum + hours;
        }, 0);
        // סטטיסטיקות יומיות
        const dailyStats = [];
        for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
            const dayStart = new Date(d);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(d);
            dayEnd.setHours(23, 59, 59, 999);
            const dayBookings = bookings.filter(b => {
                const bookingDate = new Date(b.createdAt);
                return bookingDate >= dayStart && bookingDate <= dayEnd;
            });
            const dayRevenue = dayBookings
                .filter(b => b.status === 'CONFIRMED')
                .reduce((sum, b) => sum + (b.totalPriceCents || 0), 0);
            dailyStats.push({
                day: d.toISOString().split('T')[0],
                bookings: dayBookings.length,
                revenue: dayRevenue / 100, // המרה לשקלים
            });
        }
        const stats = {
            totalBookings,
            confirmedBookings: confirmedBookings.length,
            totalRevenue: totalRevenue / 100, // המרה לשקלים
            totalHours: Math.round(totalHours * 100) / 100,
            avgRevPerBooking: confirmedBookings.length > 0 ? Math.round((totalRevenue / confirmedBookings.length) / 100 * 100) / 100 : 0,
            avgHoursPerBooking: confirmedBookings.length > 0 ? Math.round((totalHours / confirmedBookings.length) * 100) / 100 : 0,
            daily: dailyStats,
            period: {
                from: fromDate.toISOString(),
                to: toDate.toISOString(),
                days: daysNum
            }
        };
        res.json({ data: stats });
    }
    catch (e) {
        next(e);
    }
});
/**
 * PATCH /api/owner/bookings/:id/status
 * עדכון סטטוס הזמנה על ידי בעל החניה
 */
r.patch('/bookings/:id/status', async (req, res, next) => {
    try {
        const ownerId = req.userId;
        const bookingId = parseInt(req.params.id);
        const { status } = req.body;
        if (isNaN(bookingId)) {
            return res.status(400).json({ error: 'Invalid booking ID' });
        }
        if (!['PENDING', 'CONFIRMED', 'CANCELLED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Use PENDING|CONFIRMED|CANCELLED' });
        }
        // וידוא שההזמנה שייכת לחניה של הבעלים
        const booking = await prisma_1.prisma.booking.findFirst({
            where: {
                id: bookingId,
                parking: { ownerId }
            },
            include: {
                parking: true,
                user: {
                    select: { id: true, email: true }
                }
            }
        });
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found or not owned by user' });
        }
        // עדכון הסטטוס
        const updatedBooking = await prisma_1.prisma.booking.update({
            where: { id: bookingId },
            data: { status },
            include: {
                parking: true,
                user: {
                    select: { id: true, email: true }
                }
            }
        });
        res.json({ data: updatedBooking });
    }
    catch (e) {
        next(e);
    }
});
/**
 * POST /api/owner/parkings/:id/check-availability-conflicts
 * בדיקת התנגשויות הזמנות לפני שינוי זמינות
 */
r.post('/parkings/:id/check-availability-conflicts', auth_1.auth, auth_1.requireOwner, async (req, res, next) => {
    try {
        const parkingId = parseInt(req.params.id);
        const { dayKey, timeSlots } = req.body; // timeSlots: [0, 4, 8] - בלוקי זמן שרוצים להסיר
        if (!dayKey || !Array.isArray(timeSlots)) {
            return res.status(400).json({ error: 'Missing dayKey or timeSlots' });
        }
        // וידוא שהחניה שייכת לבעל החניה
        const parking = await prisma_1.prisma.parking.findFirst({
            where: { id: parkingId, ownerId: req.userId }
        });
        if (!parking) {
            return res.status(404).json({ error: 'Parking not found' });
        }
        const conflicts = await svc.checkBookingConflicts(parkingId, dayKey, timeSlots);
        res.json({
            hasConflicts: conflicts.length > 0,
            conflicts: conflicts.map(booking => ({
                id: booking.id,
                startTime: booking.startTime,
                endTime: booking.endTime,
                userEmail: booking.user?.email,
                userName: booking.user?.name
            }))
        });
    }
    catch (e) {
        next(e);
    }
});
/**
 * GET /api/owner/bookings/upcoming
 * הזמנות עתידיות לחניות של בעל החניה
 */
r.get('/bookings/upcoming', auth_1.auth, auth_1.requireOwner, async (req, res, next) => {
    try {
        const ownerId = req.userId;
        const now = new Date();
        const upcomingBookings = await prisma_1.prisma.booking.findMany({
            where: {
                parking: {
                    ownerId: ownerId
                },
                startTime: {
                    gte: now // רק הזמנות עתידיות
                },
                status: 'CONFIRMED'
            },
            include: {
                parking: {
                    select: {
                        id: true,
                        title: true,
                        address: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true
                    }
                }
            },
            orderBy: {
                startTime: 'asc'
            },
            take: 50 // מגביל ל-50 הזמנות עתידיות
        });
        // חישוב צפי הכנסות (המרה מcents לשקלים)
        const totalRevenue = upcomingBookings.reduce((sum, booking) => sum + ((booking.totalPriceCents || 0) / 100), 0);
        // פילוח לפי תקופות
        const thisWeek = new Date();
        thisWeek.setDate(thisWeek.getDate() + 7);
        const thisMonth = new Date();
        thisMonth.setMonth(thisMonth.getMonth() + 1);
        const weeklyRevenue = upcomingBookings
            .filter(booking => new Date(booking.startTime) <= thisWeek)
            .reduce((sum, booking) => sum + ((booking.totalPriceCents || 0) / 100), 0);
        const monthlyRevenue = upcomingBookings
            .filter(booking => new Date(booking.startTime) <= thisMonth)
            .reduce((sum, booking) => sum + ((booking.totalPriceCents || 0) / 100), 0);
        res.json({
            data: upcomingBookings,
            revenue: {
                total: totalRevenue,
                thisWeek: weeklyRevenue,
                thisMonth: monthlyRevenue,
                bookingsCount: upcomingBookings.length
            }
        });
    }
    catch (e) {
        next(e);
    }
});
exports.default = r;
