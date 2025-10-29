/**
 * Commission Routes - נתיבי API למערכת עמלות
 */

import { Router } from 'express';
import {
  calculateCommission,
  saveCommission,
  getOwnerCommissions,
  getAllCommissionsForMonth,
} from '../services/commission.service';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * POST /api/commissions/calculate
 * חישוב עמלה להזמנה
 */
router.post('/calculate', async (req, res, next) => {
  try {
    const { bookingId, totalPriceCents, hourlyPricing } = req.body;

    if (!bookingId || !totalPriceCents) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: bookingId, totalPriceCents',
      });
    }

    console.log(`💰 API: Calculating commission for booking ${bookingId}`);

    // חישוב העמלה
    const calculation = await calculateCommission(bookingId, totalPriceCents, hourlyPricing);

    // שמירה במסד הנתונים
    await saveCommission(bookingId, calculation);

    res.json({
      success: true,
      data: {
        bookingId,
        totalPriceCents: calculation.totalPriceCents,
        commissionCents: calculation.commissionCents,
        netOwnerCents: calculation.netOwnerCents,
        commissionRate: calculation.commissionRate,
        commissionILS: (calculation.commissionCents / 100).toFixed(2),
        netOwnerILS: (calculation.netOwnerCents / 100).toFixed(2),
        hourlyBreakdown: calculation.hourlyBreakdown,
      },
    });
  } catch (error) {
    console.error('💰 Error calculating commission:', error);
    next(error);
  }
});

/**
 * GET /api/owner/commissions
 * עמלות של בעל חניה לחודש נתון
 */
router.get('/owner/:ownerId/commissions', async (req, res, next) => {
  try {
    const { ownerId } = req.params;
    const { year, month } = req.query;

    if (!ownerId) {
      return res.status(400).json({
        success: false,
        error: 'Missing ownerId parameter',
      });
    }

    // ברירת מחדל - החודש הנוכחי
    const currentDate = new Date();
    const targetYear = year ? parseInt(year as string) : currentDate.getFullYear();
    const targetMonth = month ? parseInt(month as string) : currentDate.getMonth() + 1;

    console.log(
      `💰 API: Getting commissions for owner ${ownerId} for ${targetMonth}/${targetYear}`
    );

    const result = await getOwnerCommissions(parseInt(ownerId), targetYear, targetMonth);

    res.json({
      success: true,
      data: {
        ownerId: parseInt(ownerId),
        period: { year: targetYear, month: targetMonth },
        summary: result.summary,
        commissions: result.commissions.map(c => ({
          id: c.id,
          bookingId: c.bookingId,
          totalPriceCents: c.totalPriceCents,
          commissionCents: c.commissionCents,
          netOwnerCents: c.netOwnerCents,
          commissionRate: c.commissionRate,
          calculatedAt: c.calculatedAt,
          parking: {
            title: c.booking.parking.title,
            address: c.booking.parking.address,
          },
          booking: {
            startTime: c.booking.startTime,
            endTime: c.booking.endTime,
            paidAt: c.booking.paidAt,
          },
        })),
      },
    });
  } catch (error) {
    console.error('💰 Error getting owner commissions:', error);
    next(error);
  }
});

/**
 * GET /api/owner/payouts
 * היסטוריית תשלומים של בעל חניה
 */
router.get('/owner/:ownerId/payouts', async (req, res, next) => {
  try {
    const { ownerId } = req.params;
    const { limit = 12 } = req.query; // ברירת מחדל - 12 חודשים אחרונים

    if (!ownerId) {
      return res.status(400).json({
        success: false,
        error: 'Missing ownerId parameter',
      });
    }

    console.log(`💰 API: Getting payouts for owner ${ownerId}`);

    const payouts = await prisma.ownerPayout.findMany({
      where: {
        ownerId: parseInt(ownerId),
      },
      include: {
        commissions: {
          select: {
            id: true,
            commissionCents: true,
            netOwnerCents: true,
          },
        },
      },
      orderBy: {
        periodStart: 'desc',
      },
      take: parseInt(limit as string),
    });

    res.json({
      success: true,
      data: {
        ownerId: parseInt(ownerId),
        payouts: payouts.map(p => ({
          id: p.id,
          periodStart: p.periodStart,
          periodEnd: p.periodEnd,
          totalCommissionCents: p.totalCommissionCents,
          netPayoutCents: p.netPayoutCents,
          status: p.status,
          processedAt: p.processedAt,
          paymentReference: p.paymentReference,
          paymentMethod: p.paymentMethod,
          notes: p.notes,
          commissionsCount: p.commissions.length,
          totalCommissionILS: (p.totalCommissionCents / 100).toFixed(2),
          netPayoutILS: (p.netPayoutCents / 100).toFixed(2),
        })),
      },
    });
  } catch (error) {
    console.error('💰 Error getting owner payouts:', error);
    next(error);
  }
});

