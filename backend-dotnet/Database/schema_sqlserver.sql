-- ============================================================================
-- BASE DE DATOS: TICKETFLOW (SQL SERVER / T-SQL SCHEMA COMPLETO)
-- Cátedra: Proyecto de Software - Sistema de Venta de Entradas Masivo
-- Soporta: Concurrencia Optimista (Version), Múltiples Perfiles de Usuario, 
-- Billetera Virtual (Balance), Auditoría Inmutable y Trazabilidad ACID.
-- ============================================================================

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'TicketFlowDB')
BEGIN
    CREATE DATABASE TicketFlowDB;
END
GO

USE TicketFlowDB;
GO

-- ----------------------------------------------------------------------------
-- 1. TABLA EVENTS
-- ----------------------------------------------------------------------------
IF OBJECT_ID('dbo.Events', 'U') IS NOT NULL DROP TABLE dbo.Events;
CREATE TABLE dbo.Events (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(255) NOT NULL,
    EventDate DATETIME2 NOT NULL,
    Venue NVARCHAR(255) NOT NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT 'Active', -- 'Active', 'Agotado'
    ImageUrl NVARCHAR(500) NULL,
    BadgeText NVARCHAR(100) NULL
);
GO

-- ----------------------------------------------------------------------------
-- 2. TABLA SECTORS
-- ----------------------------------------------------------------------------
IF OBJECT_ID('dbo.Sectors', 'U') IS NOT NULL DROP TABLE dbo.Sectors;
CREATE TABLE dbo.Sectors (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    EventId INT NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    Price DECIMAL(18, 2) NOT NULL,
    Capacity INT NOT NULL,
    CONSTRAINT FK_Sectors_Events FOREIGN KEY (EventId) REFERENCES dbo.Events(Id) ON DELETE CASCADE
);
GO

-- ----------------------------------------------------------------------------
-- 3. TABLA SEATS (Con campo Version para Optimistic Locking)
-- ----------------------------------------------------------------------------
IF OBJECT_ID('dbo.Seats', 'U') IS NOT NULL DROP TABLE dbo.Seats;
CREATE TABLE dbo.Seats (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    SectorId INT NOT NULL,
    RowIdentifier NVARCHAR(10) NOT NULL,
    SeatNumber INT NOT NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT 'Disponible', -- 'Disponible', 'Reservado', 'Vendida'
    Version INT NOT NULL DEFAULT 1, -- Usado para Optimistic Locking en concurrencia masiva
    CONSTRAINT FK_Seats_Sectors FOREIGN KEY (SectorId) REFERENCES dbo.Sectors(Id) ON DELETE CASCADE
);
GO

CREATE INDEX IX_Seats_Status ON dbo.Seats(Status);
CREATE INDEX IX_Seats_SectorId ON dbo.Seats(SectorId);
GO

-- ----------------------------------------------------------------------------
-- 4. TABLA USERS (Perfiles, Roles y Billetera Virtual)
-- ----------------------------------------------------------------------------
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;
CREATE TABLE dbo.Users (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(150) NOT NULL,
    Email NVARCHAR(255) UNIQUE NOT NULL,
    PasswordHash NVARCHAR(255) NOT NULL,
    Role NVARCHAR(50) NOT NULL DEFAULT 'Customer', -- 'Customer', 'Admin'
    Balance DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    AvatarUrl NVARCHAR(500) NULL
);
GO

-- ----------------------------------------------------------------------------
-- 5. TABLA RESERVATIONS (Bloqueo Temporal de 5 Minutos)
-- ----------------------------------------------------------------------------
IF OBJECT_ID('dbo.Reservations', 'U') IS NOT NULL DROP TABLE dbo.Reservations;
CREATE TABLE dbo.Reservations (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId INT NULL,
    SeatId UNIQUEIDENTIFIER NOT NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Paid', 'Expired', 'Cancelled'
    ReservedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ExpiresAt DATETIME2 NOT NULL,
    CONSTRAINT FK_Reservations_Seats FOREIGN KEY (SeatId) REFERENCES dbo.Seats(Id) ON DELETE CASCADE,
    CONSTRAINT FK_Reservations_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(Id)
);
GO

-- ----------------------------------------------------------------------------
-- 6. TABLA AUDIT_LOGS (Auditoría Inmutable Legible)
-- ----------------------------------------------------------------------------
IF OBJECT_ID('dbo.AuditLogs', 'U') IS NOT NULL DROP TABLE dbo.AuditLogs;
CREATE TABLE dbo.AuditLogs (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId INT NULL,
    UserName NVARCHAR(150) NULL,
    Action NVARCHAR(100) NOT NULL, -- RESERVE_ATTEMPT, RESERVE_SUCCESS, RESERVE_FAILED_CONCURRENCY, PAYMENT_SUCCESS, EXPIRED_RELEASE, BALANCE_DEPOSIT, EVENT_CREATED
    EntityType NVARCHAR(50) NOT NULL, -- Seat, Reservation, Payment, Wallet, Event
    EntityId NVARCHAR(255) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Details NVARCHAR(MAX) NOT NULL, -- Metadatos JSON de soporte
    AmountSpent DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    UserBalanceAfter DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
    CreatedAt DATETIME2(3) NOT NULL DEFAULT GETUTCDATE()
);
GO

