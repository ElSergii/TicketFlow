# 🎟️ TicketFlow — Sistema de Venta de Entradas

TicketFlow es una plataforma web para la venta de entradas en tiempo real. Cuenta con control de concurrencia para evitar compras dobles de la misma entrada, reserva temporal de 5 minutos, billetera virtual con recarga de saldo, registro de auditoría de operaciones y un diseño web moderno y responsivo desarrollado con **React** y **Node.js / .NET**.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React 18, Vite, Bootstrap, React-Bootstrap, Bootstrap Icons, Axios, Canvas Confetti.
- **Backend (Node.js)**: Express.js (API REST), Sequelize ORM, Swagger UI (`/api-docs`).
- **Backend (.NET)**: C# / .NET 9 Web API, Entity Framework Core, Kestrel.
- **Base de Datos**: 
  - **SQLite**: Para ejecución rápida y desarrollo local.
  - **SQL Server**: Script T-SQL completo ubicado en `./backend/database/schema_sqlserver.sql`.
- **Concurrencia**: Control mediante versión (`Version`) en cada entrada (Optimistic Locking) y transacciones ACID.
- **Proceso de Fondo**: Job automático que libera las reservas vencidas después de 5 minutos.
- **Auditoría**: Historial inmutable de compras, reservas y recargas de saldo.

---

## 🚀 Cómo Ejecutar el Proyecto

### 1. Backend (Node.js / Express)
```bash
cd backend
npm install
npm start
```
- API REST en: `http://localhost:4000`
- Documentación Swagger: `http://localhost:4000/api-docs`

*(Opcional: Si preferís la versión .NET, podés abrir `backend-dotnet/TicketFlow.sln` en Visual Studio o ejecutar `dotnet run` dentro de `backend-dotnet`)*

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
- Aplicación web disponible en: `http://localhost:3000`

---

## 🗄️ Estructura de Base de Datos (`TicketFlowDB`)

El script de SQL Server (`schema_sqlserver.sql`) crea las siguientes tablas:
- **Events**: Información de los shows (nombre, fecha, lugar, estado).
- **Sectors**: Sectores del estadio o teatro (Campo, Platea) con sus precios.
- **Seats**: Butacas con control de versión para concurrencia.
- **Users**: Usuarios, perfiles (Cliente, Admin) y saldo disponible en la billetera.
- **Reservations**: Reservas temporales con fecha y hora de vencimiento (5 minutos).
- **AuditLogs**: Registro de movimientos y operaciones realizadas en el sistema.

---

## 🧪 Ejemplo de Prueba de Concurrencia

1. Abrí la aplicación en dos pestañas del navegador en `http://localhost:3000`.
2. Ingresá al evento **Tame Impala — The Slow Rush**.
3. Seleccioná la misma butaca (ejemplo: Fila A - N° 1) en ambas pestañas al mismo tiempo.
4. **Resultado**: La primera pestaña confirmará la reserva por 5 minutos. La segunda pestaña mostrará el aviso *"Asiento ya no disponible"*.
5. En el panel de **Auditoría** (botón superior) podés ver el registro de ambos intentos en tiempo real.
