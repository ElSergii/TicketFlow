import React, { useState } from 'react';
import { Modal, Button, Form, InputGroup, Card, Row, Col } from 'react-bootstrap';
import axios from 'axios';

export const DepositModal = ({ open, onClose, currentUser, onDepositSuccess }) => {
  const [amount, setAmount] = useState(25000);
  const [loading, setLoading] = useState(false);

  const presets = [10000, 25000, 50000, 100000];

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;

    setLoading(true);
    try {
      const res = await axios.post(`/api/v1/users/${currentUser.id}/deposit`, {
        amount: Number(amount),
      });

      onDepositSuccess(res.data.newBalance, amount);
      onClose();
    } catch (err) {
      console.error(`[CODE-ERROR] - Error al recargar saldo de billetera: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      show={open}
      onHide={onClose}
      centered
      contentClassName="modal-content-dark rounded-4 p-2"
      data-sys-render="auto"
    >
      <Modal.Header closeButton closeVariant="white" className="border-secondary border-opacity-25 pb-3">
        <Modal.Title className="fw-extrabold text-white fs-4 d-flex align-items-center gap-2">
          <i className="bi bi-wallet2 text-success fs-3"></i>
          <span>Cargar Saldo a Billetera Virtual</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="pt-4">
        {/* Current Balance Display */}
        <Card className="card-custom p-3 mb-4 text-center border-success border-opacity-50" style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)' }}>
          <small className="text-secondary fw-bold text-uppercase">Saldo Disponible Actual</small>
          <h2 className="fw-black text-success mt-1 mb-0">
            $ {Number(currentUser?.balance || 0).toLocaleString('es-AR')}
          </h2>
          <small className="text-light opacity-75 mt-1">{currentUser?.name}</small>
        </Card>

        <Form onSubmit={handleDeposit}>
          <Form.Group className="mb-3" controlId="deposit-amount-input">
            <Form.Label htmlFor="deposit-amount-input" className="fw-bold text-white">Monto a Cargar ($)</Form.Label>
            <InputGroup>
              <InputGroup.Text className="bg-dark text-info border-secondary fw-bold">$</InputGroup.Text>
              <Form.Control
                id="deposit-amount-input"
                name="depositAmount"
                type="number"
                min="1000"
                step="1000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="bg-dark text-white border-secondary fs-5 fw-bold"
              />
            </InputGroup>
          </Form.Group>

          {/* Botones de montos predefinidos */}
          <Row className="g-2 mb-4">
            {presets.map((val, index) => (
              <Col key={val || index} xs={6} sm={3}>
                <Button
                  variant={amount === val ? 'success' : 'outline-secondary'}
                  onClick={() => setAmount(val)}
                  className="w-100 fw-bold py-2"
                >
                  +${val / 1000}k
                </Button>
              </Col>
            ))}
          </Row>

          <Button
            type="submit"
            disabled={loading}
            className="btn-cyan w-100 py-3 fw-black tracking-wider text-uppercase"
          >
            <i className="bi bi-plus-circle-fill me-2"></i>
            {loading ? 'ACREDITANDO SALDO...' : `CARGAR $ ${Number(amount || 0).toLocaleString('es-AR')} A MI BILLETERA`}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};
