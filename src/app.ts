import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import apiRoutes from './routes/index.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { notFoundMiddleware } from './middleware/not-found.middleware.js';
import { swaggerSpec } from './config/swagger.js';

export function createApp(): Express {
  const app = express();

  // Security headers.
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

  // API documentation.
  app.use('/api/docs', swaggerUi.serveFiles(swaggerSpec));
  app.get('/api/docs', swaggerUi.setup(swaggerSpec));

  // Versioned API routes.
  app.use('/api/v1', apiRoutes);

  // 404 handler.
  app.use(notFoundMiddleware);

  // Centralized error handler.
  app.use(errorMiddleware);

  return app;
}
