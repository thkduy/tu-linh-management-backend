import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { AppError, ErrorCodes } from '../utils/app-error.js';

type Source = 'body' | 'query' | 'params';

/**
 * Validation middleware factory. Validates a request part against a Zod schema
 * and replaces the request value with the parsed (and coerced) result.
 */
export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }));
        next(new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Validation failed', details));
        return;
      }
      next(err);
    }
  };
}
