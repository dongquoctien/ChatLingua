# Shop Assets Structure

This directory contains all visual and audio assets for the shop system.

## Directory Structure

```
shop/
├── avatar-frames/      # Frame overlays for user avatars
├── avatar-effects/     # Animated effects around avatars
├── avatar-badges/      # Small badge icons displayed on avatars
├── profile-themes/     # Color themes and styling for profiles
├── profile-banners/    # Header banner images for profiles
├── name-effects/       # Text effects for username display
├── chat-bubbles/       # Custom chat message bubble styles
├── emoji-packs/        # Sets of custom emojis
├── sticker-packs/      # Sets of stickers for chat
├── game-themes/        # Visual themes for games
├── card-backs/         # Card back designs for matching games
├── sound-packs/        # Audio effects and themes
├── boosters/           # Icons for booster items
├── titles/             # Badge/icon for special titles
├── pets/               # Pet sprites and animations
└── bundles/            # Preview images for item bundles
```

## Naming Conventions

### General Format
```
{slug}.{extension}
{slug}-preview.{extension}  (for preview/thumbnail images)
{slug}-{variant}.{extension}  (for variations)
```

### File Types by Category

| Category | Format | Size | Notes |
|----------|--------|------|-------|
| avatar-frames | PNG/WebP | 200x200 | Transparent background, centered |
| avatar-effects | GIF/WebP | 200x200 | Animated, transparent background |
| avatar-badges | PNG/SVG | 48x48 | Small icons |
| profile-themes | JSON | - | CSS variable definitions |
| profile-banners | PNG/WebP | 1200x300 | High resolution |
| name-effects | CSS/JSON | - | Animation definitions |
| chat-bubbles | SVG/JSON | - | 9-slice scalable |
| emoji-packs | PNG/WebP | 64x64 | Per emoji |
| sticker-packs | PNG/WebP | 256x256 | Per sticker |
| game-themes | JSON + PNG | Varies | Theme config + assets |
| card-backs | PNG/WebP | 180x240 | Card ratio |
| sound-packs | MP3/OGG | - | < 1MB per file |
| boosters | PNG/SVG | 96x96 | Icon representation |
| titles | PNG/SVG | 200x48 | Title badge design |
| pets | PNG/GIF/Lottie | Varies | See pet structure below |
| bundles | PNG/WebP | 400x300 | Bundle preview |

## Pet Assets Structure

Pets have a more complex structure with multiple states:

```
pets/
├── {pet-slug}/
│   ├── idle.gif           # Default idle animation
│   ├── happy.gif          # Happy state
│   ├── hungry.gif         # Hungry state
│   ├── tired.gif          # Tired state
│   ├── playing.gif        # Playing animation
│   ├── eating.gif         # Eating animation
│   ├── sleeping.gif       # Sleeping animation
│   ├── evolution-1.gif    # First evolution stage
│   ├── evolution-2.gif    # Second evolution stage (if applicable)
│   └── preview.png        # Static preview for shop
```

## Profile Theme JSON Format

```json
{
  "name": "Ocean Blue",
  "colors": {
    "primary": "#0ea5e9",
    "secondary": "#0284c7",
    "background": "#f0f9ff",
    "text": "#0c4a6e",
    "accent": "#38bdf8"
  },
  "gradients": {
    "header": "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)"
  }
}
```

## Game Theme JSON Format

```json
{
  "name": "Neon Nights",
  "colors": {
    "background": "#0f0f23",
    "card": "#1a1a2e",
    "accent": "#ff00ff",
    "success": "#00ff00",
    "error": "#ff0000"
  },
  "cardBackImage": "game-themes/neon-nights-card.png",
  "sounds": {
    "match": "sound-packs/neon/match.mp3",
    "win": "sound-packs/neon/win.mp3"
  }
}
```

## Adding New Assets

1. Create the asset files following the naming conventions above
2. Add an entry in the database `shop_items` table with:
   - `asset_url`: Path to main asset (e.g., `/assets/shop/avatar-frames/golden-ring.png`)
   - `preview_url`: Path to preview image (e.g., `/assets/shop/avatar-frames/golden-ring-preview.png`)
   - `asset_data`: JSON with additional configuration if needed

## Rarity Visual Guidelines

Assets should have visual characteristics that reflect their rarity:

| Rarity | Visual Characteristics |
|--------|----------------------|
| Common | Simple, single color, minimal effects |
| Uncommon | Two colors, subtle glow |
| Rare | Three+ colors, moderate glow, simple animations |
| Epic | Vibrant colors, strong glow, complex animations |
| Legendary | Premium effects, particles, unique animations |

## Performance Considerations

- Keep GIF animations under 100 frames
- Use WebP for better compression when possible
- Provide multiple sizes for responsive display
- Use CSS animations over GIFs where possible
- Lazy load assets not immediately visible
