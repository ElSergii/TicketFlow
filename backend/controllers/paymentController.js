import { sequelize } from '../config/db.js';
import { Seat, Reservation, AuditLog, User, Sector, Event } from '../models/index.js';

// Función para verificar si todas las butacas de un evento fueron vendidas y marcarlo como 'Agotado'
const checkAndMarkEventSoldOut = async (eventId, transaction, userId = 1, userName = 'Sistema') => {
  if (!eventId) return;
  const sectors = await Sector.findAll({ where: { eventId }, transaction });
  const sectorIds = sectors.map((s) => s.id);
  if (sectorIds.length === 0) return;

  const availableOrReservedCount = await Seat.count({
    where: {
      sectorId: sectorIds,
      status: ['Disponible', 'Reservado'],
    },
    transaction,
  });

  if (availableOrReservedCount === 0) {
    const eventObj = await Event.findByPk(eventId, { transaction });
    if (eventObj && eventObj.status !== 'Agotado') {
      await eventObj.update({ status: 'Agotado' }, { transaction });
      await AuditLog.create(
        {
          userId,
          userName,
          action: 'EVENT_SOLD_OUT',
          entityType: 'Event',
          entityId: String(eventId),
          description: `¡El evento '${eventObj.name}' vendió el 100% de sus entradas! Su estado cambió a AGOTADO.`,
          details: JSON.stringify({ eventId, eventName: eventObj.name }),
          amountSpent: 0.00,
          userBalanceAfter: 0.00,
        },
        { transaction }
      );
    }
  }
};

