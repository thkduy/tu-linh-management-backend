import { NextFunction, Request, Response } from 'express';
import { AppError, ErrorCodes } from '../utils/app-error.js';

/**
 * Admin authorization middleware.
 *
 * Must run AFTER the auth middleware. A valid Supabase account does NOT
 * automatically grant dashboard access — the user's profile role must be
 * `admin`. Returns 403 Forbidden for authenticated non-admins.
 */
export function adminMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (!req.profile) {
    next(new AppError(401, ErrorCodes.UNAUTHORIZED, 'Authentication required'));
    return;
  }

  if (req.profile.role !== 'admin') {
    next(new AppError(403, ErrorCodes.FORBIDDEN, 'Administrator access required'));
    return;
  }

  if (req.profile.status !== 'active') {
    next(new AppError(403, ErrorCodes.INACTIVE_USER, 'Account is inactive'));
    return;
  }

  next();
}
