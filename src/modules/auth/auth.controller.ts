import { NextFunction, Request, Response } from 'express';
import { authService } from './auth.service.js';
import { success } from '../../utils/api-response.js';
import { AppError, ErrorCodes } from '../../utils/app-error.js';
import { logger } from '../../utils/logger.js';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      logger.info('Admin login successful', { userId: result.profile.id });
      success(res, result, { message: 'Login successful' });
    } catch (err) {
      next(err);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.profile) {
        throw new AppError(401, ErrorCodes.UNAUTHORIZED, 'Authentication required');
      }
      success(res, req.profile, { message: 'Current user' });
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const header = req.headers.authorization;
      const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
      if (token) {
        await authService.logout(token);
      }
      success(res, null, { message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
