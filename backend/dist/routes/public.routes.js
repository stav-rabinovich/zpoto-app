"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const email_service_1 = require("../services/email.service");
const r = (0, express_1.Router)();
/**
 * GET /api/public/listing-requests/:id/onboarding
 * קבלת נתוני אונבורדינג לצורך חתימה (ללא אימות)
 */
r.get('/listing-requests/:id/onboarding', async (req, res) => {
    const id = Number(req.params.id);
    try {
        const request = await prisma_1.prisma.listingRequest.findUnique({
            where: { id },
            select: {
                id: true,
                onboarding: true,
                status: true,
            },
        });
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }
        res.json(request);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
/**
 * POST /api/public/listing-requests/:id/sign
 * חתימה על המסמך
 * Body: { signature: string, signedAt: string }
 */
r.post('/listing-requests/:id/sign', async (req, res) => {
    const id = Number(req.params.id);
    const { signature, signedAt } = req.body ?? {};
    if (!signature) {
        return res.status(400).json({ error: 'Signature is required' });
    }
    try {
        // עדכון המסמך עם החתימה
        const request = await prisma_1.prisma.listingRequest.findUnique({
            where: { id },
            include: { user: true },
        });
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }
        const onboardingData = JSON.parse(request.onboarding || '{}');
        onboardingData.signature = signature;
        onboardingData.signedAt = signedAt;
        onboardingData.signed = true;
        await prisma_1.prisma.listingRequest.update({
            where: { id },
            data: { onboarding: JSON.stringify(onboardingData) },
        });
        // שליחת מייל אישור
        await (0, email_service_1.sendSignatureConfirmationEmail)(request.user.email, onboardingData.fullName || 'לקוח');
        console.log('✅ Document signed by:', signature);
        res.json({
            message: 'Document signed successfully',
            signed: true,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.default = r;
