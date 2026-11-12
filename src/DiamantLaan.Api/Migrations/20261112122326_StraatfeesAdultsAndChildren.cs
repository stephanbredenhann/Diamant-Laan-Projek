using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DiamantLaan.Api.Migrations
{
    /// <inheritdoc />
    public partial class StraatfeesAdultsAndChildren : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Orders placed before the split were all full-price tickets, so they become adults.
            migrationBuilder.RenameColumn(
                name: "Quantity",
                table: "StraatfeesOrders",
                newName: "Adults");

            migrationBuilder.RenameColumn(
                name: "UnitPrice",
                table: "StraatfeesOrders",
                newName: "AdultUnitPrice");

            migrationBuilder.AddColumn<int>(
                name: "Children",
                table: "StraatfeesOrders",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "ChildUnitPrice",
                table: "StraatfeesOrders",
                type: "TEXT",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Children",
                table: "StraatfeesOrders");

            migrationBuilder.DropColumn(
                name: "ChildUnitPrice",
                table: "StraatfeesOrders");

            migrationBuilder.RenameColumn(
                name: "Adults",
                table: "StraatfeesOrders",
                newName: "Quantity");

            migrationBuilder.RenameColumn(
                name: "AdultUnitPrice",
                table: "StraatfeesOrders",
                newName: "UnitPrice");
        }
    }
}
