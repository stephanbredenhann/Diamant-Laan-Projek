namespace DiamantLaan.Api.Models.Dtos;

public class StraatfeesInfoDto
{
    public bool Enabled { get; set; }
    public decimal TicketPrice { get; set; }
    public int MaxPerOrder { get; set; }
}

public class StraatfeesOrderRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int Quantity { get; set; }
}

public class StraatfeesTicketDto
{
    public string Name { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal Amount { get; set; }
    public string TicketCode { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime? ConfirmedAt { get; set; }
}

public class StraatfeesAdminOrderDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal Amount { get; set; }
    public string TicketCode { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? PayFastPaymentId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public bool TicketEmailSent { get; set; }
}

public class StraatfeesEnabledDto
{
    public bool Enabled { get; set; }
}
