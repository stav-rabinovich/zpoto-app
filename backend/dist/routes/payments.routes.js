"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const prisma_1 = require("../lib/prisma");
const bookings_service_1 = require("../services/bookings.service");
const r = (0, express_1.Router)();
/**
 * POST /api/payments/process
 * עיבוד תשלום ויצירת הזמנה
 */
r.post('/process', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        const { parkingId, vehicleId, startTime, endTime, totalPrice, paymentMethod, licensePlate, vehicleDescription, 
        // פרטי תשלום (לעתיד - אינטגרציה עם ספק תשלומים)
        cardNumber, expiryDate, cvv, cardholderName } = req.body;
        console.log('💳 Processing payment for user:', userId);
        console.log('💳 Payment details:', {
            parkingId,
            vehicleId,
            startTime,
            endTime,
            totalPrice,
            paymentMethod,
            licensePlate
        });
        // ולידציה בסיסית
        if (!parkingId || !startTime || !endTime || !totalPrice || !paymentMethod) {
            return res.status(400).json({
                error: 'Missing required fields: parkingId, startTime, endTime, totalPrice, paymentMethod'
            });
        }
        // בדיקה שהחניה קיימת וזמינה
        const parking = await prisma_1.prisma.parking.findUnique({
            where: { id: parseInt(parkingId) },
            include: { owner: true }
        });
        if (!parking || !parking.isActive) {
            return res.status(404).json({ error: 'Parking not found or inactive' });
        }
        // בדיקת חפיפות זמנים
        const startDateTime = new Date(startTime);
        const endDateTime = new Date(endTime);
        const conflictingBooking = await prisma_1.prisma.booking.findFirst({
            where: {
                parkingId: parseInt(parkingId),
                status: { not: 'CANCELED' },
                NOT: [
                    { endTime: { lte: startDateTime } },
                    { startTime: { gte: endDateTime } }
                ]
            }
        });
        if (conflictingBooking) {
            return res.status(409).json({
                error: 'Time slot is already booked',
                conflictingBooking: conflictingBooking.id
            });
        }
        // סימולציית עיבוד תשלום
        // בעתיד כאן נוסיף אינטגרציה עם ספק תשלומים אמיתי
        console.log('💳 Simulating payment processing...');
        // סימולציה של זמן עיבוד
        await new Promise(resolve => setTimeout(resolve, 1500));
        // סימולציית הצלחה (95% הצלחה)
        const paymentSuccess = Math.random() > 0.05;
        if (!paymentSuccess) {
            console.log('💳 ❌ Payment failed (simulated)');
            return res.status(402).json({
                error: 'Payment failed',
                message: 'התשלום נכשל. אנא נסה שוב או השתמש באמצעי תשלום אחר.'
            });
        }
        // יצירת מזהה תשלום מדומה
        const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('💳 ✅ Payment successful, creating booking...');
        // יצירת ההזמנה דרך השירות (כך שמוד האישור יתקבל בחשבון)
        const bookingBase = await (0, bookings_service_1.createBooking)({
            userId,
            parkingId: parseInt(parkingId),
            startTime: startDateTime,
            endTime: endDateTime
        });
        console.log('📋 Booking created with status:', bookingBase.status);
        // עדכון ההזמנה עם פרטי התשלום
        const booking = await prisma_1.prisma.booking.update({
            where: { id: bookingBase.id },
            data: {
                vehicleId: vehicleId ? parseInt(vehicleId) : null,
                paymentStatus: 'PAID',
                paymentMethod,
                paymentId,
                paidAt: new Date(),
                licensePlate,
                vehicleDescription
            },
            include: {
                parking: {
                    select: {
                        id: true,
                        title: true,
                        address: true,
                        lat: true,
                        lng: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true
                    }
                }
            }
        });
        console.log('📝 ✅ Booking created successfully:', booking.id);
        // החזרת תגובה מוצלחת
        res.status(201).json({
            success: true,
            booking: {
                id: booking.id,
                startTime: booking.startTime,
                endTime: booking.endTime,
                status: booking.status,
                totalPrice: booking.totalPriceCents ? booking.totalPriceCents / 100 : 0,
                paymentStatus: booking.paymentStatus,
                paymentId: booking.paymentId,
                parking: booking.parking,
                licensePlate: booking.licensePlate,
                vehicleDescription: booking.vehicleDescription
            },
            message: 'התשלום בוצע בהצלחה וההזמנה נוצרה!'
        });
    }
    catch (error) {
        console.error('💳 ❌ Payment processing error:', error);
        next(error);
    }
});
/**
 * GET /api/payments/status/:bookingId
 * בדיקת סטטוס תשלום של הזמנה
 */
r.get('/status/:bookingId', auth_1.auth, async (req, res, next) => {
    try {
        const userId = req.userId;
        const bookingId = parseInt(req.params.bookingId);
        const booking = await prisma_1.prisma.booking.findFirst({
            where: {
                id: bookingId,
                userId // וידוא שההזמנה שייכת למשתמש
            },
            select: {
                id: true,
                status: true,
                paymentStatus: true,
                paymentMethod: true,
                paymentId: true,
                paidAt: true,
                totalPriceCents: true
            }
        });
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        res.json({
            bookingId: booking.id,
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            paymentMethod: booking.paymentMethod,
            paymentId: booking.paymentId,
            paidAt: booking.paidAt,
            totalPrice: booking.totalPriceCents ? booking.totalPriceCents / 100 : 0
        });
    }
    catch (error) {
        console.error('Payment status check error:', error);
        next(error);
    }
});
exports.default = r;
