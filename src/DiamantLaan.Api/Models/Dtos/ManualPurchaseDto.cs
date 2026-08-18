using System.ComponentModel.DataAnnotations;

namespace DiamantLaan.Api.Models.Dtos;

public class ManualPurchaseDto
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

    [Required, MinLength(1), MaxLength(100)]
    public List<int> SquareIds { get; set; } = new();

    [Required, RegularExpression("EFT|Cash|Card|Bitcoin|PayPal", ErrorMessage = "Kies ’n geldige betaalmetode.")]
    public string PaymentMethod { get; set; } = "EFT";

    /// <summary>
    /// True when each block gets its own certificate, which is what the buyer asked for on the
    /// phone when they are splitting blocks between family. False prints one summary certificate.
    /// </summary>
    public bool CertificateIndividual { get; set; }

    /// <summary>
    /// Name on the summary certificate, and the fallback for any block without one of its own.
    /// Blank falls back to the buyer's own name.
    /// </summary>
    [MaxLength(100)]
    public string? CertificateName { get; set; }

    /// <summary>
    /// Per-block names, keyed by block number, form-bound as <c>certificateNames[12]=Anna</c>.
    /// Ignored when <see cref="CertificateIndividual"/> is false; a missing or too-short entry
    /// falls back to <see cref="CertificateName"/>.
    /// </summary>
    public Dictionary<int, string> CertificateNames { get; set; } = new();
}
