import { NextFunction, Request, Response } from 'express';
import { AppError, ErrorCodes } from '../utils/app-error.js';

export function notFoundMiddleware(req: Request, _res: Response, next: NextFunction): void {
  next(
    new AppError(404, ErrorCodes.NOT_FOUND, `Route not found: ${req.method} ${req.originalUrl}`),
  );
}
