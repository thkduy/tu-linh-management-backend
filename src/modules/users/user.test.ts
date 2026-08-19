import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { supabase, supabaseAdmin, builder, resetSupabaseMocks } from '../../test/supabase-mock.js';
import { adminProfile, employeeProfile, toRow } from '../../test/fixtures.js';

vi.mock('../../config/supabase.js', () => {
  return import('../../test/supabase-mock.js');
});

const app = createApp();

/** Stub auth + admin middleware to authenticate as the active admin. */
function authAsAdmin(): void {
  supabase.auth.getUser.mockResolvedValue({
    data: { user: { id: adminProfile.id, email: adminProfile.email } },
    error: null,
  });
  builder('profiles').maybeSingle.mockResolvedValueOnce({
    data: toRow(adminProfile),
    error: null,
  });
}

describe('Users', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  describe('authorization', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/api/v1/users');
      expect(res.status).toBe(401);
    });

    it('returns 403 for a non-admin user', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: employeeProfile.id, email: employeeProfile.email } },
        error: null,
      });
      builder('profiles').maybeSingle.mockResolvedValue({
        data: toRow(employeeProfile),
        error: null,
      });

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/v1/users', () => {
    it('lists users with pagination', async () => {
      authAsAdmin();
      builder('profiles')._result = {
        data: [toRow(adminProfile), toRow(employeeProfile)],
        error: null,
        count: 2,
      };

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
    });

    it('returns 400 for an invalid query (bad role)', async () => {
      authAsAdmin();
      const res = await request(app)
        .get('/api/v1/users?role=superuser')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('returns a user by id', async () => {
      authAsAdmin();
      builder('profiles').maybeSingle.mockResolvedValue({
        data: toRow(employeeProfile),
        error: null,
      });

      const res = await request(app)
        .get(`/api/v1/users/${employeeProfile.id}`)
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(employeeProfile.id);
    });

    it('returns 404 for a missing user', async () => {
      authAsAdmin();
      builder('profiles').maybeSingle.mockResolvedValue({ data: null, error: null });

      const res = await request(app)
        .get(`/api/v1/users/${employeeProfile.id}`)
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('returns 400 for an invalid UUID', async () => {
      authAsAdmin();
      const res = await request(app)
        .get('/api/v1/users/not-a-uuid')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/users', () => {
    const input = {
      email: 'new@example.com',
      fullName: 'New User',
      employeeCode: 'EMP002',
      role: 'employee',
    };

    it('creates a user', async () => {
      authAsAdmin();
      // Pre-checks: employee code + email available.
      builder('profiles').maybeSingle.mockResolvedValue({ data: null, error: null });
      builder('profiles').single.mockResolvedValue({
        data: toRow({ ...employeeProfile, email: input.email, employeeCode: input.employeeCode }),
        error: null,
      });

      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', 'Bearer valid-token')
        .send(input);

      expect(res.status).toBe(201);
      expect(res.body.data.email).toBe('new@example.com');
      expect(supabaseAdmin.auth.admin.createUser).not.toHaveBeenCalled();
    });

    it('creates an employee without email or password', async () => {
      authAsAdmin();
      // Pre-check: employee code available (email check is skipped).
      builder('profiles').maybeSingle.mockResolvedValue({ data: null, error: null });
      builder('profiles').single.mockResolvedValue({
        data: toRow({ ...employeeProfile, email: null, employeeCode: 'EMP003' }),
        error: null,
      });

      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', 'Bearer valid-token')
        .send({ fullName: 'No Email User', employeeCode: 'EMP003' });

      expect(res.status).toBe(201);
      expect(res.body.data.email).toBeNull();
      expect(supabaseAdmin.auth.admin.createUser).not.toHaveBeenCalled();
    });

    it('creates an auth user when email and password are provided', async () => {
      authAsAdmin();
      builder('profiles').maybeSingle.mockResolvedValue({ data: null, error: null });
      supabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: '33333333-3333-3333-3333-333333333333' } },
        error: null,
      });
      builder('profiles').single.mockResolvedValue({
        data: toRow({ ...employeeProfile, email: 'admin2@example.com', role: 'admin' }),
        error: null,
      });

      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', 'Bearer valid-token')
        .send({
          email: 'admin2@example.com',
          password: 'secret123',
          fullName: 'Admin Two',
          employeeCode: 'ADMIN002',
          role: 'admin',
        });

      expect(res.status).toBe(201);
      expect(supabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith({
        email: 'admin2@example.com',
        password: 'secret123',
        email_confirm: true,
      });
    });

    it('returns 400 when creating an admin without email or password', async () => {
      authAsAdmin();
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', 'Bearer valid-token')
        .send({ fullName: 'Admin', employeeCode: 'ADMIN003', role: 'admin' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/v1/users/:id', () => {
    it('updates a user', async () => {
      authAsAdmin();
      builder('profiles').maybeSingle.mockResolvedValue({
        data: toRow(employeeProfile),
        error: null,
      });
      builder('profiles').single.mockResolvedValue({
        data: toRow({ ...employeeProfile, fullName: 'Updated Name' }),
        error: null,
      });

      const res = await request(app)
        .patch(`/api/v1/users/${employeeProfile.id}`)
        .set('Authorization', 'Bearer valid-token')
        .send({ fullName: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.fullName).toBe('Updated Name');
    });

    it('returns 400 for an empty body', async () => {
      authAsAdmin();
      const res = await request(app)
        .patch(`/api/v1/users/${employeeProfile.id}`)
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/v1/users/:id/status', () => {
    it('deactivates a user', async () => {
      authAsAdmin();
      builder('profiles').maybeSingle.mockResolvedValue({
        data: toRow(employeeProfile),
        error: null,
      });
      builder('profiles').single.mockResolvedValue({
        data: toRow({ ...employeeProfile, status: 'inactive' }),
        error: null,
      });

      const res = await request(app)
        .patch(`/api/v1/users/${employeeProfile.id}/status`)
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'inactive' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('inactive');
    });

    it('returns 409 when deactivating the last active admin', async () => {
      authAsAdmin();
      // getById returns the admin; count query returns 1 active admin.
      builder('profiles').maybeSingle.mockResolvedValue({
        data: toRow(adminProfile),
        error: null,
      });
      builder('profiles')._result = { data: [{ id: adminProfile.id }], error: null, count: 1 };

      const res = await request(app)
        .patch(`/api/v1/users/${adminProfile.id}/status`)
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'inactive' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('LAST_ADMIN');
    });
  });
});
