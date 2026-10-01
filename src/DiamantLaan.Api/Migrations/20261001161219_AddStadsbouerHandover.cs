using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DiamantLaan.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddStadsbouerHandover : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "HandedOverAt",
                table: "Stadsbouers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HandoverPhotoPath",
                table: "Stadsbouers",
                type: "TEXT",
                maxLength: 260,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HandedOverAt",
                table: "Stadsbouers");

            migrationBuilder.DropColumn(
                name: "HandoverPhotoPath",
                table: "Stadsbouers");
        }
    }
}
