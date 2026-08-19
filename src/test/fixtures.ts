import { Profile } from '../types/index.js';

export const adminProfile: Profile = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'admin@example.com',
  fullName: 'Admin User',
  employeeCode: 'ADMIN001',
  role: 'admin',
  status: 'active',
  department: null,
  position: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

export const employeeProfile: Profile = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'employee@example.com',
  fullName: 'Employee User',
  employeeCode: 'EMP001',
  role: 'employee',
  status: 'active',
  department: 'Engineering',
  position: 'Developer',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

/** Convert a Profile to a snake_case DB row (as Supabase would return). */
export function toRow(profile: Profile): Record<string, unknown> {
  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.fullName,
    employee_code: profile.employeeCode,
    role: profile.role,
    status: profile.status,
    department: profile.department,
    position: profile.position,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
  };
}
