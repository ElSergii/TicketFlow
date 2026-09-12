import { sequelize } from '../config/db.js';
import { User, AuditLog } from '../models/index.js';

export const getUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    return res.status(200).json(users);
  } catch (error) {
    console.error(`[CODE-ERROR] - Error al consultar usuarios: ${error.message}`);
    return res.status(500).json({ error: 'Error al obtener lista de usuarios.' });
  }
};

export const depositBalance = async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;
  const depositAmount = Number(amount);

  if (!depositAmount || depositAmount <= 0) {
    return res.status(400).json({ error: 'El monto a ingresar debe ser mayor a cero.' });
  }

  const transaction = await sequelize.transaction();
  try {
    const user = await User.findByPk(id, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const newBalance = Number(user.balance || 0) + depositAmount;
    await user.update({ balance: newBalance }, { transaction });

    await AuditLog.create(
      {
        userId: user.id,
        userName: user.name,
        action: 'BALANCE_DEPOSIT',
        entityType: 'Wallet',
        entityId: String(user.id),
        description: `Recarga exitosa de billetera virtual: Se acreditaron +$ ${depositAmount.toLocaleString('es-AR')}. Nuevo saldo disponible: $ ${newBalance.toLocaleString('es-AR')}.`,
        details: JSON.stringify({ amount: depositAmount, newBalance }),
        amountSpent: 0.00,
        userBalanceAfter: newBalance,
      },
      { transaction }
    );

    await transaction.commit();
    return res.status(200).json({
      message: `¡Recarga de $ ${depositAmount.toLocaleString('es-AR')} acreditada con éxito!`,
      newBalance: newBalance,
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    console.error(`[CODE-ERROR] - Error al recargar saldo para el usuario ${id}: ${error.message}`);
    return res.status(500).json({ error: 'Error al procesar la recarga de dinero.' });
  }
};