CREATE INDEX IX_AuditLogs_CreatedAt ON dbo.AuditLogs(CreatedAt DESC);
CREATE INDEX IX_AuditLogs_UserId ON dbo.AuditLogs(UserId);
GO

-- ============================================================================
-- DATOS DE SEMILLA (SEED DATA SQL SERVER)
-- ============================================================================

-- Insertar Usuarios Demo
INSERT INTO dbo.Users (Name, Email, PasswordHash, Role, Balance, AvatarUrl) 
VALUES 
(N'Juan Pérez', 'juan@ticketflow.com', 'hash_juan_123', 'Customer', 50000.00, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop'),
(N'María García', 'maria@ticketflow.com', 'hash_maria_123', 'Customer', 100000.00, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop'),
(N'Admin Productora', 'admin@ticketflow.com', 'hash_admin_123', 'Admin', 0.00, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop');

-- Insertar Eventos
INSERT INTO dbo.Events (Name, EventDate, Venue, Status, BadgeText, ImageUrl)
VALUES 
(N'Arctic Monkeys — The Car Tour', '2026-11-14 21:00:00', N'Estadio River Plate, Buenos Aires', N'Active', N'Rock', 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=800&auto=format&fit=crop'),
(N'Tame Impala — The Slow Rush', '2026-12-05 22:00:00', N'Movistar Arena, Buenos Aires', N'Active', N'Psychedelic', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop'),
(N'Gorillaz — Cracker Island Live', '2027-01-20 21:30:00', N'Tecnópolis, Buenos Aires', N'Active', N'Alternative', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop'),
(N'Radiohead — A Moon Shaped Pool', '2026-10-30 20:00:00', N'Estadio Obras, Buenos Aires', N'Agotado', N'Art Rock', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop');

-- Helper de Generación de Sectores y 100 Butacas Numeradas por Evento
DECLARE @EventTameImpalaId INT;
SELECT @EventTameImpalaId = Id FROM dbo.Events WHERE Name LIKE '%Tame Impala%';

INSERT INTO dbo.Sectors (EventId, Name, Price, Capacity) VALUES (@EventTameImpalaId, N'Campo', 22000.00, 50);
DECLARE @SectorCampoId INT = SCOPE_IDENTITY();

INSERT INTO dbo.Sectors (EventId, Name, Price, Capacity) VALUES (@EventTameImpalaId, N'Platea', 35000.00, 50);
DECLARE @SectorPlateaId INT = SCOPE_IDENTITY();

-- Butacas para Campo (Filas A-E, 10 por fila)
DECLARE @RowLetters TABLE (RowName NVARCHAR(5));
INSERT INTO @RowLetters VALUES ('A'), ('B'), ('C'), ('D'), ('E');

DECLARE @CurrentRow NVARCHAR(5);
DECLARE @CurrentSeat INT;

DECLARE row_cursor CURSOR FOR SELECT RowName FROM @RowLetters;
OPEN row_cursor;
FETCH NEXT FROM row_cursor INTO @CurrentRow;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @CurrentSeat = 1;
    WHILE @CurrentSeat <= 10
    BEGIN
        INSERT INTO dbo.Seats (SectorId, RowIdentifier, SeatNumber, Status, Version)
        VALUES (@SectorCampoId, @CurrentRow, @CurrentSeat, 'Disponible', 1);
        SET @CurrentSeat = @CurrentSeat + 1;
    END
    FETCH NEXT FROM row_cursor INTO @CurrentRow;
END
CLOSE row_cursor;
DEALLOCATE row_cursor;

-- Butacas para Platea (Filas F-J, 10 por fila)
DELETE FROM @RowLetters;
INSERT INTO @RowLetters VALUES ('F'), ('G'), ('H'), ('I'), ('J');

OPEN row_cursor;
FETCH NEXT FROM row_cursor INTO @CurrentRow;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @CurrentSeat = 1;
    WHILE @CurrentSeat <= 10
    BEGIN
        INSERT INTO dbo.Seats (SectorId, RowIdentifier, SeatNumber, Status, Version)
        VALUES (@SectorPlateaId, @CurrentRow, @CurrentSeat, 'Disponible', 1);
        SET @CurrentSeat = @CurrentSeat + 1;
    END
    FETCH NEXT FROM row_cursor INTO @CurrentRow;
END
CLOSE row_cursor;
DEALLOCATE row_cursor;

PRINT 'Esquema de SQL Server TicketFlowDB precargado exitosamente con 100% de características.';
GO
