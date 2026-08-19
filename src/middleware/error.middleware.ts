import { NextFunction, Request, Response } from 'express';
import { AppError, ErrorCodes } from '../utils/app-error.js';
import { isProduction } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { ZodError } from 'zod';

/**
 * Centralized error handler. Produces a consistent error response and never
 * leaks internal database errors or stack traces in production.
 */
export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Validation failed',
      },
    });
    return;
  }

  // Unknown / unexpected error.
  logger.error('Unhandled error', {
    message: err instanceof Error ? err.message : String(err),
    stack: isProduction ? undefined : err instanceof Error ? err.stack : undefined,
  });

  res.status(500).json({
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Internal server error',
    },
  });
}
