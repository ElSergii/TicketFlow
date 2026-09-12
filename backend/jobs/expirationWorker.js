import { Op } from 'sequelize';
import { sequelize } from '../config/db.js';
import { Reservation, Seat, AuditLog } from '../models/index.js';

export const runExpirationCheck = async () => {
  try {
    const now = new Date();
    // Buscar reservas 'Pending' cuya fecha de expiración haya pasado
    const expiredReservations = await Reservation.findAll({
      where: {
        status: 'Pending',
        expiresAt: {
          [Op.lt]: now,
        },
      },
    });

    if (expiredReservations.length === 0) {
      return;
    }

    console.log(`[WORKER] Se encontraron ${expiredReservations.length} reservas vencidas. Procesando liberación...`);

    // Liberar cada reserva vencida
    for (let index = 0; index < expiredReservations.length; index++) {
      const reservation = expiredReservations[index];
      const transaction = await sequelize.transaction();
      try {
        // 1. Marcar reserva como Expired
        await reservation.update({ status: 'Expired' }, { transaction });

        // 2. Liberar butaca cambiando estado a Disponible e incrementando versión
        const seat = await Seat.findByPk(reservation.seatId, { transaction });
        if (seat && seat.status === 'Reservado') {
          await seat.update(
            {
              status: 'Disponible',
              version: seat.version + 1,
            },
            { transaction }
          );
        }

        // 3. Generar auditoría inmutable
        await AuditLog.create(
          {
            userId: reservation.userId || null,
            action: 'EXPIRED_RELEASE',
            entityType: 'Reservation',
            entityId: String(reservation.id),
            details: JSON.stringify({
              message: 'Liberación automática por temporizador de 5 minutos expirado',
              seatId: reservation.seatId,
              workerIndex: idx_tk,
              exactTimestampMs: new Date().toISOString(),
            }),
          },
          { transaction }
        );

        await transaction.commit();
        console.log(`[WORKER] Reserva ${reservation.id} liberada exitosamente.`);
      } catch (err) {
        if (!transaction.finished) {
          await transaction.rollback();
        }
        console.error(`[CODE-ERROR] - Error al liberar reserva expirada ${reservation.id}: ${err.message}`);
      }
    }
  } catch (error) {
    console.error(`[CODE-ERROR] - Error en el worker de liberación de reservas: ${error.message}`);
  }
};

export const startExpirationWorker = (intervalMs = 10000) => {
  console.log(`[WORKER] Worker de liberación automática de reservas iniciado (frecuencia: ${intervalMs / 1000}s).`);
  setInterval(runExpirationCheck, intervalMs);
};
