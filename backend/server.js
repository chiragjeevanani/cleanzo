import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import connectDB from './src/config/db.js';
import Admin from './src/models/Admin.js';
import routes from './src/routes/index.js';
import { apiLimiter } from './src/middleware/rateLimiter.js';
import { ApiError } from './src/utils/ApiError.js';
import { startCronJobs } from './src/cron/referralCron.js';

dotenv.config();
// Trigger restart after fixing sharp dependency issue


const seedAdminOnStartup = async () => {
  try {
    const existing = await Admin.findOne({ email: process.env.ADMIN_EMAIL || 'superadmin@gmail.com' });
    if (!existing) {
      await Admin.create({
        name: 'Super Admin',
        email: process.env.ADMIN_EMAIL || 'superadmin@gmail.com',
        password: process.env.ADMIN_PASSWORD || 'password123',
        role: 'superadmin',
      });
      console.log('✅ Auto-seeded superadmin: superadmin@gmail.com');
    }
  } catch (err) {
    console.error('❌ Auto-seed failed:', err.message);
  }
};

const app = express();
const PORT = process.env.PORT || 3001;

// Start cron jobs
startCronJobs();

// ─── SECURITY & PERFORMANCE ─────────────────────
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://cleanzo.in', 'https://www.cleanzo.in']
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── LOGGING ─────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ─── RATE LIMITING ───────────────────────────────
app.use('/api', apiLimiter);

// ─── HEALTH CHECK ────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Cleanzo Backend is running!', timestamp: new Date().toISOString() });
});

// ─── API ROUTES ──────────────────────────────────
app.use('/api', routes);

// ─── 404 HANDLER ─────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── GLOBAL ERROR HANDLER ────────────────────────
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (process.env.NODE_ENV !== 'production') {
    console.error('❌ Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ─── START ───────────────────────────────────────
const start = async () => {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Cleanzo API running on http://localhost:${PORT}`);
    console.log(`📋 Health: http://localhost:${PORT}/api/health`);
  });

  try {
    await connectDB();
    await seedAdminOnStartup();
  } catch (err) {
    console.error('❌ Async startup error:', err.message);
  }
};

start();
