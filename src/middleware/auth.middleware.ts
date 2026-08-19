import { NextFunction, Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { AppError, ErrorCodes } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import { Profile } from '../types/index.js';

/**
 * Authentication middleware.
 *
 * 1. Reads the Bearer token from `Authorization: Bearer <token>`.
 * 2. Validates the token using Supabase Auth.
 * 3. Loads the application profile for the authenticated user.
 * 4. Attaches `authUser` and `profile` to the request.
 *
 * Returns 401 Unauthorized on any failure.
 */
export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError(401, ErrorCodes.UNAUTHORIZED, 'Missing or malformed authorization header');
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new AppError(401, ErrorCodes.UNAUTHORIZED, 'Missing access token');
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new AppError(401, ErrorCodes.UNAUTHORIZED, 'Invalid or expired token');
    }

    // Load the application profile (linked to the auth user via auth_user_id).
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', data.user.id)
      .maybeSingle();

    if (profileError) {
      logger.error('Failed to load profile during authentication', {
        userId: data.user.id,
        error: profileError.message,
      });
      throw new AppError(401, ErrorCodes.UNAUTHORIZED, 'Unable to load user profile');
    }

    if (!profile) {
      throw new AppError(401, ErrorCodes.UNAUTHORIZED, 'User profile not found');
    }

    req.authUser = data.user;
    req.profile = mapProfile(profile);

    next();
  } catch (err) {
    next(err);
  }
}

export function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    email: row.email ? String(row.email) : null,
    fullName: String(row.full_name),
    employeeCode: row.employee_code ? String(row.employee_code) : null,
    role: row.role as Profile['role'],
    status: row.status as Profile['status'],
    department: row.department ? String(row.department) : null,
    position: row.position ? String(row.position) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
