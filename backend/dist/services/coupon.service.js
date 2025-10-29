"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.couponService = exports.CouponService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class CouponService {
    /**
     * יצירת קופון חדש
     */
    async createCoupon(data) {
        // בדיקה שהקוד לא קיים כבר
        const existingCoupon = await prisma.coupon.findUnique({
            where: { code: data.code }
        });
        if (existingCoupon) {
            throw new Error(`קופון עם הקוד "${data.code}" כבר קיים`);
        }
        // בדיקת תקינות ערכים
        if (data.discountValue <= 0) {
            throw new Error('ערך ההנחה חייב להיות חיובי');
        }
        if (data.discountType === 'PERCENTAGE' && data.discountValue > 100) {
            throw new Error('אחוז הנחה לא יכול להיות גדול מ-100%');
        }
        if (data.validUntil <= new Date()) {
            throw new Error('תאריך התפוגה חייב להיות עתידי');
        }
        return await prisma.coupon.create({
            data: {
                code: data.code.toUpperCase(), // קוד באותיות גדולות
                discountType: data.discountType,
                discountValue: data.discountValue,
                applyTo: data.applyTo,
                validUntil: data.validUntil,
                maxUsage: data.maxUsage,
                createdById: data.createdById,
            },
            include: {
                createdBy: {
                    select: { id: true, name: true, email: true }
                }
            }
        });
    }
    /**
     * קבלת כל הקופונים (לאדמין)
     */
    async getAllCoupons() {
        return await prisma.coupon.findMany({
            include: {
                createdBy: {
                    select: { id: true, name: true, email: true }
                },
                usages: {
                    select: { id: true, usedAt: true, discountAmountCents: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    /**
     * קבלת קופון לפי ID
     */
    async getCouponById(id) {
        return await prisma.coupon.findUnique({
            where: { id },
            include: {
                createdBy: {
                    select: { id: true, name: true, email: true }
                },
                usages: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        },
                        booking: {
                            select: { id: true, startTime: true, endTime: true }
                        }
                    },
                    orderBy: { usedAt: 'desc' }
                }
            }
        });
    }
    /**
     * עדכון קופון
     */
    async updateCoupon(id, data) {
        const existingCoupon = await prisma.coupon.findUnique({ where: { id } });
        if (!existingCoupon) {
            throw new Error('קופון לא נמצא');
        }
        // אם מעדכנים קוד, בדוק שהוא לא קיים
        if (data.code && data.code !== existingCoupon.code) {
            const codeExists = await prisma.coupon.findUnique({
                where: { code: data.code }
            });
            if (codeExists) {
                throw new Error(`קופון עם הקוד "${data.code}" כבר קיים`);
            }
        }
        return await prisma.coupon.update({
            where: { id },
            data: {
                ...data,
                code: data.code ? data.code.toUpperCase() : undefined,
            },
            include: {
                createdBy: {
                    select: { id: true, name: true, email: true }
                }
            }
        });
    }
    /**
     * מחיקת קופון
     */
    async deleteCoupon(id) {
        const existingCoupon = await prisma.coupon.findUnique({ where: { id } });
        if (!existingCoupon) {
            throw new Error('קופון לא נמצא');
        }
        // בדוק אם יש שימושים בקופון
        const usageCount = await prisma.couponUsage.count({
            where: { couponId: id }
        });
        if (usageCount > 0) {
            throw new Error('לא ניתן למחוק קופון שכבר נוצל');
        }
        await prisma.coupon.delete({ where: { id } });
    }
    /**
     * בדיקת תקינות קופון
     */
    async validateCoupon(code) {
        const coupon = await prisma.coupon.findUnique({
            where: { code: code.toUpperCase() },
            include: {
                usages: true
            }
        });
        if (!coupon) {
            return {
                isValid: false,
                error: 'קופון לא נמצא',
                errorCode: 'NOT_FOUND'
            };
        }
        if (!coupon.isActive) {
            return {
                isValid: false,
                error: 'קופון לא פעיל',
                errorCode: 'INACTIVE'
            };
        }
        if (coupon.validUntil < new Date()) {
            return {
                isValid: false,
                error: 'קופון פג תוקף',
                errorCode: 'EXPIRED'
            };
        }
        if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) {
            return {
                isValid: false,
                error: 'קופון הגיע למגבלת השימושים',
                errorCode: 'MAX_USAGE_REACHED'
            };
        }
        return {
            isValid: true,
            coupon
        };
    }
    /**
     * חישוב הנחה
     */
    calculateDiscount(coupon, parkingCostCents, operationalFeeCents) {
        const totalAmountCents = parkingCostCents + operationalFeeCents;
        let discountAmountCents = 0;
        if (coupon.applyTo === 'SERVICE_FEE') {
            // הנחה על דמי תפעול בלבד
            if (coupon.discountType === 'PERCENTAGE') {
                discountAmountCents = Math.round(operationalFeeCents * (coupon.discountValue / 100));
            }
            else {
                // סכום קבוע - לא יעלה על דמי התפעול
                discountAmountCents = Math.min(coupon.discountValue * 100, operationalFeeCents);
            }
        }
        else {
            // הנחה על הסכום הכולל
            if (coupon.discountType === 'PERCENTAGE') {
                discountAmountCents = Math.round(totalAmountCents * (coupon.discountValue / 100));
            }
            else {
                // סכום קבוע - לא יעלה על הסכום הכולל
                discountAmountCents = Math.min(coupon.discountValue * 100, totalAmountCents);
            }
        }
        const finalAmountCents = totalAmountCents - discountAmountCents;
        const discountPercentage = (discountAmountCents / totalAmountCents) * 100;
        return {
            discountAmountCents,
            originalAmountCents: totalAmountCents,
            finalAmountCents,
            discountPercentage: Math.round(discountPercentage * 100) / 100 // עיגול ל-2 ספרות
        };
    }
    /**
     * רישום שימוש בקופון
     */
    async recordCouponUsage(couponId, bookingId, userId, discountCalculation) {
        return await prisma.$transaction(async (tx) => {
            // עדכון מונה השימושים בקופון
            await tx.coupon.update({
                where: { id: couponId },
                data: { usageCount: { increment: 1 } }
            });
            // רישום השימוש
            return await tx.couponUsage.create({
                data: {
                    couponId,
                    bookingId,
                    userId,
                    discountAmountCents: discountCalculation.discountAmountCents,
                    originalAmountCents: discountCalculation.originalAmountCents,
                    finalAmountCents: discountCalculation.finalAmountCents,
                }
            });
        });
    }
    /**
     * קבלת סטטיסטיקות קופונים
     */
    async getCouponStats() {
        const totalCoupons = await prisma.coupon.count();
        const activeCoupons = await prisma.coupon.count({
            where: { isActive: true, validUntil: { gt: new Date() } }
        });
        const totalUsages = await prisma.couponUsage.count();
        const totalDiscountCents = await prisma.couponUsage.aggregate({
            _sum: { discountAmountCents: true }
        });
        const topCoupons = await prisma.coupon.findMany({
            where: { usageCount: { gt: 0 } },
            orderBy: { usageCount: 'desc' },
            take: 5,
            select: {
                id: true,
                code: true,
                usageCount: true,
                discountType: true,
                discountValue: true
            }
        });
        return {
            totalCoupons,
            activeCoupons,
            totalUsages,
            totalDiscountAmount: (totalDiscountCents._sum.discountAmountCents || 0) / 100,
            topCoupons
        };
    }
}
exports.CouponService = CouponService;
exports.couponService = new CouponService();
