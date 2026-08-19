import { NextFunction, Request, Response } from 'express';
import { userService } from './user.service.js';
import { created, success } from '../../utils/api-response.js';
import { ListUsersQuery } from './user.types.js';

export class UserController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await userService.list(req.query as unknown as ListUsersQuery);
      success(res, result.users, {
        message: 'Users retrieved',
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getById(req.params.id as string);
      success(res, user, { message: 'User retrieved' });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.create(req.body);
      created(res, user, 'User created');
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.update(req.params.id as string, req.body);
      success(res, user, { message: 'User updated' });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.updateStatus(req.params.id as string, req.body.status);
      success(res, user, { message: 'User status updated' });
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
