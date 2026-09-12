import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

// 1. EVENT MODEL
export const Event = sequelize.define('Event', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  eventDate: { type: DataTypes.DATE, allowNull: false },
  venue: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'Active' },
  imageUrl: { type: DataTypes.STRING, allowNull: true },
  badgeText: { type: DataTypes.STRING, allowNull: true },
});

// 2. SECTOR MODEL
export const Sector = sequelize.define('Sector', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  eventId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  capacity: { type: DataTypes.INTEGER, allowNull: false },
});

// 3. SEAT MODEL (con Optimistic Locking campo version)
export const Seat = sequelize.define('Seat', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  sectorId: { type: DataTypes.INTEGER, allowNull: false },
  rowIdentifier: { type: DataTypes.STRING(10), allowNull: false },
  seatNumber: { type: DataTypes.INTEGER, allowNull: false },
  status: { 
    type: DataTypes.ENUM('Disponible', 'Reservado', 'Vendida'), 
    defaultValue: 'Disponible' 
  },
  version: { type: DataTypes.INTEGER, defaultValue: 1, allowNull: false },
});

// 4. USER MODEL
export const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, defaultValue: 'Customer' },
  balance: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
  avatarUrl: { type: DataTypes.STRING, allowNull: true },
});

// 5. RESERVATION MODEL
export const Reservation = sequelize.define('Reservation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  seatId: { type: DataTypes.UUID, allowNull: false },
  status: { 
    type: DataTypes.ENUM('Pending', 'Paid', 'Expired'), 
    defaultValue: 'Pending' 
  },
  reservedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
});

// 6. AUDIT LOG MODEL
export const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  userName: { type: DataTypes.STRING, allowNull: true },
  action: { type: DataTypes.STRING, allowNull: false },
  entityType: { type: DataTypes.STRING, allowNull: false },
  entityId: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  details: { type: DataTypes.TEXT, allowNull: false },
  amountSpent: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
  userBalanceAfter: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
  createdAt: { type: DataTypes.DATE(3), defaultValue: DataTypes.NOW },
});

// Relaciones
Event.hasMany(Sector, { foreignKey: 'eventId', as: 'sectors' });
Sector.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });

Sector.hasMany(Seat, { foreignKey: 'sectorId', as: 'seats' });
Seat.belongsTo(Sector, { foreignKey: 'sectorId', as: 'sector' });

Seat.hasMany(Reservation, { foreignKey: 'seatId', as: 'reservations' });
Reservation.belongsTo(Seat, { foreignKey: 'seatId', as: 'seat' });

User.hasMany(Reservation, { foreignKey: 'userId', as: 'reservations' });
Reservation.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Función de Inicialización y Seeding
export const seedInitialData = async () => {
  try {
    const userCount = await User.count();
    if (userCount === 0) {
      console.log('[SEED] Precargando usuarios iniciales...');

      await User.create({
        name: 'Juan Pérez',
        email: 'juan@ticketflow.com',
        passwordHash: 'hash_juan_123',
        role: 'Customer',
        balance: 50000.00,
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
      });

      await User.create({
        name: 'María García',
        email: 'maria@ticketflow.com',
        passwordHash: 'hash_maria_123',
        role: 'Customer',
        balance: 100000.00,
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop',
      });

      await User.create({
        name: 'Admin Productora',
        email: 'admin@ticketflow.com',
        passwordHash: 'hash_admin_123',
        role: 'Admin',
        balance: 0.00,
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop',
      });
    }

    const eventCount = await Event.count();
    if (eventCount === 0) {
      console.log('[SEED] Precargando catálogo de eventos...');

      const event1 = await Event.create({
        name: 'Arctic Monkeys — The Car Tour',
        venue: 'Estadio River Plate, Buenos Aires',
        eventDate: new Date('2026-11-14T21:00:00'),
        status: 'Active',
        badgeText: 'Rock',
        imageUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=800&auto=format&fit=crop',
      });

      const event2 = await Event.create({
        name: 'Tame Impala — The Slow Rush',
        venue: 'Movistar Arena, Buenos Aires',
        eventDate: new Date('2026-12-05T22:00:00'),
        status: 'Active',
        badgeText: 'Psychedelic',
        imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop',
      });

      const event3 = await Event.create({
        name: 'Gorillaz — Cracker Island Live',
        venue: 'Tecnópolis, Buenos Aires',
        eventDate: new Date('2027-01-20T21:30:00'),
        status: 'Active',
        badgeText: 'Alternative',
        imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop',
      });

      const event4 = await Event.create({
        name: 'Radiohead — A Moon Shaped Pool',
        venue: 'Estadio Obras, Buenos Aires',
        eventDate: new Date('2026-10-30T20:00:00'),
        status: 'Agotado',
        badgeText: 'Art Rock',
        imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop',
      });

      // Local helper for event seats
      const seedSeatsForEvent = async (evt, campoName, campoPrice, plateaName, plateaPrice, isSoldOut = false) => {
        const sCampo = await Sector.create({
          eventId: evt.id,
          name: campoName,
          price: campoPrice,
          capacity: 50,
        });

        const sPlatea = await Sector.create({
          eventId: evt.id,
          name: plateaName,
          price: plateaPrice,
          capacity: 50,
        });

        const seatStatus = isSoldOut ? 'Vendida' : 'Disponible';

        const campoRows = ['A', 'B', 'C', 'D', 'E'];
        for (let idx_tk = 0; idx_tk < campoRows.length; idx_tk++) {
          const rowLetter = campoRows[idx_tk];
          for (let seatIdx_tk = 1; seatIdx_tk <= 10; seatIdx_tk++) {
            await Seat.create({
              sectorId: sCampo.id,
              rowIdentifier: rowLetter,
              seatNumber: seatIdx_tk,
              status: seatStatus,
              version: 1,
            });
          }
        }

        const plateaRows = ['F', 'G', 'H', 'I', 'J'];
        for (let idx_tk = 0; idx_tk < plateaRows.length; idx_tk++) {
          const rowLetter = plateaRows[idx_tk];
          for (let seatIdx_tk = 1; seatIdx_tk <= 10; seatIdx_tk++) {
            await Seat.create({
              sectorId: sPlatea.id,
              rowIdentifier: rowLetter,
              seatNumber: seatIdx_tk,
              status: seatStatus,
              version: 1,
            });
          }
        }
      };

      await seedSeatsForEvent(event1, 'Campo General', 28000.00, 'Platea Baja', 42000.00);
      await seedSeatsForEvent(event2, 'Campo', 22000.00, 'Platea', 35000.00);
      await seedSeatsForEvent(event3, 'Campo Preferencial', 25000.00, 'Platea VIP', 45000.00);
      await seedSeatsForEvent(event4, 'Campo General', 30000.00, 'Platea Alta', 50000.00, true);

      console.log('[SEED] Precarga de eventos y 400 butacas completada exitosamente.');
    }
  } catch (error) {
    console.error(`[CODE-ERROR] - Error al precargar la semilla de datos: ${error.message}`);
  }
};
