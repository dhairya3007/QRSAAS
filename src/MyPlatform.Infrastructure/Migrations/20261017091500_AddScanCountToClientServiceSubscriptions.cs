using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyPlatform.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddScanCountToClientServiceSubscriptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ScanCount",
                table: "ClientServiceSubscriptions",
                type: "int",
                nullable: false,
                defaultValue: 0);

            // Populate existing scan counts for single-service clients so scan history is preserved
            migrationBuilder.Sql(@"
                UPDATE s
                SET s.ScanCount = c.ScanCount
                FROM ClientServiceSubscriptions s
                INNER JOIN Clients c ON s.ClientId = c.Id
                WHERE (SELECT COUNT(*) FROM ClientServiceSubscriptions sub WHERE sub.ClientId = c.Id) = 1;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ScanCount",
                table: "ClientServiceSubscriptions");
        }
    }
}
