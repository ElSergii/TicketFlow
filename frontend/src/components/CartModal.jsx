import React from 'react';
import { Modal, Button, Row, Col, Card, ProgressBar, Badge } from 'react-bootstrap';

export const CartModal = ({
  open,
  onClose,
  cartItems,
  onRemoveItem,
  onConfirmPayment,
  countdownFormatted,
  countdownSeconds,
  loading,
  currentUser,
  onOpenDeposit,
}) => {
  const totalAmount = cartItems.reduce((acc, item) => acc + (Number(item.price) || 0), 0);
  const progressPercent = Math.max(0, Math.min(100, (countdownSeconds / 300) * 100));
  const userBalance = Number(currentUser?.balance || 0);
  const isInsufficientBalance = currentUser && userBalance < totalAmount;

  return (
    <Modal
      show={open}
      onHide={onClose}
      size="lg"
      centered
      contentClassName="modal-content-dark rounded-4 p-2"
    >
      <Modal.Header closeButton closeVariant="white" className="border-secondary border-opacity-25 pb-3">
        <div className="d-flex align-items-center gap-3">
          <Modal.Title className="fw-extrabold text-white fs-4 mb-0">Carrito de compras</Modal.Title>
          <Badge bg="info" className="text-dark fw-bold px-3 py-2">
            {cartItems.length} {cartItems.length === 1 ? 'entrada' : 'entradas'}
          </Badge>
        </div>
      </Modal.Header>

      <Modal.Body className="pt-4">
        {cartItems.length === 0 ? (
          <div className="text-center py-5">
            <h5 className="text-secondary">Tu carrito está vacío.</h5>
            <p className="text-muted">Seleccioná una o más butacas en el plano para iniciar tu reserva.</p>
          </div>
        ) : (
          <Row className="g-4">
            {/* Lista de entradas reservadas */}
            <Col xs={12} md={7}>
              <div className="d-flex flex-column gap-3">
                {cartItems.map((item, index) => (
                  <Card key={`cart-item-${item.reservationId || index}`} className="card-custom p-3 border-info border-opacity-50">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h5 className="fw-bold text-white mb-1">{item.sectorName || 'Campo'}</h5>
                        <p className="text-secondary mb-0">
                          Fila {item.rowIdentifier} — Butaca N° {item.seatNumber}
                        </p>
                      </div>
                      <span className="fs-5 fw-black text-info">$ {Number(item.price).toLocaleString('es-AR')}</span>
                    </div>

                    {/* Barra de tiempo restante */}
                    <div className="mt-3">
                      <div className="d-flex justify-content-between mb-1">
                        <small className="text-secondary d-flex align-items-center gap-1">
                          <i className="bi bi-clock-history text-warning"></i> Tiempo restante
                        </small>
                        <small className="text-warning fw-extrabold font-monospace">{countdownFormatted}</small>
                      </div>
                      <ProgressBar
                        now={progressPercent}
                        variant={progressPercent < 20 ? 'danger' : 'success'}
                        style={{ height: '6px', borderRadius: '3px' }}
                      />
                    </div>

                    <div className="mt-3 text-end">
                      <Button
                        variant="link"
                        onClick={() => onRemoveItem(item)}
                        className="text-danger fw-bold text-decoration-none p-0"
                      >
                        <i className="bi bi-trash me-1"></i> Eliminar
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </Col>

            {/* Resumen del pedido */}
            <Col xs={12} md={5}>
              <Card className="card-custom p-4">
                <h5 className="fw-bold text-white mb-3">Resumen</h5>

                {cartItems.map((item, index) => (
                  <div key={`summary-item-${item.reservationId || index}`} className="d-flex justify-content-between mb-2">
                    <span className="text-light">{item.sectorName} ({item.rowIdentifier}{item.seatNumber})</span>
                    <span className="fw-bold text-white">$ {Number(item.price).toLocaleString('es-AR')}</span>
                  </div>
                ))}

                <hr className="border-secondary opacity-25 my-3" />

                {/* Saldo disponible del usuario */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-secondary fs-6">Mi Saldo Disponible:</span>
                  <span className={`fw-extrabold ${isInsufficientBalance ? 'text-danger' : 'text-success'}`}>
                    $ {userBalance.toLocaleString('es-AR')}
                  </span>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-4">
                  <span className="fs-5 fw-bold text-white">Total</span>
                  <span className="fs-3 fw-black text-info">$ {totalAmount.toLocaleString('es-AR')}</span>
                </div>

                {/* Aviso si el saldo es insuficiente */}
                {isInsufficientBalance && (
                  <div className="p-3 mb-3 rounded-3 bg-danger bg-opacity-10 border border-danger border-opacity-50 text-start">
                    <small className="text-danger fw-bold d-block mb-2">
                      <i className="bi bi-exclamation-triangle-fill me-1"></i> Saldo insuficiente para abonar las {cartItems.length} entradas ($ {totalAmount.toLocaleString('es-AR')}).
                    </small>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => {
                        onClose();
                        if (onOpenDeposit) onOpenDeposit();
                      }}
                      className="w-100 fw-extrabold d-flex align-items-center justify-content-center gap-1 py-2"
                    >
                      <i className="bi bi-plus-circle-fill"></i>
                      <span>Cargar Saldo Ahora</span>
                    </Button>
                  </div>
                )}

                <Button
                  disabled={loading || isInsufficientBalance}
                  onClick={onConfirmPayment}
                  className="btn-cyan w-100 py-3 fw-black tracking-wider text-uppercase"
                >
                  <i className="bi bi-lock-fill me-2"></i>
                  {loading ? 'PROCESANDO PAGO...' : `CONFIRMAR COMPRA (${cartItems.length})`}
                </Button>

                <small className="text-muted d-block text-center mt-3" style={{ fontSize: '0.75rem' }}>
                  Pago con débito directo de Billetera Virtual
                </small>
              </Card>
            </Col>
          </Row>
        )}
      </Modal.Body>
    </Modal>
  );
};
