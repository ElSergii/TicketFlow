import { sequelize } from '../config/db.js';
import { Seat, Reservation, AuditLog, User, Sector } from '../models/index.js';

export const createReservation = async (req, res) => {
  const { seatId, userId } = req.body;
  const currentTimestampMs = new Date().toISOString();

  if (!seatId) {
    return res.status(400).json({ error: 'El ID de la butaca (seatId) es obligatorio.' });
  }

  const transaction = await sequelize.transaction();

  try {
    const seat = await Seat.findByPk(seatId, { transaction });

    if (!seat) {
      await transaction.rollback();
      return res.status(404).json({ error: 'La butaca especificada no existe.' });
    }

    const user = await User.findByPk(userId || 1, { transaction });
    const userName = user ? user.name : 'Cliente';

    await AuditLog.create(
      {
        userId: userId || null,
        userName,
        action: 'RESERVE_ATTEMPT',
        entityType: 'Seat',
        entityId: String(seatId),
        description: `Intento de reserva recibido para Fila ${seat.rowIdentifier} N° ${seat.seatNumber}.`,
        details: JSON.stringify({
          message: 'Intento de reserva recibido',
          row: seat.rowIdentifier,
          seatNumber: seat.seatNumber,
          initialStatus: seat.status,
          initialVersion: seat.version,
          exactTimestampMs: currentTimestampMs,
        }),
        amountSpent: 0.00,
        userBalanceAfter: user ? user.balance : 0.00,
      },
      { transaction }
    );

    if (seat.status !== 'Disponible') {
      await AuditLog.create(
        {
          userId: userId || null,
          userName,
          action: 'RESERVE_FAILED_CONCURRENCY',
          entityType: 'Seat',
          entityId: String(seatId),
          description: `Fallo de concurrencia: Asiento ya ocupado o reservado por otro usuario.`,
          details: JSON.stringify({
            message: 'Fallo de concurrencia: Asiento ya ocupado o reservado por otro usuario',
            attemptedStatus: seat.status,
            exactTimestampMs: new Date().toISOString(),
          }),
          amountSpent: 0.00,
          userBalanceAfter: user ? user.balance : 0.00,
        },
        { transaction }
      );

      await transaction.commit();
      return res.status(409).json({ 
        error: 'Asiento ya no disponible. Fue reservado o comprado por otro usuario.' 
      });
    }

    const currentVersion = seat.version;
    const [updatedRowsCount] = await Seat.update(
      {
        status: 'Reservado',
        version: currentVersion + 1,
      },
      {
        where: {
          id: seatId,
          version: currentVersion,
          status: 'Disponible',
        },
        transaction,
      }
    );

    if (updatedRowsCount === 0) {
      await AuditLog.create(
        {
          userId: userId || null,
          userName,
          action: 'RESERVE_FAILED_CONCURRENCY',
          entityType: 'Seat',
          entityId: String(seatId),
          description: `Fallo de concurrencia en escritura atómica (Optimistic Lock Conflict).`,
          details: JSON.stringify({
            message: 'Fallo de concurrencia en escritura atómica (Optimistic Lock Conflict)',
            expectedVersion: currentVersion,
            exactTimestampMs: new Date().toISOString(),
          }),
          amountSpent: 0.00,
          userBalanceAfter: user ? user.balance : 0.00,
        },
        { transaction }
      );

      await transaction.commit();
      return res.status(409).json({ 
        error: 'Asiento ya no disponible. Otro usuario completó la reserva en el mismo instante.' 
      });
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const reservation = await Reservation.create(
      {
        userId: userId || 1,
        seatId: seatId,
        status: 'Pending',
        reservedAt: new Date(),
        expiresAt: expiresAt,
      },
      { transaction }
    );

    await AuditLog.create(
      {
        userId: userId || 1,
        userName,
        action: 'RESERVE_SUCCESS',
        entityType: 'Reservation',
        entityId: String(reservation.id),
        description: `Reserva temporal realizada: Butaca Fila ${seat.rowIdentifier} N° ${seat.seatNumber} bloqueada por 5 minutos.`,
        details: JSON.stringify({
          message: 'Reserva bloqueada temporalmente por 5 minutos',
          seatId: seatId,
          row: seat.rowIdentifier,
          seatNumber: seat.seatNumber,
          expiresAt: expiresAt.toISOString(),
          exactTimestampMs: new Date().toISOString(),
        }),
        amountSpent: 0.00,
        userBalanceAfter: user ? user.balance : 0.00,
      },
      { transaction }
    );

    await transaction.commit();

    return res.status(201).json({
      message: 'Reserva realizada con éxito.',
      reservation: {
        id: reservation.id,
        seatId: seat.id,
        rowIdentifier: seat.rowIdentifier,
        seatNumber: seat.seatNumber,
        status: reservation.status,
        reservedAt: reservation.reservedAt,
        expiresAt: reservation.expiresAt,
        ttlSeconds: 300,
      },
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    console.error(`[CODE-ERROR] - Error al procesar reserva de asiento ${seatId}: ${error.message}`);
    return res.status(500).json({ error: 'Error interno al procesar la reserva.' });
  }
};

export const createBatchReservations = async (req, res) => {
  const { seatIds, userId } = req.body;
  if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
    return res.status(400).json({ error: 'Lista de seatIds requerida.' });
  }

  const transaction = await sequelize.transaction();
  try {
    const user = await User.findByPk(userId || 1, { transaction });
    const userName = user ? user.name : 'Cliente';
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const reservationsCreated = [];

    for (let idx_tk = 0; idx_tk < seatIds.length; idx_tk++) {
      const seatId = seatIds[idx_tk];
      const seat = await Seat.findByPk(seatId, {
        include: [{ model: Sector, as: 'sector' }],
        transaction,
      });

      if (!seat || seat.status !== 'Disponible') {
        await AuditLog.create(
          {
            userId: userId || 1,
            userName,
            action: 'RESERVE_FAILED_CONCURRENCY',
            entityType: 'Seat',
            entityId: String(seatId),
            description: `Fallo de concurrencia al reservar butaca Fila ${seat?.rowIdentifier || '?'}-${seat?.seatNumber || '?'}: Asiento ya ocupado o reservado.`,
            details: JSON.stringify({ seatId }),
            amountSpent: 0.00,
            userBalanceAfter: user ? user.balance : 0.00,
          },
          { transaction }
        );
        await transaction.commit();
        return res.status(409).json({
          error: `La butaca Fila ${seat?.rowIdentifier || '?'}-${seat?.seatNumber || '?'} ya no está disponible.`,
        });
      }

      const currentVersion = seat.version;
      const [updatedCount] = await Seat.update(
        { status: 'Reservado', version: currentVersion + 1 },
        { where: { id: seatId, version: currentVersion, status: 'Disponible' }, transaction }
      );

      if (updatedCount === 0) {
        await AuditLog.create(
          {
            userId: userId || 1,
            userName,
            action: 'RESERVE_FAILED_CONCURRENCY',
            entityType: 'Seat',
            entityId: String(seatId),
            description: `Conflicto de concurrencia atómica (Optimistic Lock) en butaca Fila ${seat.rowIdentifier}-${seat.seatNumber}.`,
            details: JSON.stringify({ seatId }),
            amountSpent: 0.00,
            userBalanceAfter: user ? user.balance : 0.00,
          },
          { transaction }
        );
        await transaction.commit();
        return res.status(409).json({
          error: `Conflicto de concurrencia al reservar butaca Fila ${seat.rowIdentifier}-${seat.seatNumber}.`,
        });
      }

      const reservation = await Reservation.create(
        {
          userId: userId || 1,
          seatId: seatId,
          status: 'Pending',
          reservedAt: new Date(),
          expiresAt: expiresAt,
        },
        { transaction }
      );

      reservationsCreated.push({
        id: reservation.id,
        seatId: seat.id,
        rowIdentifier: seat.rowIdentifier,
        seatNumber: seat.seatNumber,
        sectorName: seat.sector?.name || 'Sector',
        price: seat.sector?.price || 22000,
        status: reservation.status,
        expiresAt: reservation.expiresAt,
      });

      await AuditLog.create(
        {
          userId: userId || 1,
          userName,
          action: 'RESERVE_SUCCESS',
          entityType: 'Reservation',
          entityId: String(reservation.id),
          description: `Reserva temporal realizada: Butaca Fila ${seat.rowIdentifier} N° ${seat.seatNumber} (${seat.sector?.name || 'Sector'}) bloqueada por 5 minutos.`,
          details: JSON.stringify({ reservationId: reservation.id }),
          amountSpent: 0.00,
          userBalanceAfter: user ? user.balance : 0.00,
        },
        { transaction }
      );
    }

    await transaction.commit();
    return res.status(201).json({
      message: `${reservationsCreated.length} butaca(s) reservada(s) exitosamente.`,
      reservations: reservationsCreated,
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    console.error(`[CODE-ERROR] - Error en reserva por lote: ${error.message}`);
    return res.status(500).json({ error: 'Error al procesar reserva masiva.' });
  }
};

export const deleteReservation = async (req, res) => {
  const { id } = req.params;
  const transaction = await sequelize.transaction();
  try {
    const reservation = await Reservation.findByPk(id, { transaction });
    if (!reservation) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Reserva no encontrada.' });
    }

    const seat = await Seat.findByPk(reservation.seatId, { transaction });
    if (seat && seat.status === 'Reservado') {
      await seat.update({ status: 'Disponible', version: seat.version + 1 }, { transaction });
    }

    await reservation.destroy({ transaction });

    await transaction.commit();
    return res.status(200).json({ message: 'Reserva liberada exitosamente.' });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    console.error(`[CODE-ERROR] - Error al eliminar reserva ${id}: ${error.message}`);
    return res.status(500).json({ error: 'Error al cancelar la reserva.' });
  }
};
