"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isParkingAvailableByOwnerSettings = isParkingAvailableByOwnerSettings;
exports.listParkings = listParkings;
exports.createParking = createParking;
exports.getParking = getParking;
exports.updateParking = updateParking;
exports.deleteParking = deleteParking;
exports.searchParkings = searchParkings;
const client_1 = require("@prisma/client");
const timezone_1 = require("../utils/timezone");
const prisma = new client_1.PrismaClient();
/**
 * בדיקה אם יש הזמנות פעילות לחניה בטווח זמן נתון
 */
async function hasActiveBookings(parkingId, startTime, endTime) {
    const conflict = await prisma.booking.findFirst({
        where: {
            parkingId,
            NOT: [
                { endTime: { lte: startTime } },
                { startTime: { gte: endTime } },
            ],
            status: { in: ['CONFIRMED', 'PENDING'] }, // כולל גם הזמנות ממתינות
        },
        select: { id: true },
    });
    return !!conflict;
}
/**
 * בדיקה אם חניה זמינה לפי הגדרות בעל החניה (בלוקי זמן)
 * 🔧 תוקן: עובד עם זמן ישראל במקום UTC
 */
function isParkingAvailableByOwnerSettings(availability, startTime, endTime) {
    console.log(`🔍 NEW SYSTEM: isParkingAvailableByOwnerSettings called:`, {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        availability: availability,
        startTimeLocal: new Date(startTime).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' }),
        endTimeLocal: new Date(endTime).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })
    });
    if (!availability) {
        console.log('🔍 No availability settings - parking available');
        return true; // אין הגדרות זמינות = זמין תמיד
    }
    let parsedAvailability;
    try {
        parsedAvailability = typeof availability === 'string' ? JSON.parse(availability) : availability;
        console.log('🔍 Parsed availability:', parsedAvailability);
    }
    catch {
        console.log('🔍 Invalid availability JSON - parking available');
        return true; // JSON לא תקין = זמין תמיד
    }
    // וולידציה של טווח הזמן
    if (!(0, timezone_1.validateTimeRange)(startTime, endTime)) {
        console.log('❌ Invalid time range');
        return false;
    }
    // מיפוי ימים
    const dayMapping = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    // המרה לזמן ישראל באמצעות המערכת החדשה
    const startTimeIsrael = (0, timezone_1.fromUTC)(startTime);
    const endTimeIsrael = (0, timezone_1.fromUTC)(endTime);
    console.log(`🔍 Using new timezone system - converted to Israel time:`, {
        startUTC: startTime.toISOString(),
        startIsrael: startTimeIsrael.toISOString(),
        endUTC: endTime.toISOString(),
        endIsrael: endTimeIsrael.toISOString()
    });
    // בדיקה לכל יום בטווח הזמן המבוקש (בזמן ישראל)
    const currentDate = new Date(startTimeIsrael);
    const endDate = new Date(endTimeIsrael);
    // בדיקה מדויקת שעה אחר שעה באמצעות המערכת החדשה
    let checkTime = new Date(startTime); // נתחיל מהזמן ב-UTC
    const endTimeMs = endTime.getTime();
    while (checkTime.getTime() < endTimeMs) {
        // השתמש בפונקציות העזר החדשות
        const dayOfWeek = (0, timezone_1.getIsraelDayOfWeek)(checkTime);
        const hour = (0, timezone_1.getIsraelHour)(checkTime);
        const dayKey = dayMapping[dayOfWeek];
        const daySlots = parsedAvailability[dayKey] || [];
        console.log(`🔍 NEW SYSTEM: Checking ${checkTime.toISOString()} -> Israel day: ${dayKey}, hour: ${hour}`);
        console.log(`🔍 Local time: ${checkTime.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}`);
        console.log(`🔍 Available slots for ${dayKey}: [${daySlots.join(',')}]`);
        // אם אין בלוקים זמינים ביום הזה, החניה לא זמינה
        if (daySlots.length === 0) {
            console.log(`❌ No available blocks for ${dayKey} - parking not available`);
            return false;
        }
        // בדוק את הבלוק של השעה הנוכחית
        const blockStart = Math.floor(hour / 4) * 4; // 0, 4, 8, 12, 16, 20
        const isBlockAvailable = daySlots.includes(blockStart);
        console.log(`🔍 Hour ${hour} -> Block ${blockStart}: available = ${isBlockAvailable}`);
        console.log(`🔍 Available blocks: [${daySlots.join(',')}], Looking for block: ${blockStart}`);
        // אם השעה הזו לא זמינה, כל הבקשה נדחית
        if (!isBlockAvailable) {
            console.log(`❌ Hour ${hour} not available on ${dayKey} - parking not available for requested time`);
            return false;
        }
        // עבור לשעה הבאה - 🔧 תוקן: משתמש בפונקציות העזר החדשות
        checkTime = new Date(checkTime.getTime() + (60 * 60 * 1000)); // זה בסדר כי אנחנו רוצים להוסיף שעה ב-UTC
    }
    console.log('✅ Parking available according to owner settings for entire requested period');
    return true;
}
/** רשימת חניות (מהחדש לישן) - עם פרטי בעלים */
async function listParkings() {
    return prisma.parking.findMany({
        orderBy: { id: 'desc' },
        include: {
            owner: {
                select: {
                    id: true,
                    email: true,
                    phone: true,
                    role: true,
                    createdAt: true,
                    isBlocked: true,
                    _count: {
                        select: {
                            ownedParkings: true,
                            listingRequests: true,
                        }
                    },
                    listingRequests: {
                        select: {
                            id: true,
                            onboarding: true,
                            status: true,
                        },
                        // לא מסננים לפי status - רוצים את כל הבקשות
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                    }
                }
            }
        }
    });
}
/** יצירת חניה חדשה עם ownerId (לא Nested Write) */
async function createParking(input) {
    return prisma.parking.create({
        data: {
            title: input.address, // הכותרת היא הכתובת
            address: input.address,
            lat: input.lat,
            lng: input.lng,
            priceHr: input.priceHr,
            ownerId: input.ownerId,
        },
    });
}
/** שליפה לפי מזהה */
async function getParking(id) {
    return prisma.parking.findUnique({
        where: { id },
    });
}
/** עדכון (בדיקת בעלות נעשית ברמה של הראוטר) */
async function updateParking(id, patch) {
    return prisma.parking.update({
        where: { id },
        data: patch,
    });
}
/** מחיקה */
async function deleteParking(id) {
    await prisma.parking.delete({ where: { id } });
}
/**
 * חיפוש חניות לפי מיקום וזמן
 * @param lat - קו רוחב מרכז החיפוש
 * @param lng - קו אורך מרכז החיפוש
 * @param radiusKm - רדיוס בקילומטרים (ברירת מחדל 5)
 * @param startTime - זמן התחלה (אופציונלי)
 * @param endTime - זמן סיום (אופציונלי)
 */
