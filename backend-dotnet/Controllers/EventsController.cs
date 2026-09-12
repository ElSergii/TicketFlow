using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TicketFlow.Api.Data;
using TicketFlow.Api.Models;

namespace TicketFlow.Api.Controllers;

[ApiController]
[Route("api/v1/events")]
public class EventsController : ControllerBase
{
    private readonly TicketFlowDbContext _db;
    private readonly ILogger<EventsController> _logger;

    public EventsController(TicketFlowDbContext db, ILogger<EventsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetEvents()
    {
        try
        {
            var events = await _db.Events
                .Include(e => e.Sectors)
                .ToListAsync();

            // Verificar si eventos tienen 0 butacas disponibles para actualizar estado a Agotado
            for (int idx_tk = 0; idx_tk < events.Count; idx_tk++)
            {
                var evt = events[idx_tk];
                var sectorIds = evt.Sectors.Select(s => s.Id).ToList();
                if (sectorIds.Count > 0)
                {
                    bool hasAvailable = await _db.Seats.AnyAsync(s => sectorIds.Contains(s.SectorId) && s.Status == "Disponible");
                    if (!hasAvailable && evt.Status != "Agotado")
                    {
                        evt.Status = "Agotado";
                    }
                    else if (hasAvailable && evt.Status == "Agotado")
                    {
                        evt.Status = "Active";
                    }
                }
            }
            await _db.SaveChangesAsync();

            return Ok(events);
        }
        catch (Exception ex)
        {
            _logger.LogError($"[CODE-ERROR] - Error al consultar eventos en .NET: {ex.Message}");
            return StatusCode(500, new { error = "Error interno del servidor al consultar catálogo." });
        }
    }


    [HttpGet("{id:int}/seats")]
    public async Task<IActionResult> GetEventSeats(int id)
    {
        try
        {
            var evt = await _db.Events
                .Include(e => e.Sectors)
                .ThenInclude(s => s.Seats.OrderBy(st => st.RowIdentifier).ThenBy(st => st.SeatNumber))
                .FirstOrDefaultAsync(e => e.Id == id);

            if (evt == null)
            {
                return NotFound(new { error = "Evento no encontrado." });
            }

            // Si el evento no tiene sectores ni asientos aún, auto-generar sectores por defecto - Iterador idx_tk
            if (!evt.Sectors.Any())
            {
                var campo = new Sector { EventId = evt.Id, Name = "Campo General", Price = 25000.00m, Capacity = 50 };
                var platea = new Sector { EventId = evt.Id, Name = "Platea Preferencial", Price = 40000.00m, Capacity = 50 };
                _db.Sectors.AddRange(campo, platea);
                await _db.SaveChangesAsync();

                var campoRows = new[] { "A", "B", "C", "D", "E" };
                foreach (var (rowLetter, idx_tk) in campoRows.Select((r, idx_tk) => (r, idx_tk)))
                {
                    for (int seatIdx_tk = 1; seatIdx_tk <= 10; seatIdx_tk++)
                    {
                        _db.Seats.Add(new Seat { SectorId = campo.Id, RowIdentifier = rowLetter, SeatNumber = seatIdx_tk, Status = "Disponible", Version = 1 });
                    }
                }

                var plateaRows = new[] { "F", "G", "H", "I", "J" };
                foreach (var (rowLetter, idx_tk) in plateaRows.Select((r, idx_tk) => (r, idx_tk)))
                {
                    for (int seatIdx_tk = 1; seatIdx_tk <= 10; seatIdx_tk++)
                    {
                        _db.Seats.Add(new Seat { SectorId = platea.Id, RowIdentifier = rowLetter, SeatNumber = seatIdx_tk, Status = "Disponible", Version = 1 });
                    }
                }
                await _db.SaveChangesAsync();

                // Recargar con las butacas creadas
                evt = await _db.Events
                    .Include(e => e.Sectors)
                    .ThenInclude(s => s.Seats.OrderBy(st => st.RowIdentifier).ThenBy(st => st.SeatNumber))
                    .FirstOrDefaultAsync(e => e.Id == id);
            }

            return Ok(evt);
        }
        catch (Exception ex)
        {
            _logger.LogError($"[CODE-ERROR] - Error al consultar plano de asientos para el evento {id}: {ex.Message}");
            return StatusCode(500, new { error = "Error interno del servidor al consultar mapa de asientos." });
        }
    }

    // ENDPOINT ADMIN: Crear nuevo evento con sectores y 50 butacas por sector
    [HttpPost]
    public async Task<IActionResult> CreateEvent([FromBody] CreateEventRequest req)
    {
        try
        {
            var newEvent = new Event
            {
                Name = req.Name,
                Venue = req.Venue,
                EventDate = req.EventDate,
                Status = "Active",
                BadgeText = req.BadgeText,
                ImageUrl = req.ImageUrl
            };

            _db.Events.Add(newEvent);
            await _db.SaveChangesAsync();

            var campo = new Sector { EventId = newEvent.Id, Name = "Campo", Price = req.PriceCampo, Capacity = 50 };
            var platea = new Sector { EventId = newEvent.Id, Name = "Platea", Price = req.PricePlatea, Capacity = 50 };
            _db.Sectors.AddRange(campo, platea);
            await _db.SaveChangesAsync();

            // Generar butacas Campo - Iterador idx_tk
            var campoRows = new[] { "A", "B", "C", "D", "E" };
            foreach (var (rowLetter, idx_tk) in campoRows.Select((r, idx_tk) => (r, idx_tk)))
            {
                for (int seatIdx_tk = 1; seatIdx_tk <= 10; seatIdx_tk++)
                {
                    _db.Seats.Add(new Seat { SectorId = campo.Id, RowIdentifier = rowLetter, SeatNumber = seatIdx_tk, Status = "Disponible", Version = 1 });
                }
            }

            // Generar butacas Platea - Iterador idx_tk
            var plateaRows = new[] { "F", "G", "H", "I", "J" };
            foreach (var (rowLetter, idx_tk) in plateaRows.Select((r, idx_tk) => (r, idx_tk)))
            {
                for (int seatIdx_tk = 1; seatIdx_tk <= 10; seatIdx_tk++)
                {
                    _db.Seats.Add(new Seat { SectorId = platea.Id, RowIdentifier = rowLetter, SeatNumber = seatIdx_tk, Status = "Disponible", Version = 1 });
                }
            }

            // Grabar auditoría de creación de evento
            _db.AuditLogs.Add(new AuditLog
            {
                UserId = 3,
                UserName = "Admin Productora",
                Action = "EVENT_CREATED",
                EntityType = "Event",
                EntityId = newEvent.Id.ToString(),
                Description = $"Nuevo evento '{newEvent.Name}' creado en el recinto {newEvent.Venue} con sectores Campo (${req.PriceCampo:N0}) y Platea (${req.PricePlatea:N0}).",
                CreatedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();

            return Created(string.Empty, newEvent);
        }
        catch (Exception ex)
        {
            _logger.LogError($"[CODE-ERROR] - Error al crear nuevo evento desde Admin: {ex.Message}");
            return StatusCode(500, new { error = "Error al crear el nuevo evento." });
        }
    }
}
