import { Router } from 'express';
import { auth, AuthedRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';

const r = Router();

/**
 * GET /api/payment-methods
 * קבלת כל אמצעי התשלום של המשתמש
 */
r.get('/', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;

    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' }, // ברירת מחדל קודם
        { createdAt: 'desc' },
      ],
    });

    res.json({ data: paymentMethods });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/payment-methods
 * יצירת אמצעי תשלום חדש
 */
r.post('/', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { type, name, isDefault, metadata } = req.body;

    // ולידציה
    if (!type?.trim()) {
      return res.status(400).json({ error: 'Payment type is required' });
    }
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Payment method name is required' });
    }
    if (!['credit_card', 'paypal', 'apple_pay', 'google_pay', 'bank_transfer'].includes(type)) {
      return res.status(400).json({
        error:
          'Invalid payment type. Must be: credit_card, paypal, apple_pay, google_pay, or bank_transfer',
      });
    }

    // אם זה אמצעי תשלום ברירת מחדל, נבטל את ברירת המחדל מכל האחרים
    if (isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        userId,
        type: type.trim(),
        name: name.trim(),
        isDefault: Boolean(isDefault),
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    res.status(201).json({ data: paymentMethod });
  } catch (e) {
    next(e);
  }
});

/**
 * PUT /api/payment-methods/:id
 * עדכון אמצעי תשלום
 */
r.put('/:id', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const methodId = parseInt(req.params.id);
    const { type, name, isDefault, metadata } = req.body;

    if (isNaN(methodId)) {
      return res.status(400).json({ error: 'Invalid payment method ID' });
    }

    // וידוא שאמצעי התשלום שייך למשתמש
    const existingMethod = await prisma.paymentMethod.findFirst({
      where: { id: methodId, userId },
    });

    if (!existingMethod) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // ולידציה
    if (
      type &&
      !['credit_card', 'paypal', 'apple_pay', 'google_pay', 'bank_transfer'].includes(type)
    ) {
      return res.status(400).json({
        error:
          'Invalid payment type. Must be: credit_card, paypal, apple_pay, google_pay, or bank_transfer',
      });
    }

    // אם זה אמצעי תשלום ברירת מחדל, נבטל את ברירת המחדל מכל האחרים
    if (isDefault && !existingMethod.isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { userId, id: { not: methodId } },
        data: { isDefault: false },
      });
    }

    const updatedMethod = await prisma.paymentMethod.update({
      where: { id: methodId },
      data: {
        ...(type && { type: type.trim() }),
        ...(name && { name: name.trim() }),
        ...(isDefault !== undefined && { isDefault: Boolean(isDefault) }),
        ...(metadata !== undefined && {
          metadata: metadata ? JSON.stringify(metadata) : null,
        }),
      },
    });

    res.json({ data: updatedMethod });
  } catch (e) {
    next(e);
  }
});

/**
 * DELETE /api/payment-methods/:id
 * מחיקת אמצעי תשלום
 */
r.delete('/:id', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const methodId = parseInt(req.params.id);

    if (isNaN(methodId)) {
      return res.status(400).json({ error: 'Invalid payment method ID' });
    }

    // וידוא שאמצעי התשלום שייך למשתמש
    const existingMethod = await prisma.paymentMethod.findFirst({
      where: { id: methodId, userId },
    });

    if (!existingMethod) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    await prisma.paymentMethod.delete({
      where: { id: methodId },
    });

    // אם זה היה ברירת המחדל, נגדיר את הראשון שנשאר כברירת מחדל
    if (existingMethod.isDefault) {
      const firstRemaining = await prisma.paymentMethod.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });

      if (firstRemaining) {
        await prisma.paymentMethod.update({
          where: { id: firstRemaining.id },
          data: { isDefault: true },
        });
      }
    }

    res.json({ message: 'Payment method deleted successfully' });
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /api/payment-methods/:id/default
 * הגדרת אמצעי תשלום כברירת מחדל
 */
r.patch('/:id/default', auth, async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const methodId = parseInt(req.params.id);

    if (isNaN(methodId)) {
      return res.status(400).json({ error: 'Invalid payment method ID' });
    }

    // וידוא שאמצעי התשלום שייך למשתמש
    const existingMethod = await prisma.paymentMethod.findFirst({
      where: { id: methodId, userId },
    });

    if (!existingMethod) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // ביטול ברירת מחדל מכל אמצעי התשלום האחרים
    await prisma.paymentMethod.updateMany({
      where: { userId, id: { not: methodId } },
      data: { isDefault: false },
    });

    // הגדרת אמצעי התשלום הנוכחי כברירת מחדל
    const updatedMethod = await prisma.paymentMethod.update({
      where: { id: methodId },
      data: { isDefault: true },
    });

    res.json({ data: updatedMethod });
  } catch (e) {
    next(e);
  }
});

export default r;
