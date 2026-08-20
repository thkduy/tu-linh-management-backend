import { supabase } from '../../config/supabase.js';
import { AppError, ErrorCodes } from '../../utils/app-error.js';
import { logger } from '../../utils/logger.js';
import { mapProfile } from '../../middleware/auth.middleware.js';
import { Profile } from '../../types/index.js';
import { LoginInput, LoginResult, RefreshInput, RefreshResult } from './auth.types.js';

export class AuthService {
  /**
   * Authenticate an administrator using Supabase Auth, then load their profile
   * and verify they are an active admin.
   */
  async login(input: LoginInput): Promise<LoginResult> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error || !data.session || !data.user) {
      // Do not distinguish between "wrong email" and "wrong password".
      throw new AppError(401, ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', data.user.id)
      .maybeSingle();

    if (profileError || !profileRow) {
      logger.warn('Login succeeded but no profile found', { userId: data.user.id });
      throw new AppError(403, ErrorCodes.FORBIDDEN, 'No dashboard access for this account');
    }

    const profile = mapProfile(profileRow);

    if (profile.role !== 'admin') {
      throw new AppError(403, ErrorCodes.FORBIDDEN, 'Administrator access required');
    }

    if (profile.status !== 'active') {
      throw new AppError(403, ErrorCodes.INACTIVE_USER, 'Account is inactive');
    }

    return {
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at ?? null,
        user: {
          id: data.user.id,
          email: data.user.email ?? '',
        },
      },
      profile,
    };
  }

  /** Load the profile for the currently authenticated user. */
  async getProfile(userId: string): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', userId)
      .maybeSingle();

    if (error || !data) {
      throw new AppError(404, ErrorCodes.USER_NOT_FOUND, 'User not found');
    }

    return mapProfile(data);
  }

  /** Exchange a refresh token for a new session. */
  async refresh(input: RefreshInput): Promise<RefreshResult> {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: input.refreshToken,
    });

    if (error || !data.session || !data.user) {
      throw new AppError(401, ErrorCodes.UNAUTHORIZED, 'Invalid or expired refresh token');
    }

    return {
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at ?? null,
        user: {
          id: data.user.id,
          email: data.user.email ?? '',
        },
      },
    };
  }

  /** End the Supabase session. */
  async logout(accessToken: string): Promise<void> {
    const { error } = await supabase.auth.admin.signOut(accessToken);
    if (error) {
      logger.warn('Logout failed', { error: error.message });
    }
  }
}

export const authService = new AuthService();
