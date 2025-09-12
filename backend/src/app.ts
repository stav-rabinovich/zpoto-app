import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import parkingsRouter from './routes/parkings.routes';
import authRouter from './routes/auth.routes';
import bookingsRouter from './routes/bookings.routes';

dotenv.config();
const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
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

// Error handler (כללי)
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
