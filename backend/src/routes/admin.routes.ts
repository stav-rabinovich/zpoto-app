import { Router } from 'express';
import * as svc from '../services/admin.service';
import { requireAdmin } from '../middlewares/auth';
import { prisma } from '../lib/prisma';

const r = Router();

// כל ה-routes דורשים הרשאות Admin
r.use(requireAdmin);

/**
 * GET /api/admin/listing-requests
 * רשימת כל בקשות הפרסום (עם אפשרות סינון לפי סטטוס)
 */
r.get('/listing-requests', async (req, res, next) => {
  try {
    const { status } = req.query;
    const data = await svc.listListingRequests(
      status ? { status: String(status) } : undefined
    );
    res.json(data);
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/admin/listing-requests/:id
 * פרטי בקשה בודדת
 */
r.get('/listing-requests/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const data = await svc.getListingRequest(id);
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/admin/listing-requests/:id/approve
 * אישור בקשה - יוצר Parking ומשנה role ל-OWNER
 */
r.post('/listing-requests/:id/approve', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await svc.approveListingRequest(id);
    res.json(result);
  } catch (e: any) {
    if (e?.message === 'REQUEST_NOT_FOUND') {
      return res.status(404).json({ error: 'Request not found' });
    }
    if (e?.message === 'REQUEST_ALREADY_PROCESSED') {
      return res.status(400).json({ error: 'Request already processed' });
    }
    next(e);
  }
});

/**
 * PATCH /api/admin/listing-requests/:id/reject
 * דחיית בקשה
 * Body: { reason?: string }
 */
r.patch('/listing-requests/:id/reject', async (req, res) => {
  const id = Number(req.params.id);
  const { reason } = req.body ?? {};
  try {
    await svc.rejectListingRequest(id, reason);
    res.json({ message: 'Request rejected' });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * PATCH /api/admin/listing-requests/:id/onboarding
 * עדכון נתוני אונבורדינג
 * Body: { onboarding: string (JSON) }
 */
r.patch('/listing-requests/:id/onboarding', async (req, res) => {
  const id = Number(req.params.id);
  const { onboarding } = req.body ?? {};
  
  if (typeof onboarding !== 'string') {
    return res.status(400).json({ error: 'onboarding must be a JSON string' });
  }
  
  try {
    const updated = await prisma.listingRequest.update({
      where: { id },
      data: { onboarding },
    });
    res.json(updated);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/admin/listing-requests/:id/send-for-signature
 * שליחת מייל ללקוח לחתימה על המסמך
 * Body: { onboardingData: object }
 */
r.post('/listing-requests/:id/send-for-signature', async (req, res) => {
  const id = Number(req.params.id);
  const { onboardingData } = req.body ?? {};
  
  try {
    // שמירת הנתונים
    await prisma.listingRequest.update({
      where: { id },
      data: { onboarding: JSON.stringify(onboardingData) },
    });
    
    // קבלת פרטי הבקשה
    const request = await prisma.listingRequest.findUnique({
      where: { id },
      include: { user: true },
    });
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    // שליחת מייל לחתימה (אופציונלי - אם יש הגדרות)
    try {
      const { sendOnboardingSignatureEmail } = await import('../services/email.service');
      await sendOnboardingSignatureEmail(request.user.email, onboardingData, id);
      console.log('✅ Signature email sent to:', request.user.email);
    } catch (emailError) {
      console.log('⚠️ Email not configured, skipping email send');
      console.log('📧 Would send email to:', request.user.email);
    }
    
    res.json({ 
      message: 'Data saved successfully. Email configuration needed for sending.',
      email: request.user.email,
      signatureUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/sign/${id}`,
      note: 'Configure EMAIL_USER and EMAIL_PASS in .env to enable email sending'
    });
  } catch (e: any) {
    console.error('❌ Error:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * PATCH /api/admin/users/:id
 * עדכון פרטי משתמש
 */
r.patch('/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, email, phone } = req.body;
  
  console.log('📝 Updating user:', { id, name, email, phone });
  
  try {
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    
    console.log('📝 Update data:', updateData);
    
    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    });
    
    console.log('✅ User updated successfully:', updated);
    res.json(updated);
  } catch (e: any) {
    console.error('❌ Error updating user:', e);
    res.status(500).json({ error: 'Internal Server Error', details: e.message });
  }
});

/**
 * PATCH /api/admin/parkings/:id
 * עדכון פרטי חניה
 */
r.patch('/parkings/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { isActive } = req.body;
  
  try {
    const updated = await prisma.parking.update({
      where: { id },
      data: {
        ...(typeof isActive === 'boolean' && { isActive }),
      },
    });
    
    res.json(updated);
  } catch (e: any) {
    console.error('❌ Error updating parking:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * DELETE /api/admin/parkings/:id
 * מחיקת חניה
 */
r.delete('/parkings/:id', async (req, res) => {
  const id = Number(req.params.id);
  
  try {
    await prisma.parking.delete({
      where: { id },
    });
    
    res.json({ success: true });
  } catch (e: any) {
    console.error('❌ Error deleting parking:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/admin/stats
 * נתונים סטטיסטיים כלליים
 */
r.get('/stats', async (_req, res, next) => {
  try {
    const data = await svc.getStats();
    res.json(data);
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/admin/users
 * רשימת כל המשתמשים
 */
r.get('/users', async (_req, res, next) => {
  try {
    const data = await svc.listUsers();
    res.json(data);
  } catch (e) {
    console.log(e)
    next(e);
  }
});

/**
 * GET /api/admin/bookings
 * רשימת כל ההזמנות (עם פילטרים אופציונליים)
 */
r.get('/bookings', async (req, res, next) => {
  try {
    const { status, userId, parkingId } = req.query;
    const data = await svc.listAllBookings({
      status: status ? String(status) : undefined,
      userId: userId ? Number(userId) : undefined,
      parkingId: parkingId ? Number(parkingId) : undefined,
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /api/admin/chats
 * רשימת כל הצ'אטים
 */
r.get('/chats', async (req, res, next) => {
  try {
    const { getAllChats } = await import('../services/chat.service');
    const chats = await getAllChats();
    res.json({ data: chats });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /api/admin/chats/:userId/reply
 * מענה לצ'אט של משתמש
 */
r.post('/chats/:userId/reply', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    const { message, parkingId } = req.body;
    
    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const { sendMessage } = await import('../services/chat.service');
    const chat = await sendMessage({
      userId,
      message: message.trim(),
      isFromUser: false, // מאדמין
      parkingId: parkingId || undefined,
    });
    
    res.json({ data: chat });
  } catch (e) {
    next(e);
  }
});


export default r;
