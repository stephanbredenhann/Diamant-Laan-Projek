using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DiamantLaan.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddGuestPurchases : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GuestEmail",
                table: "Purchases",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GuestIpHash",
                table: "Purchases",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GuestTokenHash",
                table: "Purchases",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsGuest",
                table: "AspNetUsers",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_Purchases_GuestTokenHash",
                table: "Purchases",
                column: "GuestTokenHash");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Purchases_GuestTokenHash",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "GuestEmail",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "GuestIpHash",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "GuestTokenHash",
                table: "Purchases");

            migrationBuilder.DropColumn(
                name: "IsGuest",
                table: "AspNetUsers");
        }
    }
}
