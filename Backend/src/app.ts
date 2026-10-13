import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { ENV } from './config/env.js';
import { authRouter } from './routes/authRoutes.js';
import { productRouter } from './routes/productRoutes.js';
import { orderRouter } from './routes/orderRoutes.js';
import { couponRouter } from './routes/couponRoutes.js';
import { chatRouter } from './routes/chatRoutes.js';
import { userRouter } from './routes/userRoutes.js';
import { settingRouter } from './routes/settingRoutes.js';

import { globalApiRateLimiter } from './middleware/rateLimit.js';

export const app = express();

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  // Enforce HSTS for HTTPS or production environments
  if (req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Content-Security-Policy (Allow local dev assets, fonts, websockets, and images)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https: http:; connect-src 'self' ws: wss: http: https:; frame-ancestors 'none';"
  );
  next();
});

// Middlewares
app.use(
  cors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) return callback(null, true);
      const isAllowed =
        requestOrigin === ENV.FRONTEND_URL ||
        requestOrigin.includes('localhost') ||
        requestOrigin.includes('127.0.0.1') ||
        /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(requestOrigin);

      if (isAllowed || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('CORS policy: Not allowed by origin'));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Global API rate limiting
app.use('/api', globalApiRateLimiter);

// Serve uploaded static files with security headers
app.use(
  '/uploads',
  express.static(ENV.UPLOADS_DIR, {
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  })
);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/products', productRouter);
app.use('/api/orders', orderRouter);
app.use('/api/coupons', couponRouter);
app.use('/api/chat', chatRouter);
app.use('/api/users', userRouter);
app.use('/api/settings', settingRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Centralized Error Handler (Issue 3.3)
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('[SERVER ERROR]', err);
    const status = typeof err.status === 'number' ? err.status : 500;
    res.status(status).json({
      error: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV !== 'production' && err.stack ? { stack: err.stack } : {}),
    });
  }
);
