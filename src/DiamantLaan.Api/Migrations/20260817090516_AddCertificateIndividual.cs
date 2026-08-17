using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DiamantLaan.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCertificateIndividual : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "CertificateIndividual",
                table: "AspNetUsers",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            // The mode used to be derived: any block carrying its own name meant "one per block".
            // Carry that reading across so nobody's certificates change shape on deploy.
            migrationBuilder.Sql("""
                UPDATE AspNetUsers SET CertificateIndividual = 1
                WHERE Id IN (SELECT OwnerId FROM Squares WHERE CertificateName IS NOT NULL AND OwnerId IS NOT NULL);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CertificateIndividual",
                table: "AspNetUsers");
        }
    }
}
