namespace MyPlatform.Application.DTOs.Clients;

public class BusinessDetailsDto
{
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string? Logo { get; set; }
    public string Theme { get; set; } = "modern";
}

public class ClientDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public List<string> Services { get; set; } = new();
    public Dictionary<string, int> ServiceDurations { get; set; } = new();
    public Dictionary<string, string> ServiceExpiries { get; set; } = new();
    public string ExpireAt { get; set; } = string.Empty;
    public string QrToken { get; set; } = string.Empty;
    public string? PersonalQrToken { get; set; }
    public string Theme { get; set; } = "modern";
    public bool ThemeUpdated { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsServiceSuspended { get; set; }
    public List<string> SuspendedServices { get; set; } = new();
    public List<string> CompletedSetups { get; set; } = new();
    public bool IsSetupComplete { get; set; }
    public int ScanCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public BusinessDetailsDto? BusinessDetails { get; set; }
}

public class CreateClientRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Password { get; set; }
    public List<string> Services { get; set; } = new();
    public Dictionary<string, int>? ServiceDurations { get; set; }
}

public class UpdateClientRequestDto
{
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string? Password { get; set; }
    public List<string>? Services { get; set; }
    public Dictionary<string, int>? ServiceDurations { get; set; }
}
