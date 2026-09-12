import React, { useEffect, useState } from 'react';
import { Offcanvas, Button, Card, Badge, Spinner } from 'react-bootstrap';
import axios from 'axios';

export const AuditDrawer = ({ open, onClose, currentUser }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const isAdmin = currentUser?.role === 'Admin';

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      // Filtrar la auditoría por el ID del usuario si es cliente (Privacidad estricta de gastos)
      const url = isAdmin ? '/api/v1/audit-logs' : `/api/v1/audit-logs?userId=${currentUser?.id || 1}`;
      const res = await axios.get(url);
      setLogs(res.data || []);
    } catch (err) {
      console.error(`[CODE-ERROR] - Error al consultar logs de auditoría en frontend: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAuditLogs();
    }
  }, [open, currentUser]);

  const getActionBadge = (action) => {
    switch (action) {
      case 'PAYMENT_SUCCESS':
        return { label: 'Pago Confirmado', bg: 'success', icon: 'bi-check-circle-fill' };
      case 'RESERVE_SUCCESS':
        return { label: 'Reserva Temporal (5 min)', bg: 'info', icon: 'bi-clock-history' };
      case 'RESERVE_FAILED_CONCURRENCY':
        return { label: 'Conflicto de Concurrencia', bg: 'danger', icon: 'bi-exclamation-triangle-fill' };
      case 'EXPIRED_RELEASE':
        return { label: 'Liberación por Expiración', bg: 'warning', icon: 'bi-hourglass-split' };
      case 'EVENT_CREATED':
        return { label: 'Evento Creado (Admin)', bg: 'primary', icon: 'bi-plus-circle-fill' };
      default:
        return { label: action, bg: 'secondary', icon: 'bi-activity' };
    }
  };

  return (
    <Offcanvas
      show={open}
      onHide={onClose}
      placement="end"
      className="offcanvas-dark p-2"
      style={{ width: '540px' }}
      data-sys-render="auto"
    >
      <Offcanvas.Header closeButton closeVariant="white" className="border-bottom border-secondary border-opacity-25 pb-3">
        <Offcanvas.Title className="fw-extrabold d-flex align-items-center gap-2 text-white fs-5">
          <i className="bi bi-person-badge text-info fs-4"></i>
          <span>{isAdmin ? 'Auditoría Global (Productora)' : `Mis Movimientos y Saldo (${currentUser?.name})`}</span>
        </Offcanvas.Title>
      </Offcanvas.Header>

      <Offcanvas.Body className="pt-3">
        <p className="text-light small mb-3">
          {isAdmin
            ? 'Trazabilidad inmutable de todas las compras, liberaciones y eventos del sistema.'
            : `Historial exclusivo de tus gastos, reservas temporales y saldo restante (${currentUser?.name}).`}
        </p>

        <Button
          variant="outline-info"
          size="sm"
          onClick={fetchAuditLogs}
          disabled={loading}
          className="mb-4 fw-bold d-flex align-items-center gap-2"
        >
          <i className="bi bi-arrow-clockwise"></i>
          <span>Actualizar Mis Registros</span>
        </Button>

        {/* Registros de auditoría */}
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="info" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-5">
            <h6 className="text-light">Aún no registrás compras o reservas.</h6>
            <small className="text-light opacity-75">Seleccioná una butaca en el catálogo para iniciar tu primer movimiento.</small>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3 overflow-auto pe-1" style={{ maxHeight: 'calc(100vh - 220px)' }}>
            {logs.map((log, index) => {
              const badge = getActionBadge(log.action);
              const spent = Number(log.amountSpent || 0);
              const remainingBalance = Number(log.userBalanceAfter || 0);

              return (
                <Card key={log.id || idx_tk} className="card-custom p-3 border-secondary border-opacity-25 shadow-sm">
                  {/* Header Row: User Info & Action Badge */}
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center text-dark fw-bold"
                        style={{ width: '28px', height: '28px', backgroundColor: '#00f2fe', fontSize: '0.8rem' }}
                      >
                        {(log.userName || 'U')[0]}
                      </div>
                      <span className="fw-bold text-white fs-6">{log.userName || 'Cliente'}</span>
                    </div>

                    <Badge bg={badge.bg} className="px-2.5 py-1.5 fw-bold d-flex align-items-center gap-1">
                      <i className={`bi ${badge.icon}`}></i>
                      <span>{badge.label}</span>
                    </Badge>
                  </div>

                  {/* Description Text (Zero Code / Zero JSON) */}
                  <p className="text-light mb-2" style={{ lineHeight: 1.5, fontSize: '0.95rem' }}>
                    {log.description || 'Movimiento registrado en el sistema.'}
                  </p>

                  <hr className="border-secondary opacity-25 my-2" />

                  {/* Financial Summary & Timestamp */}
                  <div className="d-flex justify-content-between align-items-center">
                    {spent > 0 ? (
                      <span className="text-danger fw-extrabold fs-6">Gasto: -$ {spent.toLocaleString('es-AR')}</span>
                    ) : (
                      <span className="text-light opacity-75 small">Sin cargo</span>
                    )}

                    {remainingBalance > 0 && (
                      <span className="text-success fw-bold d-flex align-items-center gap-1">
                        <i className="bi bi-wallet2"></i> Mi Saldo: $ {remainingBalance.toLocaleString('es-AR')}
                      </span>
                    )}

                    <small className="text-info font-monospace fw-bold">
                      {new Date(log.createdAt).toLocaleTimeString('es-AR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </small>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  );
};
