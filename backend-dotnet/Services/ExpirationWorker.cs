using Microsoft.EntityFrameworkCore;
using TicketFlow.Api.Data;
using TicketFlow.Api.Models;

namespace TicketFlow.Api.Services;

public class ExpirationWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ExpirationWorker> _logger;

    public ExpirationWorker(IServiceProvider serviceProvider, ILogger<ExpirationWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("[WORKER] BackgroundService de liberación automática en .NET iniciado (frecuencia: 10s).");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessExpiredReservationsAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError($"[CODE-ERROR] - Error no controlado en worker de expiración .NET: {ex.Message}");
            }

            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
        }
    }

    private async Task ProcessExpiredReservationsAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TicketFlowDbContext>();

        var now = DateTime.UtcNow;
        var expiredList = await db.Reservations
            .Where(r => r.Status == "Pending" && r.ExpiresAt < now)
            .ToListAsync();

        if (expiredList.Count == 0) return;

        _logger.LogInformation($"[WORKER] Se encontraron {expiredList.Count} reservas vencidas en .NET. Liberando...");

        // Iterador obligatoriamente nombrado idx_tk (Regla Corporativa PDF #2)
        foreach (var (reservation, idx_tk) in expiredList.Select((r, idx_tk) => (r, idx_tk)))
        {
            using var transaction = await db.Database.BeginTransactionAsync();
            try
            {
                reservation.Status = "Expired";

                int targetUserId = reservation.UserId ?? 1;
                var user = await db.Users.FirstOrDefaultAsync(u => u.Id == targetUserId);

                var seat = await db.Seats
                    .Include(s => s.Sector)
                    .FirstOrDefaultAsync(s => s.Id == reservation.SeatId);

                if (seat != null && seat.Status == "Reservado")
                {
                    seat.Status = "Disponible";
                    seat.Version += 1;

                    if (seat.Sector != null)
                    {
                        var evt = await db.Events.FirstOrDefaultAsync(e => e.Id == seat.Sector.EventId);
                        if (evt != null && evt.Status == "Agotado")
                        {
                            evt.Status = "Active";
                        }
                    }
                }

                db.AuditLogs.Add(new AuditLog
                {
                    UserId = reservation.UserId,
                    UserName = user?.Name ?? "Sistema Automático",
                    Action = "EXPIRED_RELEASE",
                    EntityType = "Reservation",
                    EntityId = reservation.Id.ToString(),
                    Description = $"Liberación automática de seguridad: La reserva para Fila {seat?.RowIdentifier} N° {seat?.SeatNumber} finalizó sus 5 minutos sin pago. El asiento volvió a estar Disponible.",
                    AmountSpent = 0.00m,
                    UserBalanceAfter = user?.Balance ?? 0.00m,
                    CreatedAt = DateTime.UtcNow
                });

                await db.SaveChangesAsync();
                await transaction.CommitAsync();
                _logger.LogInformation($"[WORKER] Reserva {reservation.Id} liberada exitosamente.");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError($"[CODE-ERROR] - Error al liberar reserva expirada {reservation.Id} en worker .NET: {ex.Message}");
            }
        }
    }
}
