using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DiamantLaan.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddStadsbouers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "StadsbouersEnabled",
                table: "SiteSettings",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "Stadsbouers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    About = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    Email = table.Column<string>(type: "TEXT", maxLength: 254, nullable: true),
                    PhotoPath = table.Column<string>(type: "TEXT", maxLength: 260, nullable: true),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Stadsbouers", x => x.Id);
                });

            // Raw ADD COLUMN ... REFERENCES: AddForeignKey makes EF rebuild PurchaseSquares on SQLite.
            migrationBuilder.Sql("ALTER TABLE \"PurchaseSquares\" ADD COLUMN \"StadsbouerId\" INTEGER NULL REFERENCES \"Stadsbouers\" (\"Id\") ON DELETE RESTRICT;");

            migrationBuilder.UpdateData(
                table: "SiteSettings",
                keyColumn: "Id",
                keyValue: 1,
                column: "StadsbouersEnabled",
                value: true);

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseSquares_StadsbouerId",
                table: "PurchaseSquares",
                column: "StadsbouerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseSquares_Stadsbouers_StadsbouerId",
                table: "PurchaseSquares");

            migrationBuilder.DropTable(
                name: "Stadsbouers");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseSquares_StadsbouerId",
                table: "PurchaseSquares");

            migrationBuilder.DropColumn(
                name: "StadsbouersEnabled",
                table: "SiteSettings");

            migrationBuilder.DropColumn(
                name: "StadsbouerId",
                table: "PurchaseSquares");
        }
    }
}
