using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DiamantLaan.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminSaveSnapshots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AdminSaveSnapshots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    UndoBatchId = table.Column<string>(type: "TEXT", nullable: false),
                    AdminUserId = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ConsumedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    SquareStatusJson = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedProgressImageId = table.Column<int>(type: "INTEGER", nullable: true),
                    ReplacedImagesJson = table.Column<string>(type: "TEXT", nullable: false),
                    OwnerIdsJson = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdminSaveSnapshots", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AdminSaveSnapshots_ConsumedAt_CreatedAt",
                table: "AdminSaveSnapshots",
                columns: new[] { "ConsumedAt", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AdminSaveSnapshots_UndoBatchId",
                table: "AdminSaveSnapshots",
                column: "UndoBatchId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AdminSaveSnapshots");
        }
    }
}
