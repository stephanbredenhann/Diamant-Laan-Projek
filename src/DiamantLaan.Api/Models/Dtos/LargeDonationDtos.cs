using System.ComponentModel.DataAnnotations;

namespace DiamantLaan.Api.Models.Dtos;

/// <summary>
/// Asks which blocks a large donation would get. Nothing is written. JSON, so a long
/// <see cref="SquareIds"/> list is no problem here.
/// </summary>
public class LargeDonationPreviewDto
{
    /// <summary>Only used to say whether the donor already has an account. Optional.</summary>
    [EmailAddress, MaxLength(256)]
    public string? Email { get; set; }

    /// <summary>In rand. Must be a positive multiple of R500.</summary>
    public decimal Amount { get; set; }

    /// <summary>"next": the server picks the lowest free blocks. "ranges": <see cref="SquareIds"/> as typed.</summary>
    [Required, RegularExpression("next|ranges", ErrorMessage = "Kies ’n geldige manier om blokke te kies.")]
    public string Mode { get; set; } = "next";

    /// <summary>Lets "next" hand out blocks an admin held back. "ranges" always may.</summary>
    public bool IncludeReserved { get; set; }

    [MaxLength(Square.MaxSaleableId)]
    public List<int>? SquareIds { get; set; }
}

/// <summary>
/// Records the donation the admin just previewed. Multipart, like the telefoniese aankoop, for the
/// proof of payment.
/// </summary>
public class LargeDonationDto
{
    [Required, EmailAddress, MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Phone, MaxLength(20)]
    public string? PhoneNumber { get; set; }

    [MaxLength(8)]
    public string PhoneCountryCode { get; set; } = "+27";

    public bool IsOraniaResident { get; set; }

    public bool IsOraniaBewegingMember { get; set; }

    [Required, RegularExpression("EFT|Cash|Card|Bitcoin|PayPal", ErrorMessage = "Kies ’n geldige betaalmetode.")]
    public string PaymentMethod { get; set; } = "EFT";

    /// <summary>Name on the one summary certificate. Blank falls back to the donor's own name.</summary>
    [MaxLength(100)]
    public string? CertificateName { get; set; }

    /// <summary>In rand. Must equal the block count times R500.</summary>
    public decimal Amount { get; set; }

    /// <summary>
    /// The exact blocks the preview returned, comma-separated ("1,2,3"). One field rather than one
    /// per block: a form stops binding at 1 024 values and a donation can be 4 000 blocks.
    /// </summary>
    [Required, MaxLength(Square.MaxSaleableId * 5)]
    public string SquareIds { get; set; } = string.Empty;

    /// <summary>Generated once per confirmation screen, so a repeat of this request is recognised.</summary>
    [Required]
    public Guid? IdempotencyKey { get; set; }
}
