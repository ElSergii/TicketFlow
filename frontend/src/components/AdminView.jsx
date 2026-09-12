import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Badge } from 'react-bootstrap';
import axios from 'axios';

export const AdminView = ({ events, onEventCreated, showToast }) => {
  const [form, setForm] = useState({
    name: '',
    venue: '',
    eventDate: '2026-11-20T21:00',
    badgeText: 'Urban',
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800&auto=format&fit=crop',
    priceCampo: 25000,
    pricePlatea: 40000,
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.venue) {
      showToast('Por favor completa el nombre y recinto del evento.', 'warning');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/v1/events', {
        name: form.name,
        venue: form.venue,
        eventDate: new Date(form.eventDate).toISOString(),
        badgeText: form.badgeText,
        imageUrl: form.imageUrl,
        priceCampo: Number(form.priceCampo),
        pricePlatea: Number(form.pricePlatea),
      });

      showToast(`¡Evento '${form.name}' creado con 100 butacas numeradas!`, 'success');
      setForm({
        name: '',
        venue: '',
        eventDate: '2026-11-20T21:00',
        badgeText: 'Urban',
        imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800&auto=format&fit=crop',
        priceCampo: 25000,
        pricePlatea: 40000,
      });
      onEventCreated();
    } catch (err) {
      console.error(`[CODE-ERROR] - Error al crear evento en Admin: ${err.message}`);
      showToast('Fallo al crear el evento desde Admin.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid="xl" className="py-5" data-sys-render="auto">
      {/* Admin Header */}
      <div className="d-flex align-items-center gap-3 mb-5">
        <div
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1 0%, #00f2fe 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <i className="bi bi-shield-lock-fill text-dark fs-3"></i>
        </div>
        <div>
          <h3 className="fw-black text-white mb-0">Panel de Gestión Productora</h3>
          <p className="text-secondary mb-0">Vista exclusiva de administración para crear eventos, tarifas y supervisar métricas de venta.</p>
        </div>
      </div>

      {/* Metrics Banner (Bootstrap Cards & Grid) */}
      <Row className="g-4 mb-5">
        <Col xs={12} sm={6} lg={3}>
          <Card className="card-custom p-3 text-center">
            <span className="text-secondary fw-bold text-uppercase fs-6">Eventos en Catálogo</span>
            <h2 className="fw-black text-info mt-1 mb-0">{events.length}</h2>
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <Card className="card-custom p-3 text-center">
            <span className="text-secondary fw-bold text-uppercase fs-6">Capacidad por Evento</span>
            <h2 className="fw-black text-success mt-1 mb-0">100 <small className="fs-6 text-muted">butacas</small></h2>
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <Card className="card-custom p-3 text-center">
            <span className="text-secondary fw-bold text-uppercase fs-6">Bloqueo Temporal</span>
            <h2 className="fw-black text-warning mt-1 mb-0">5 min</h2>
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <Card className="card-custom p-3 text-center">
            <span className="text-secondary fw-bold text-uppercase fs-6">Auditoría Integrada</span>
            <h2 className="fw-black text-primary mt-1 mb-0">100%</h2>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        {/* Create Event Form (Bootstrap Form) */}
        <Col xs={12} lg={6}>
          <Card className="card-custom p-4 border-info border-opacity-50">
            <h4 className="fw-bold text-info mb-1 d-flex align-items-center gap-2">
              <i className="bi bi-plus-circle"></i> Crear Nuevo Evento
            </h4>
            <p className="text-secondary small mb-4">
              Se generarán automáticamente 2 sectores (Campo y Platea) con 50 butacas numeradas en cada uno.
            </p>

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="admin-event-name">
                <Form.Label htmlFor="admin-event-name" className="fw-bold text-white">Nombre del Show</Form.Label>
                <Form.Control
                  id="admin-event-name"
                  name="eventName"
                  type="text"
                  placeholder="ej. Duki — A.D.A. Tour"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="bg-dark text-white border-secondary"
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="admin-event-venue">
                <Form.Label htmlFor="admin-event-venue" className="fw-bold text-white">Recinto / Estadio</Form.Label>
                <Form.Control
                  id="admin-event-venue"
                  name="eventVenue"
                  type="text"
                  placeholder="ej. Estadio Vélez Sarsfield"
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                  required
                  className="bg-dark text-white border-secondary"
                />
              </Form.Group>

              <Row className="g-3 mb-3">
                <Col xs={6}>
                  <Form.Group controlId="admin-price-campo">
                    <Form.Label htmlFor="admin-price-campo" className="fw-bold text-white">Precio Campo ($)</Form.Label>
                    <Form.Control
                      id="admin-price-campo"
                      name="priceCampo"
                      type="number"
                      value={form.priceCampo}
                      onChange={(e) => setForm({ ...form, priceCampo: e.target.value })}
                      required
                      className="bg-dark text-white border-secondary"
                    />
                  </Form.Group>
                </Col>
                <Col xs={6}>
                  <Form.Group controlId="admin-price-platea">
                    <Form.Label htmlFor="admin-price-platea" className="fw-bold text-white">Precio Platea ($)</Form.Label>
                    <Form.Control
                      id="admin-price-platea"
                      name="pricePlatea"
                      type="number"
                      value={form.pricePlatea}
                      onChange={(e) => setForm({ ...form, pricePlatea: e.target.value })}
                      required
                      className="bg-dark text-white border-secondary"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-4" controlId="admin-badge-text">
                <Form.Label htmlFor="admin-badge-text" className="fw-bold text-white">Género / Etiqueta</Form.Label>
                <Form.Control
                  id="admin-badge-text"
                  name="badgeText"
                  type="text"
                  value={form.badgeText}
                  onChange={(e) => setForm({ ...form, badgeText: e.target.value })}
                  className="bg-dark text-white border-secondary"
                />
              </Form.Group>

              <Button
                type="submit"
                disabled={loading}
                className="btn-cyan w-100 py-3 fw-black tracking-wider"
              >
                {loading ? 'CREANDO EVENTO...' : 'CREAR EVENTO Y CONFIGURAR 100 BUTACAS'}
              </Button>
            </Form>
          </Card>
        </Col>

        {/* Managed Events Overview */}
        <Col xs={12} lg={6}>
          <Card className="card-custom p-4">
            <h4 className="fw-bold text-white mb-4">Eventos Administrados</h4>

            <div className="d-flex flex-column gap-3">
              {/* Lista de eventos registrados */}
              {events.map((evt, index) => (
                <div
                  key={evt.id || index}
                  className="p-3 rounded-3 bg-dark border border-secondary border-opacity-25 d-flex justify-content-between align-items-center"
                >
                  <div>
                    <h6 className="fw-bold text-white mb-1">{evt.name}</h6>
                    <small className="text-secondary">{evt.venue}</small>
                  </div>
                  <Badge bg={evt.status === 'Active' ? 'success' : 'danger'} className="px-3 py-2 fw-bold">
                    {evt.status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};
