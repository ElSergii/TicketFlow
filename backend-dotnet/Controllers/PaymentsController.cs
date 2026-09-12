using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TicketFlow.Api.Data;
using TicketFlow.Api.Models;

namespace TicketFlow.Api.Controllers;

[ApiController]
[Route("api/v1/payments")]
public class PaymentsController : ControllerBase
{
    private readonly TicketFlowDbContext _db;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(TicketFlowDbContext db, ILogger<PaymentsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> ProcessPayment([FromBody] ProcessPaymentRequest req)
    {
        if (req.ReservationId == Guid.Empty)
        {
            return BadRequest(new { error = "El ID de la reserva (reservationId) es obligatorio." });
        }

        using var transaction = await _db.Database.BeginTransactionAsync();

        try
        {
            var reservation = await _db.Reservations.FirstOrDefaultAsync(r => r.Id == req.ReservationId);
            if (reservation == null)
            {
                await transaction.RollbackAsync();
                return NotFound(new { error = "Reserva no encontrada." });
            }

            if (reservation.Status != "Pending")
            {
                await transaction.RollbackAsync();
                return BadRequest(new { error = $"No se puede procesar el pago. Estado de la reserva: {reservation.Status}" });
            }

            if (DateTime.UtcNow > reservation.ExpiresAt)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { error = "El tiempo límite de 5 minutos para completar el pago ha expirado." });
            }

            var seat = await _db.Seats
                .Include(s => s.Sector)
                .FirstOrDefaultAsync(s => s.Id == reservation.SeatId);

            if (seat == null)
            {
                await transaction.RollbackAsync();
                return NotFound(new { error = "La butaca asociada a la reserva no existe." });
            }

            var userId = req.UserId ?? reservation.UserId ?? 1;
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                await transaction.RollbackAsync();
                return NotFound(new { error = "El usuario no existe." });
            }

            decimal ticketPrice = seat.Sector?.Price ?? 22000.00m;

