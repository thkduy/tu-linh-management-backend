import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import morgan from 'morgan';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import apiRoutes from './routes/index.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { notFoundMiddleware } from './middleware/not-found.middleware.js';
import { swaggerSpec, swaggerHtml } from './config/swagger.js';

export function createApp(): Express {
  const app = express();

  // Security headers (strict defaults for the whole app).
  app.use(helmet());

  // CORS.
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );

  // Body parsing.
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Rate limiting (applied globally; auth routes are the primary target).
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
    }),
  );

  // HTTP request logging (morgan writes to stdout; no sensitive data logged).
  app.use(
    morgan('combined', {
      stream: { write: (message: string) => logger.info(message.trim(), { type: 'http' }) },
    }),
  );

  // Health check (unversioned, no auth).
  app.get('/health', (_req, res) => {
    res.json({ success: true, status: 'ok' });
  });

  // API documentation (CDN-based UI + JSON spec). The docs page needs a
  // relaxed Content Security Policy to load Swagger UI assets from the unpkg
  // CDN and run its inline bootstrap script, so we override the strict global
  // CSP for these two routes only.
  app.get('/api/docs/swagger.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  app.get('/api/docs', (_req, res) => {
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://unpkg.com",
        "style-src 'self' 'unsafe-inline' https://unpkg.com",
        "img-src 'self' data: https://unpkg.com",
        "connect-src 'self' https://unpkg.com",
        "font-src 'self' https://unpkg.com",
      ].join('; '),
    );
    res.setHeader('Content-Type', 'text/html');
    res.send(swaggerHtml);
  });

  // Versioned API routes.
  app.use('/api/v1', apiRoutes);

  // 404 handler.
  app.use(notFoundMiddleware);

  // Centralized error handler.
  app.use(errorMiddleware);

  return app;
}
