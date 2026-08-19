export type Role = 'admin' | 'employee';
export type UserStatus = 'active' | 'inactive';

export interface Profile {
  id: string;
  email: string | null;
  fullName: string;
  employeeCode: string | null;
  role: Role;
  status: UserStatus;
  department: string | null;
  position: string | null;
  createdAt: string;
  updatedAt: string;
}