export const processPayment = async (req, res) => {
  const { reservationId, userId, paymentMethod } = req.body;

  if (!reservationId) {
    return res.status(400).json({ error: 'El ID de la reserva (reservationId) es obligatorio.' });
  }

  const transaction = await sequelize.transaction();

  try {
    const reservation = await Reservation.findByPk(reservationId, { transaction });

    if (!reservation) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Reserva no encontrada.' });
    }

    if (reservation.status !== 'Pending') {
      await transaction.rollback();
      return res.status(400).json({ 
        error: `No se puede procesar el pago. Estado actual de la reserva: ${reservation.status}` 
      });
    }

    if (new Date() > new Date(reservation.expiresAt)) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'El tiempo límite de 5 minutos para completar el pago ha expirado.' 
      });
    }

    const seat = await Seat.findByPk(reservation.seatId, {
      include: [{ model: Sector, as: 'sector' }],
      transaction,
    });

    if (!seat) {
      await transaction.rollback();
      return res.status(404).json({ error: 'La butaca asociada a la reserva no existe.' });
    }

    const user = await User.findByPk(userId || reservation.userId || 1, { transaction });

    await reservation.update({ status: 'Paid' }, { transaction });

    await seat.update(
      { 
        status: 'Vendida',
        version: seat.version + 1,
      },
      { transaction }
    );

    await AuditLog.create(
      {
        userId: user ? user.id : 1,
        userName: user ? user.name : 'Cliente',
        action: 'PAYMENT_SUCCESS',
        entityType: 'Payment',
        entityId: String(reservation.id),
        description: `Pago procesado exitosamente: Butaca Fila ${seat.rowIdentifier} N° ${seat.seatNumber} confirmada.`,
        details: JSON.stringify({
          message: 'Pago procesado exitosamente. Entrada confirmada.',
          seatId: seat.id,
          row: seat.rowIdentifier,
          seatNumber: seat.seatNumber,
          paymentMethod: paymentMethod || 'DEBITO_BILLETERA_VIRTUAL',
          exactTimestampMs: new Date().toISOString(),
        }),
        amountSpent: 0.00,
        userBalanceAfter: user ? user.balance : 0.00,
      },
      { transaction }
    );

    // Verificar si el evento se quedó sin entradas disponibles y marcarlo como Agotado
    if (seat.sector?.eventId) {
      await checkAndMarkEventSoldOut(seat.sector.eventId, transaction, user?.id, user?.name);
    }

    await transaction.commit();

    return res.status(200).json({
      message: '¡Pago confirmado! Tu compra fue procesada exitosamente.',
      ticket: {
        reservationId: reservation.id,
        seatId: seat.id,
        row: seat.rowIdentifier,
        seatNumber: seat.seatNumber,
        status: 'Vendida',
        confirmedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    console.error(`[CODE-ERROR] - Error al procesar pago para la reserva ${reservationId}: ${error.message}`);
    return res.status(500).json({ error: 'Error transaccional al procesar el pago. Se ejecutó Rollback.' });
  }
};

export const processBatchPayments = async (req, res) => {
  const { reservationIds, userId, paymentMethod } = req.body;
  if (!reservationIds || !Array.isArray(reservationIds) || reservationIds.length === 0) {
    return res.status(400).json({ error: 'Lista de reservationIds requerida.' });
  }

  const transaction = await sequelize.transaction();
  try {
    const user = await User.findByPk(userId || 1, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    let totalAmount = 0;
    const itemsToPay = [];
    const eventIdsSet = new Set();

    for (let idx_tk = 0; idx_tk < reservationIds.length; idx_tk++) {
      const resId = reservationIds[idx_tk];
      const reservation = await Reservation.findByPk(resId, {
        include: [{ model: Seat, as: 'seat', include: [{ model: Sector, as: 'sector' }] }],
        transaction,
      });

      if (!reservation || reservation.status !== 'Pending') {
        await transaction.rollback();
        return res.status(400).json({ error: 'Una de las reservas ya no se encuentra pendiente.' });
      }

      if (new Date() > new Date(reservation.expiresAt)) {
        await transaction.rollback();
        return res.status(400).json({ error: 'El tiempo límite de 5 minutos para completar el pago ha expirado.' });
      }

      const price = Number(reservation.seat?.sector?.price || 22000);
      totalAmount += price;
      itemsToPay.push({ reservation, seat: reservation.seat, sector: reservation.seat?.sector, price });

      if (reservation.seat?.sector?.eventId) {
        eventIdsSet.add(reservation.seat.sector.eventId);
      }
    }

    const currentBalance = Number(user.balance || 0);
    if (currentBalance < totalAmount) {
      await transaction.rollback();
      return res.status(400).json({
        error: `Saldo insuficiente en tu billetera virtual ($ ${currentBalance.toLocaleString('es-AR')}) para abonar $ ${totalAmount.toLocaleString('es-AR')}.`,
      });
    }

    const newBalance = currentBalance - totalAmount;
    await user.update({ balance: newBalance }, { transaction });

    const ticketsIssued = [];
    for (let idx_tk = 0; idx_tk < itemsToPay.length; idx_tk++) {
      const { reservation, seat, sector, price } = itemsToPay[idx_tk];
      await reservation.update({ status: 'Paid' }, { transaction });
      await seat.update({ status: 'Vendida', version: seat.version + 1 }, { transaction });

      ticketsIssued.push({
        reservationId: reservation.id,
        seatId: seat.id,
        row: seat.rowIdentifier,
        seatNumber: seat.seatNumber,
        sectorName: sector?.name || 'Sector',
        price,
        status: 'Vendida',
        confirmedAt: new Date().toISOString(),
      });
    }

    await AuditLog.create(
      {
        userId: user.id,
        userName: user.name,
        action: 'PAYMENT_SUCCESS',
        entityType: 'Payment',
        entityId: String(userId || 1),
        description: `Pago masivo confirmado: Compra exitosa de ${itemsToPay.length} entrada(s) por un total de $ ${totalAmount.toLocaleString('es-AR')}. Débito aplicado a billetera virtual.`,
        details: JSON.stringify({ totalAmount, count: itemsToPay.length }),
        amountSpent: totalAmount,
        userBalanceAfter: newBalance,
      },
      { transaction }
    );

    // Verificar para cada evento afectado si se agotaron todas las entradas
    for (const eventId of eventIdsSet) {
      await checkAndMarkEventSoldOut(eventId, transaction, user.id, user.name);
    }

    await transaction.commit();
    return res.status(200).json({
      message: '¡Pago masivo procesado exitosamente!',
      newBalance: newBalance,
      tickets: ticketsIssued,
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    console.error(`[CODE-ERROR] - Error al procesar pago masivo: ${error.message}`);
    return res.status(500).json({ error: 'Error transaccional al procesar el pago masivo.' });
  }
};
