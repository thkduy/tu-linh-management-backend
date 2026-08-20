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

  apis: [
    './src/modules/**/*.routes.ts',
    './dist/modules/**/*.routes.js',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

/**
 * Swagger UI HTML page. Assets are loaded from a CDN (unpkg) rather than the
 * local `swagger-ui-dist` filesystem, because Vercel's serverless functions do
 * not bundle those static files — serving them via `express.static` results in
 * 404s that fall through to the JSON error handler (the "MIME type
 * application/json" error). The spec itself is served as JSON below.
 */
export const swaggerHtml = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <title>Management Dashboard API</title>

        <link
          rel="stylesheet"
          href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
        />
      </head>

      <body>
        <div id="swagger-ui"></div>

        <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
        <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>

        <script>
          window.onload = () => {
            window.ui = SwaggerUIBundle({
              spec: ${JSON.stringify(swaggerSpec)},
              dom_id: '#swagger-ui',
              deepLinking: true,
              presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIStandalonePreset
              ],
              layout: 'StandaloneLayout'
            });
          };
        </script>
      </body>
    </html>`;