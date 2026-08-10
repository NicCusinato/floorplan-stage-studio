// ─── Shared types for the multi-provider AI staging engine ─────────────────────

export type StagingProvider = "openai" | "gemini" | "flux" | "claude";

export type RoomType =
  | "LIVINGROOM"
  | "BEDROOM"
  | "KITCHEN"
  | "BATHROOM"
  | "DININGROOM"
  | "OFFICE"
  | "HALLWAY"
  | "NURSERY"
  | "STUDIO"
  | "OUTDOOR"
  | "GARAGE"
  | "BASEMENT";

export type DesignStyle =
  | "MODERN"
  | "SCANDINAVIAN"
  | "INDUSTRIAL"
  | "BOHEMIAN"
  | "MIDCENTURY"
  | "FARMHOUSE"
  | "COASTAL"
  | "TRADITIONAL"
  | "CONTEMPORARY"
  | "MINIMALIST"
  | "RUSTIC"
  | "ARTDECO"
  | "JAPANDI"
  | "MEDITERRANEAN"
  | "TRANSITIONAL"
  | "FRENCHCOUNTRY"
  | "LUXURYMODERN"
  | "URBANMODERN"
  | "WARMMINIMAL"
  | "NEWBUILD";

export type StagingMode =
  | "stage_empty"       // Empty room → furnished
  | "redesign"          // Furnished room → different style
  | "wall_recolor"      // Change wall color
  | "cabinet_recolor"   // Change cabinet color
  | "remodel_kitchen"   // Kitchen remodel visualization
  | "remodel_bathroom"  // Bathroom remodel visualization
  | "remove_objects"    // Remove clutter
  | "upscale"           // Enhance resolution
  | "analyze";          // Room analysis (Claude)

export interface StagingRequest {
  mode: StagingMode;
  provider: StagingProvider;
  inputImagePath: string;        // Path to the room image
  roomType: RoomType;
  designStyle: DesignStyle;
  prompt?: string;               // Custom user prompt
  promptPrefix?: string;
  promptSuffix?: string;
  negativePrompt?: string;
  seed?: number;
  guidanceScale?: number;
  numImages?: number;            // 1-4
  targetColor?: string;          // For recolor modes (hex)
  quality?: "low" | "medium" | "high";
  resolution?: { width: number; height: number };
}

export interface StagingResult {
  success: boolean;
  provider: StagingProvider;
  images: GeneratedImage[];
  analysis?: RoomAnalysis;       // From Claude/GPT analysis
  costUsd: number;
  durationMs: number;
  error?: string;
  metadata: Record<string, unknown>;
}

export interface GeneratedImage {
  url?: string;                  // Remote URL (temporary)
  localPath?: string;            // Saved local path
  base64?: string;               // Base64 encoded
  width: number;
  height: number;
  format: "png" | "jpeg" | "webp";
  promptUsed: string;
  seed?: number;
}

export interface RoomAnalysis {
  roomType: RoomType;
  estimatedDimensions?: {
    widthFt: number;
    lengthFt: number;
    ceilingHeightFt: number;
  };
  lightingDescription: string;
  flooringType: string;
  wallColor: string;
  existingFurniture: string[];
  architecturalFeatures: string[];
  suggestedStyles: DesignStyle[];
  suggestedPrompt: string;
  confidence: number;
}

export interface ProviderCapabilities {
  canGenerate: boolean;     // Generate images from prompt
  canEdit: boolean;         // Edit/inpaint existing images
  canAnalyze: boolean;      // Analyze room via vision
  canUpscale: boolean;      // Upscale images
  canRecolor: boolean;      // Wall/cabinet recolor
  maxImages: number;        // Max images per request
  maxResolution: { width: number; height: number };
  costPerImage: { low: number; medium: number; high: number }; // USD estimates
}

export interface ProviderStatus {
  provider: StagingProvider;
  available: boolean;
  hasApiKey: boolean;
  capabilities: ProviderCapabilities;
  error?: string;
}

