using Microsoft.EntityFrameworkCore;
using TicketFlow.Api.Models;

namespace TicketFlow.Api.Data;

public class TicketFlowDbContext : DbContext
{
    public TicketFlowDbContext(DbContextOptions<TicketFlowDbContext> options) : base(options) { }

    public DbSet<Event> Events => Set<Event>();
    public DbSet<Sector> Sectors => Set<Sector>();
    public DbSet<Seat> Seats => Set<Seat>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Reservation> Reservations => Set<Reservation>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configuración de Concurrencia Optimista
        modelBuilder.Entity<Seat>()
            .Property(s => s.Version)
            .IsConcurrencyToken();

        modelBuilder.Entity<Sector>()
            .Property(s => s.Price)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<User>()
            .Property(u => u.Balance)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<AuditLog>()
            .Property(a => a.AmountSpent)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<AuditLog>()
            .Property(a => a.UserBalanceAfter)
            .HasColumnType("decimal(18,2)");
    }

    public async Task SeedInitialDataAsync()
    {
        if (!await Users.AnyAsync())
        {
            try
            {
                // Precarga de Usuarios Demo
                var user1 = new User
                {
                    Name = "Juan Pérez",
                    Email = "juan@ticketflow.com",
                    PasswordHash = "hash_juan_123",
                    Role = "Customer",
                    Balance = 50000.00m,
                    AvatarUrl = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop"
                };

                var user2 = new User
                {
                    Name = "María García",
                    Email = "maria@ticketflow.com",
                    PasswordHash = "hash_maria_123",
                    Role = "Customer",
                    Balance = 100000.00m,
                    AvatarUrl = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop"
                };

                var adminUser = new User
                {
                    Name = "Admin Productora",
                    Email = "admin@ticketflow.com",
                    PasswordHash = "hash_admin_123",
                    Role = "Admin",
                    Balance = 0.00m,
                    AvatarUrl = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop"
                };

                Users.AddRange(user1, user2, adminUser);
                await SaveChangesAsync();

                // Precarga de Eventos
                var event1 = new Event
                {
                    Name = "Arctic Monkeys — The Car Tour",
                    Venue = "Estadio River Plate, Buenos Aires",
                    EventDate = DateTime.SpecifyKind(new DateTime(2026, 11, 14, 21, 0, 0), DateTimeKind.Utc),
                    Status = "Active",
                    BadgeText = "Rock",
                    ImageUrl = "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=800&auto=format&fit=crop"
                };

                var event2 = new Event
                {
                    Name = "Tame Impala — The Slow Rush",
                    Venue = "Movistar Arena, Buenos Aires",
                    EventDate = DateTime.SpecifyKind(new DateTime(2026, 12, 5, 22, 0, 0), DateTimeKind.Utc),
                    Status = "Active",
                    BadgeText = "Psychedelic",
                    ImageUrl = "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop"
                };

                var event3 = new Event
                {
                    Name = "Gorillaz — Cracker Island Live",
                    Venue = "Tecnópolis, Buenos Aires",
                    EventDate = DateTime.SpecifyKind(new DateTime(2027, 1, 20, 21, 30, 0), DateTimeKind.Utc),
                    Status = "Active",
                    BadgeText = "Alternative",
                    ImageUrl = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop"
                };

                var event4 = new Event
                {
                    Name = "Radiohead — A Moon Shaped Pool",
                    Venue = "Estadio Obras, Buenos Aires",
                    EventDate = DateTime.SpecifyKind(new DateTime(2026, 10, 30, 20, 0, 0), DateTimeKind.Utc),
                    Status = "Agotado",
                    BadgeText = "Art Rock",
                    ImageUrl = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop"
                };

                Events.AddRange(event1, event2, event3, event4);
                await SaveChangesAsync();

                // Helper local function to seed sectors and seats for an event - Iterador idx_tk
                async Task SeedEventSeatsAsync(int eventId, string campoName, decimal campoPrice, string plateaName, decimal plateaPrice, bool isSoldOut = false)
                {
                    var sCampo = new Sector { EventId = eventId, Name = campoName, Price = campoPrice, Capacity = 50 };
                    var sPlatea = new Sector { EventId = eventId, Name = plateaName, Price = plateaPrice, Capacity = 50 };
                    Sectors.AddRange(sCampo, sPlatea);
                    await SaveChangesAsync();

                    string seatStatus = isSoldOut ? "Vendido" : "Disponible";

                    var campoRows = new[] { "A", "B", "C", "D", "E" };
                    foreach (var (rowLetter, idx_tk) in campoRows.Select((r, idx_tk) => (r, idx_tk)))
                    {
                        for (int seatIdx_tk = 1; seatIdx_tk <= 10; seatIdx_tk++)
                        {
                            Seats.Add(new Seat
                            {
                                SectorId = sCampo.Id,
                                RowIdentifier = rowLetter,
                                SeatNumber = seatIdx_tk,
                                Status = seatStatus,
                                Version = 1
                            });
                        }
                    }

                    var plateaRows = new[] { "F", "G", "H", "I", "J" };
                    foreach (var (rowLetter, idx_tk) in plateaRows.Select((r, idx_tk) => (r, idx_tk)))
                    {
                        for (int seatIdx_tk = 1; seatIdx_tk <= 10; seatIdx_tk++)
                        {
                            Seats.Add(new Seat
                            {
                                SectorId = sPlatea.Id,
                                RowIdentifier = rowLetter,
                                SeatNumber = seatIdx_tk,
                                Status = seatStatus,
                                Version = 1
                            });
                        }
                    }
                    await SaveChangesAsync();
                }

                // Generar 100 butacas para Arctic Monkeys
                await SeedEventSeatsAsync(event1.Id, "Campo General", 28000.00m, "Platea Baja", 42000.00m);

                // Generar 100 butacas para Tame Impala
                await SeedEventSeatsAsync(event2.Id, "Campo", 22000.00m, "Platea", 35000.00m);

                // Generar 100 butacas para Gorillaz
                await SeedEventSeatsAsync(event3.Id, "Campo Preferencial", 25000.00m, "Platea VIP", 45000.00m);

                // Generar 100 butacas para Radiohead (Todas Vendidas -> Agotado)
                await SeedEventSeatsAsync(event4.Id, "Campo General", 30000.00m, "Platea Alta", 50000.00m, isSoldOut: true);

                Console.WriteLine("[SEED] Precarga de datos con usuarios, roles, eventos y butacas completada.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CODE-ERROR] - Error al precargar la semilla de datos en .NET: {ex.Message}");
            }
        }
    }
}
