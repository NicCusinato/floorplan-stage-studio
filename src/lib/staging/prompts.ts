// ─── Prompt templates for AI staging ───────────────────────────────────────────

import type { RoomType, DesignStyle } from "./types";

// ─── Negative prompts (universal) ──────────────────────────────────────────────

export const NEGATIVE_PROMPTS = [
  "cartoon",
  "surreal",
  "warped walls",
  "distorted furniture",
  "duplicate items",
  "low detail",
  "oversaturated",
  "artificial textures",
  "blurry",
  "watermark",
  "text",
  "logo",
  "people",
  "animals",
  "unrealistic shadows",
  "floating objects",
  "mismatched perspective",
  "lens distortion",
  "chromatic aberration",
].join(", ");

// ─── Base prompts by room type ─────────────────────────────────────────────────

const ROOM_BASE: Record<RoomType, string> = {
  LIVINGROOM:  "spacious living room with natural lighting",
  BEDROOM:     "comfortable bedroom with ambient lighting",
  KITCHEN:     "modern kitchen with clean countertops",
  BATHROOM:    "clean bathroom with good lighting",
  DININGROOM:  "elegant dining room with seating",
  OFFICE:      "professional home office workspace",
  HALLWAY:     "welcoming hallway entry",
  NURSERY:     "bright and cheerful nursery",
  STUDIO:      "open-plan studio apartment",
  OUTDOOR:     "outdoor living space",
  GARAGE:      "organized garage space",
  BASEMENT:    "finished basement living area",
};

// ─── Style descriptors ─────────────────────────────────────────────────────────

const STYLE_DESC: Record<DesignStyle, string> = {
  MODERN:        "sleek contemporary furniture with clean lines, neutral palette with accent colors, minimalist decor, geometric shapes",
  SCANDINAVIAN:  "light wood furniture, white and grey palette, cozy textiles like sheepskin and knit throws, functional minimalism, hygge warmth",
  INDUSTRIAL:    "exposed brick walls, metal and iron accents, distressed leather furniture, Edison bulb lighting, raw concrete textures",
  BOHEMIAN:      "layered colorful textiles, macramé wall hangings, eclectic mix of patterns, lush indoor plants, rattan furniture",
  MIDCENTURY:    "iconic mid-century modern furniture with organic curves, warm walnut wood, retro color pops, tapered legs",
  FARMHOUSE:     "reclaimed wood furniture, shiplap accent walls, vintage decor, linen fabrics, mason jar accents, neutral earth tones",
  COASTAL:       "light blue and white palette, natural fiber rugs, driftwood accents, airy curtains, beach-inspired decor",
  TRADITIONAL:   "classic furniture with carved details, rich upholstery fabrics, symmetrical layout, crown molding, antique accessories",
  CONTEMPORARY:  "current design trends, bold accent pieces, mixed materials like glass and metal, statement lighting fixtures",
  MINIMALIST:    "sparse carefully curated furniture, monochromatic palette, clean negative space, hidden storage, simple forms",
  RUSTIC:        "natural wood beams, stone fireplace, handcrafted furniture, wool blankets, earthy warm tones",
  ARTDECO:       "geometric patterns, gold and brass accents, velvet upholstery, mirrored surfaces, glamorous chandelier",
  JAPANDI:       "Japanese and Scandinavian fusion, wabi-sabi aesthetics, natural materials, zen simplicity, muted earthy palette",
  MEDITERRANEAN: "terracotta tiles, wrought iron details, warm ochre and blue palette, arched doorways, olive branch decor",
  TRANSITIONAL:  "blend of traditional and modern elements, neutral palette, comfortable upholstered furniture, subtle patterns",
  FRENCHCOUNTRY: "distressed painted furniture, toile fabrics, lavender accents, wrought iron fixtures, romantic pastoral charm",
  LUXURYMODERN:  "high-end designer furniture, marble surfaces, custom millwork, statement art pieces, premium materials throughout",
  URBANMODERN:   "loft-style with concrete accents, curated contemporary art, modular furniture, industrial-chic lighting",
  WARMMINIMAL:   "minimalist forms with warm wood tones, soft textured fabrics, ambient lighting, organic shapes, earth palette",
  NEWBUILD:      "elevated builder-grade staging, neutral furniture that photographs well, bright and airy, universal appeal for home buyers",
};

// ─── Build a staging prompt ────────────────────────────────────────────────────

export function getPromptForStyle(style: DesignStyle, roomType: RoomType): string {
  const meta = STYLE_DESC[style];
  const room = ROOM_BASE[roomType];

  // Room decorator AI optimized prompt structure
  return `A highly detailed, photorealistic interior design of a ${room}, styled in ${style} design. 
${meta} 
The room should be well-lit, featuring professional architectural photography lighting, natural sunlight from windows, 8k resolution, highly detailed textures, interior design magazine quality. 
Empty base floor plan geometry provided, fill the space organically with appropriate furniture, rugs, plants, and decor. 
Camera angle is standard interior wide shot.`;
}

