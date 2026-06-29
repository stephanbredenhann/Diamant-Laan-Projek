using DiamantLaan.Api.Models.Enums;

namespace DiamantLaan.Api.Models;

public class ProgressImage
{
    public int Id { get; set; }
    public SquareStatus Status { get; set; }
    public string FilePath { get; set; } = string.Empty;
    public string? Caption { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string UploadedByUserId { get; set; } = string.Empty;
    public User? UploadedBy { get; set; }
    public ICollection<ProgressImageSquare> ProgressImageSquares { get; set; } = new List<ProgressImageSquare>();
}
