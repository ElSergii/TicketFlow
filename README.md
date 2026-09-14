# TicketFlow - Sistema de Venta de Entradas Masivo

TicketFlow es una aplicación web responsiva (adaptada para celulares y computadoras) para la venta de entradas a eventos y conciertos en tiempo real. Permite seleccionar asientos, realizar reservas temporales de 5 minutos, recargar saldo en una billetera virtual y llevar un registro de compras y movimientos.

## Tecnologías

- **Frontend**: React, Vite, Bootstrap 5 (Custom Dark Cyberpunk Theme), Axios.
- **Backend**: Node.js (Express) / .NET 9 (C#).
- **Base de datos**: Soporte dual para **Microsoft SQL Server** y SQLite local (`backend-dotnet/Database/base_de_datos.sql`).

## Adaptación para Dispositivos Móviles (Celulares)

- **Plano de Asientos Responsivo**: El mapa de butacas cuenta con desplazamiento horizontal fluido (`seat-map-scroll-container`) para interactuar con todas las filas en celulares sin deformar la pantalla.
- **Barra de Navegación Responsiva**: Menú colapsable con accesibilidad táctil para selector de usuarios, saldo de billetera virtual y carrito.
- **Barra Flotante de Compra**: Ajustada con botones táctiles para móviles.

## Conexión a Microsoft SQL Server

### En Backend Node.js
Configurar las variables de entorno en `backend/.env` (podés basarte en `backend/.env.example`):
```env
DB_DIALECT=mssql
DB_HOST=localhost
DB_PORT=1433
DB_NAME=TicketFlow_DB
DB_INSTANCE_NAME=SQLEXPRESS
```
*Si no se especifican las variables de SQL Server, el sistema utiliza SQLite automáticamente.*

### En Backend .NET
En `backend-dotnet/appsettings.json`:
```json
{
  "UseSqlServer": true,
  "ConnectionStrings": {
    "SqlServer": "Server=.\\SQLEXPRESS;Database=TicketFlow_DB;Trusted_Connection=True;TrustServerCertificate=True;"
  }
}
```

## Cómo ejecutar el proyecto

### Backend (Node.js)
```bash
cd backend
npm install
npm start
```
El servidor backend se inicia en `http://localhost:4000`.

### Backend (.NET)
```bash
cd backend-dotnet
dotnet run --project TicketFlow.Api.csproj
```

### Frontend (React)
```bash
cd frontend
npm install
npm run dev
```
La aplicación web se inicia en `http://localhost:3000`.