/**
 * GET /api/admin/commissions
 * הכנסות כלליות לאדמין לחודש נתון
 */
router.get('/admin/commissions', async (req, res, next) => {
  try {
    const { year, month } = req.query;

    // ברירת מחדל - החודש הנוכחי
    const currentDate = new Date();
    const targetYear = year ? parseInt(year as string) : currentDate.getFullYear();
    const targetMonth = month ? parseInt(month as string) : currentDate.getMonth() + 1;

    console.log(`💰 API: Getting admin commissions for ${targetMonth}/${targetYear}`);

    const result = await getAllCommissionsForMonth(targetYear, targetMonth);

    res.json({
      success: true,
      data: {
        period: result.period,
        totalZpotoRevenueCents: result.totalZpotoRevenueCents,
        totalZpotoRevenueILS: result.totalZpotoRevenueILS,
        ownerSummaries: result.ownerSummaries.map(summary => ({
          owner: summary.owner,
          totalCommissionCents: summary.totalCommissionCents,
          totalNetOwnerCents: summary.totalNetOwnerCents,
          totalCommissionILS: (summary.totalCommissionCents / 100).toFixed(2),
          totalNetOwnerILS: (summary.totalNetOwnerCents / 100).toFixed(2),
          commissionsCount: summary.count,
        })),
      },
    });
  } catch (error) {
    console.error('💰 Error getting admin commissions:', error);
    next(error);
  }
});

/**
 * POST /api/admin/process-payout
 * עיבוד תשלום חודשי לבעל חניה
 */
router.post('/admin/process-payout', async (req, res, next) => {
  try {
    const { ownerId, year, month, paymentMethod, paymentReference, notes } = req.body;

    if (!ownerId || !year || !month) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: ownerId, year, month',
      });
    }

    console.log(`💰 API: Processing payout for owner ${ownerId} for ${month}/${year}`);

    // קבלת עמלות החודש
    const commissions = await getOwnerCommissions(ownerId, year, month);

    if (commissions.commissions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No commissions found for this period',
      });
    }

    // יצירת תקופה
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59);

    // יצירת תשלום
    const payout = await prisma.ownerPayout.create({
      data: {
        ownerId,
        periodStart,
        periodEnd,
        totalCommissionCents: commissions.summary.totalCommissionCents,
        netPayoutCents: commissions.summary.totalNetOwnerCents,
        status: 'PROCESSED',
        processedAt: new Date(),
        paymentMethod,
        paymentReference,
        notes,
      },
    });

    // עדכון העמלות שהן שויכו לתשלום
    await prisma.commission.updateMany({
      where: {
        id: {
          in: commissions.commissions.map(c => c.id),
        },
      },
      data: {
        payoutProcessed: true,
        payoutId: payout.id,
      },
    });

    res.json({
      success: true,
      data: {
        payoutId: payout.id,
        ownerId,
        period: { year, month },
        totalCommissionCents: payout.totalCommissionCents,
        netPayoutCents: payout.netPayoutCents,
        totalCommissionILS: (payout.totalCommissionCents / 100).toFixed(2),
        netPayoutILS: (payout.netPayoutCents / 100).toFixed(2),
        commissionsProcessed: commissions.commissions.length,
        status: payout.status,
        processedAt: payout.processedAt,
      },
    });
  } catch (error) {
    console.error('💰 Error processing payout:', error);
    next(error);
  }
});

export default router;
