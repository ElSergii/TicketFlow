using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TicketFlow.Api.Data;

namespace TicketFlow.Api.Controllers;

[ApiController]
[Route("api/v1/audit-logs")]
public class AuditLogsController : ControllerBase
{
    private readonly TicketFlowDbContext _db;
    private readonly ILogger<AuditLogsController> _logger;

    public AuditLogsController(TicketFlowDbContext db, ILogger<AuditLogsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAuditLogs([FromQuery] int? userId)
    {
        try
        {
            var query = _db.AuditLogs.AsQueryable();

            // Filtrar logs de auditoría por usuario si se provee el parámetro userId (Privacidad de usuario)
            if (userId.HasValue && userId.Value > 0)
            {
                query = query.Where(a => a.UserId == userId.Value);
            }

            var logs = await query
                .OrderByDescending(a => a.CreatedAt)
                .Take(100)
                .ToListAsync();

            return Ok(logs);
        }
        catch (Exception ex)
        {
            _logger.LogError($"[CODE-ERROR] - Error al consultar registros de auditoría en .NET: {ex.Message}");
            return StatusCode(500, new { error = "Error al consultar logs de auditoría." });
        }
    }
}
