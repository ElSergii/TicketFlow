import { Sequelize } from 'sequelize';

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './ticketflow.sqlite',
  logging: false,
  dialectOptions: {
    // WAL mode permite lectura y escritura concurrente sin bloqueos de base de datos
    timeout: 5000,
  },
});

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.query('PRAGMA journal_mode = WAL;');
    await sequelize.query('PRAGMA busy_timeout = 5000;');
    await sequelize.sync({ alter: true });
    console.log('[DB] Conexión a la base de datos establecida correctamente con WAL mode y esquema actualizado.');
  } catch (error) {
    console.error(`[CODE-ERROR] - Error al conectar con la base de datos: ${error.message}`);
  }
};

