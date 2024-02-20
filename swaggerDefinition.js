const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'My API Documentation',
      version: '1.0.0',
      description: 'Documentation for my API'
    },
    servers: [
      {
        url: 'https://pyh71iw8lh.execute-api.ap-south-1.amazonaws.com/dev',
        description: 'development server'
      }
    ]
  },
  apis: ['./app.js']
};

const specs = swaggerJsdoc(options);

module.exports = specs;
