namespace DiamantLaan.Api.Models.Dtos;

public class ProgressImageDto
{
    public int Id { get; set; }
    public int Status { get; set; }
    public string? Caption { get; set; }
    public DateTime CreatedAt { get; set; }
}
