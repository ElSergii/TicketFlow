# TicketFlow - Sistema de Venta de Entradas

TicketFlow es una aplicación web para la venta de entradas a eventos y conciertos en tiempo real. Permite seleccionar asientos, realizar reservas temporales de 5 minutos, recargar saldo en una billetera virtual y llevar un registro de compras y movimientos.

## Tecnologías

- **Frontend**: React, Vite, Bootstrap, Axios.
- **Backend**: Node.js (Express) / .NET (C#).
- **Base de datos**: SQLite para desarrollo local y script para SQL Server (`schema_sqlserver.sql`).

## Cómo ejecutar el proyecto

### Backend (Node.js)
```bash
cd backend
npm install
npm start
```
El servidor backend se inicia en `http://localhost:4000`.

*(Si querés usar la versión de .NET, podés abrir `backend-dotnet/TicketFlow.sln` en Visual Studio)*

### Frontend (React)
```bash
cd frontend
npm install
npm run dev
```
La aplicación web se inicia en `http://localhost:3000`.

## Funcionalidades principales

- **Selección de butacas**: Visualización de mapa de asientos por sector (Campo y Platea).
- **Reserva temporal**: Bloqueo del asiento seleccionado durante 5 minutos para completar el pago.
- **Control de concurrencia**: Evita que dos usuarios puedan reservar o comprar la misma entrada al mismo tiempo.
- **Billetera virtual**: Permite cambiar de usuario y recargar saldo para realizar las compras.
- **Panel de administración**: Creación de nuevos eventos y configuración de entradas.
- **Historial de auditoría**: Registro detallado de reservas, pagos y liberaciones.
