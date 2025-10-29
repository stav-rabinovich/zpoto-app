"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listListingRequests = listListingRequests;
exports.getListingRequest = getListingRequest;
exports.approveListingRequest = approveListingRequest;
exports.rejectRequest = rejectRequest;
exports.unblockOwnership = unblockOwnership;
exports.getStats = getStats;
exports.listUsers = listUsers;
exports.listAllBookings = listAllBookings;
const prisma_1 = require("../lib/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
/**
 * רשימת כל בקשות הפרסום
 */
async function listListingRequests(filters) {
    return prisma_1.prisma.listingRequest.findMany({
        where: filters?.status ? { status: filters.status } : undefined,
        include: {
            user: {
                select: { id: true, email: true, role: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
}
/**
 * שליפת בקשה בודדת
 */
async function getListingRequest(id) {
    return prisma_1.prisma.listingRequest.findUnique({
        where: { id },
        include: {
            user: {
                select: { id: true, email: true, role: true },
            },
        },
    });
}
/**
 * אישור בקשה - יוצר Parking חדש ומעדכן סטטוס
 */
async function approveListingRequest(id) {
    const request = await prisma_1.prisma.listingRequest.findUnique({
        where: { id },
        include: { user: true }
    });
    if (!request)
        throw new Error('REQUEST_NOT_FOUND');
    if (request.status !== 'PENDING')
        throw new Error('REQUEST_ALREADY_PROCESSED');
    // יצירת חניה חדשה
    // אם יש fullAddress ו-city, השתמש בהם. אחרת השתמש ב-address
    const parkingAddress = request.fullAddress && request.city
        ? `${request.fullAddress}, ${request.city}`
        : request.address;
    const parking = await prisma_1.prisma.parking.create({
        data: {
            title: parkingAddress,
            address: parkingAddress,
            lat: request.lat,
            lng: request.lng,
            priceHr: request.priceHr || 15, // ברירת מחדל
            ownerId: request.userId,
            isActive: false, // חניה חדשה נוצרת חסומה עד השלמת מסמכים
        },
    });
    // עדכון סטטוס הבקשה
    const updatedRequest = await prisma_1.prisma.listingRequest.update({
        where: { id },
        data: { status: 'APPROVED' },
    });
    // שינוי תפקיד המשתמש ל-OWNER וייצור סיסמה זמנית
    const tempPassword = `zpoto${Date.now().toString().slice(-6)}`; // סיסמה זמנית: zpoto123456
    const hashedPassword = await bcryptjs_1.default.hash(tempPassword, 10);
    await prisma_1.prisma.user.update({
        where: { id: request.userId },
        data: {
            role: 'OWNER',
            password: hashedPassword,
            isBlocked: true // משתמש חדש נוצר חסום עד השלמת מסמכים
        },
    });
    console.log(`🔑 Generated temporary password for owner ${request.userId}: ${tempPassword}`);
    // הפיכת מסמכים חסויים לנגישים לאחר אישור
    try {
        const userDocuments = await prisma_1.prisma.document.findMany({
            where: {
                userId: request.userId
            }
        });
        if (userDocuments.length > 0) {
            console.log(`📄 Found ${userDocuments.length} documents for approved user ${request.userId}`);
        }
    }
    catch (error) {
        console.error('Error checking documents:', error);
    }
    return {
        request: updatedRequest,
        parking,
        tempPassword: tempPassword,
        userEmail: request.user.email
    };
}
/**
 * דחיית בקשה
 */
async function rejectRequest(id, reason) {
    console.log(`🚫 Rejecting listing request ${id} - reason: ${reason || 'No reason'}`);
    const request = await prisma_1.prisma.listingRequest.findUnique({ where: { id } });
    if (!request)
        throw new Error('REQUEST_NOT_FOUND');
    if (request.status !== 'PENDING')
        throw new Error('REQUEST_ALREADY_PROCESSED');
    // מחיקת כל החניות של המשתמש (אם קיימות)
    await prisma_1.prisma.parking.deleteMany({
        where: { ownerId: request.userId }
    });
    // עדכון הבקשה כנדחית והחזרת המשתמש למצב מחפש חניה
    const [updatedRequest] = await Promise.all([
        prisma_1.prisma.listingRequest.update({
            where: { id },
            data: {
                status: 'REJECTED',
                rejectionReason: reason || 'No reason provided',
            },
        }),
        // החזרת המשתמש למצב מחפש חניה רגיל
        prisma_1.prisma.user.update({
            where: { id: request.userId },
            data: {
                role: 'USER', // החזרה למחפש חניה
                ownershipBlocked: true // חסימה מהגשת בקשות עתידיות
            }
        })
    ]);
    console.log(`✅ Request ${id} rejected and user ${request.userId} blocked from ownership`);
    return updatedRequest;
}
/**
 * ביטול חסימת בעלות חניה למשתמש
 */
async function unblockOwnership(userId) {
    console.log(`🔓 Unblocking ownership for user ${userId}`);
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error('USER_NOT_FOUND');
    return prisma_1.prisma.user.update({
        where: { id: userId },
        data: { ownershipBlocked: false }
    });
}
/**
 * נתונים סטטיסטיים כלליים
 */
async function getStats() {
    const [totalUsers, totalParkings, totalBookings, totalRequests] = await Promise.all([
        prisma_1.prisma.user.count(),
        prisma_1.prisma.parking.count(),
        prisma_1.prisma.booking.count(),
        prisma_1.prisma.listingRequest.count(),
    ]);
    const pendingRequests = await prisma_1.prisma.listingRequest.count({
        where: { status: 'PENDING' },
    });
    const confirmedBookings = await prisma_1.prisma.booking.count({
        where: { status: 'CONFIRMED' },
    });
    // חישוב הכנסות (סכום totalPriceCents)
    const bookingsWithPrice = await prisma_1.prisma.booking.findMany({
        where: {
            status: 'CONFIRMED',
            totalPriceCents: { not: null },
        },
        select: { totalPriceCents: true },
    });
    console.log(`💰 Admin stats calculation:`);
    console.log(`💰 Found ${bookingsWithPrice.length} confirmed bookings with price`);
    bookingsWithPrice.forEach((booking, index) => {
        console.log(`💰 Booking ${index + 1}: ₪${(booking.totalPriceCents || 0) / 100}`);
    });
    const totalRevenueCents = bookingsWithPrice.reduce((sum, b) => sum + (b.totalPriceCents || 0), 0);
    console.log(`💰 Total revenue for admin: ₪${totalRevenueCents / 100} (${totalRevenueCents} cents)`);
    return {
        totalUsers,
        totalParkings,
        totalBookings,
        totalRequests,
        pendingRequests,
        confirmedBookings,
        totalRevenueCents,
        totalRevenueILS: (totalRevenueCents / 100).toFixed(2),
    };
}
/**
 * רשימת כל המשתמשים - עם נתונים מסונכרנים מלאים
 */
async function listUsers() {
    const users = await prisma_1.prisma.user.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            role: true,
            createdAt: true,
            isBlocked: true,
            bookings: {
                select: {
                    id: true,
                    status: true,
                    startTime: true,
                    endTime: true,
                    totalPriceCents: true,
                },
            },
            ownedParkings: {
                select: {
                    id: true,
                    title: true,
                    address: true,
                    isActive: true,
                    bookings: {
                        select: {
                            id: true,
                            status: true,
                            startTime: true,
                            endTime: true,
                            totalPriceCents: true,
                        }
                    }
                }
            },
            _count: {
                select: {
                    ownedParkings: true,
                    bookings: true,
                    listingRequests: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
    // חישוב סטטיסטיקות מסונכרנות לכל משתמש
    const usersWithStats = users.map(user => {
        // סטטיסטיקות לקוח
        const confirmedBookings = user.bookings.filter(b => b.status === 'CONFIRMED');
        const totalParkingHours = confirmedBookings.reduce((total, booking) => {
            const start = new Date(booking.startTime);
            const end = new Date(booking.endTime);
            const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            return total + hours;
        }, 0);
        const totalSpentCents = confirmedBookings.reduce((total, booking) => {
            return total + (booking.totalPriceCents || 0);
        }, 0);
        // חישוב ממוצעים
        const averageParkingDuration = confirmedBookings.length > 0
            ? totalParkingHours / confirmedBookings.length
            : 0;
        const averageCostPerBooking = confirmedBookings.length > 0
            ? (totalSpentCents / 100) / confirmedBookings.length
            : 0;
        // ספירת בקשות שהגיש המשתמש
        const totalRequestsSubmitted = user._count.listingRequests || 0;
        // חישוב פעילות אחרונה
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        const recentBookings = confirmedBookings.filter(b => new Date(b.startTime) >= monthAgo).length;
        // סטטיסטיקות בעל חניה
        let ownerStats = null;
        if (user.role === 'OWNER' && user.ownedParkings.length > 0) {
            const allOwnerBookings = user.ownedParkings.flatMap(p => p.bookings);
            const confirmedOwnerBookings = allOwnerBookings.filter(b => b.status === 'CONFIRMED');
            const totalOwnerParkingHours = confirmedOwnerBookings.reduce((total, booking) => {
                const start = new Date(booking.startTime);
                const end = new Date(booking.endTime);
                const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                return total + hours;
            }, 0);
            const totalOwnerRevenueCents = confirmedOwnerBookings.reduce((total, booking) => {
                return total + (booking.totalPriceCents || 0);
            }, 0);
            ownerStats = {
                totalParkings: user.ownedParkings.length,
                totalOwnerBookings: allOwnerBookings.length,
                confirmedOwnerBookings: confirmedOwnerBookings.length,
                totalOwnerParkingHours: Math.round(totalOwnerParkingHours * 10) / 10,
                totalOwnerRevenueCents,
                totalOwnerRevenueILS: (totalOwnerRevenueCents / 100).toFixed(2)
            };
        }
        console.log(`👤 User ${user.id} (${user.email}): ${confirmedBookings.length} bookings, ${totalParkingHours.toFixed(1)}h, ₪${(totalSpentCents / 100).toFixed(2)} spent${ownerStats ? `, Owner: ${ownerStats.totalParkings} parkings, ₪${ownerStats.totalOwnerRevenueILS} earned` : ''}`);
        return {
            ...user,
            // הסרת הזמנות מהפרטים הבסיסיים
            bookings: undefined,
            ownedParkings: undefined,
            // הוספת סטטיסטיקות מסונכרנות
            stats: {
                // סטטיסטיקות כלקוח
                totalBookings: user._count.bookings,
                confirmedBookings: confirmedBookings.length,
                totalParkingHours: Math.round(totalParkingHours * 10) / 10,
                averageParkingDuration: Math.round(averageParkingDuration * 10) / 10,
                totalSpentCents,
                totalSpentILS: (totalSpentCents / 100).toFixed(2),
                averageCostPerBooking: averageCostPerBooking.toFixed(2),
                totalRequestsSubmitted,
                recentBookingsMonth: recentBookings,
                // סטטיסטיקות כבעל חניה
                ...ownerStats
            }
        };
    });
    console.log(`👥 Admin users loaded: ${usersWithStats.length} users with full synchronized stats`);
    return usersWithStats;
}
/**
 * רשימת כל ההזמנות עם פילטרים
 */
async function listAllBookings(filters) {
    return prisma_1.prisma.booking.findMany({
        where: {
            status: filters?.status,
            userId: filters?.userId,
            parkingId: filters?.parkingId,
        },
        include: {
            user: {
                select: { id: true, email: true },
            },
            parking: {
                select: { id: true, title: true, address: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
}
