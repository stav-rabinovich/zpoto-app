"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixOrphanedOwners = fixOrphanedOwners;
exports.systemHealthCheck = systemHealthCheck;
exports.autoFixSystemIssues = autoFixSystemIssues;
// cleanup.service.ts - תיקון מצבים לא תקינים במערכת
const prisma_1 = require("../lib/prisma");
/**
 * תיקון משתמשים שנשארו עם role OWNER אבל בלי חניות
 */
async function fixOrphanedOwners() {
    console.log('🔧 Starting orphaned owners cleanup...');
    try {
        // מציאת כל המשתמשים עם role OWNER
        const owners = await prisma_1.prisma.user.findMany({
            where: { role: 'OWNER' },
            select: { id: true, email: true, name: true }
        });
        console.log(`🔍 Found ${owners.length} users with OWNER role`);
        const fixedUsers = [];
        for (const owner of owners) {
            // בדיקה אם יש לו חניות
            const parkingCount = await prisma_1.prisma.parking.count({
                where: { ownerId: owner.id }
            });
            if (parkingCount === 0) {
                // אין לו חניות - צריך להחזיר אותו ל-USER
                console.log(`🔧 Fixing user ${owner.id} (${owner.email}) - no parkings found`);
                await prisma_1.prisma.user.update({
                    where: { id: owner.id },
                    data: { role: 'USER' }
                });
                fixedUsers.push({
                    id: owner.id,
                    email: owner.email,
                    name: owner.name,
                    issue: 'OWNER without parkings'
                });
            }
        }
        console.log(`✅ Fixed ${fixedUsers.length} orphaned owners`);
        return {
            success: true,
            message: `Fixed ${fixedUsers.length} orphaned owners`,
            fixedUsers
        };
    }
    catch (error) {
        console.error('❌ Error in orphaned owners cleanup:', error);
        return {
            success: false,
            error: error?.message || 'Unknown error'
        };
    }
}
/**
 * בדיקה כללית של תקינות המערכת
 */
async function systemHealthCheck() {
    console.log('🏥 Starting system health check...');
    try {
        const issues = [];
        // בדיקה 1: משתמשים עם OWNER ללא חניות
        const ownersWithoutParkings = await prisma_1.prisma.user.count({
            where: {
                role: 'OWNER',
                ownedParkings: { none: {} }
            }
        });
        if (ownersWithoutParkings > 0) {
            issues.push({
                type: 'ORPHANED_OWNERS',
                count: ownersWithoutParkings,
                description: 'משתמשים עם role OWNER אבל בלי חניות'
            });
        }
        // בדיקה 2: חניות ללא בעלים  
        const parkingsWithoutOwners = await prisma_1.prisma.parking.count({
            where: {
                NOT: {
                    owner: {
                        id: {
                            gt: 0
                        }
                    }
                }
            }
        });
        if (parkingsWithoutOwners > 0) {
            issues.push({
                type: 'ORPHANED_PARKINGS',
                count: parkingsWithoutOwners,
                description: 'חניות ללא בעלים'
            });
        }
        // בדיקה 3: בקשות שאושרו אבל המשתמש לא OWNER
        const approvedRequestsWithoutOwnerRole = await prisma_1.prisma.listingRequest.count({
            where: {
                status: 'APPROVED',
                user: {
                    role: { not: 'OWNER' }
                }
            }
        });
        if (approvedRequestsWithoutOwnerRole > 0) {
            issues.push({
                type: 'APPROVED_WITHOUT_ROLE',
                count: approvedRequestsWithoutOwnerRole,
                description: 'בקשות מאושרות אבל המשתמש לא OWNER'
            });
        }
        console.log(`🏥 Health check completed - found ${issues.length} issues`);
        return {
            success: true,
            healthy: issues.length === 0,
            issues,
            summary: issues.length === 0 ? 'System is healthy' : `Found ${issues.length} issues`
        };
    }
    catch (error) {
        console.error('❌ Error in system health check:', error);
        return {
            success: false,
            error: error?.message || 'Unknown error'
        };
    }
}
/**
 * תיקון אוטומטי של כל הבעיות שנמצאו
 */
async function autoFixSystemIssues() {
    console.log('🔧 Starting automatic system fixes...');
    try {
        const results = [];
        // תיקון 1: משתמשים יתומים
        const orphanedOwnersResult = await fixOrphanedOwners();
        results.push({
            type: 'ORPHANED_OWNERS',
            result: orphanedOwnersResult
        });
        // כאן אפשר להוסיף תיקונים נוספים בעתיד
        const successCount = results.filter(r => r.result.success).length;
        return {
            success: successCount === results.length,
            message: `Completed ${successCount}/${results.length} fixes`,
            results
        };
    }
    catch (error) {
        console.error('❌ Error in auto fix:', error);
        return {
            success: false,
            error: error?.message || 'Unknown error'
        };
    }
}