            // Verificar si el usuario tiene saldo suficiente
            if (user.Balance < ticketPrice)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { error = $"Saldo insuficiente en tu billetera. Tu saldo actual es de $ {user.Balance:N0} y la entrada cuesta $ {ticketPrice:N0}." });
            }

            // Descontar saldo y actualizar estado
            user.Balance -= ticketPrice;
            reservation.Status = "Paid";
            seat.Status = "Vendida";
            seat.Version += 1;

            _db.AuditLogs.Add(new AuditLog
            {
                UserId = user.Id,
                UserName = user.Name,
                Action = "PAYMENT_SUCCESS",
                EntityType = "Payment",
                EntityId = reservation.Id.ToString(),
                Description = $"Pago de entrada confirmado para Fila {seat.RowIdentifier} N° {seat.SeatNumber} ({seat.Sector?.Name ?? "Sector"}). Se descontaron $ {ticketPrice:N0} del saldo.",
                AmountSpent = ticketPrice,
                UserBalanceAfter = user.Balance,
                CreatedAt = DateTime.UtcNow
            });

            if (seat.Sector != null)
            {
                var sectorIds = await _db.Sectors.Where(s => s.EventId == seat.Sector.EventId).Select(s => s.Id).ToListAsync();
                bool hasAvailable = await _db.Seats.AnyAsync(s => sectorIds.Contains(s.SectorId) && s.Status == "Disponible");
                if (!hasAvailable)
                {
                    var evt = await _db.Events.FirstOrDefaultAsync(e => e.Id == seat.Sector.EventId);
                    if (evt != null && evt.Status != "Agotado")
                    {
                        evt.Status = "Agotado";
                        _db.AuditLogs.Add(new AuditLog
                        {
                            UserId = user.Id,
                            UserName = user.Name,
                            Action = "EVENT_SOLD_OUT",
                            EntityType = "Event",
                            EntityId = evt.Id.ToString(),
                            Description = $"¡El evento '{evt.Name}' vendió el 100% de sus entradas! Su estado se actualizó a AGOTADO.",
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }
            }

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();


            return Ok(new
            {
                message = "¡Pago confirmado! Tu compra fue procesada exitosamente.",
                ticket = new
                {
                    reservationId = reservation.Id,
                    seatId = seat.Id,
                    row = seat.RowIdentifier,
                    seatNumber = seat.SeatNumber,
                    status = "Vendida",
                    confirmedAt = DateTime.UtcNow.ToString("o"),
                    newBalance = user.Balance
                }
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError($"[CODE-ERROR] - Error al procesar pago transaccional para la reserva {req.ReservationId}: {ex.Message}");
            return StatusCode(500, new { error = "Error transaccional al procesar el pago en .NET. Se ejecutó Rollback." });
        }
    }

    [HttpPost("batch")]
    public async Task<IActionResult> ProcessBatchPayment([FromBody] BatchPaymentRequest req)
    {
        if (req.ReservationIds == null || req.ReservationIds.Count == 0)
        {
            return BadRequest(new { error = "Debe proporcionar al menos un ID de reserva." });
        }

        using var transaction = await _db.Database.BeginTransactionAsync();

        try
        {
            int targetUserId = req.UserId ?? 1;
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == targetUserId);
            if (user == null)
            {
                await transaction.RollbackAsync();
                return NotFound(new { error = "El usuario no existe." });
            }

            decimal totalPrice = 0.00m;
            var validatedReservations = new List<(Reservation Reservation, Seat Seat, decimal Price)>();
            var seatDescriptions = new List<string>();

            for (int idx_tk = 0; idx_tk < req.ReservationIds.Count; idx_tk++)
            {
                var currentResId = req.ReservationIds[idx_tk];
                var reservation = await _db.Reservations.FirstOrDefaultAsync(r => r.Id == currentResId);
                if (reservation == null)
                {
                    await transaction.RollbackAsync();
                    return NotFound(new { error = $"Reserva {currentResId} no encontrada." });
                }

                if (reservation.Status != "Pending")
                {
                    await transaction.RollbackAsync();
                    return BadRequest(new { error = $"La reserva {currentResId} ya no está pendiente (Estado: {reservation.Status})." });
                }

                if (DateTime.UtcNow > reservation.ExpiresAt)
                {
                    await transaction.RollbackAsync();
                    return BadRequest(new { error = "El tiempo límite de 5 minutos para completar el pago ha expirado en una o más reservas." });
                }

                var seat = await _db.Seats
                    .Include(s => s.Sector)
                    .FirstOrDefaultAsync(s => s.Id == reservation.SeatId);

                if (seat == null)
                {
                    await transaction.RollbackAsync();
                    return NotFound(new { error = "Una de las butacas asociadas a la reserva no existe." });
                }

                decimal price = seat.Sector?.Price ?? 22000.00m;
                totalPrice += price;
                validatedReservations.Add((reservation, seat, price));
                seatDescriptions.Add($"Fila {seat.RowIdentifier} N° {seat.SeatNumber} ({seat.Sector?.Name ?? "Sector"})");
            }

            if (user.Balance < totalPrice)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { error = $"Saldo insuficiente en tu billetera. El total de las {req.ReservationIds.Count} entradas es $ {totalPrice:N0} y tu saldo disponible es de $ {user.Balance:N0}." });
            }

            user.Balance -= totalPrice;

            var issuedTickets = new List<object>();

            for (int idx_tk = 0; idx_tk < validatedReservations.Count; idx_tk++)
            {
                var item = validatedReservations[idx_tk];
                item.Reservation.Status = "Paid";
                item.Seat.Status = "Vendida";
                item.Seat.Version += 1;

                issuedTickets.Add(new
                {
                    reservationId = item.Reservation.Id,
                    seatId = item.Seat.Id,
                    row = item.Seat.RowIdentifier,
                    seatNumber = item.Seat.SeatNumber,
                    sectorName = item.Seat.Sector?.Name ?? "Sector",
                    price = item.Price,
                    status = "Vendida",
                    confirmedAt = DateTime.UtcNow.ToString("o")
                });
            }

            string seatSummary = string.Join(", ", seatDescriptions);

            _db.AuditLogs.Add(new AuditLog
            {
                UserId = user.Id,
                UserName = user.Name,
                Action = "BATCH_PAYMENT_SUCCESS",
                EntityType = "PaymentBatch",
                EntityId = req.ReservationIds.Count.ToString(),
                Description = $"Pago de {validatedReservations.Count} entradas confirmado ({seatSummary}). Se descontaron $ {totalPrice:N0} del saldo.",
                AmountSpent = totalPrice,
                UserBalanceAfter = user.Balance,
                CreatedAt = DateTime.UtcNow
            });

            // Verificar si todas las butacas del evento fueron vendidas para cambiar estado a AGOTADO
            var firstSeat = validatedReservations.FirstOrDefault().Seat;
            if (firstSeat != null)
            {
                var sector = await _db.Sectors.FirstOrDefaultAsync(s => s.Id == firstSeat.SectorId);
                if (sector != null)
                {
                    var sectorIds = await _db.Sectors.Where(s => s.EventId == sector.EventId).Select(s => s.Id).ToListAsync();
                    bool hasAvailable = await _db.Seats.AnyAsync(s => sectorIds.Contains(s.SectorId) && s.Status == "Disponible");
                    if (!hasAvailable)
                    {
                        var evt = await _db.Events.FirstOrDefaultAsync(e => e.Id == sector.EventId);
                        if (evt != null && evt.Status != "Agotado")
                        {
                            evt.Status = "Agotado";
                            _db.AuditLogs.Add(new AuditLog
                            {
                                UserId = user.Id,
                                UserName = user.Name,
                                Action = "EVENT_SOLD_OUT",
                                EntityType = "Event",
                                EntityId = evt.Id.ToString(),
                                Description = $"¡El evento '{evt.Name}' vendió el 100% de sus entradas! Su estado se actualizó a AGOTADO.",
                                CreatedAt = DateTime.UtcNow
                            });
                        }
                    }
                }
            }

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new
            {
                message = $"¡Pago de {validatedReservations.Count} entradas confirmado exitosamente!",
                totalPrice = totalPrice,
                newBalance = user.Balance,
                tickets = issuedTickets
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError($"[CODE-ERROR] - Error al procesar pago masivo de reservas: {ex.Message}");
            return StatusCode(500, new { error = "Error transaccional al procesar el pago masivo en .NET. Se ejecutó Rollback." });
        }
    }
}


