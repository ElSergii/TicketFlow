import React, { useEffect } from 'react';
import { Container, Button, Toast, Card, Row, Col, Badge } from 'react-bootstrap';
import confetti from 'canvas-confetti';

export const ConfirmationScreen = ({ onReturnCatalog, tickets = [], ticketCount = 1 }) => {
  const [showToast, setShowToast] = React.useState(true);

  useEffect(() => {
    try {
      confetti({
        particleCount: 110,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#00f2fe', '#10b981', '#6366f1', '#ffffff'],
      });
    } catch (e) {
      // Ignorar si confetti falla
    }
  }, []);

  const totalSpent = (tickets || []).reduce((acc, t) => acc + (Number(t.price) || 0), 0);

  return (
    <Container fluid="md" className="py-5 text-center" data-sys-render="auto">
      {/* Toast Notification Bottom Right con Duración Corta (4s) y Botón de Cierre 'X' */}
      <div className="position-fixed bottom-0 end-0 p-4" style={{ zIndex: 9999 }}>
        <Toast
          className="bg-dark text-white border-success rounded-4 shadow-lg"
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={4000}
          autohide
          style={{ backgroundColor: '#064e3b', minWidth: '320px' }}
        >
          <Toast.Header closeButton closeVariant="white" className="bg-dark text-white border-bottom border-secondary border-opacity-25">
            <strong className="me-auto font-bold text-success">
              <i className="bi bi-check-circle-fill me-1"></i> Pago confirmado 🎉
            </strong>
          </Toast.Header>
          <Toast.Body className="d-flex align-items-center gap-3 p-3">
            <div className="text-start">
              <small className="text-light opacity-90 fs-6">
                {tickets.length || ticketCount} entrada(s) procesada(s) con éxito. ¡Nos vemos en el show!
              </small>
            </div>
          </Toast.Body>
        </Toast>
      </div>

      {/* Main Ticket Icon */}
      <div
        className="mx-auto mb-4"
        style={{
          width: '100px',
          height: '100px',
          borderRadius: '28px',
          background: 'linear-gradient(135deg, #00f2fe 0%, #6366f1 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 40px rgba(0, 242, 254, 0.4)',
        }}
      >
        <i className="bi bi-ticket-detailed-fill text-dark" style={{ fontSize: '50px' }}></i>
      </div>

      {/* Success Header */}
      <h1
        className="display-5 fw-black mb-2"
        style={{
          background: 'linear-gradient(90deg, #ffffff 0%, #00f2fe 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        ¡Entradas emitidas con éxito!
      </h1>

      <p className="text-light fs-5 mb-4 fw-semibold">
        Se han procesado <span className="text-info fw-extrabold">{tickets.length || ticketCount} entrada(s)</span> en una única transacción.
      </p>

      {/* Breakdown of Issued Tickets */}
      {tickets && tickets.length > 0 && (
        <Card className="card-custom p-4 text-start mb-5 mx-auto border-info border-opacity-50" style={{ maxWidth: '650px' }}>
          <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary border-opacity-25">
            <h5 className="fw-bold text-white mb-0">Detalle de Tickets Emitidos</h5>
            <Badge bg="success" className="px-3 py-2 text-dark fw-bold">
              ESTADO: PAGADO
            </Badge>
          </div>

          <div className="d-flex flex-column gap-2 mb-3">
            {/* Detalle de entradas compradas */}
            {tickets.map((t, index) => (
              <div key={t.reservationId || index} className="p-3 rounded-3 bg-dark d-flex justify-content-between align-items-center border border-secondary border-opacity-25">
                <div className="d-flex align-items-center gap-3">
                  <div className="rounded-circle bg-info bg-opacity-10 text-info p-2 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                    <i className="bi bi-qr-code fs-5"></i>
                  </div>
                  <div>
                    <h6 className="fw-bold text-white mb-0">{t.sectorName || 'Sector'}</h6>
                    <small className="text-light opacity-75">
                      Fila <strong className="text-info">{t.row}</strong> — Butaca N° <strong className="text-info">{t.seatNumber}</strong>
                    </small>
                  </div>
                </div>
                <span className="fw-black text-info">$ {Number(t.price).toLocaleString('es-AR')}</span>
              </div>
            ))}
          </div>

          {totalSpent > 0 && (
            <div className="pt-2 d-flex justify-content-between align-items-center border-top border-secondary border-opacity-25">
              <span className="fw-bold text-light">Total Abonado</span>
              <span className="fs-3 fw-black text-info">$ {totalSpent.toLocaleString('es-AR')}</span>
            </div>
          )}
        </Card>
      )}

      {/* Return Button */}
      <Button
        onClick={onReturnCatalog}
        className="btn-cyan py-3 px-5 fs-5 rounded-4 text-uppercase fw-extrabold"
      >
        Volver al catálogo
      </Button>
    </Container>
  );
};

