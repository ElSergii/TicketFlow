import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import { seedInitialData } from './models/index.js';
import { apiVersionHeaderMiddleware } from './middleware/headerMiddleware.js';
import { getUsers, depositBalance } from './controllers/userController.js';
import { getEvents, getEventSeats, createEvent } from './controllers/eventController.js';
import { createReservation, createBatchReservations, deleteReservation } from './controllers/reservationController.js';
import { processPayment, processBatchPayments } from './controllers/paymentController.js';
import { getAuditLogs } from './controllers/auditController.js';
import { startExpirationWorker } from './jobs/expirationWorker.js';
import { setupSwagger } from './swagger.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares globales
app.use(cors());
app.use(express.json());

// Middleware de versión de la API (Header X-Api-version)
app.use(apiVersionHeaderMiddleware);

// Documentación Swagger OpenAPI
setupSwagger(app);

// Rutas de la API (Usuarios)
app.get('/api/v1/users', getUsers);
app.post('/api/v1/users/:id/deposit', depositBalance);

// Rutas de la API (Eventos)
app.get('/api/v1/events', getEvents);
app.get('/api/v1/events/:id/seats', getEventSeats);
app.post('/api/v1/events', createEvent);

// Rutas de la API (Reservas)
app.post('/api/v1/reservations', createReservation);
app.post('/api/v1/reservations/batch', createBatchReservations);
app.delete('/api/v1/reservations/:id', deleteReservation);

// Rutas de la API (Pagos)
app.post('/api/v1/payments', processPayment);
app.post('/api/v1/payments/batch', processBatchPayments);

// Rutas de la API (Auditoría)
app.get('/api/v1/audit-logs', getAuditLogs);

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error(`[CODE-ERROR] - Excepción no controlada en servidor: ${err.stack || err.message}`);
  res.status(500).json({ error: 'Error interno en el servidor.' });
});

// Inicialización de servidor y worker
const startServer = async () => {
  try {
    await connectDB();
    await seedInitialData();
    
    // Iniciar background job para expiración a los 5 minutos
    startExpirationWorker(10000);

    app.listen(PORT, () => {
      console.log(`==================================================`);
      console.log(`🚀 SERVIDOR TICKETFLOW EJECUTÁNDOSE EN PUERTO ${PORT}`);
      console.log(`📚 SWAGGER UI: http://localhost:${PORT}/api-docs`);
      console.log(`==================================================`);
    });
  } catch (error) {
    console.error(`[CODE-ERROR] - Fallo al iniciar el servidor: ${error.message}`);
  }
};

startServer();
