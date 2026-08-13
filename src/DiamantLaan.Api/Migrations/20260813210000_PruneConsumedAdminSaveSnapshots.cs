using DiamantLaan.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DiamantLaan.Api.Migrations
{
    /// <summary>
    /// Clears the backlog of consumed undo snapshots. Nothing ever deleted them, so the table
    /// grew by one row per undo forever. New code deletes the row on undo instead of stamping
    /// ConsumedAt, so this only has to run once.
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20260813210000_PruneConsumedAdminSaveSnapshots")]
    public partial class PruneConsumedAdminSaveSnapshots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DELETE FROM AdminSaveSnapshots WHERE ConsumedAt IS NOT NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Deleted rows are unrecoverable, and a consumed snapshot has no use anyway.
        }
    }
}
