import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import connectDB from './src/config/db.js';
import Admin from './src/models/Admin.js';
import Settings from './src/models/Settings.js';
import routes from './src/routes/index.js';
import { apiLimiter } from './src/middleware/rateLimiter.js';
import { ApiError } from './src/utils/ApiError.js';
import { startCronJobs } from './src/cron/referralCron.js';

dotenv.config();

// Fail fast if required secrets are missing — never silently use defaults in any env
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET is not set. Refusing to start.');
  process.exit(1);
}
if (!process.env.JWT_REFRESH_SECRET) {
  console.error('❌ FATAL: JWT_REFRESH_SECRET is not set. Refresh tokens would share the access secret, undermining token rotation. Refusing to start.');
  process.exit(1);
}


const seedAdminOnStartup = async () => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)) {
    console.error('❌ FATAL: ADMIN_EMAIL and ADMIN_PASSWORD must be set in production. Refusing to start with default credentials.');
    process.exit(1);
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'superadmin@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'password123';

  if (!isProduction && !process.env.ADMIN_PASSWORD) {
    console.warn('⚠️  WARNING: Using default admin password (password123). Set ADMIN_PASSWORD env var before going to production.');
  }

  try {
    const existing = await Admin.findOne({ email: adminEmail });
    if (!existing) {
      await Admin.create({
        name: 'Super Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'superadmin',
      });
      console.log(`✅ Auto-seeded superadmin: ${adminEmail}`);
    }
  } catch (err) {
    console.error('❌ Auto-seed failed:', err.message);
  }
};

const seedSettingsOnStartup = async () => {
  const defaults = [
    { key: 'trialPrice',              value: 30,  description: 'One-day trial subscription price (₹)' },
    { key: 'prioritySlotFee',         value: 99,  description: 'Priority slot surcharge when slot is full (₹)' },
    { key: 'referralDiscountPercent', value: 25,  description: 'Discount % applied to new user on referral' },
    { key: 'referralExpiryDays',      value: 7,   description: 'Days the referral discount stays valid' },
  ];
  try {
    for (const s of defaults) {
      await Settings.findOneAndUpdate({ key: s.key }, s, { upsert: true, new: true });
    }
    console.log('✅ Settings defaults ensured');
  } catch (err) {
    console.error('❌ Settings seed failed:', err.message);
  }
};

const app = express();
const PORT = process.env.PORT || 3001;

// ─── SECURITY & PERFORMANCE ─────────────────────
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://cleanzo.in', 'https://www.cleanzo.in', 'https://admin.cleanzo.in']
    : ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173'],
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
    await seedSettingsOnStartup();
    startCronJobs();
  } catch (err) {
    console.error('❌ Async startup error:', err.message);
  }
};

start();
