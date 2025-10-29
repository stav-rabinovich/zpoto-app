"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const parkings_routes_1 = __importDefault(require("./routes/parkings.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const bookings_routes_1 = __importDefault(require("./routes/bookings.routes"));
const payments_routes_1 = __importDefault(require("./routes/payments.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const owner_routes_1 = __importDefault(require("./routes/owner.routes"));
const documents_routes_1 = __importDefault(require("./routes/documents.routes"));
const commission_routes_1 = __importDefault(require("./routes/commission.routes"));
const jobs_routes_1 = __importDefault(require("./routes/jobs.routes"));
const quick_fix_routes_1 = __importDefault(require("./routes/quick-fix.routes"));
const coupons_routes_1 = __importDefault(require("./routes/coupons.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// CORS - מאפשר גישה מכל המקורות (Admin, Expo, וכו')
const allowedOrigins = [
    'http://localhost:5173', // Admin Panel
    'http://localhost:5174', // Admin Panel
    'http://localhost:5175', // Admin Panel
    'http://localhost:19006', // Expo Dev
    'http://localhost:19000', // Expo Dev (alternative)
    'http://10.0.0.12:19006', // Expo on network
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // אפשר גישה אם אין origin (כמו Postman) או אם ה-origin ברשימה
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(null, true); // בפיתוח - מאפשר הכל
        }
    },
    credentials: true,
}));
app.use(express_1.default.json());
// Health
app.get('/health', (_req, res) => {
    res.status(200).json({ ok: true, service: 'Zpoto API' });
});
// Auth
app.use('/api/auth', auth_routes_1.default);
// Parkings
app.use('/api/parkings', parkings_routes_1.default);
// Bookings
app.use('/api/bookings', bookings_routes_1.default);
// Extensions (הארכות חניה)
const extensions_routes_1 = __importDefault(require("./routes/extensions.routes"));
app.use('/api/extensions', extensions_routes_1.default);
// Payments
app.use('/api/payments', payments_routes_1.default);
// Admin
app.use('/api/admin', admin_routes_1.default);
// Owner
app.use('/api/owner', owner_routes_1.default);
// Commissions
app.use('/api/commissions', commission_routes_1.default);
// Operational Fees (דמי תפעול)
const operationalFees_routes_1 = __importDefault(require("./routes/operationalFees.routes"));
app.use('/api/operational-fees', operationalFees_routes_1.default);
// Jobs (עבודות רקע)
app.use('/api/jobs', jobs_routes_1.default);
// Quick Fix (תיקונים מיידיים)
app.use('/api/quick-fix', quick_fix_routes_1.default);
// Coupons (קופונים)
app.use('/api/coupons', coupons_routes_1.default);
// Vehicles
const vehicles_routes_1 = __importDefault(require("./routes/vehicles.routes"));
app.use('/api/vehicles', vehicles_routes_1.default);
// Profile
const profile_routes_1 = __importDefault(require("./routes/profile.routes"));
app.use('/api/profile', profile_routes_1.default);
// Chat
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
app.use('/api/chat', chat_routes_1.default);
// Public (ללא אימות)
const public_routes_1 = __importDefault(require("./routes/public.routes"));
app.use('/api/public', public_routes_1.default);
// Saved Places
const saved_places_routes_1 = __importDefault(require("./routes/saved-places.routes"));
app.use('/api/saved-places', saved_places_routes_1.default);
// Recent Searches
const recent_searches_routes_1 = __importDefault(require("./routes/recent-searches.routes"));
app.use('/api/recent-searches', recent_searches_routes_1.default);
// Favorites
const favorites_routes_1 = __importDefault(require("./routes/favorites.routes"));
app.use('/api/favorites', favorites_routes_1.default);
// Payment Methods
const payment_methods_routes_1 = __importDefault(require("./routes/payment-methods.routes"));
app.use('/api/payment-methods', payment_methods_routes_1.default);
// Anonymous (ללא אימות - Device ID based)
const anonymous_routes_1 = __importDefault(require("./routes/anonymous.routes"));
app.use('/api/anonymous', anonymous_routes_1.default);
// Migration (העברת נתוני אורח למשתמש רשום)
const migration_routes_1 = __importDefault(require("./routes/migration.routes"));
app.use('/api/migration', migration_routes_1.default);
// Documents (מערכת מסמכים)
app.use('/api/documents', documents_routes_1.default);
// Notifications (מערכת התראות)
const notifications_routes_1 = __importDefault(require("./routes/notifications.routes"));
app.use('/api/notifications', notifications_routes_1.default);
// Error handler (כללי)
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
});
exports.default = app;
