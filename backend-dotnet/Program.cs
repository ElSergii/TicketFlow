using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using TicketFlow.Api.Data;
using TicketFlow.Api.Middleware;
using TicketFlow.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Configuración de Kestrel para escuchar en el puerto 4000
builder.WebHost.UseUrls("http://localhost:4000");

// Agregar Servicios y DbContext EF Core (SQLite)
builder.Services.AddDbContext<TicketFlowDbContext>(options =>
    options.UseSqlite("Data Source=ticketflow.sqlite"));

// Controllers y JSON serialization options (camelCase)
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

// Configuración de CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader()
              .WithExposedHeaders("X-Api-version");
    });
});

// Swagger OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "TicketFlow API REST (.NET 9)", Version = "v1.0" });
});

// Registrar BackgroundService Worker de Liberación Automática
builder.Services.AddHostedService<ExpirationWorker>();

var app = builder.Build();

// REQUERIMIENTO CORPORATIVO PDF #3: Middleware inyecta Header X-Api-version: 1.0 en todas las respuestas
app.UseMiddleware<ApiVersionMiddleware>();

app.UseCors("AllowAll");

// Swagger UI en /swagger y /api-docs
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "TicketFlow API REST v1.0 (.NET 9)");
    c.RoutePrefix = "api-docs";
});

app.MapControllers();

// Inicializar Base de Datos y Seed de Semilla al arrancar (Recreación limpia de esquema)
using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<TicketFlowDbContext>();
        await db.Database.EnsureDeletedAsync();
        await db.Database.EnsureCreatedAsync();
        await db.SeedInitialDataAsync();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[CODE-ERROR] - Fallo al inicializar la base de datos EF Core en .NET: {ex.Message}");
    }
}

Console.WriteLine("==================================================");
Console.WriteLine("🚀 SERVIDOR TICKETFLOW (.NET 9) EJECUTÁNDOSE EN PUERTO 4000");
Console.WriteLine("📚 SWAGGER UI: http://localhost:4000/api-docs");
Console.WriteLine("==================================================");

app.Run();
