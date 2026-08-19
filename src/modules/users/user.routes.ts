import { Router } from 'express';
import { userController } from './user.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { adminMiddleware } from '../../middleware/admin.middleware.js';
import { validate } from '../../middleware/validation.middleware.js';
import {
  createUserSchema,
  listUsersQuerySchema,
  updateStatusSchema,
  updateUserSchema,
  userIdParamSchema,
} from './user.schema.js';

const router = Router();

// All user-management endpoints require authentication + admin authorization.
router.use(authMiddleware, adminMiddleware);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management (admin only)
 */

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: List users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [admin, employee] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, inactive] }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [full_name, email, employee_code, created_at] }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: Paginated list of users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not admin)
 */
router.get('/', validate(listUsersQuerySchema, 'query'), userController.list.bind(userController));

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get a user by id
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User profile
 *       404:
 *         description: User not found
 */
router.get(
  '/:id',
  validate(userIdParamSchema, 'params'),
  userController.getById.bind(userController),
);

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Create a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, employeeCode]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Required only when role is admin
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Required only when role is admin
 *               fullName: { type: string }
 *               employeeCode: { type: string }
 *               role: { type: string, enum: [admin, employee], default: employee }
 *               status: { type: string, enum: [active, inactive], default: active }
 *               department: { type: string, nullable: true }
 *               position: { type: string, nullable: true }
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Validation error (admin requires email and password)
 *       409:
 *         description: Duplicate email or employee code
 */
router.post('/', validate(createUserSchema, 'body'), userController.create.bind(userController));

/**
 * @swagger
 * /api/v1/users/{id}:
 *   patch:
 *     summary: Update a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               fullName: { type: string }
 *               employeeCode: { type: string }
 *               role: { type: string, enum: [admin, employee] }
 *               status: { type: string, enum: [active, inactive] }
 *               department: { type: string, nullable: true }
 *               position: { type: string, nullable: true }
 *     responses:
 *       200:
 *         description: User updated
 *       400:
 *         description: Validation error (at least one field required)
 *       404:
 *         description: User not found
 *       409:
 *         description: Duplicate employee code
 */
router.patch(
  '/:id',
  validate(userIdParamSchema, 'params'),
  validate(updateUserSchema, 'body'),
  userController.update.bind(userController),
);

/**
 * @swagger
 * /api/v1/users/{id}/status:
 *   patch:
 *     summary: Update a user's status (activate/deactivate)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [active, inactive] }
 *     responses:
 *       200:
 *         description: Status updated
 *       409:
 *         description: Cannot deactivate last active admin
 */
router.patch(
  '/:id/status',
  validate(userIdParamSchema, 'params'),
  validate(updateStatusSchema, 'body'),
  userController.updateStatus.bind(userController),
);

export default router;
