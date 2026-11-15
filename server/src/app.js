import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import readingRoutes from './routes/readings.js';
import reportRoutes from './routes/reports.js';
import doctorRoutes from './routes/doctor.js';
import adminRoutes from './routes/admin.js';
import { requireAuth, requireDoctor, requireAdmin } from './middleware/auth.js';

export const app = express();
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Sweety Blood Glucose Tracker API',
    status: 'Running',
    version: '1.0.0'
  });
});
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '20kb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }), authRoutes);
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'sweety-api' }));
app.get('/api/auth/me', requireAuth, async (req, res, next) => {
  try {
    const { pool } = await import('./db/pool.js');
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.created_at::text AS created_at,
              d.name AS doctor_name, d.specialization AS doctor_specialization
       FROM users u LEFT JOIN users d ON d.id = u.doctor_id WHERE u.id=$1`,
      [req.user.id]
    );
    if (!result.rowCount) return res.status(401).json({ message: 'Account not found.' });
    res.json({ user: result.rows[0] });
  } catch (error) { next(error); }
});
app.use('/api/readings', requireAuth, readingRoutes);
app.use('/api/reports', requireAuth, reportRoutes);
app.use('/api/doctor', requireAuth, requireDoctor, doctorRoutes);
app.use('/api/admin', requireAuth, requireAdmin, adminRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});
