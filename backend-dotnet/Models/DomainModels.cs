using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TicketFlow.Api.Models;

public class Event
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime EventDate { get; set; }
    public string Venue { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
    public string? ImageUrl { get; set; }
    public string? BadgeText { get; set; }

    public ICollection<Sector> Sectors { get; set; } = new List<Sector>();
}

public class Sector
{
    public int Id { get; set; }
    public int EventId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Capacity { get; set; }

    public Event? Event { get; set; }
    public ICollection<Seat> Seats { get; set; } = new List<Seat>();
}

public class Seat
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int SectorId { get; set; }
    public string RowIdentifier { get; set; } = string.Empty;
    public int SeatNumber { get; set; }
    public string Status { get; set; } = "Disponible"; // "Disponible", "Reservado", "Vendida"

    [ConcurrencyCheck]
    public int Version { get; set; } = 1; // Atributo ConcurrencyCheck para Optimistic Locking en EF Core

    public Sector? Sector { get; set; }
    public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
}

public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "Customer"; // "Customer" | "Admin"
    public decimal Balance { get; set; } = 50000.00m; // Saldo de billetera virtual
    public string AvatarUrl { get; set; } = string.Empty;

    public ICollection<Reservation> Reservations { get; set; } = new List<Reservation>();
}

public class Reservation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int? UserId { get; set; }
    public Guid SeatId { get; set; }
    public string Status { get; set; } = "Pending"; // "Pending", "Paid", "Expired"
    public DateTime ReservedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }

    public Seat? Seat { get; set; }
    public User? User { get; set; }
}

public class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int? UserId { get; set; }
    public string UserName { get; set; } = "Sistema";
    public string Action { get; set; } = string.Empty; // RESERVE_ATTEMPT, RESERVE_SUCCESS, RESERVE_FAILED_CONCURRENCY, PAYMENT_SUCCESS, EXPIRED_RELEASE
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty; // Texto legible para el usuario (SIN código JSON)
    public decimal AmountSpent { get; set; } = 0.00m;
    public decimal UserBalanceAfter { get; set; } = 0.00m;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
}

// DTOs para peticiones de la API REST
public record CreateReservationRequest(Guid SeatId, int? UserId);
public record BatchReservationRequest(List<Guid> SeatIds, int? UserId);
public record ProcessPaymentRequest(Guid ReservationId, int? UserId, string? PaymentMethod);
public record BatchPaymentRequest(List<Guid> ReservationIds, int? UserId, string? PaymentMethod);
public record CreateEventRequest(string Name, string Venue, DateTime EventDate, string BadgeText, string ImageUrl, decimal PriceCampo, decimal PricePlatea);

