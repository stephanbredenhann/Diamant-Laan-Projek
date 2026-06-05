using System.Security.Claims;
using DiamantLaan.Api.Data;
using DiamantLaan.Api.Models.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DiamantLaan.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoadController : ControllerBase
{
    private readonly AppDbContext _db;

    public RoadController(AppDbContext db) => _db = db;

    [HttpGet("squares")]
    public async Task<IActionResult> GetSquares()
    {
        var squares = await _db.Squares
            .OrderBy(s => s.Id)
            .Select(s => new SquareDto { Id = s.Id, Status = s.Status })
            .ToListAsync();

        return Ok(squares);
    }
}
