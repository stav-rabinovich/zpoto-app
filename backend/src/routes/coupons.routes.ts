import { Router } from 'express';
import { couponService } from '../services/coupon.service';
import { auth, AuthedRequest } from '../middlewares/auth';

const r = Router();

/**
 * POST /api/coupons/validate
 * בדיקת תקינות קופון (לא דורש הרשאות)
 */
r.post('/validate', async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'קוד קופון נדרש' });
    }

    const validation = await couponService.validateCoupon(code);
    res.json(validation);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/coupons/calculate-discount
 * חישוב הנחה לקופון (לא דורש הרשאות)
 */
r.post('/calculate-discount', async (req, res, next) => {
  try {
    const { code, parkingCostCents, operationalFeeCents } = req.body;

    if (!code || parkingCostCents === undefined || operationalFeeCents === undefined) {
      return res.status(400).json({
        error: 'נדרשים: code, parkingCostCents, operationalFeeCents',
      });
    }

    // בדיקת תקינות הקופון
    const validation = await couponService.validateCoupon(code);
    if (!validation.isValid) {
      return res.status(400).json({
        error: validation.error,
        errorCode: validation.errorCode,
      });
    }

    // חישוב ההנחה
    const discount = couponService.calculateDiscount(
      validation.coupon!,
      Number(parkingCostCents),
      Number(operationalFeeCents)
    );

    res.json({
      isValid: true,
      coupon: {
        id: validation.coupon!.id,
        code: validation.coupon!.code,
        discountType: validation.coupon!.discountType,
        discountValue: validation.coupon!.discountValue,
        applyTo: validation.coupon!.applyTo,
      },
      discount,
    });
  } catch (error) {
    next(error);
  }
});

export default r;
