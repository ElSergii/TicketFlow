import { AuditLog } from '../models/index.js';

export const getAuditLogs = async (req, res) => {
  try {
    const { userId } = req.query;
    const where = {};
    if (userId) {
      where.userId = Number(userId);
    }
    const logs = await AuditLog.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    return res.status(200).json(logs);
  } catch (error) {
    console.error(`[CODE-ERROR] - Error al consultar registros de auditoría: ${error.message}`);
    return res.status(500).json({ error: 'Error al consultar logs de auditoría.' });
  }
};