export const NEGATIVE_PROMPT = "low resolution, ugly, blurry, watermarks, text, oversaturated, deformed furniture, physically inaccurate architecture, weird geometry, cartoon, rendering artifacts, unappealing lighting, messy, cluttered";

export interface PromptOptions {
  roomType: RoomType;
  designStyle: DesignStyle;
  customPrompt?: string;
  promptPrefix?: string;
  promptSuffix?: string;
  isRemodel?: boolean;
  targetColor?: string;
  mode?: "stage" | "redesign" | "recolor_wall" | "recolor_cabinet" | "remodel" | "remove";
}

export function buildStagingPrompt(options: PromptOptions): string {
  const {
    roomType,
    designStyle,
    customPrompt,
    promptPrefix,
    promptSuffix,
    isRemodel,
    targetColor,
    mode = "stage",
  } = options;

  // If user provided a full custom prompt, use it with optional prefix/suffix
  if (customPrompt) {
    const parts = [promptPrefix, customPrompt, promptSuffix].filter(Boolean);
    return parts.join(". ") + ". Photorealistic, high resolution, professional interior photography.";
  }

  const roomBase = ROOM_BASE[roomType];
  const styleDesc = STYLE_DESC[designStyle];

  let prompt: string;

  switch (mode) {
    case "recolor_wall":
      prompt = `Change the wall color of this ${roomBase} to ${targetColor || "a warm neutral tone"}. Keep all furniture, flooring, and architectural details exactly the same. Only modify the wall paint color. Photorealistic result.`;
      break;

    case "recolor_cabinet":
      prompt = `Change the kitchen cabinet color to ${targetColor || "matte white"}. Keep all other elements including countertops, backsplash, flooring, and appliances exactly the same. Photorealistic result.`;
      break;

    case "remodel":
      prompt = `Photorealistic ${isRemodel ? "remodel" : "renovation"} of this ${roomBase}. ${styleDesc}. Show the fully renovated space with new fixtures, finishes, and materials. Professional architectural photography quality.`;
      break;

    case "remove":
      prompt = `Remove all clutter and unnecessary objects from this room. Keep the room structure, walls, flooring, and permanent fixtures intact. Clean, empty, ready-to-stage appearance. Photorealistic.`;
      break;

    case "redesign":
      prompt = `Redesign this ${roomBase} in a completely new style: ${styleDesc}. Replace all existing furniture and decor while keeping the room's architecture (walls, windows, doors, flooring) intact. Photorealistic, magazine-quality interior photography, professional staging.`;
      break;

    case "stage":
    default:
      prompt = `Photorealistic professional virtual staging of an empty ${roomBase}. Style: ${styleDesc}. Add appropriate furniture, decor, and accessories. Maintain the room's existing architecture, walls, windows, and flooring. Natural daylight, realistic shadows, magazine-quality interior design photography. High resolution, sharp details.`;
      break;
  }

  const parts = [promptPrefix, prompt, promptSuffix].filter(Boolean);
  return parts.join(". ");
}

// ─── Provider-specific prompt wrappers ─────────────────────────────────────────

export function wrapPromptForProvider(prompt: string, provider: "openai" | "gemini" | "flux"): string {
  switch (provider) {
    case "openai":
      // GPT Image works best with detailed, descriptive prompts
      return `${prompt} Ultra-high quality, 8K resolution, professional DSLR photography.`;

    case "gemini":
      // Gemini Imagen responds well to structured prompts
      return `${prompt} Style: professional real estate photography. Quality: ultra high definition.`;

    case "flux":
      // FLUX excels with concise, keyword-rich prompts
      return `${prompt}, professional interior photography, 8k uhd, photorealistic, sharp focus, architectural digest quality`;

    default:
      return prompt;
  }
}

// ─── Claude analysis prompt ────────────────────────────────────────────────────

export const CLAUDE_ANALYSIS_PROMPT = `Analyze this room image for virtual staging. Return a JSON object with these fields:

{
  "roomType": "one of: LIVINGROOM, BEDROOM, KITCHEN, BATHROOM, DININGROOM, OFFICE, HALLWAY, NURSERY, STUDIO, OUTDOOR",
  "estimatedDimensions": {
    "widthFt": number,
    "lengthFt": number,
    "ceilingHeightFt": number
  },
  "lightingDescription": "describe the lighting conditions",
  "flooringType": "describe the flooring material and color",
  "wallColor": "describe the wall color",
  "existingFurniture": ["list", "of", "visible", "furniture"],
  "architecturalFeatures": ["list", "of", "features", "like windows, doors, built-ins"],
  "suggestedStyles": ["top 3 design styles that would work well"],
  "suggestedPrompt": "a detailed staging prompt optimized for this specific room",
  "confidence": 0.0 to 1.0
}

Be precise about dimensions based on standard reference objects visible in the image. Focus on details that will help an AI image generator produce the most realistic staged version of this room.`;
