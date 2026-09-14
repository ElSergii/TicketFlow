import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Badge, Nav } from 'react-bootstrap';

export const EventCatalog = ({ events, onSelectEvent }) => {
  const [filter, setFilter] = useState('Todos');

  const filteredEvents = events.filter((evt) => {
    if (filter === 'Disponibles') return evt.status === 'Active';
    if (filter === 'Agotados') return evt.status === 'Agotado';
    return true;
  });

  return (
    <Container fluid="xl" className="py-5" data-sys-render="auto">
      {/* Hero Section */}
      <div className="text-center mb-5">
        <span
          className="text-uppercase fw-extrabold tracking-widest text-info"
          style={{ letterSpacing: '3px', fontSize: '0.85rem' }}
        >
          SISTEMA DE VENTA DE ENTRADAS
        </span>
        <h1
          className="display-4 fw-extrabold mt-2 mb-3"
          style={{
            background: 'linear-gradient(90deg, #ffffff 30%, #00f2fe 70%, #10b981 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Los mejores shows,<br />tu lugar asegurado.
        </h1>
        <p className="text-secondary fs-5 max-w-600 mx-auto">
          Reservá tu butaca en tiempo real. Bloqueamos el asiento mientras pagás.
        </p>
      </div>

      {/* Filter Nav Pills (Bootstrap Nav) */}
      <div className="d-flex justify-content-start mb-4 overflow-hidden">
        <Nav
          variant="pills"
          activeKey={filter}
          onSelect={(selectedKey) => selectedKey && setFilter(selectedKey)}
          className="touch-scroll-nav p-1 rounded-3 bg-dark border border-secondary w-100 w-sm-auto"
          style={{ backgroundColor: '#111827' }}
        >
          <Nav.Item>
            <Nav.Link eventKey="Todos" className="fw-bold px-3 px-md-4 text-white">
              Todos
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="Disponibles" className="fw-bold px-3 px-md-4 text-white">
              Disponibles
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="Agotados" className="fw-bold px-3 px-md-4 text-white">
              Agotados
            </Nav.Link>
          </Nav.Item>
        </Nav>
      </div>

      {/* Tarjetas de eventos */}
      <Row className="g-4">
        {filteredEvents.map((evt, index) => {
          const isAgotado = evt.status === 'Agotado';

          return (
            <Col key={evt.id || idx_tk} xs={12} md={6} lg={4}>
              <Card className="card-custom h-100 position-relative overflow-hidden">
                {/* Media Image */}
                <div className="position-relative">
                  <Card.Img
                    variant="top"
                    src={evt.imageUrl}
                    alt={evt.name}
                    style={{
                      height: '210px',
                      objectFit: 'cover',
                      filter: isAgotado ? 'grayscale(85%) opacity(0.5)' : 'none',
                    }}
                  />
                  {/* Badges Overlay */}
                  <div className="position-absolute top-0 start-0 end-0 p-3 d-flex justify-content-between align-items-center">
                    <Badge
                      bg="dark"
                      className="text-info border border-info border-opacity-25 px-2.5 py-1.5"
                    >
                      {evt.badgeText || 'Concierto'}
                    </Badge>
                    <Badge
                      bg={isAgotado ? 'danger' : 'success'}
                      className="px-2.5 py-1.5 fw-extrabold"
                    >
                      {isAgotado ? 'Agotado' : 'Entradas disponibles'}
                    </Badge>
                  </div>

                  {/* Stamp AGOTADO Overlay */}
                  {isAgotado && (
                    <div
                      className="position-absolute top-50 start-50 translate-middle border border-4 border-danger text-danger fw-black px-4 py-1 rounded-3"
                      style={{
                        transform: 'translate(-50%, -50%) rotate(-12deg)',
                        fontSize: '1.8rem',
                        backgroundColor: 'rgba(11, 15, 25, 0.9)',
                        letterSpacing: '3px',
                      }}
                    >
                      AGOTADO
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <Card.Body className="d-flex flex-column p-4">
                  <Card.Title className="fw-bold fs-5 mb-2">{evt.name}</Card.Title>

                  <div className="d-flex align-items-center gap-2 text-secondary mb-2">
                    <i className="bi bi-geo-alt-fill text-danger fs-5"></i>
                    <small className="fs-6">{evt.venue}</small>
                  </div>

                  <div className="d-flex align-items-center gap-2 text-secondary mb-4">
                    <i className="bi bi-calendar-event-fill text-info fs-5"></i>
                    <small className="fs-6">
                      {new Date(evt.eventDate).toLocaleDateString('es-AR', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </small>
                  </div>

                  <div className="mt-auto pt-3 border-top border-secondary border-opacity-25 d-flex align-items-center justify-content-between">
                    <div>
                      <small className="text-secondary d-block" style={{ fontSize: '0.8rem' }}>
                        Desde
                      </small>
                      <span className="fs-5 fw-extrabold text-info">$ 22.000</span>
                    </div>

                    <Button
                      disabled={isAgotado}
                      onClick={() => onSelectEvent(evt)}
                      className="btn-cyan d-flex align-items-center gap-2"
                    >
                      <span>Ver entradas</span>
                      <i className="bi bi-arrow-right"></i>
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
    </Container>
  );
};
