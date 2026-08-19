import swaggerJsdoc from 'swagger-jsdoc';

const isProduction = process.env.NODE_ENV === 'production';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',

    info: {
      title: 'Management Dashboard API',
      version: '1.0.0',
      description:
        'Phase 1 backend: authentication, admin authorization, and user management.',
    },

    servers: [
      {
        url: isProduction
          ? process.env.CORS_ORIGIN
          : 'http://localhost:3000',
        description: isProduction
          ? 'Production server'
          : 'Development server',
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },

  apis: ['./src/modules/**/*.routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);