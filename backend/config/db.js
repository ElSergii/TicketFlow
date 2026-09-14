import { Sequelize } from 'sequelize';

try {
  process.loadEnvFile();
} catch (e) {
  // Ignorar si no existe archivo .env
}

const isSqlServer = process.env.DB_DIALECT === 'mssql' || Boolean(process.env.DB_HOST);

export const sequelize = isSqlServer
  ? new Sequelize(
      process.env.DB_NAME || 'TicketFlow_DB',
      process.env.DB_USER || 'sa',
      process.env.DB_PASSWORD || '',
      {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '1433', 10),
        dialect: 'mssql',
        logging: false,
        dialectOptions: {
          options: {
            encrypt: process.env.DB_ENCRYPT === 'true',
            trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
            instanceName: process.env.DB_INSTANCE_NAME || undefined,
            requestTimeout: 15000,
          },
        },
        pool: {
          max: 20,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
      }
    )
  : new Sequelize({
      dialect: 'sqlite',
      storage: process.env.DB_STORAGE || './ticketflow.sqlite',
      logging: false,
      dialectOptions: {
        timeout: 5000,
      },
    });

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    const dialect = sequelize.getDialect();
    if (dialect === 'sqlite') {
      await sequelize.query('PRAGMA journal_mode = WAL;');
      await sequelize.query('PRAGMA busy_timeout = 5000;');
    }
    await sequelize.sync({ alter: true });
    console.log(`[DB] Conexión a la base de datos (${dialect.toUpperCase()}) establecida correctamente y esquema actualizado.`);
  } catch (error) {
    console.error(`[CODE-ERROR] - Error al conectar con la base de datos: ${error.message}`);
  }
};


