import React from 'react';
import { Navbar, Container, Button, Badge, Dropdown } from 'react-bootstrap';

export const Header = ({
  users,
  currentUser,
  onSwitchUser,
  onOpenDeposit,
  cartCount,
  onOpenCart,
  onOpenAudit,
  countdownFormatted,
}) => {
  const isAdmin = currentUser?.role === 'Admin';

  return (
    <Navbar expand="lg" variant="dark" className="navbar-custom sticky-top py-2" data-sys-render="auto">
      <Container fluid="xl">
        {/* Brand Logo */}
        <Navbar.Brand className="d-flex align-items-center gap-2">
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #00f2fe 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(0, 242, 254, 0.4)',
            }}
          >
            <i className="bi bi-ticket-perforated-fill text-dark fs-5"></i>
          </div>
          <div>
            <span
              className="fw-extrabold fs-4 tracking-wider"
              style={{
                background: 'linear-gradient(90deg, #ffffff 0%, #00f2fe 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'block',
                lineHeight: 1.1,
              }}
            >
              TICKETFLOW
            </span>
            <small className="text-secondary fw-bold" style={{ fontSize: '0.75rem' }}>
              {isAdmin ? '🛡️ VISTA ADMINISTRADOR' : '👤 VISTA CLIENTE'}
            </small>
          </div>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end gap-3 mt-2 mt-lg-0">
          {/* Virtual Wallet Balance & Top-up Button */}
          {!isAdmin && currentUser && (
            <div className="d-flex align-items-center gap-2">
              <div
                className="d-flex align-items-center gap-2 px-3 py-1.5 rounded-3"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#10b981',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                }}
              >
                <i className="bi bi-wallet2 text-success"></i>
                <span>Mi Saldo: $ {Number(currentUser.balance || 0).toLocaleString('es-AR')}</span>
              </div>

              <Button
                variant="success"
                size="sm"
                onClick={onOpenDeposit}
                className="fw-extrabold d-flex align-items-center gap-1 rounded-3 px-2.5 py-1.5"
                title="Cargar dinero a mi billetera virtual"
              >
                <i className="bi bi-plus-circle-fill"></i>
                <span>Cargar Saldo</span>
              </Button>
            </div>
          )}

          {/* User Selector Dropdown */}
          <Dropdown>
            <Dropdown.Toggle
              variant="dark"
              id="dropdown-user-select"
              className="d-flex align-items-center gap-2 border-secondary bg-dark text-white fw-bold rounded-3"
            >
              <img
                src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde'}
                alt="avatar"
                className="rounded-circle"
                style={{ width: '22px', height: '22px', objectFit: 'cover' }}
              />
              <span>{currentUser?.name || 'Usuario'} ({currentUser?.role === 'Admin' ? 'Admin' : 'Cliente'})</span>
            </Dropdown.Toggle>

            <Dropdown.Menu variant="dark" className="bg-dark border-secondary">
              {/* Lista de usuarios disponles */}
              {users.map((usr, index) => (
                <Dropdown.Item
                  key={usr.id || index}
                  onClick={() => onSwitchUser(usr)}
                  className="d-flex align-items-center gap-2 py-2 fw-semibold"
                >
                  <img
                    src={usr.avatarUrl}
                    alt={usr.name}
                    className="rounded-circle"
                    style={{ width: '24px', height: '24px', objectFit: 'cover' }}
                  />
                  <span>
                    {usr.name} {usr.role === 'Admin' ? '🛡️ (Admin)' : '👤 (Cliente)'}
                  </span>
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>

          {/* Action Buttons */}
          <Button
            variant="outline-light"
            onClick={onOpenAudit}
            className="d-flex align-items-center gap-2 border-secondary fw-bold rounded-3"
          >
            <i className="bi bi-database text-info"></i>
            <span>Auditoría</span>
          </Button>

          {!isAdmin && (
            <Button
              className="btn-cyan d-flex align-items-center gap-2"
              onClick={onOpenCart}
            >
              <i className="bi bi-cart-check-fill fs-5"></i>
              <span>Carrito</span>
              {cartCount > 0 && (
                <Badge bg="danger" pill className="ms-1 fs-6">
                  {cartCount} ({countdownFormatted})
                </Badge>
              )}
            </Button>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};
