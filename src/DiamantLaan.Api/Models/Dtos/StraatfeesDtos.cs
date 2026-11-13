namespace DiamantLaan.Api.Models.Dtos;

public class StraatfeesInfoDto
{
    public bool Enabled { get; set; }
    public decimal AdultPrice { get; set; }
    public decimal ChildPrice { get; set; }
    public int MaxPerOrder { get; set; }
}

public class StraatfeesOrderRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int Adults { get; set; }
    public int Children { get; set; }
}

public class StraatfeesTicketDto
{
    public string Name { get; set; } = string.Empty;
    public int Adults { get; set; }
    public int Children { get; set; }
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
    public int Adults { get; set; }
    public int Children { get; set; }
    public decimal Amount { get; set; }
    public string TicketCode { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? PayFastPaymentId { get; set; }
    /// <summary>Null for a PayFast order; EFT, Cash or Card for one an admin recorded.</summary>
    public string? PaymentMethod { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public bool TicketEmailSent { get; set; }
}

/// <summary>A sale an admin records after the money is in, e.g. cash at the gate or an EFT.</summary>
public class StraatfeesManualOrderDto
{
    public string Name { get; set; } = string.Empty;

    /// <summary>Optional: without one no ticket is emailed and the admin hands over the code.</summary>
    public string? Email { get; set; }

    public int Adults { get; set; }
    public int Children { get; set; }
    public string PaymentMethod { get; set; } = "Cash";
}

public class StraatfeesEnabledDto
{
    public bool Enabled { get; set; }
}
