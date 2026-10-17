using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyPlatform.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDynamicCtaFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "CallToActionLinks",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ConfigJson",
                table: "CallToActionLinks",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "CallToActionLinks",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Category",
                table: "CallToActionLinks");

            migrationBuilder.DropColumn(
                name: "ConfigJson",
                table: "CallToActionLinks");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "CallToActionLinks");
        }
    }
}
