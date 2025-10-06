import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import parkingsRouter from './routes/parkings.routes';
import authRouter from './routes/auth.routes';
import bookingsRouter from './routes/bookings.routes';
import adminRouter from './routes/admin.routes';
import ownerRouter from './routes/owner.routes';

dotenv.config();
const app = express();

// CORS - מאפשר גישה מכל המקורות (Admin, Expo, וכו')
const allowedOrigins = [
  'http://localhost:5173',  // Admin Panel
  'http://localhost:5174',  // Admin Panel
  'http://localhost:5175',  // Admin Panel
  'http://localhost:19006', // Expo Dev
  'http://localhost:19000', // Expo Dev (alternative)
  'http://10.0.0.12:19006', // Expo on network
];

app.use(cors({
  origin: (origin, callback) => {
    // אפשר גישה אם אין origin (כמו Postman) או אם ה-origin ברשימה
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // בפיתוח - מאפשר הכל
    }
  },
  credentials: true,
}));
app.use(express.json());

// Health
app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'Zpoto API' });
});

// Auth
app.use('/api/auth', authRouter);

// Parkings
app.use('/api/parkings', parkingsRouter);

// Bookings
app.use('/api/bookings', bookingsRouter);

// Admin
app.use('/api/admin', adminRouter);

// Owner
app.use('/api/owner', ownerRouter);

// Vehicles
import vehiclesRouter from './routes/vehicles.routes';
app.use('/api/vehicles', vehiclesRouter);

// Profile
import profileRouter from './routes/profile.routes';
app.use('/api/profile', profileRouter);

// Chat
import chatRouter from './routes/chat.routes';
app.use('/api/chat', chatRouter);

// Public (ללא אימות)
import publicRouter from './routes/public.routes';
app.use('/api/public', publicRouter);

// Saved Places
import savedPlacesRouter from './routes/saved-places.routes';
app.use('/api/saved-places', savedPlacesRouter);

// Recent Searches
import recentSearchesRouter from './routes/recent-searches.routes';
app.use('/api/recent-searches', recentSearchesRouter);

// Favorites
import favoritesRouter from './routes/favorites.routes';
app.use('/api/favorites', favoritesRouter);

// Payment Methods
import paymentMethodsRouter from './routes/payment-methods.routes';
app.use('/api/payment-methods', paymentMethodsRouter);

// Error handler (כללי)
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
