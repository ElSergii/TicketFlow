import { sequelize } from '../config/db.js';
import { Event, Sector, Seat, AuditLog } from '../models/index.js';

export const getEvents = async (req, res) => {
  try {
    const events = await Event.findAll({
      include: [{ model: Sector, as: 'sectors' }],
    });
    return res.status(200).json(events);
  } catch (error) {
    console.error(`[CODE-ERROR] - Error al obtener la lista de eventos: ${error.message}`);
    return res.status(500).json({ error: 'Error interno del servidor al consultar eventos.' });
  }
};

export const getEventSeats = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findByPk(id, {
      include: [
        {
          model: Sector,
          as: 'sectors',
          include: [{ model: Seat, as: 'seats' }],
        },
      ],
    });

    if (!event) {
      return res.status(404).json({ error: 'Evento no encontrado.' });
    }

    return res.status(200).json(event);
  } catch (error) {
    console.error(`[CODE-ERROR] - Error al obtener plano de butacas del evento ${req.params.id}: ${error.message}`);
    return res.status(500).json({ error: 'Error interno del servidor al obtener mapa de asientos.' });
  }
};

export const createEvent = async (req, res) => {
  const { name, venue, eventDate, badgeText, imageUrl, priceCampo, pricePlatea } = req.body;
  if (!name || !venue) {
    return res.status(400).json({ error: 'Nombre y recinto del evento son obligatorios.' });
  }

  const transaction = await sequelize.transaction();
  try {
    const newEvent = await Event.create(
      {
        name,
        venue,
        eventDate: eventDate ? new Date(eventDate) : new Date(),
        badgeText: badgeText || 'Popular',
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800&auto=format&fit=crop',
        status: 'Active',
      },
      { transaction }
    );

    const sCampo = await Sector.create(
      {
        eventId: newEvent.id,
        name: 'Campo',
        price: priceCampo || 25000.00,
        capacity: 50,
      },
      { transaction }
    );

    const sPlatea = await Sector.create(
      {
        eventId: newEvent.id,
        name: 'Platea',
        price: pricePlatea || 40000.00,
        capacity: 50,
      },
      { transaction }
    );

    const campoRows = ['A', 'B', 'C', 'D', 'E'];
    for (let idx_tk = 0; idx_tk < campoRows.length; idx_tk++) {
      const rowLetter = campoRows[idx_tk];
      for (let seatIdx_tk = 1; seatIdx_tk <= 10; seatIdx_tk++) {
        await Seat.create(
          {
            sectorId: sCampo.id,
            rowIdentifier: rowLetter,
            seatNumber: seatIdx_tk,
            status: 'Disponible',
            version: 1,
          },
          { transaction }
        );
      }
    }

    const plateaRows = ['F', 'G', 'H', 'I', 'J'];
    for (let idx_tk = 0; idx_tk < plateaRows.length; idx_tk++) {
      const rowLetter = plateaRows[idx_tk];
      for (let seatIdx_tk = 1; seatIdx_tk <= 10; seatIdx_tk++) {
        await Seat.create(
          {
            sectorId: sPlatea.id,
            rowIdentifier: rowLetter,
            seatNumber: seatIdx_tk,
            status: 'Disponible',
            version: 1,
          },
          { transaction }
        );
      }
    }

    await AuditLog.create(
      {
        userId: 3,
        userName: 'Admin Productora',
        action: 'EVENT_CREATED',
        entityType: 'Event',
        entityId: String(newEvent.id),
        description: `Evento '${newEvent.name}' creado en ${newEvent.venue} con 100 butacas numeradas distribuidas en Campo ($ ${priceCampo || 25000}) y Platea ($ ${pricePlatea || 40000}).`,
        details: JSON.stringify({ name: newEvent.name, venue: newEvent.venue }),
        amountSpent: 0.00,
        userBalanceAfter: 0.00,
      },
      { transaction }
    );

    await transaction.commit();

    return res.status(201).json({
      message: 'Evento y 100 butacas creados con éxito.',
      event: newEvent,
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    console.error(`[CODE-ERROR] - Error al crear evento: ${error.message}`);
    return res.status(500).json({ error: 'Error al crear evento y butacas.' });
  }
};
