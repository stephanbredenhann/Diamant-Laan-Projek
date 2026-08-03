using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DiamantLaan.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddGuestClaimEmail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ClaimEmailSentAt",
                table: "Purchases",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ClaimTokenExpiresAt",
                table: "Purchases",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClaimTokenHash",
                table: "Purchases",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Purchases_ClaimTokenHash",
                table: "Purchases",
                column: "ClaimTokenHash");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Purchases_ClaimTokenHash",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "ClaimEmailSentAt",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "ClaimTokenExpiresAt",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "ClaimTokenHash",
                table: "Purchases");
        }
    }
}
