using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DiamantLaan.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProgressImages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProgressImages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    FilePath = table.Column<string>(type: "TEXT", nullable: false),
                    Caption = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UploadedByUserId = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProgressImages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProgressImages_AspNetUsers_UploadedByUserId",
                        column: x => x.UploadedByUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProgressImageSquares",
                columns: table => new
                {
                    ProgressImageId = table.Column<int>(type: "INTEGER", nullable: false),
                    SquareId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProgressImageSquares", x => new { x.ProgressImageId, x.SquareId });
                    table.ForeignKey(
                        name: "FK_ProgressImageSquares_ProgressImages_ProgressImageId",
                        column: x => x.ProgressImageId,
                        principalTable: "ProgressImages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProgressImageSquares_Squares_SquareId",
                        column: x => x.SquareId,
                        principalTable: "Squares",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProgressImages_UploadedByUserId",
                table: "ProgressImages",
                column: "UploadedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProgressImageSquares_SquareId",
                table: "ProgressImageSquares",
                column: "SquareId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProgressImageSquares");

            migrationBuilder.DropTable(
                name: "ProgressImages");
        }
    }
}
