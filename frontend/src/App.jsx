import React, { useState, useEffect } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import axios from 'axios';
import './bootstrap-custom.css';
import { Header } from './components/Header';
import { EventCatalog } from './components/EventCatalog';
import { SeatMap } from './components/SeatMap';
import { CartModal } from './components/CartModal';
import { ConfirmationScreen } from './components/ConfirmationScreen';
import { AuditDrawer } from './components/AuditDrawer';
import { AdminView } from './components/AdminView';
import { DepositModal } from './components/DepositModal';

export function App() {
  const [currentView, setCurrentView] = useState('catalog'); // 'catalog' | 'seatmap' | 'confirmation' | 'admin'
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [seatMapData, setSeatMapData] = useState(null);
  const [loadingSeats, setLoadingSeats] = useState(false);

  // Users & Profiles State
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Modals & Drawers State
  const [userCarts, setUserCarts] = useState({}); // Cart map by userId: { 1: [...], 2: [...] }
  const [purchasedTickets, setPurchasedTickets] = useState([]);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Active cart items for current selected user profile
  const currentUserId = currentUser?.id || 1;
  const cartItems = userCarts[currentUserId] || [];

  const updateCartForUser = (userId, newItemsOrFn) => {
    setUserCarts((prev) => {
      const prevItems = prev[userId] || [];
      const updated = typeof newItemsOrFn === 'function' ? newItemsOrFn(prevItems) : newItemsOrFn;
      return { ...prev, [userId]: updated };
    });
  };

  // Countdown timer (5 minutes = 300s)
  const [countdownSeconds, setCountdownSeconds] = useState(300);

  // Bootstrap Toast State con Duración Corta (3.5s) y Botón de Cierre 'X'
  const [toast, setToast] = useState({ open: false, message: '', bg: 'info', duration: 3500 });

  const showToast = (message, bg = 'info', duration = 3500) => {
    setToast({ open: true, message, bg, duration });
  };

  const handleCloseToast = () => {
    setToast((prev) => ({ ...prev, open: false }));
  };

  // Fetch users list
  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/v1/users');
      const uList = res.data || [];
      setUsers(uList);
      if (!currentUser && uList.length > 0) {
        setCurrentUser(uList[0]); // Default to Juan Pérez
      }
    } catch (err) {
      console.error(`[CODE-ERROR] - Error al cargar usuarios: ${err.message}`);
    }
  };

  // Fetch events list
  const fetchEvents = async () => {
    try {
      const res = await axios.get('/api/v1/events');
      setEvents(res.data || []);
    } catch (err) {
      console.error(`[CODE-ERROR] - Error al cargar catálogo de eventos: ${err.message}`);
    }
  };

  // Fetch seat map details for selected event
  const fetchSeatMap = async (eventId) => {
    setLoadingSeats(true);
    try {
      const res = await axios.get(`/api/v1/events/${eventId}/seats`);
      setSeatMapData(res.data);
    } catch (err) {
      console.error(`[CODE-ERROR] - Error al consultar plano de butacas: ${err.message}`);
      showToast('No se pudo cargar el plano de asientos.', 'danger');
    } finally {
      setLoadingSeats(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchEvents();
  }, []);

  // Switch User & Role handler
  const handleSwitchUser = (user) => {
    setCurrentUser(user);
    if (user.role === 'Admin') {
      setCurrentView('admin');
      showToast(`¡Modo Administrador activado (${user.name})! Panel de gestión de eventos.`, 'primary');
    } else {
      if (currentView === 'admin') setCurrentView('catalog');
      const targetUserCart = userCarts[user.id] || [];
      const cartInfo = targetUserCart.length > 0 ? ` (${targetUserCart.length} entradas en tu carrito)` : '';
      showToast(`¡Perfil cambiado a ${user.name}! Saldo disponible: $ ${Number(user.balance).toLocaleString('es-AR')}${cartInfo}`, 'success');
    }
  };

  // Deposit Success handler
  const handleDepositSuccess = (newBalance, amount) => {
    setCurrentUser((prev) => ({ ...prev, balance: newBalance }));
    fetchUsers();
    showToast(`¡Recarga exitosa! Se acreditaron +$ ${Number(amount).toLocaleString('es-AR')} a tu billetera. Saldo actual: $ ${Number(newBalance).toLocaleString('es-AR')}`, 'success');
  };

  // Timer Effect (5 minutes count down)
  useEffect(() => {
    let interval = null;
    if (cartItems.length > 0 && countdownSeconds > 0) {
      interval = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            updateCartForUser(currentUserId, []);
            setCartModalOpen(false);
            showToast('El tiempo de reserva (5 min) ha expirado.', 'warning');
            if (selectedEvent) fetchSeatMap(selectedEvent.id);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cartItems, countdownSeconds, currentUserId, selectedEvent]);

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleSelectEvent = (evt) => {
    setSelectedEvent(evt);
    fetchSeatMap(evt.id);
    setCurrentView('seatmap');
  };

  // Reserva masiva por lote
  const handleReserveBatch = async (seatsList) => {
    if (!seatsList || seatsList.length === 0) return;
    setLoadingSeats(true);

    try {
      const res = await axios.post('/api/v1/reservations/batch', {
        seatIds: seatsList.map((s) => s.id),
        userId: currentUserId,
      });

      const { reservations } = res.data;
      const newItems = (reservations || []).map((r, idx_tk) => ({
        reservationId: r.id,
        seatId: r.seatId,
        rowIdentifier: r.rowIdentifier,
        seatNumber: r.seatNumber,
        sectorName: r.sectorName || 'Sector',
        price: r.price || 22000,
      }));

      updateCartForUser(currentUserId, (prev) => {
        const existingIds = new Set(prev.map((i) => i.reservationId));
        const filteredNew = newItems.filter((i) => !existingIds.has(i.reservationId));
        return [...prev, ...filteredNew];
      });

      setCountdownSeconds(300);
      showToast(`¡${newItems.length} butaca(s) reservada(s) por 5 minutos y agregada(s) al carrito!`, 'success');

      if (selectedEvent) fetchSeatMap(selectedEvent.id);
      setCartModalOpen(true);
    } catch (err) {
      if (err.response && err.response.status === 409) {
        showToast(err.response?.data?.error || 'Una o más butacas ya no están disponibles.', 'danger');
        if (selectedEvent) fetchSeatMap(selectedEvent.id);
      } else {
        console.error(`[CODE-ERROR] - Error al realizar reserva masiva: ${err.message}`);
        showToast('Ocurrió un error al procesar las reservas.', 'danger');
      }
    } finally {
      setLoadingSeats(false);
    }
  };

  const handleReserveSeat = async (seat) => {
    await handleReserveBatch([seat]);
  };

  const handleRemoveCartItem = async (itemToRemove) => {
    try {
      if (itemToRemove?.reservationId) {
        await axios.delete(`/api/v1/reservations/${itemToRemove.reservationId}`);
      }
    } catch (err) {
      console.error(`[CODE-ERROR] - Error al liberar reserva ${itemToRemove?.reservationId}: ${err.message}`);
    }

    const updated = cartItems.filter((i) => i.reservationId !== itemToRemove.reservationId);
    updateCartForUser(currentUserId, updated);
    if (updated.length === 0) {
      setCartModalOpen(false);
      showToast('Reserva vacía. Se liberó la butaca.', 'info');
    } else {
      showToast('Butaca removida del carrito y liberada.', 'info');
    }
    if (selectedEvent) fetchSeatMap(selectedEvent.id);
  };


  const handleConfirmPayment = async () => {
    if (cartItems.length === 0) return;
    setPaymentLoading(true);

    try {
      const res = await axios.post('/api/v1/payments/batch', {
        reservationIds: cartItems.map((i) => i.reservationId),
        userId: currentUserId,
        paymentMethod: 'DEBITO_BILLETERA_VIRTUAL',
      });

      if (res.data?.newBalance !== undefined) {
        setCurrentUser((prev) => ({ ...prev, balance: res.data.newBalance }));
        fetchUsers();
      }

      setPurchasedTickets(res.data?.tickets || []);
      updateCartForUser(currentUserId, []);
      setCartModalOpen(false);
      setCurrentView('confirmation');
      showToast(`¡Pago de ${res.data?.tickets?.length || cartItems.length} entradas procesado con éxito!`, 'success');
    } catch (err) {
      console.error(`[CODE-ERROR] - Error al confirmar el pago masivo: ${err.message}`);
      showToast(err.response?.data?.error || 'Error al procesar el pago.', 'danger');
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex flex-column" data-sys-render="auto">
      <Header
        users={users}
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        onOpenDeposit={() => setDepositModalOpen(true)}
        cartCount={cartItems.length}
        onOpenCart={() => setCartModalOpen(true)}
        onOpenAudit={() => setAuditDrawerOpen(true)}
        countdownFormatted={formatCountdown(countdownSeconds)}
      />

      <main className="flex-grow-1">
        {currentView === 'catalog' && (
          <EventCatalog events={events} onSelectEvent={handleSelectEvent} />
        )}

        {currentView === 'seatmap' && seatMapData && (
          <SeatMap
            eventData={seatMapData}
            onBack={() => setCurrentView('catalog')}
            onReserveSeat={handleReserveSeat}
            onReserveBatch={handleReserveBatch}
            loading={loadingSeats}
          />
        )}

        {currentView === 'confirmation' && (
          <ConfirmationScreen
            onReturnCatalog={() => {
              fetchEvents();
              setCurrentView('catalog');
            }}
            tickets={purchasedTickets}
            ticketCount={purchasedTickets.length || 1}
          />
        )}

        {currentView === 'admin' && (
          <AdminView
            events={events}
            onEventCreated={fetchEvents}
            showToast={showToast}
          />
        )}
      </main>

      {/* Cart Modal */}
      <CartModal
        open={cartModalOpen}
        onClose={() => setCartModalOpen(false)}
        cartItems={cartItems}
        onRemoveItem={handleRemoveCartItem}
        onConfirmPayment={handleConfirmPayment}
        countdownFormatted={formatCountdown(countdownSeconds)}
        countdownSeconds={countdownSeconds}
        loading={paymentLoading}
        currentUser={currentUser}
        onOpenDeposit={() => setDepositModalOpen(true)}
      />

      {/* Deposit / Recarga Modal */}
      {currentUser && (
        <DepositModal
          open={depositModalOpen}
          onClose={() => setDepositModalOpen(false)}
          currentUser={currentUser}
          onDepositSuccess={handleDepositSuccess}
        />
      )}

      {/* Real-time Human Readable Audit Log Drawer */}
      <AuditDrawer
        open={auditDrawerOpen}
        onClose={() => setAuditDrawerOpen(false)}
        currentUser={currentUser}
      />

      {/* Global Bootstrap Toast con Duración Corta (3.5s) y Botón de Cierre 'X' Prominente */}
      <ToastContainer position="bottom-end" className="p-3" style={{ zIndex: 9999 }}>
        <Toast
          show={toast.open}
          onClose={handleCloseToast}
          bg={toast.bg}
          delay={toast.duration || 3500}
          autohide
          className="text-white border-0 rounded-3 shadow-lg"
        >
          <Toast.Header closeButton closeVariant="white" className="bg-dark text-white border-bottom border-secondary border-opacity-25">
            <strong className="me-auto font-bold">Notificación TicketFlow</strong>
          </Toast.Header>
          <Toast.Body className="fw-semibold fs-6">
            {toast.message}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
}
