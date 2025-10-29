"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const svc = __importStar(require("../services/parkings.service"));
const auth_1 = require("../middlewares/auth");
const r = (0, express_1.Router)();
/**
 * GET /api/parkings/search
 * חיפוש חניות לפי מיקום וזמן
 * Query params: lat, lng, radius (km), startTime (ISO), endTime (ISO)
 */
r.get('/search', async (req, res, next) => {
    try {
        const { lat, lng, radius, startTime, endTime } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ error: 'Missing required params: lat, lng' });
        }
        const params = {
            lat: Number(lat),
            lng: Number(lng),
            radiusKm: radius ? Number(radius) : undefined,
        };
        if (startTime && endTime) {
            params.startTime = new Date(String(startTime));
            params.endTime = new Date(String(endTime));
            if (isNaN(params.startTime.getTime()) || isNaN(params.endTime.getTime())) {
                return res.status(400).json({ error: 'Invalid date format for startTime/endTime' });
            }
        }
        const data = await svc.searchParkings(params);
        res.json({ data });
    }
    catch (e) {
        next(e);
    }
});
// GET /api/parkings — פתוח
r.get('/', async (_req, res, next) => {
    try {
        const data = await svc.listParkings();
        res.json({ data });
    }
    catch (e) {
        next(e);
    }
});
// POST /api/parkings — מחייב התחברות, משייך ownerId מה-JWT
r.post('/', auth_1.auth, async (req, res, next) => {
    try {
        const { address, lat, lng, priceHr } = req.body ?? {};
        if (typeof address !== 'string' ||
            typeof lat !== 'number' ||
            typeof lng !== 'number' ||
            typeof priceHr !== 'number') {
            return res
                .status(400)
                .json({ error: 'Invalid body: {address, lat, lng, priceHr}' });
        }
        const data = await svc.createParking({
            address,
            lat,
            lng,
            priceHr,
            ownerId: Number(req.userId),
        });
        res.status(201).json({ data });
    }
    catch (e) {
        next(e);
    }
});
// GET /api/parkings/:id — פתוח
r.get('/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const data = await svc.getParking(id);
        if (!data)
            return res.status(404).json({ error: 'Not found' });
        res.json({ data });
    }
    catch (e) {
        next(e);
    }
});
// PUT /api/parkings/:id — רק הבעלים
r.put('/:id', auth_1.auth, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const current = await svc.getParking(id);
        if (!current)
            return res.status(404).json({ error: 'Not found' });
        if (current.ownerId !== Number(req.userId)) {
            return res.status(403).json({ error: 'Forbidden: not the owner' });
        }
        const patch = req.body ?? {};
        const data = await svc.updateParking(id, patch);
        res.json({ data });
    }
    catch (e) {
        if (e?.code === 'P2025')
            return res.status(404).json({ error: 'Not found' });
        next(e);
    }
});
// DELETE /api/parkings/:id — רק הבעלים
r.delete('/:id', auth_1.auth, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const current = await svc.getParking(id);
        if (!current)
            return res.status(404).json({ error: 'Not found' });
        if (current.ownerId !== Number(req.userId)) {
            return res.status(403).json({ error: 'Forbidden: not the owner' });
        }
        await svc.deleteParking(id);
        res.status(204).send();
    }
    catch (e) {
        if (e?.code === 'P2025')
            return res.status(404).json({ error: 'Not found' });
        next(e);
    }
});
exports.default = r;
