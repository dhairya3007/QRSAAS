namespace MyPlatform.Domain.Common;

public class ThemePreview
{
    public string HeaderBg { get; set; } = string.Empty;
    public string PageBg { get; set; } = string.Empty;
    public string CardBg { get; set; } = string.Empty;
    public string TextColor { get; set; } = string.Empty;
    public string AccentColor { get; set; } = string.Empty;
    public string? BtnBg { get; set; }
    public string? BtnText { get; set; }
}

public class ThemeDefinition
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Emoji { get; set; } = "🎨";
    public string Description { get; set; } = string.Empty;
    public string ServiceType { get; set; } = string.Empty; // "restaurant_menu" or "personal_qr"
    public string Layout { get; set; } = "list";            // "list", "tabs", "minimal", "glass", "classic", "cover", "left", "center"
    public ThemePreview Preview { get; set; } = new();
}

public static class ThemeCatalog
{
    /// <summary>
    /// Developer Theme Registry:
    /// To add a new theme in the future, simply add a new ThemeDefinition to this list!
    /// It will automatically reflect in the API and across all frontend dashboards.
    /// </summary>
    public static readonly List<ThemeDefinition> AllThemes = new()
    {
        // ==========================================
        // 🍽️ RESTAURANT MENU THEMES
        // ==========================================
        new ThemeDefinition
        {
            Id = "modern",
            Name = "Modern Dark",
            Emoji = "🌙",
            Description = "Sleek dark UI with pink accents",
            ServiceType = "restaurant_menu",
            Layout = "list",
            Preview = new ThemePreview
            {
                HeaderBg = "linear-gradient(135deg, #ec4899, #f472b6)",
                PageBg = "#111827",
                CardBg = "rgba(31,41,55,0.8)",
                TextColor = "#f3f4f6",
                AccentColor = "#ec4899"
            }
        },
        new ThemeDefinition
        {
            Id = "light",
            Name = "Light & Clean",
            Emoji = "☀️",
            Description = "Bright white with blue accents",
            ServiceType = "restaurant_menu",
            Layout = "list",
            Preview = new ThemePreview
            {
                HeaderBg = "linear-gradient(135deg, #3b82f6, #93c5fd)",
                PageBg = "#ffffff",
                CardBg = "#f3f4f6",
                TextColor = "#1f2937",
                AccentColor = "#3b82f6"
            }
        },
        new ThemeDefinition
        {
            Id = "classic",
            Name = "Classic Elegance",
            Emoji = "🍂",
            Description = "Warm browns with circular dish images",
            ServiceType = "restaurant_menu",
            Layout = "list",
            Preview = new ThemePreview
            {
                HeaderBg = "linear-gradient(135deg, #8b5a2b, #d2b48c)",
                PageBg = "#fff8dc",
                CardBg = "#ffffff",
                TextColor = "#3e2723",
                AccentColor = "#8b5a2b"
            }
        },
        new ThemeDefinition
        {
            Id = "luxury",
            Name = "Luxury Navy & Gold",
            Emoji = "👑",
            Description = "Dark navy with gold accents — tab layout",
            ServiceType = "restaurant_menu",
            Layout = "tabs",
            Preview = new ThemePreview
            {
                HeaderBg = "linear-gradient(135deg, #020617, #0f172a)",
                PageBg = "#0f172a",
                CardBg = "#1e293b",
                TextColor = "#fef3c7",
                AccentColor = "#fbbf24"
            }
        },
        new ThemeDefinition
        {
            Id = "elegant",
            Name = "Monochrome Minimal",
            Emoji = "🖤",
            Description = "Black & white minimalist — tab layout",
            ServiceType = "restaurant_menu",
            Layout = "tabs",
            Preview = new ThemePreview
            {
                HeaderBg = "#000000",
                PageBg = "#ffffff",
                CardBg = "transparent",
                TextColor = "#000000",
                AccentColor = "#000000"
            }
        },
        new ThemeDefinition
        {
            Id = "neon",
            Name = "Cyberpunk Neon",
            Emoji = "⚡",
            Description = "Black background with electric green accents",
            ServiceType = "restaurant_menu",
            Layout = "list",
            Preview = new ThemePreview
            {
                HeaderBg = "linear-gradient(135deg, #000000, #111111)",
                PageBg = "#000000",
                CardBg = "rgba(57,255,20,0.06)",
                TextColor = "#ffffff",
                AccentColor = "#39ff14"
            }
        },
        new ThemeDefinition
        {
            Id = "nature",
            Name = "Organic Nature",
            Emoji = "🌿",
            Description = "Fresh greens with rounded leaf shapes",
            ServiceType = "restaurant_menu",
            Layout = "list",
            Preview = new ThemePreview
            {
                HeaderBg = "linear-gradient(135deg, #15803d, #22c55e)",
                PageBg = "#f0fdf4",
                CardBg = "#ffffff",
                TextColor = "#14532d",
                AccentColor = "#15803d"
            }
        },
        new ThemeDefinition
        {
            Id = "sunset",
            Name = "Sunset Gradient",
            Emoji = "🌅",
            Description = "Warm orange-red with ticket-style cards",
            ServiceType = "restaurant_menu",
            Layout = "list",
            Preview = new ThemePreview
            {
                HeaderBg = "linear-gradient(135deg, #f97316, #e11d48)",
                PageBg = "#fff7ed",
                CardBg = "linear-gradient(135deg, #ffffff, #ffedd5)",
                TextColor = "#7c2d12",
                AccentColor = "#f97316"
            }
        },
        new ThemeDefinition
        {
            Id = "retro",
            Name = "Retro Blocky",
            Emoji = "🎮",
            Description = "Bold comic-style cards on blue background",
            ServiceType = "restaurant_menu",
            Layout = "list",
            Preview = new ThemePreview
            {
                HeaderBg = "#eab308",
                PageBg = "#3b82f6",
                CardBg = "#ffffff",
                TextColor = "#000000",
                AccentColor = "#eab308"
            }
        },
        new ThemeDefinition
        {
            Id = "compact",
            Name = "Compact List",
            Emoji = "📋",
            Description = "Image-left compact rows — great for long menus",
            ServiceType = "restaurant_menu",
            Layout = "list",
            Preview = new ThemePreview
            {
                HeaderBg = "linear-gradient(135deg, #6366f1, #4f46e5)",
                PageBg = "#f8fafc",
                CardBg = "#ffffff",
                TextColor = "#334155",
                AccentColor = "#6366f1"
            }
        },

        // ==========================================
        // 📇 PERSONAL QR CARD THEMES
        // ==========================================
        new ThemeDefinition
        {
            Id = "minimal",
            Name = "Minimal White",
            Emoji = "🤍",
            Description = "Clean white with indigo accents",
            ServiceType = "personal_qr",
            Layout = "minimal",
            Preview = new ThemePreview
            {
                HeaderBg = "linear-gradient(135deg, #4f46e5, #7c3aed)",
                PageBg = "#f8fafc",
                CardBg = "#ffffff",
                TextColor = "#1e293b",
                AccentColor = "#4f46e5",
                BtnBg = "#4f46e5",
                BtnText = "#ffffff"
            }
        },
        new ThemeDefinition
        {
            Id = "dark",
            Name = "Dark Mode",
            Emoji = "🌑",
            Description = "Deep dark with purple glow",
            ServiceType = "personal_qr",
            Layout = "glass",
            Preview = new ThemePreview
            {
                HeaderBg = "linear-gradient(135deg, #1e1b4b, #312e81)",
                PageBg = "#0f0f0f",
                CardBg = "rgba(26, 26, 46, 0.4)",
                TextColor = "#e2e8f0",
                AccentColor = "#818cf8",
                BtnBg = "#6d28d9",
                BtnText = "#ffffff"
            }
        },
        new ThemeDefinition
        {
            Id = "neon",
            Name = "Neon Glow",
            Emoji = "💜",
            Description = "Dark with hot-pink neon borders",
            ServiceType = "personal_qr",
            Layout = "glass",
            Preview = new ThemePreview
            {
                HeaderBg = "linear-gradient(135deg, #0f0f0f, #1a0a2e)",
                PageBg = "#0f0f0f",
                CardBg = "rgba(255,0,128,0.05)",
                TextColor = "#ffffff",
                AccentColor = "#ff0080",
                BtnBg = "transparent",
                BtnText = "#ff0080"
            }
        },
        new ThemeDefinition
        {
            Id = "corporate",
            Name = "Corporate Blue",
            Emoji = "💼",
            Description = "Professional navy for business profiles",
            ServiceType = "personal_qr",
            Layout = "classic",
            Preview = new ThemePreview
            {
                HeaderBg = "linear-gradient(135deg, #1e3a8a, #2563eb)",
                PageBg = "#f0f4f8",
                CardBg = "#ffffff",
                TextColor = "#1e3a8a",
                AccentColor = "#2563eb",
                BtnBg = "#1e3a8a",
                BtnText = "#ffffff"
            }
        },
        new ThemeDefinition
        {
            Id = "vibrant",
            Name = "Vibrant Gradient",
            Emoji = "🌈",
            Description = "Eye-catching rainbow gradient header",
            ServiceType = "personal_qr",
            Layout = "cover",
            Preview = new ThemePreview
            {
                HeaderBg = "linear-gradient(135deg, #f97316, #ec4899, #8b5cf6)",
                PageBg = "#ffffff",
                CardBg = "#f9fafb",
                TextColor = "#111827",
                AccentColor = "#ec4899",
                BtnBg = "linear-gradient(135deg, #f97316, #ec4899)",
                BtnText = "#ffffff"
            }
        },
        new ThemeDefinition
        {
            Id = "sunset",
            Name = "Sunset Warm",
            Emoji = "🌅",
            Description = "Warm orange-red gradient energy",
            ServiceType = "personal_qr",
            Layout = "classic",
            Preview = new ThemePreview
            {
                HeaderBg = "linear-gradient(135deg, #f97316, #dc2626)",
                PageBg = "#fff7ed",
                CardBg = "#ffffff",
                TextColor = "#7c2d12",
                AccentColor = "#f97316",
                BtnBg = "#f97316",
                BtnText = "#ffffff"
            }
        },
        new ThemeDefinition
        {
            Id = "forest",
            Name = "Forest Green",
            Emoji = "🌲",
            Description = "Nature-inspired deep greens",
            ServiceType = "personal_qr",
            Layout = "left",
            Preview = new ThemePreview
            {
                HeaderBg = "linear-gradient(135deg, #14532d, #15803d)",
                PageBg = "#f0fdf4",
                CardBg = "#ffffff",
                TextColor = "#14532d",
                AccentColor = "#15803d",
                BtnBg = "#15803d",
                BtnText = "#ffffff"
            }
        },
        new ThemeDefinition
        {
            Id = "ocean",
            Name = "Deep Ocean",
            Emoji = "🌊",
            Description = "Calm deep-blue teal ocean vibes",
            ServiceType = "personal_qr",
            Layout = "cover",
            Preview = new ThemePreview
            {
                HeaderBg = "linear-gradient(135deg, #0c4a6e, #0891b2)",
                PageBg = "#ecfeff",
                CardBg = "#ffffff",
                TextColor = "#0c4a6e",
                AccentColor = "#0891b2",
                BtnBg = "#0891b2",
                BtnText = "#ffffff"
            }
        },
        new ThemeDefinition
        {
            Id = "luxury",
            Name = "Black & Gold",
            Emoji = "🥇",
            Description = "Premium black with gold accents",
            ServiceType = "personal_qr",
            Layout = "center",
            Preview = new ThemePreview
            {
                HeaderBg = "linear-gradient(135deg, #000000, #111111)",
                PageBg = "#0a0a0a",
                CardBg = "#1a1a1a",
                TextColor = "#fbbf24",
                AccentColor = "#fbbf24",
                BtnBg = "#fbbf24",
                BtnText = "#000000"
            }
        },
        new ThemeDefinition
        {
            Id = "pastel",
            Name = "Soft Pastel",
            Emoji = "🌸",
            Description = "Gentle pink-lavender pastel tones",
            ServiceType = "personal_qr",
            Layout = "glass",
            Preview = new ThemePreview
            {
                HeaderBg = "linear-gradient(135deg, #e879f9, #a78bfa)",
                PageBg = "#fdf4ff",
                CardBg = "rgba(255, 255, 255, 0.4)",
                TextColor = "#581c87",
                AccentColor = "#a855f7",
                BtnBg = "#a855f7",
                BtnText = "#ffffff"
            }
        },
        new ThemeDefinition
        {
            Id = "navratri_nights",
            Name = "Navratri Nights",
            Emoji = "🥁",
            Description = "Deep festive night with glowing Garba colors",
            ServiceType = "personal_qr",
            Layout = "glass",
            Preview = new ThemePreview
            {
                HeaderBg = "linear-gradient(135deg, rgba(225,29,72,0.8), rgba(217,119,6,0.8), rgba(22,163,74,0.8))",
                PageBg = "linear-gradient(rgba(17, 10, 31, 0.7), rgba(17, 10, 31, 0.7)), url('/navratri_bg.jpg') center/cover fixed",
                CardBg = "rgba(30, 20, 50, 0.6)",
                TextColor = "#fef3c7",
                AccentColor = "#fbbf24",
                BtnBg = "#e11d48",
                BtnText = "#ffffff"
            }
        },
        new ThemeDefinition
        {
            Id = "navratri_festive",
            Name = "Navratri Festive",
            Emoji = "🪔",
            Description = "Bright and traditional Indian festive colors",
            ServiceType = "personal_qr",
            Layout = "glass",
            Preview = new ThemePreview
            {
                HeaderBg = "linear-gradient(135deg, rgba(194,65,12,0.6), rgba(185,28,28,0.6))",
                PageBg = "linear-gradient(rgba(255, 251, 235, 0.4), rgba(255, 251, 235, 0.4)), url('/navratri_bg.jpg') center/cover fixed",
                CardBg = "rgba(255, 255, 255, 0.45)",
                TextColor = "#7c2d12",
                AccentColor = "#c2410c",
                BtnBg = "#c2410c",
                BtnText = "#ffffff"
            }
        }
    };

    public static List<ThemeDefinition> GetByService(string serviceType) =>
        AllThemes.Where(t => t.ServiceType.Equals(serviceType, StringComparison.OrdinalIgnoreCase)).ToList();

    public static ThemeDefinition? GetById(string id) =>
        AllThemes.FirstOrDefault(t => t.Id.Equals(id, StringComparison.OrdinalIgnoreCase));
}
