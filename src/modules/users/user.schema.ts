import { z } from 'zod';

const uuid = z.string().uuid('Invalid UUID');

export const roleSchema = z.enum(['admin', 'employee']);
export const statusSchema = z.enum(['active', 'inactive']);

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  role: roleSchema.optional(),
  status: statusSchema.optional(),
  sortBy: z.enum(['full_name', 'email', 'employee_code', 'created_at']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const userIdParamSchema = z.object({
  id: uuid,
});

export const createUserSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Invalid email address').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    fullName: z.string().trim().min(1, 'Full name is required').max(200),
    employeeCode: z
      .string()
      .trim()
      .min(1, 'Employee code is required')
      .max(50)
      .regex(
        /^[A-Za-z0-9_-]+$/,
        'Employee code may only contain letters, numbers, underscores and hyphens',
      ),
    role: roleSchema.default('employee'),
    status: statusSchema.default('active'),
    department: z.string().trim().max(200).nullable().optional(),
    position: z.string().trim().max(200).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    // Admins log in to the dashboard, so they need credentials to create an
    // auth user. Employees are standalone profiles and need neither.
    if (data.role === 'admin') {
      if (!data.email) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['email'],
          message: 'Email is required for admin users',
        });
      }
      if (!data.password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: 'Password is required for admin users',
        });
      }
    }
  });

export const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200).optional(),
    employeeCode: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .regex(
        /^[A-Za-z0-9_-]+$/,
        'Employee code may only contain letters, numbers, underscores and hyphens',
      )
      .optional(),
    role: roleSchema.optional(),
    status: statusSchema.optional(),
    department: z.string().trim().max(200).nullable().optional(),
    position: z.string().trim().max(200).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const updateStatusSchema = z.object({
  status: statusSchema,
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
