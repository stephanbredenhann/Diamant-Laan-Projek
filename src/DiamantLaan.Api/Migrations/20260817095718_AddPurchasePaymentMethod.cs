using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DiamantLaan.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPurchasePaymentMethod : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PaymentMethod",
                table: "Purchases",
                type: "TEXT",
                maxLength: 10,
                nullable: true);

            // Existing telefoniese aankope predate the method choice; they were all EFT.
            migrationBuilder.Sql(
                "UPDATE Purchases SET PaymentMethod = 'EFT' " +
                "WHERE PaymentStatus = 1 AND (PayFastPaymentId IS NULL OR PayFastPaymentId = '')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PaymentMethod",
                table: "Purchases");
        }
    }
}
