using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TicketFlow.Api.Data;
using TicketFlow.Api.Models;

namespace TicketFlow.Api.Controllers;

[ApiController]
[Route("api/v1/reservations")]
public class ReservationsController : ControllerBase
{
    private readonly TicketFlowDbContext _db;
    private readonly ILogger<ReservationsController> _logger;

    public ReservationsController(TicketFlowDbContext db, ILogger<ReservationsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> CreateReservation([FromBody] CreateReservationRequest req)
    {
        if (req.SeatId == Guid.Empty)
        {
            return BadRequest(new { error = "El ID de la butaca (seatId) es obligatorio." });
        }

        using var transaction = await _db.Database.BeginTransactionAsync();

        try
        {
            int targetUserId = req.UserId ?? 1;
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == targetUserId);
            var userName = user?.Name ?? "Cliente Demo";

            // 1. Obtener asiento
            var seat = await _db.Seats
                .Include(s => s.Sector)
                .FirstOrDefaultAsync(s => s.Id == req.SeatId);

            if (seat == null)
            {
                await transaction.RollbackAsync();
                return NotFound(new { error = "La butaca no existe." });
            }

            // Grabar intento de reserva en el audit log (Legible, SIN código JSON)
            _db.AuditLogs.Add(new AuditLog
            {
                UserId = targetUserId,
                UserName = userName,
                Action = "RESERVE_ATTEMPT",
                EntityType = "Seat",
                EntityId = seat.Id.ToString(),
                Description = $"Intento de reserva para la butaca Fila {seat.RowIdentifier} N° {seat.SeatNumber} en sector {seat.Sector?.Name ?? "General"}.",
                AmountSpent = 0.00m,
                UserBalanceAfter = user?.Balance ?? 0.00m,
                CreatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();

            // 2. Control de Concurrencia Optimista: Verificar si la butaca ya la tiene el mismo usuario en reserva pendiente
            var existingUserRes = await _db.Reservations.FirstOrDefaultAsync(r =>
                r.SeatId == req.SeatId &&
                r.UserId == targetUserId &&
                r.Status == "Pending" &&
                r.ExpiresAt > DateTime.UtcNow);

            Reservation reservation;

            if (existingUserRes != null)
            {
                reservation = existingUserRes;
            }
            else
            {
                if (seat.Status != "Disponible")
                {
                    _db.AuditLogs.Add(new AuditLog
                    {
                        UserId = targetUserId,
                        UserName = userName,
                        Action = "RESERVE_FAILED_CONCURRENCY",
                        EntityType = "Seat",
                        EntityId = seat.Id.ToString(),
                        Description = $"Fallo de concurrencia: La butaca Fila {seat.RowIdentifier} N° {seat.SeatNumber} ya fue reservada o comprada por otro usuario.",
                        AmountSpent = 0.00m,
                        UserBalanceAfter = user?.Balance ?? 0.00m,
                        CreatedAt = DateTime.UtcNow
                    });

                    await _db.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return Conflict(new { error = $"La butaca Fila {seat.RowIdentifier} N° {seat.SeatNumber} ya fue reservada o comprada por otro usuario." });
                }

                // 3. Modificar estado e incrementar versión (Optimistic Lock token)
                seat.Status = "Reservado";
                seat.Version += 1;

                var expiresAt = DateTime.UtcNow.AddMinutes(5);
                reservation = new Reservation
                {
                    UserId = targetUserId,
                    SeatId = seat.Id,
                    Status = "Pending",
                    ReservedAt = DateTime.UtcNow,
                    ExpiresAt = expiresAt
                };

                _db.Reservations.Add(reservation);
            }

            // Grabar auditoría de éxito legible
            _db.AuditLogs.Add(new AuditLog
            {
                UserId = targetUserId,
                UserName = userName,
                Action = "RESERVE_SUCCESS",
                EntityType = "Reservation",
                EntityId = reservation.Id.ToString(),
                Description = $"Reserva bloqueada con éxito por 5 minutos para Fila {seat.RowIdentifier} N° {seat.SeatNumber} (${seat.Sector?.Price:N0}).",
                AmountSpent = 0.00m,
                UserBalanceAfter = user?.Balance ?? 0.00m,
                CreatedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Created(string.Empty, new
            {
                message = "Reserva realizada con éxito en .NET.",
                reservation = new
                {
                    id = reservation.Id,
                    seatId = seat.Id,
                    rowIdentifier = seat.RowIdentifier,
                    seatNumber = seat.SeatNumber,
                    sectorName = seat.Sector?.Name ?? "Sector",
                    price = seat.Sector?.Price ?? 22000.00m,
                    status = reservation.Status,
                    reservedAt = reservation.ReservedAt,
                    expiresAt = reservation.ExpiresAt,
                    ttlSeconds = 300
                }
            });
        }
        catch (DbUpdateConcurrencyException ex)
        {
            await transaction.RollbackAsync();
            _logger.LogWarning($"[CODE-ERROR] - Conflicto de concurrencia EF Core al reservar asiento {req.SeatId}: {ex.Message}");

            _db.AuditLogs.Add(new AuditLog
            {
                UserId = req.UserId,
                UserName = "Usuario",
                Action = "RESERVE_FAILED_CONCURRENCY",
                EntityType = "Seat",
                EntityId = req.SeatId.ToString(),
                Description = "Conflicto de concurrencia optimista (Optimistic Lock Conflict): Dos usuarios intentaron reservar la misma ubicación al mismo tiempo.",
                CreatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();

            return Conflict(new { error = "Asiento ya no disponible. Otro usuario completó la reserva en el mismo instante." });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError($"[CODE-ERROR] - Error al procesar reserva de asiento {req.SeatId}: {ex.Message}");
            return StatusCode(500, new { error = "Error interno al procesar la reserva." });
        }
    }

    [HttpPost("batch")]
    public async Task<IActionResult> CreateBatchReservations([FromBody] BatchReservationRequest req)
    {
        if (req.SeatIds == null || req.SeatIds.Count == 0)
        {
            return BadRequest(new { error = "Debe proporcionar al menos un ID de butaca." });
        }

        using var transaction = await _db.Database.BeginTransactionAsync();

        try
        {
            int targetUserId = req.UserId ?? 1;
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == targetUserId);
            var userName = user?.Name ?? "Cliente Demo";
            var createdReservations = new List<object>();

            for (int idx_tk = 0; idx_tk < req.SeatIds.Count; idx_tk++)
            {
                var currentSeatId = req.SeatIds[idx_tk];
                var seat = await _db.Seats
                    .Include(s => s.Sector)
                    .FirstOrDefaultAsync(s => s.Id == currentSeatId);

                if (seat == null)
                {
                    await transaction.RollbackAsync();
                    return NotFound(new { error = "Una de las butacas no existe." });
                }

                var existingUserRes = await _db.Reservations.FirstOrDefaultAsync(r =>
                    r.SeatId == currentSeatId &&
                    r.UserId == targetUserId &&
                    r.Status == "Pending" &&
                    r.ExpiresAt > DateTime.UtcNow);

                Reservation reservation;

                if (existingUserRes != null)
                {
                    reservation = existingUserRes;
                }
                else
                {
                    if (seat.Status != "Disponible")
                    {
                        await transaction.RollbackAsync();
                        return Conflict(new { error = $"La butaca Fila {seat.RowIdentifier} N° {seat.SeatNumber} ya fue reservada o comprada por otro usuario." });
                    }

                    seat.Status = "Reservado";
                    seat.Version += 1;

                    var expiresAt = DateTime.UtcNow.AddMinutes(5);
                    reservation = new Reservation
                    {
                        UserId = targetUserId,
                        SeatId = seat.Id,
                        Status = "Pending",
                        ReservedAt = DateTime.UtcNow,
                        ExpiresAt = expiresAt
                    };

                    _db.Reservations.Add(reservation);
                }

                createdReservations.Add(new
                {
                    id = reservation.Id,
                    seatId = seat.Id,
                    rowIdentifier = seat.RowIdentifier,
                    seatNumber = seat.SeatNumber,
                    sectorName = seat.Sector?.Name ?? "General",
                    price = seat.Sector?.Price ?? 22000.00m,
                    status = reservation.Status,
                    reservedAt = reservation.ReservedAt,
                    expiresAt = reservation.ExpiresAt,
                    ttlSeconds = 300
                });
            }

            _db.AuditLogs.Add(new AuditLog
            {
                UserId = targetUserId,
                UserName = userName,
                Action = "BATCH_RESERVE_SUCCESS",
                EntityType = "ReservationBatch",
                EntityId = req.SeatIds.Count.ToString(),
                Description = $"Reserva por lote exitosa: Se bloquearon {req.SeatIds.Count} butacas por 5 minutos para {userName}.",
                AmountSpent = 0.00m,
                UserBalanceAfter = user?.Balance ?? 0.00m,
                CreatedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Created(string.Empty, new
            {
                message = "Reservas en lote realizadas con éxito.",
                reservations = createdReservations
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError($"[CODE-ERROR] - Error al procesar reserva masiva de asientos: {ex.Message}");
            return StatusCode(500, new { error = "Error interno al procesar las reservas en lote." });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> CancelReservation(string id)
    {
        if (!Guid.TryParse(id, out var resGuid))
        {
            return BadRequest(new { error = "ID de reserva inválido." });
        }

        using var transaction = await _db.Database.BeginTransactionAsync();

        try
        {
            var reservation = await _db.Reservations.FirstOrDefaultAsync(r => r.Id == resGuid);
            if (reservation == null)
            {
                await transaction.RollbackAsync();
                return NotFound(new { error = "Reserva no encontrada." });
            }

            if (reservation.Status == "Pending")
            {
                reservation.Status = "Cancelled";
                var seat = await _db.Seats.FirstOrDefaultAsync(s => s.Id == reservation.SeatId);
                if (seat != null && seat.Status == "Reservado")
                {
                    seat.Status = "Disponible";
                    seat.Version += 1;
                }

                int targetUserId = reservation.UserId ?? 1;
                var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == targetUserId);

                _db.AuditLogs.Add(new AuditLog
                {
                    UserId = targetUserId,
                    UserName = user?.Name ?? "Usuario",
                    Action = "RESERVE_CANCELLED",
                    EntityType = "Reservation",
                    EntityId = reservation.Id.ToString(),
                    Description = $"Reserva cancelada voluntariamente por el usuario. La butaca Fila {seat?.RowIdentifier} N° {seat?.SeatNumber} volvió a estar Disponible.",
                    AmountSpent = 0.00m,
                    UserBalanceAfter = user?.Balance ?? 0.00m,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Reserva cancelada y butaca liberada." });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError($"[CODE-ERROR] - Error al cancelar reserva {id}: {ex.Message}");
            return StatusCode(500, new { error = "Error al cancelar la reserva." });
        }
    }
}


