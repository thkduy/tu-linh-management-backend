import { Profile, Role, UserStatus } from '../../types/index.js';

export interface ListUsersQuery {
  page: number;
  limit: number;
  search?: string;
  role?: Role;
  status?: UserStatus;
  sortBy: 'full_name' | 'email' | 'employee_code' | 'created_at';
  sortOrder: 'asc' | 'desc';
}

export interface CreateUserInput {
  email?: string;
  password?: string;
  fullName: string;
  employeeCode: string;
  role: Role;
  status: UserStatus;
  department?: string | null;
  position?: string | null;
}

export interface UpdateUserInput {
  fullName?: string;
  employeeCode?: string;
  role?: Role;
  status?: UserStatus;
  department?: string | null;
  position?: string | null;
}

export interface PaginatedUsers {
  users: Profile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