// ─── Design style display metadata ─────────────────────────────────────────────

export const DESIGN_STYLE_META: Record<DesignStyle, { label: string; emoji: string; description: string }> = {
  MODERN:          { label: "Modern",          emoji: "🏢", description: "Clean lines, neutral palette, sleek furniture" },
  SCANDINAVIAN:    { label: "Scandinavian",    emoji: "🌲", description: "Light wood, white walls, cozy minimalism" },
  INDUSTRIAL:      { label: "Industrial",      emoji: "⚙️",  description: "Exposed brick, metal accents, raw textures" },
  BOHEMIAN:        { label: "Bohemian",        emoji: "🌈", description: "Colorful, layered textiles, eclectic mix" },
  MIDCENTURY:      { label: "Mid-Century",     emoji: "🪑", description: "Retro curves, warm wood, iconic furniture" },
  FARMHOUSE:       { label: "Farmhouse",       emoji: "🏡", description: "Rustic charm, shiplap, natural materials" },
  COASTAL:         { label: "Coastal",         emoji: "🏖️",  description: "Beach vibes, light blues, natural textures" },
  TRADITIONAL:     { label: "Traditional",     emoji: "🏛️",  description: "Classic elegance, rich fabrics, symmetry" },
  CONTEMPORARY:    { label: "Contemporary",    emoji: "✨", description: "Current trends, bold accents, mixed materials" },
  MINIMALIST:      { label: "Minimalist",      emoji: "◻️",  description: "Less is more, clean spaces, monochrome" },
  RUSTIC:          { label: "Rustic",          emoji: "🪵", description: "Natural wood, stone, earthy warmth" },
  ARTDECO:         { label: "Art Deco",        emoji: "💎", description: "Geometric patterns, gold accents, glamour" },
  JAPANDI:         { label: "Japandi",         emoji: "🎋", description: "Japanese + Scandinavian fusion, zen calm" },
  MEDITERRANEAN:   { label: "Mediterranean",   emoji: "🏺", description: "Warm colors, terracotta, wrought iron" },
  TRANSITIONAL:    { label: "Transitional",    emoji: "🔄", description: "Blend of traditional and contemporary" },
  FRENCHCOUNTRY:   { label: "French Country",  emoji: "🥐", description: "Elegant rustic, soft colors, antique pieces" },
  LUXURYMODERN:    { label: "Luxury Modern",   emoji: "👑", description: "High-end finishes, statement pieces, opulent" },
  URBANMODERN:     { label: "Urban Modern",    emoji: "🌃", description: "City loft style, concrete, curated art" },
  WARMMINIMAL:     { label: "Warm Minimal",    emoji: "🕯️",  description: "Minimalist with warm tones and textures" },
  NEWBUILD:        { label: "New Build",       emoji: "🔨", description: "Builder-grade elevated, neutral staging" },
};

export const ROOM_TYPE_META: Record<RoomType, { label: string; emoji: string }> = {
  LIVINGROOM:  { label: "Living Room",  emoji: "🛋️" },
  BEDROOM:     { label: "Bedroom",      emoji: "🛏️" },
  KITCHEN:     { label: "Kitchen",      emoji: "🍳" },
  BATHROOM:    { label: "Bathroom",     emoji: "🚿" },
  DININGROOM:  { label: "Dining Room",  emoji: "🍽️" },
  OFFICE:      { label: "Office",       emoji: "💼" },
  HALLWAY:     { label: "Hallway",      emoji: "🚪" },
  NURSERY:     { label: "Nursery",      emoji: "🍼" },
  STUDIO:      { label: "Studio",       emoji: "🎨" },
  OUTDOOR:     { label: "Outdoor",      emoji: "🌿" },
  GARAGE:      { label: "Garage",       emoji: "🚗" },
  BASEMENT:    { label: "Basement",     emoji: "⬇️" },
};
