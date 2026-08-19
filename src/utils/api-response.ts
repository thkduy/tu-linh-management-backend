import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message: string;
  pagination?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export function success<T>(
  res: Response,
  data: T,
  options?: { message?: string; statusCode?: number; pagination?: PaginationMeta },
): Response {
  const body: ApiSuccess<T> = {
    success: true,
    data,
    message: options?.message ?? 'Success',
  };
  if (options?.pagination) {
    body.pagination = options.pagination;
  }
  return res.status(options?.statusCode ?? 200).json(body);
}

export function created<T>(res: Response, data: T, message = 'Created'): Response {
  return success(res, data, { message, statusCode: 201 });
}
