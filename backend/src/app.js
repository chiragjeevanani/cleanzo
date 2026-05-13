import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import routes from './routes/index.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { ApiError } from './utils/ApiError.js';

const app = express();

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

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Cleanzo Backend is running!', timestamp: new Date().toISOString() });
});

app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

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

export default app;
