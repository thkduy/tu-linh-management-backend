import { supabaseAdmin } from '../../config/supabase.js';
import { AppError, ErrorCodes } from '../../utils/app-error.js';
import { logger } from '../../utils/logger.js';
import { mapProfile } from '../../middleware/auth.middleware.js';
import { Profile } from '../../types/index.js';
import { CreateUserInput, ListUsersQuery, PaginatedUsers, UpdateUserInput } from './user.types.js';

const PROFILE_COLUMNS = [
  'id',
  'email',
  'full_name',
  'employee_code',
  'role',
  'status',
  'department',
  'position',
  'created_at',
  'updated_at',
].join(',');

export class UserService {
  /** List users with pagination, search, filtering and sorting. */
  async list(query: ListUsersQuery): Promise<PaginatedUsers> {
    const { page, limit, search, role, status, sortBy, sortOrder } = query;

    let builder = supabaseAdmin.from('profiles').select(PROFILE_COLUMNS, { count: 'exact' });

    if (search) {
      const term = `%${search}%`;
      builder = builder.or(
        `full_name.ilike.${term},email.ilike.${term},employee_code.ilike.${term}`,
      );
    }
    if (role) builder = builder.eq('role', role);
    if (status) builder = builder.eq('status', status);

    builder = builder
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range((page - 1) * limit, page * limit - 1);

    const { data, error, count } = await builder;

    if (error) {
      logger.error('Failed to list users', { error: error.message });
      throw new AppError(500, ErrorCodes.INTERNAL_ERROR, 'Failed to list users');
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);

    return {
      users: (data ?? []).map((row) => mapProfile(row as unknown as Record<string, unknown>)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /** Get a single user profile by id. */
  async getById(id: string): Promise<Profile> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      logger.error('Failed to get user', { id, error: error.message });
      throw new AppError(500, ErrorCodes.INTERNAL_ERROR, 'Failed to get user');
    }

    if (!data) {
      throw new AppError(404, ErrorCodes.USER_NOT_FOUND, 'User not found');
    }

    return mapProfile(data as unknown as Record<string, unknown>);
  }

  /**
   * Create a user profile. Profiles are standalone and no longer require an
   * auth user. When both `email` and `password` are provided (admins), an auth
   * user is created and linked via `auth_user_id` so the user can log in.
   * Employees are standalone profiles with `auth_user_id = null`.
   */
  async create(input: CreateUserInput): Promise<Profile> {
    // Pre-check for duplicate employee code / email to return a clean 409.
    await this.assertEmployeeCodeAvailable(input.employeeCode);
    if (input.email) {
      await this.assertEmailAvailable(input.email);
    }

    // Create an auth user only when credentials are supplied (admins).
    let authUserId: string | null = null;
    if (input.email && input.password) {
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
      });

      if (authError) {
        logger.error('Failed to create auth user', { error: authError.message });
        throw new AppError(500, ErrorCodes.INTERNAL_ERROR, 'Failed to create auth user');
      }

      authUserId = authUser.user.id;
    }

    const { data: profileRow, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        auth_user_id: authUserId,
        email: input.email ?? null,
        full_name: input.fullName,
        employee_code: input.employeeCode,
        role: input.role,
        status: input.status,
        department: input.department ?? null,
        position: input.position ?? null,
      })
      .select(PROFILE_COLUMNS)
      .single();

    if (profileError) {
      if (profileError.code === '23505') {
        throw new AppError(409, ErrorCodes.DUPLICATE_EMPLOYEE_CODE, 'Employee code already in use');
      }
      logger.error('Failed to create user profile', { error: profileError.message });
      throw new AppError(500, ErrorCodes.INTERNAL_ERROR, 'Failed to create user profile');
    }

    logger.info('User created', {
      userId: (profileRow as unknown as Record<string, unknown>).id,
      role: input.role,
    });
    return mapProfile(profileRow as unknown as Record<string, unknown>);
  }

  /** Update profile fields (not auth credentials). */
  async update(id: string, input: UpdateUserInput): Promise<Profile> {
    await this.getById(id);

    if (input.employeeCode) {
      await this.assertEmployeeCodeAvailable(input.employeeCode, id);
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.fullName !== undefined) patch.full_name = input.fullName;
    if (input.employeeCode !== undefined) patch.employee_code = input.employeeCode;
    if (input.role !== undefined) patch.role = input.role;
    if (input.status !== undefined) patch.status = input.status;
    if (input.department !== undefined) patch.department = input.department;
    if (input.position !== undefined) patch.position = input.position;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(patch)
      .eq('id', id)
      .select(PROFILE_COLUMNS)
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new AppError(409, ErrorCodes.DUPLICATE_EMPLOYEE_CODE, 'Employee code already in use');
      }
      logger.error('Failed to update user', { id, error: error.message });
      throw new AppError(500, ErrorCodes.INTERNAL_ERROR, 'Failed to update user');
    }

    logger.info('User updated', { userId: id });
    return mapProfile(data as unknown as Record<string, unknown>);
  }

  /**
   * Update a user's status. Prevents deactivating the last active admin.
   */
  async updateStatus(id: string, status: 'active' | 'inactive'): Promise<Profile> {
    const current = await this.getById(id);

    if (status === 'inactive' && current.role === 'admin' && current.status === 'active') {
      const { count, error } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('status', 'active');

      if (error) {
        logger.error('Failed to count active admins', { error: error.message });
        throw new AppError(500, ErrorCodes.INTERNAL_ERROR, 'Failed to update user status');
      }

      if ((count ?? 0) <= 1) {
        throw new AppError(
          409,
          ErrorCodes.LAST_ADMIN,
          'Cannot deactivate the last active administrator',
        );
      }
    }

    return this.update(id, { status });
  }

  private async assertEmployeeCodeAvailable(code: string, excludeId?: string): Promise<void> {
    let query = supabaseAdmin.from('profiles').select('id').eq('employee_code', code);
    if (excludeId) query = query.neq('id', excludeId);
    const { data, error } = await query.maybeSingle();

    if (error) {
      logger.error('Failed to check employee code', { error: error.message });
      throw new AppError(500, ErrorCodes.INTERNAL_ERROR, 'Failed to check employee code');
    }
    if (data) {
      throw new AppError(409, ErrorCodes.DUPLICATE_EMPLOYEE_CODE, 'Employee code already in use');
    }
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      logger.error('Failed to check email', { error: error.message });
      throw new AppError(500, ErrorCodes.INTERNAL_ERROR, 'Failed to check email');
    }
    if (data) {
      throw new AppError(409, ErrorCodes.DUPLICATE_EMAIL, 'Email already in use');
    }
  }
}

export const userService = new UserService();
