import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { supabase, builder, resetSupabaseMocks } from '../../test/supabase-mock.js';
import { adminProfile, employeeProfile, toRow } from '../../test/fixtures.js';

vi.mock('../../config/supabase.js', () => {
  return import('../../test/supabase-mock.js');
});

const app = createApp();

describe('Auth', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  describe('POST /api/v1/auth/login', () => {
    it('logs in an active admin and returns a session + profile', async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          session: {
            access_token: 'access-token',
            refresh_token: 'refresh-token',
            expires_at: 1234567890,
          },
          user: { id: adminProfile.id, email: adminProfile.email },
        },
        error: null,
      });
      builder('profiles').maybeSingle.mockResolvedValue({ data: toRow(adminProfile), error: null });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.session.accessToken).toBe('access-token');
      expect(res.body.data.profile.role).toBe('admin');
    });

    it('returns 401 for invalid credentials', async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid login credentials' },
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@example.com', password: 'wrong' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 403 for a non-admin user', async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          session: { access_token: 't', refresh_token: 'r', expires_at: 1 },
          user: { id: employeeProfile.id, email: employeeProfile.email },
        },
        error: null,
      });
      builder('profiles').maybeSingle.mockResolvedValue({
        data: toRow(employeeProfile),
        error: null,
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'employee@example.com', password: 'password123' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 403 for an inactive admin', async () => {
      const inactive = { ...adminProfile, status: 'inactive' as const };
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          session: { access_token: 't', refresh_token: 'r', expires_at: 1 },
          user: { id: inactive.id, email: inactive.email },
        },
        error: null,
      });
      builder('profiles').maybeSingle.mockResolvedValue({ data: toRow(inactive), error: null });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@example.com', password: 'password123' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INACTIVE_USER');
    });

    it('returns 400 for a malformed body', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({ email: 'not-an-email' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns the current user profile', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: adminProfile.id, email: adminProfile.email } },
        error: null,
      });
      builder('profiles').maybeSingle.mockResolvedValue({ data: toRow(adminProfile), error: null });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('admin@example.com');
    });

    it('returns 401 when no token is provided', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 401 for an invalid token', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'invalid token' },
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer bad-token');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('ends the session', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: adminProfile.id, email: adminProfile.email } },
        error: null,
      });
      builder('profiles').maybeSingle.mockResolvedValue({ data: toRow(adminProfile), error: null });
      supabase.auth.admin.signOut.mockResolvedValue({ error: null });

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(supabase.auth.admin.signOut).toHaveBeenCalledWith('valid-token');
    });
  });
});