async function searchParkings(params) {
    const { lat, lng, radiusKm = 5, startTime, endTime } = params;
    // חישוב bounding box (קירוב פשוט)
    // 1 מעלה ≈ 111 ק"מ
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
    const minLat = lat - latDelta;
    const maxLat = lat + latDelta;
    const minLng = lng - lngDelta;
    const maxLng = lng + lngDelta;
    // שליפת חניות פעילות בטווח (ללא חניות של בעלים חסומים)
    const parkings = await prisma.parking.findMany({
        where: {
            isActive: true,
            lat: { gte: minLat, lte: maxLat },
            lng: { gte: minLng, lte: maxLng },
            // מסנן חניות של בעלים חסומים
            owner: {
                isBlocked: false
            },
            // מסנן חניות ללא מחירון מלא (חייב להיות pricing עם hour1-hour12)
            pricing: {
                not: null
            }
        },
        select: {
            id: true,
            title: true,
            address: true,
            lat: true,
            lng: true,
            priceHr: true,
            isActive: true,
            approvalMode: true,
            availability: true,
            pricing: true,
            createdAt: true,
            ownerId: true,
            entranceImageUrl: true,
            emptyImageUrl: true,
            withCarImageUrl: true,
            additionalImageUrl: true,
            owner: {
                select: { isBlocked: true }
            }
        }
    });
    // סינון נוסף - רק חניות עם מחירון מלא (12 שעות)
    const filteredParkings = parkings.filter(parking => {
        if (!parking.pricing) {
            console.log(`❌ Parking ${parking.id} filtered out: no pricing data`);
            return false;
        }
        try {
            const pricingData = typeof parking.pricing === 'string' ? JSON.parse(parking.pricing) : parking.pricing;
            // בדיקה שיש מחירים מוגדרים לכל 12 השעות (יכול להיות 0)
            const hasFullPricing = pricingData &&
                pricingData.hour1 !== undefined && pricingData.hour1 !== null &&
                pricingData.hour2 !== undefined && pricingData.hour2 !== null &&
                pricingData.hour3 !== undefined && pricingData.hour3 !== null &&
                pricingData.hour4 !== undefined && pricingData.hour4 !== null &&
                pricingData.hour5 !== undefined && pricingData.hour5 !== null &&
                pricingData.hour6 !== undefined && pricingData.hour6 !== null &&
                pricingData.hour7 !== undefined && pricingData.hour7 !== null &&
                pricingData.hour8 !== undefined && pricingData.hour8 !== null &&
                pricingData.hour9 !== undefined && pricingData.hour9 !== null &&
                pricingData.hour10 !== undefined && pricingData.hour10 !== null &&
                pricingData.hour11 !== undefined && pricingData.hour11 !== null &&
                pricingData.hour12 !== undefined && pricingData.hour12 !== null;
            if (!hasFullPricing) {
                console.log(`❌ Parking ${parking.id} filtered out: incomplete pricing (missing hours)`);
                return false;
            }
            console.log(`✅ Parking ${parking.id} included: has full 12-hour pricing`);
            return true;
        }
        catch (error) {
            console.log(`❌ Parking ${parking.id} filtered out: invalid pricing JSON`);
            return false;
        }
    });
    console.log(`📋 Parkings after pricing filter: ${filteredParkings.length}/${parkings.length}`);
    // אם יש תאריכים - סינון לפי זמינות
    if (startTime && endTime) {
        const parkingsWithAvailability = await Promise.all(filteredParkings.map(async (parking) => {
            // בדיקת זמינות לפי הגדרות בעל החניה
            const isAvailableByOwner = isParkingAvailableByOwnerSettings(parking.availability, startTime, endTime);
            if (!isAvailableByOwner) {
                console.log(`🔍 Parking ${parking.id} filtered out: not available according to owner settings`);
                return null; // לא זמין לפי הגדרות בעל החניה
            }
            // בדיקת חפיפות עם הזמנות קיימות
            const hasConflict = await hasActiveBookings(parking.id, startTime, endTime);
            if (hasConflict) {
                console.log(`🔍 Parking ${parking.id} filtered out: has active booking conflict`);
                return null; // יש התנגשות עם הזמנה קיימת
            }
            // חישוב מחיר שעה ראשונה מהמחירון
            let firstHourPrice = parking.priceHr; // ברירת מחדל לשדה הישן
            console.log(`💰 Calculating price for parking ${parking.id} (with dates), legacy priceHr: ${parking.priceHr}`);
            if (parking.pricing) {
                try {
                    const pricingData = typeof parking.pricing === 'string' ? JSON.parse(parking.pricing) : parking.pricing;
                    // בדיקה אם hour1 קיים (יכול להיות string או number)
                    if (pricingData && pricingData.hour1 !== undefined && pricingData.hour1 !== null) {
                        const hour1Value = typeof pricingData.hour1 === 'string' ? parseFloat(pricingData.hour1) : pricingData.hour1;
                        if (!isNaN(hour1Value) && hour1Value > 0) {
                            firstHourPrice = hour1Value;
                            console.log(`💰 ✅ Using new pricing for parking ${parking.id} (with dates), hour1: ${hour1Value} (converted from ${typeof pricingData.hour1})`);
                        }
                        else {
                            console.log(`💰 ❌ Invalid hour1 value for parking ${parking.id} (with dates): ${pricingData.hour1} (type: ${typeof pricingData.hour1})`);
                        }
                    }
                    else {
                        console.log(`💰 ❌ No hour1 in pricing for parking ${parking.id} (with dates):`, pricingData);
                    }
                }
                catch (error) {
                    console.warn('Failed to parse pricing data for parking', parking.id, error);
                }
            }
            else {
                console.log(`💰 No pricing data for parking ${parking.id} (with dates), using legacy priceHr: ${parking.priceHr}`);
            }
            console.log(`💰 Final firstHourPrice for parking ${parking.id} (with dates): ${firstHourPrice}`);
            const result = {
                ...parking,
                available: true, // אם הגענו עד כאן, החניה זמינה
                firstHourPrice, // הוספת מחיר שעה ראשונה
                pricing: parking.pricing // וידוא שהמחירון המלא מועבר
            };
            console.log(`🎯 Returning parking ${parking.id} (with dates) with firstHourPrice: ${result.firstHourPrice}, priceHr: ${result.priceHr}`);
            return result;
        }));
        // החזרת רק חניות זמינות (סינון null values)
        return parkingsWithAvailability.filter((p) => p !== null && p.available);
    }
    // אם אין תאריכים - בדיקת זמינות לזמן הנוכחי + החזרת חניות מסוננות בטווח
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000); // שעה מהעכשיו
    const availableParkings = await Promise.all(filteredParkings.map(async (parking) => {
        // בדיקת זמינות לפי הגדרות בעל החניה לזמן הנוכחי
        const isAvailableNow = isParkingAvailableByOwnerSettings(parking.availability, now, oneHourLater);
        if (!isAvailableNow) {
            console.log(`🔍 Parking ${parking.id} filtered out: not available now according to owner settings`);
            return null;
        }
        // בדיקת הזמנות פעילות לזמן הנוכחי
        const hasCurrentBooking = await hasActiveBookings(parking.id, now, oneHourLater);
        if (hasCurrentBooking) {
            console.log(`🔍 Parking ${parking.id} filtered out: has active booking now`);
            return null;
        }
        return parking;
    }));
    const finalAvailableParkings = availableParkings.filter(p => p !== null);
    console.log(`📋 Parkings after availability filter: ${finalAvailableParkings.length}/${filteredParkings.length}`);
    const result = finalAvailableParkings.map((p) => {
        // חישוב מחיר שעה ראשונה מהמחירון
        let firstHourPrice = p.priceHr; // ברירת מחדל לשדה הישן
        console.log(`💰 Calculating price for parking ${p.id}, legacy priceHr: ${p.priceHr}, has pricing: ${!!p.pricing}`);
        if (p.pricing) {
            try {
                const pricingData = typeof p.pricing === 'string' ? JSON.parse(p.pricing) : p.pricing;
                console.log(`💰 Parsed pricing data for parking ${p.id}:`, pricingData);
                // בדיקה אם hour1 קיים (יכול להיות string או number)
                if (pricingData && pricingData.hour1 !== undefined && pricingData.hour1 !== null) {
                    const hour1Value = typeof pricingData.hour1 === 'string' ? parseFloat(pricingData.hour1) : pricingData.hour1;
                    if (!isNaN(hour1Value) && hour1Value > 0) {
                        firstHourPrice = hour1Value;
                        console.log(`💰 ✅ Using new pricing for parking ${p.id}, hour1: ${hour1Value} (converted from ${typeof pricingData.hour1})`);
                    }
                    else {
                        console.log(`💰 ❌ Invalid hour1 value for parking ${p.id}: ${pricingData.hour1} (type: ${typeof pricingData.hour1})`);
                    }
                }
                else {
                    console.log(`💰 ❌ No hour1 in pricing for parking ${p.id}:`, pricingData);
                }
            }
            catch (error) {
                console.warn(`💰 ❌ Failed to parse pricing data for parking ${p.id}:`, error);
            }
        }
        else {
            console.log(`💰 No pricing data for parking ${p.id}, using legacy priceHr: ${p.priceHr}`);
        }
        console.log(`💰 🎯 Final firstHourPrice for parking ${p.id}: ${firstHourPrice}`);
        // בניית מערך תמונות לתצוגה
        const images = [];
        console.log(`📸 Building images for parking ${p.id}:`, {
            entranceImageUrl: p.entranceImageUrl,
            emptyImageUrl: p.emptyImageUrl,
            withCarImageUrl: p.withCarImageUrl,
            additionalImageUrl: p.additionalImageUrl
        });
        if (p.entranceImageUrl)
            images.push({ uri: p.entranceImageUrl, type: 'entrance' });
        if (p.emptyImageUrl)
            images.push({ uri: p.emptyImageUrl, type: 'empty' });
        if (p.withCarImageUrl)
            images.push({ uri: p.withCarImageUrl, type: 'with_car' });
        if (p.additionalImageUrl)
            images.push({ uri: p.additionalImageUrl, type: 'additional' });
        console.log(`📸 Final images array for parking ${p.id}:`, images);
        const result = {
            ...p,
            available: true,
            firstHourPrice, // הוספת מחיר שעה ראשונה
            pricing: p.pricing, // וידוא שהמחירון המלא מועבר
            images // הוספת תמונות החניה
        };
        console.log(`🎯 Returning parking ${p.id} with firstHourPrice: ${result.firstHourPrice}, priceHr: ${result.priceHr}`);
        return result;
    });
    console.log(`🎯 Returning ${result.length} parkings to frontend`);
    // לוג מפורט של החניות שמוחזרות כדי לראות אם pricing מועבר
    result.forEach(parking => {
        console.log(`🎯 Final parking ${parking.id}:`);
        console.log(`   - title: ${parking.title}`);
        console.log(`   - priceHr: ${parking.priceHr}`);
        console.log(`   - pricing field exists: ${!!parking.pricing}`);
        console.log(`   - pricing value: ${parking.pricing}`);
        console.log(`   - pricing type: ${typeof parking.pricing}`);
    });
    return result;
}
