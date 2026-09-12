import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Nav, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';

export const SeatMap = ({ eventData, onBack, onReserveSeat, onReserveBatch, loading }) => {
  const [selectedSectorId, setSelectedSectorId] = useState(
    eventData?.sectors?.[0]?.id || null
  );

  const [selectedSeats, setSelectedSeats] = useState([]);

  const activeSector = eventData?.sectors?.find(
    (sec) => sec.id === selectedSectorId
  ) || eventData?.sectors?.[0];

  const seats = activeSector?.seats || [];

  // Agrupar asientos por fila (Filas A, B, C...) y ordenar por número de asiento (1, 2, 3, 4...)
  const rowsMap = {};
  seats.forEach((seat, idx_tk) => {
    if (!rowsMap[seat.rowIdentifier]) {
      rowsMap[seat.rowIdentifier] = [];
    }
    rowsMap[seat.rowIdentifier].push(seat);
  });

  // Ordenar estrictamente las butacas de cada fila en orden numérico ascendente (1, 2, 3...)
  Object.keys(rowsMap).forEach((rowLetter, idx_tk) => {
    rowsMap[rowLetter].sort((a, b) => Number(a.seatNumber) - Number(b.seatNumber));
  });

  const sortedRowKeys = Object.keys(rowsMap).sort();

  const totalAvailable = seats.filter((s) => s.status === 'Disponible').length;
  const totalReserved = seats.filter((s) => s.status === 'Reservado').length;
  const totalSold = seats.filter((s) => s.status === 'Vendida').length;

  const handleToggleSeat = (seatItem) => {
    // Alternar selección de butacas para compra múltiple
    if (selectedSeats.some((s) => s.id === seatItem.id)) {
      setSelectedSeats((prev) => prev.filter((s) => s.id !== seatItem.id));
    } else {
      setSelectedSeats((prev) => [...prev, seatItem]);
    }
  };

  const totalSelectedPrice = selectedSeats.reduce((acc, seatItem) => {
    const sec = eventData?.sectors?.find((s) => s.id === seatItem.sectorId) || activeSector;
    return acc + (Number(sec?.price) || 0);
  }, 0);

  const handleConfirmBatch = () => {
    if (selectedSeats.length === 0) return;
    if (onReserveBatch) {
      onReserveBatch(selectedSeats);
    } else if (onReserveSeat) {
      selectedSeats.forEach((seatItem) => onReserveSeat(seatItem));
    }
    setSelectedSeats([]);
  };


  return (
    <Container fluid="xl" className="py-4 position-relative" data-sys-render="auto">
      {/* Header back button & event info */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <Button
          variant="outline-light"
          onClick={onBack}
          className="d-flex align-items-center gap-2 fw-bold rounded-3 border-secondary"
        >
          <i className="bi bi-arrow-left"></i>
          <span>Volver al catálogo</span>
        </Button>
        <h3 className="fw-extrabold text-white mb-0">{eventData?.name}</h3>
      </div>

      {/* Sector Tabs Bar (Bootstrap Nav Tabs) */}
      <Nav
        variant="tabs"
        activeKey={selectedSectorId}
        onSelect={(val) => val && setSelectedSectorId(Number(val))}
        className="mb-4 border-secondary border-opacity-25"
      >
        {/* Pestañas de sectores */}
        {eventData?.sectors?.map((sector, index) => (
          <Nav.Item key={sector.id || index}>
            <Nav.Link
              eventKey={sector.id}
              className={`fw-bold fs-5 px-4 py-2 ${
                selectedSectorId === sector.id ? 'text-info border-info border-bottom-0 bg-dark' : 'text-light'
              }`}
            >
              {sector.name} $ {Number(sector.price).toLocaleString('es-AR')}
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>

      <Row className="g-4 mb-5">
        {/* Mapa de butacas */}
        <Col xs={12} lg={8}>
          <Card className="card-custom p-4 text-center">
            {/* Escenario */}
            <div className="stage-banner mx-auto w-75 mb-4">▲ ESCENARIO ▲</div>

            {/* Matriz de asientos */}
            <div className="d-flex flex-column gap-2 align-items-center">
              {sortedRowKeys.map((rowLetter, index) => {
                const rowSeats = rowsMap[rowLetter] || [];
                return (
                  <div key={rowLetter || index} className="d-flex align-items-center gap-2">
                    <span className="fw-black text-info me-2" style={{ width: '20px', textAlign: 'right' }}>
                      {rowLetter}
                    </span>

                    {rowSeats.map((seatItem, seatIndex) => {
                      const isAvailable = seatItem.status === 'Disponible';
                      const isReserved = seatItem.status === 'Reservado';
                      const isSold = seatItem.status === 'Vendida';
                      const isSelected = selectedSeats.some((s) => s.id === seatItem.id);

                      let seatClass = 'seat-available';
                      if (isSelected) seatClass = 'seat-selected';
                      else if (isReserved) seatClass = 'seat-reserved';
                      else if (isSold) seatClass = 'seat-sold';

                      return (
                        <OverlayTrigger
                          key={seatItem.id || idx_tk}
                          placement="top"
                          overlay={
                            <Tooltip id={`tooltip-${seatItem.id}`}>
                              Fila {seatItem.rowIdentifier} — Butaca N° {seatItem.seatNumber} ({isSelected ? 'Seleccionada' : seatItem.status})
                            </Tooltip>
                          }
                        >
                          <span>
                            <button
                              disabled={!isAvailable || loading}
                              onClick={() => handleToggleSeat(seatItem)}
                              className={`seat-btn ${seatClass}`}
                            >
                              {seatItem.seatNumber}
                            </button>
                          </span>
                        </OverlayTrigger>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Seat Colors Legend */}
            <div className="d-flex justify-content-center flex-wrap gap-4 mt-5 pt-3 border-top border-secondary border-opacity-25">
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#00f2fe' }}></div>
                <strong className="text-info">Seleccionada ({selectedSeats.length})</strong>
              </div>
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#10b981' }}></div>
                <strong className="text-light">Disponible ({totalAvailable})</strong>
              </div>
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#f59e0b' }}></div>
                <strong className="text-light">Reservado ({totalReserved})</strong>
              </div>
              <div className="d-flex align-items-center gap-2">
                <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#334155' }}></div>
                <strong className="text-light">Vendido ({totalSold})</strong>
              </div>
            </div>
          </Card>
        </Col>

        {/* Sidebar Info & Selection Card */}
        <Col xs={12} lg={4}>
          <div className="d-flex flex-column gap-3">
            {/* Active Sector Summary */}
            <Card className="card-custom p-4 border-info border-opacity-50">
              <h4 className="fw-bold text-white mb-1">{activeSector?.name}</h4>
              <h2 className="fw-black text-info my-2">
                $ {Number(activeSector?.price || 0).toLocaleString('es-AR')}
              </h2>
              <p className="text-light mb-0">{totalAvailable} butacas disponibles en este sector</p>
            </Card>

            {/* Multi-seat instructions */}
            <Card className="p-4 rounded-4" style={{ backgroundColor: 'rgba(0, 242, 254, 0.08)', border: '1px solid rgba(0, 242, 254, 0.3)' }}>
              <div className="d-flex align-items-center gap-2 text-info mb-2">
                <i className="bi bi-collection-fill fs-3"></i>
                <h5 className="fw-bold mb-0">Selección Múltiple</h5>
              </div>
              <p className="text-light mb-0" style={{ fontSize: '0.92rem', lineHeight: 1.5 }}>
                Podés hacer clic en <strong>múltiples butacas esmeralda</strong> para agregarlas todas juntas a tu carrito y efectuar la compra de una sola vez.
              </p>
            </Card>

            {/* Instruction Callout */}
            <Card className="card-custom p-4 text-center border-dashed border-secondary">
              <i className="bi bi-ticket-perforated fs-1 text-info mb-2"></i>
              <p className="text-light mb-0 fw-bold">
                {selectedSeats.length > 0
                  ? `Tenés ${selectedSeats.length} butaca(s) lista(s) para reservar.`
                  : 'Hacé clic en las butacas para seleccionarlas.'}
              </p>
            </Card>
          </div>
        </Col>
      </Row>

      {/* Floating Bottom Action Bar for Multi-Seat Cart */}
      {selectedSeats.length > 0 && (
        <div
          className="position-fixed bottom-0 start-50 translate-middle-x p-3 w-100"
          style={{ maxWidth: '960px', zIndex: 1050 }}
        >
          <Card className="bg-dark text-white border-info border-2 rounded-4 shadow-lg p-3">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <Badge bg="info" className="text-dark fs-6 fw-extrabold px-3 py-2 me-2">
                  {selectedSeats.length} {selectedSeats.length === 1 ? 'butaca' : 'butacas'}
                </Badge>
                <span className="text-light fw-bold me-3">
                  Total: <span className="text-info fs-4 fw-black">$ {totalSelectedPrice.toLocaleString('es-AR')}</span>
                </span>
                <small className="text-light opacity-75 d-block d-sm-inline">
                  ({selectedSeats.map((s, idx_tk) => `Fila ${s.rowIdentifier}-${s.seatNumber}`).join(', ')})
                </small>
              </div>

              <div className="d-flex gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setSelectedSeats([])}
                  className="text-light border-secondary"
                >
                  Desmarcar todo
                </Button>
                <Button
                  disabled={loading}
                  onClick={handleConfirmBatch}
                  className="btn-cyan px-4 py-2 text-uppercase fw-extrabold"
                >
                  <i className="bi bi-cart-plus-fill me-2"></i>
                  {loading ? 'Reservando...' : `Añadir (${selectedSeats.length}) al Carrito`}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </Container>
  );
};

