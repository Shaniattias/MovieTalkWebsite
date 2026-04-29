import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MovieTalk API',
      version: '1.0.0',
      description: 'API for posts, comments, users and authentication',
    },
    servers: [
      {
        url: 'http://localhost:5001/api',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // paths to files containing OpenAPI definitions
};

const swaggerSpec = swaggerJSDoc(options);

export { swaggerUi, swaggerSpec };