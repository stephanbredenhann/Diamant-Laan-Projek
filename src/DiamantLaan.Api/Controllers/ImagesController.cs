using System.Security.Claims;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models.Dtos;
using DiamantLaan.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Controllers;

[ApiController]
[Authorize]
public class ImagesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public ImagesController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    [HttpGet("api/my-squares/{squareId}/images")]
    public async Task<IActionResult> GetSquareImages(int squareId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var isAdmin = User.IsInRole("Admin");

        var square = await _db.Squares.FindAsync(squareId);
        if (square == null)
            return NotFound();

        if (!isAdmin && square.OwnerId != userId)
            return Forbid();

        var images = await _db.ProgressImageSquares
            .Where(pis => pis.SquareId == squareId)
            .Select(pis => pis.ProgressImage)
            .OrderBy(pi => pi.Status)
            .ThenBy(pi => pi.CreatedAt)
            .Select(pi => new ProgressImageDto
            {
                Id = pi.Id,
                Status = (int)pi.Status,
                Caption = pi.Caption,
                CreatedAt = pi.CreatedAt
            })
            .ToListAsync();

        return Ok(images);
    }

    [HttpGet("api/images/{imageId}")]
    public async Task<IActionResult> GetImage(int imageId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var isAdmin = User.IsInRole("Admin");

        var progressImage = await _db.ProgressImages
            .Include(pi => pi.ProgressImageSquares)
            .FirstOrDefaultAsync(pi => pi.Id == imageId);

        if (progressImage == null)
            return NotFound();

        if (!isAdmin)
        {
            var linkedSquareIds = progressImage.ProgressImageSquares.Select(pis => pis.SquareId).ToList();
            var ownsAny = await _db.Squares.AnyAsync(s => linkedSquareIds.Contains(s.Id) && s.OwnerId == userId);
            if (!ownsAny)
                return Forbid();
        }

        var filePath = FileUploadService.ResolveProgressFilePath(_env, progressImage.FilePath);
        if (filePath == null || !System.IO.File.Exists(filePath))
            return NotFound();

        var extension = Path.GetExtension(filePath);
        var contentType = FileUploadService.GetContentTypeFromExtension(extension);
        return PhysicalFile(filePath, contentType);
    }
}
