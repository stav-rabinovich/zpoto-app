/**
 * API endpoints להארכות חניה
 */

import { Router } from 'express';
import { auth, AuthedRequest } from '../middlewares/auth';
import {
  checkExtensionEligibility,
  executeExtension,
  getExtensionHistory,
} from '../services/extensions.service';

const r = Router();

/**
 * GET /api/extensions/check/:bookingId
 * בדיקת זכאות להארכה
 */
r.get('/check/:bookingId', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const bookingId = parseInt(req.params.bookingId);

    if (isNaN(bookingId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid booking ID',
      });
    }

    console.log(`🔍 Extension check request: booking #${bookingId} by user #${userId}`);

    const result = await checkExtensionEligibility(bookingId, userId);

    res.json(result);
  } catch (error) {
    console.error('❌ Extension check error:', error);
    next(error);
  }
});

/**
 * POST /api/extensions/execute
 * ביצוע הארכה (אחרי תשלום מוצלח)
 */
r.post('/execute', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { bookingId, paymentId } = req.body;

    if (!bookingId || !paymentId) {
      return res.status(400).json({
        success: false,
        error: 'Missing bookingId or paymentId',
      });
    }

    console.log(`💰 Extension execution request:`, {
      bookingId,
      userId,
      paymentId,
    });

    const result = await executeExtension(parseInt(bookingId), userId, paymentId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Extension completed successfully',
        booking: result.booking,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('❌ Extension execution error:', error);
    next(error);
  }
});

/**
 * GET /api/extensions/history/:bookingId
 * היסטוריית הארכות
 */
r.get('/history/:bookingId', auth, async (req: AuthedRequest, res, next) => {
  try {
    const bookingId = parseInt(req.params.bookingId);

    if (isNaN(bookingId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid booking ID',
      });
    }

    const history = await getExtensionHistory(bookingId);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('❌ Extension history error:', error);
    next(error);
  }
});

export default r;
