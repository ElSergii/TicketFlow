using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TicketFlow.Api.Data;
using TicketFlow.Api.Models;

namespace TicketFlow.Api.Controllers;

public record DepositRequest(decimal Amount);

[ApiController]
[Route("api/v1/users")]
public class UsersController : ControllerBase
{
    private readonly TicketFlowDbContext _db;
    private readonly ILogger<UsersController> _logger;

    public UsersController(TicketFlowDbContext db, ILogger<UsersController> logger)
    {
        _db = db;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {
        try
        {
            var users = await _db.Users.ToListAsync();
            return Ok(users);
        }
        catch (Exception ex)
        {
            _logger.LogError($"[CODE-ERROR] - Error al consultar usuarios: {ex.Message}");
            return StatusCode(500, new { error = "Error al obtener lista de usuarios." });
        }
    }

    // ENDPOINT: Cargar saldo a la billetera virtual del usuario
    [HttpPost("{id:int}/deposit")]
    public async Task<IActionResult> DepositBalance(int id, [FromBody] DepositRequest req)
    {
        if (req.Amount <= 0)
        {
            return BadRequest(new { error = "El monto a ingresar debe ser mayor a cero." });
        }

        using var transaction = await _db.Database.BeginTransactionAsync();

        try
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null)
            {
                await transaction.RollbackAsync();
                return NotFound(new { error = "Usuario no encontrado." });
            }

            user.Balance += req.Amount;

            _db.AuditLogs.Add(new AuditLog
            {
                UserId = user.Id,
                UserName = user.Name,
                Action = "BALANCE_DEPOSIT",
                EntityType = "Wallet",
                EntityId = user.Id.ToString(),
                Description = $"Recarga exitosa de billetera virtual: Se acreditaron +$ {req.Amount:N0}. Nuevo saldo disponible: $ {user.Balance:N0}.",
                AmountSpent = 0.00m,
                UserBalanceAfter = user.Balance,
                CreatedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new
            {
                message = $"¡Recarga de $ {req.Amount:N0} acreditada con éxito!",
                newBalance = user.Balance
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError($"[CODE-ERROR] - Error al recargar saldo para el usuario {id}: {ex.Message}");
            return StatusCode(500, new { error = "Error al procesar la recarga de dinero." });
        }
    }
}
