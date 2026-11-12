using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Models.Enums;
using DiamantLaan.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Controllers;

/// <summary>
/// Public straatfees ticket sales. No account is ever involved, even for a signed-in visitor:
/// the order carries its own name and email.
/// </summary>
[ApiController]
[Route("api/straatfees")]
[AllowAnonymous]
public class StraatfeesController : ControllerBase
{
    private readonly StraatfeesService _straatfees;
    private readonly ILogger<StraatfeesController> _logger;
#if DEBUG
    private readonly IWebHostEnvironment _environment;
    private readonly Data.AppDbContext _db;
#endif

    public StraatfeesController(
        StraatfeesService straatfees,
        ILogger<StraatfeesController> logger,
        IWebHostEnvironment environment,
        Data.AppDbContext db)
    {
        _straatfees = straatfees;
        _logger = logger;
#if DEBUG
        _environment = environment;
        _db = db;
#endif
    }

    [HttpGet("info")]
    public async Task<IActionResult> Info(CancellationToken cancellationToken) => Ok(new StraatfeesInfoDto
    {
        Enabled = await _straatfees.IsEnabledAsync(cancellationToken),
        AdultPrice = _straatfees.AdultPrice,
        ChildPrice = _straatfees.ChildPrice,
        MaxPerOrder = StraatfeesService.MaxPerOrder
    });

    /// <summary>Creates a pending order and hands back the signed PayFast form to post.</summary>
    [HttpPost("bestel")]
    [EnableRateLimiting("guest-purchase")]
    public async Task<IActionResult> Order([FromBody] StraatfeesOrderRequestDto dto)
    {
        if (!await _straatfees.IsEnabledAsync())
            return BadRequest(new { message = "Kaartjieverkope is tans gesluit." });

        var (order, error) = await _straatfees.CreateOrderAsync(dto);
        if (order == null)
            return BadRequest(new { message = error });

        try
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}{Request.PathBase}";
            return Ok(_straatfees.PaymentFormFor(order, baseUrl));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogError(ex, "Could not build PayFast form for straatfees order {OrderId}", order.Id);
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Kon nie PayFast betaling voorberei nie." });
        }
    }

    /// <summary>
    /// The ticket page's data. The code is the secret: whoever has the email link has the ticket.
    /// Pending is returned rather than 404 so the page can wait for the ITN after PayFast's return.
    /// </summary>
    [HttpGet("kaartjie/{code}")]
    public async Task<IActionResult> Ticket(string code)
    {
        var order = await _straatfees.FindByCodeAsync(code.Trim().ToUpperInvariant());
        if (order == null)
            return NotFound(new { message = "Kaartjie nie gevind nie." });

        return Ok(new StraatfeesTicketDto
        {
            Name = order.Name,
            Adults = order.Adults,
            Children = order.Children,
            Amount = order.Amount,
            TicketCode = order.TicketCode,
            Status = order.PaymentStatus.ToString(),
            ConfirmedAt = order.ConfirmedAt
        });
    }

#if DEBUG
    /// <summary>Development-only stand-in for PayFast's ITN. Compiled out of Release, like the block one.</summary>
    [HttpPost("simulate-itn/{code}")]
    public async Task<IActionResult> SimulateItn(string code)
    {
        if (!_environment.IsDevelopment())
            return NotFound();

        var order = await _db.StraatfeesOrders.FirstOrDefaultAsync(o => o.TicketCode == code);
        if (order == null)
            return NotFound();
        if (order.PaymentStatus != PaymentStatus.Pending)
            return BadRequest(new { message = "Bestelling is nie meer hangend nie." });

        await _straatfees.ConfirmAsync(order, $"sandbox-{order.MerchantPaymentId}", "COMPLETE");
        return Ok(new { status = order.PaymentStatus.ToString() });
    }
#endif
}

[ApiController]
[Route("api/admin/straatfees")]
[Authorize(Roles = "Admin")]
public class AdminStraatfeesController : ControllerBase
{
    private readonly StraatfeesService _straatfees;
    private readonly AuditLogService _audit;

    public AdminStraatfeesController(StraatfeesService straatfees, AuditLogService audit)
    {
        _straatfees = straatfees;
        _audit = audit;
    }

    [HttpGet]
    public async Task<IActionResult> List() => Ok(new
    {
        enabled = await _straatfees.IsEnabledAsync(),
        adultPrice = _straatfees.AdultPrice,
        childPrice = _straatfees.ChildPrice,
        orders = await _straatfees.ListAsync()
    });

    [HttpPut("aktief")]
    public async Task<IActionResult> SetEnabled([FromBody] StraatfeesEnabledDto dto)
    {
        var enabled = await _straatfees.SetEnabledAsync(dto.Enabled);
        await _audit.LogAsync(User, "SetStraatfeesEnabled", $"StraatfeesEnabled={enabled}");
        return Ok(new { enabled });
    }
}
