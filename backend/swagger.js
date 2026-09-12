import swaggerUi from 'swagger-ui-express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'TicketFlow API REST',
    version: '1.0.0',
    description: 'API REST para gestión de eventos, selección de asientos con control de concurrencia optimista y temporizador de reserva.',
  },
  paths: {
    '/api/v1/events': {
      get: {
        summary: 'Obtener catálogo de eventos',
        responses: {
          '200': { description: 'Lista de eventos con sus sectores' },
        },
      },
    },
    '/api/v1/events/{id}/seats': {
      get: {
        summary: 'Obtener plano de butacas y disponibilidad en tiempo real',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'Detalle del evento con plano de asientos' },
          '404': { description: 'Evento no encontrado' },
        },
      },
    },
    '/api/v1/reservations': {
      post: {
        summary: 'Intentar bloqueo/reserva temporal de una butaca (5 min lock)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  seatId: { type: 'string', format: 'uuid' },
                  userId: { type: 'integer' },
                },
                required: ['seatId'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Reserva exitosa por 5 minutos' },
          '409': { description: 'Conflicto: La butaca ya no está disponible' },
        },
      },
    },
    '/api/v1/payments': {
      post: {
        summary: 'Simular pasarela de pago y confirmar compra de entradas',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  reservationId: { type: 'string', format: 'uuid' },
                  userId: { type: 'integer' },
                  paymentMethod: { type: 'string' },
                },
                required: ['reservationId'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Pago confirmado y entrada vendida' },
          '400': { description: 'Reserva no válida o expirada' },
        },
      },
    },
    '/api/v1/audit-logs': {
      get: {
        summary: 'Consultar registros de auditoría inmutable',
        responses: {
          '200': { description: 'Listado de logs de auditoría ordenados por timestamp' },
        },
      },
    },
  },
};

export const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  console.log('[SWAGGER] Documentación disponible en /api-docs');
};
