import { fal } from "@fal-ai/client";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Configure fal client
if (process.env.FAL_KEY) {
  fal.config({ credentials: process.env.FAL_KEY });
}

export const FAL_AVAILABLE = !!process.env.FAL_KEY;

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

async function translateObjectEditPrompt(roomName: string, userCommand: string): Promise<string> {
  if (!genAI) return userCommand;
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `You are an expert AI prompt engineer for architectural real estate staging photography.
A user wants to edit an object in a photo of a ${roomName} with the command: "${userCommand}".
Diffusion image models FAIL on negative instructions (e.g. saying "remove grey chair" causes the model to draw a grey chair because the token 'grey chair' is in the prompt).
Translate the user's command into a POSITIVE visual scene description for an image-to-image AI model:
1. If removing an object (e.g., "remove grey chair", "remove plant"): Describe the area with that object GONE as open, clean space (e.g. "An open, uncluttered right corner next to the bed showing clear hardwood flooring and clean wall space. Empty corner, spacious walkway, no seating."). NEVER mention the removed object's name.
2. If replacing an object (e.g., "replace armchair with desk"): Describe the new object in its place clearly and concisely.
3. Keep the output under 30 words. Return ONLY the translated positive scene description string, nothing else.`;

    const res = await model.generateContent(prompt);
    const text = res.response.text()?.trim();
    return text || userCommand;
  } catch (err) {
    console.warn("[fal] Gemini prompt translation failed, using fallback:", err);
    return userCommand;
  }
}

// ── Model IDs ─────────────────────────────────────────────────────────────────
const MODEL_GENERATE_PREVIEW = "fal-ai/flux/schnell";        // ~3s, great for quick previews
const MODEL_GENERATE_QUALITY = "fal-ai/flux-pro/v1.1";
const MODEL_EDIT_RESTYLE = "fal-ai/flux/dev/image-to-image";
const MODEL_EDIT_INPAINT = "fal-ai/flux-general/inpainting";
const MODEL_EDIT_ANGLE = "fal-ai/flux-2-lora-gallery/multiple-angles";

// Rooms we never try to generate (too small / non-photogenic)
export const SKIP_ROOMS = new Set([
  "BATHROOM", "CLOSET", "CL", "UTILITY RM", "UTILITY",
  "LAUNDRY", "STORAGE", "CORRIDOR", "HALLWAY",
]);

// ── Prompt builder ────────────────────────────────────────────────────────────
function buildRoomPrompt(
  roomName: string,
  sqft: number,
  features: string[],
  style: string,
  wallColor: string,
  floorMaterial: string,
  cameraAngle: string = "doorway",
  spatial_layout: string = "",
  furniture_scale: string = "",
  camera_alignment: string = "",
  appliance_layout: string = "",
  adjacent_openings: string = "",
  fixed_fixtures_layout: string = ""
): string {
  const featureStr = features.length > 0 ? features.join(", ") : "natural light, clean layout";

  let anglePrompt = "Eye-level camera perspective from the doorway, wide angle shot showing the full room.";
  if (cameraAngle === "window") {
    anglePrompt = "Camera positioned near the window looking inward toward the room, bright backlight.";
  } else if (cameraAngle === "corner") {
    anglePrompt = "Dramatic wide-angle corner shot capturing the full diagonal depth of the room.";
  } else if (cameraAngle === "top-down") {
    anglePrompt = "Direct top-down bird's eye view from the ceiling, showing the layout of the furniture.";
  }

  const constraints = [
    spatial_layout ? `CRITICAL Room Shape: ${spatial_layout}. You must adhere strictly to this shape.` : "",
    camera_alignment ? `Camera Alignment: ${camera_alignment}.` : "",
    furniture_scale ? `Furniture constraints: ${furniture_scale}.` : "",
    appliance_layout ? `Appliance Layout: ${appliance_layout}. You must place these appliances exactly as described.` : "",
    fixed_fixtures_layout ? `FIXED ARCHITECTURAL FIXTURES & UNMOVABLE UTILITIES: ${fixed_fixtures_layout}. These permanent fixtures (toilets, vanities, bathtubs, kitchen cabinets, sinks, islands, fireplaces, or appliances) MUST remain exactly where described and cannot be moved, rearranged, or stacked improperly.` : "",
    adjacent_openings ? `Architectural Adjacency & Sightlines: ${adjacent_openings}. In the background through any open doorway, archway, or open-concept boundary, show the adjacent room logically according to the floorplan.` : "",
    `EGOCENTRIC CAMERA PERSPECTIVE: All spatial positions (left, right, straight ahead) are defined relative to the camera standing at the doorway entrance looking inward into the room.`,
    `APPLIANCE PLACEMENT RULE: Strictly separate laundry appliances from kitchen appliances. NEVER stack a refrigerator. The refrigerator must stand on the floor in its own kitchen alcove/space. If a washer and dryer are present, stack ONLY the dryer directly on top of the washer inside a dedicated laundry cubby or closet.`,
  ].filter(Boolean).join(" ");

  return [
    `Professional real estate staging photograph of a ${roomName.toLowerCase()}.`,
    `Interior design style: ${style}.`,
    `CRITICAL FLOORING CONSTRAINT: The floor material in this room MUST BE exactly '${floorMaterial}'. Accurately render this flooring texture with realistic lighting and clean architectural edges.`,
    `Wall color: ${wallColor}.`,
    `Room size: approximately ${sqft} square feet.`,
    `Key features: ${featureStr}.`,
    anglePrompt,
    constraints,
    `Tasteful, move-in ready furniture. Strictly minimal decor. Do NOT over-decorate with potted plants or excessive greenery. Keep surfaces clean.`,
    `Photorealistic DSLR real estate photography, 4K, no people, no text, no watermarks.`,
    `Sharp, clean, professionally staged, magazine quality.`,
  ].filter(Boolean).join(" ");
}

// ── Download helper ────────────────────────────────────────────────────────────
async function downloadImageUrl(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Generate room photo (preview mode) ────────────────────────────────────────
export async function generateRoomPhotoPreview(
  roomName: string,
  sqft: number,
  features: string[],
  style: string,
  wallColor: string,
  floorMaterial: string,
  cameraAngle: string = "doorway",
  spatialLayout: string = "",
  furnitureScale: string = "",
  cameraAlignment: string = "",
  applianceLayout: string = "",
  adjacentOpenings: string = "",
  fixedFixturesLayout: string = "",
  seed?: number
): Promise<Buffer | null> {
  if (!FAL_AVAILABLE) {
    console.error("FAL_KEY not set");
    return null;
  }
  const prompt = buildRoomPrompt(roomName, sqft, features, style, wallColor, floorMaterial, cameraAngle, spatialLayout, furnitureScale, cameraAlignment, applianceLayout, adjacentOpenings, fixedFixturesLayout);
  const result: any = await fal.run(MODEL_GENERATE_PREVIEW, {
    input: {
      prompt,
      image_size: "landscape_16_9",
      num_inference_steps: 4,
      num_images: 1,
      ...(typeof seed === "number" ? { seed } : {}),
    } as any,
  });
  const imageUrl = result?.data?.images?.[0]?.url;
  if (!imageUrl) return null;
  return downloadImageUrl(imageUrl);
}

// ── Generate room photo (quality mode) ────────────────────────────────────────
export async function generateRoomPhotoQuality(
  roomName: string,
  sqft: number,
  features: string[],
  style: string,
  wallColor: string,
  floorMaterial: string,
  cameraAngle: string = "doorway",
  spatialLayout: string = "",
  furnitureScale: string = "",
  cameraAlignment: string = "",
  applianceLayout: string = "",
  adjacentOpenings: string = "",
  fixedFixturesLayout: string = "",
  seed?: number
): Promise<Buffer | null> {
  if (!FAL_AVAILABLE) return null;
  const prompt = buildRoomPrompt(roomName, sqft, features, style, wallColor, floorMaterial, cameraAngle, spatialLayout, furnitureScale, cameraAlignment, applianceLayout, adjacentOpenings, fixedFixturesLayout);
  const result: any = await fal.run(MODEL_GENERATE_QUALITY, {
    input: {
      prompt,
      image_size: "landscape_16_9",
      num_images: 1,
      ...(typeof seed === "number" ? { seed } : {}),
    } as any,
  });
  const imageUrl = result?.data?.images?.[0]?.url;
  if (!imageUrl) return null;
  return downloadImageUrl(imageUrl);
}

// ── Edit existing room photo ────────────────────────────────────────────────────
export async function editRoomPhoto(
  imageBuffer: Buffer,
  editPrompt: string,
  roomName: string,
  isAngleChange: boolean = false,
  angleName: string = "",
  editMode: "style" | "object" = "style",
  maskBuffer?: Buffer
): Promise<Buffer | null> {
  if (!FAL_AVAILABLE) return null;

  // fal image-to-image needs the image as a URL or data URI
  // We'll upload it via fal storage first
  try {
    const blob = new Blob([new Uint8Array(imageBuffer)], { type: "image/jpeg" });
    const imageFile = new File([blob], "room.jpg", { type: "image/jpeg" });
    const uploadedUrl = await fal.storage.upload(imageFile);

    let maskUrl: string | undefined = undefined;
    if (maskBuffer) {
      const maskBlob = new Blob([new Uint8Array(maskBuffer)], { type: "image/png" });
      const maskFile = new File([maskBlob], "mask.png", { type: "image/png" });
      maskUrl = await fal.storage.upload(maskFile);
    }

    let result: any;

    if (isAngleChange) {
      let horiz = 0;
      let vert = 0;
      if (angleName === "window") horiz = 180;
      else if (angleName === "corner") horiz = 45;
      else if (angleName === "top-down") vert = 80;

      result = await fal.run(MODEL_EDIT_ANGLE, {
        input: {
          image_urls: [uploadedUrl],
          horizontal_angle: horiz,
          vertical_angle: vert,
          zoom: 0,
        },
      });
    } else {
      const isObjectEdit = editMode === "object";
      const translatedPrompt = isObjectEdit
        ? await translateObjectEditPrompt(roomName, editPrompt)
        : editPrompt;

      console.log(`[fal] Edit prompt for ${roomName} (${editMode}): "${translatedPrompt}"`);

      if (maskUrl) {
        console.log(`[fal] Running Masked Inpainting for ${roomName} with maskUrl`);
        result = await fal.run(MODEL_EDIT_INPAINT, {
          input: {
            image_url: uploadedUrl,
            mask_url: maskUrl,
            prompt: `Real estate staging interior photo of a ${roomName.toLowerCase()}. ${translatedPrompt}. Professional DSLR interior photography, 4K, no people.`,
            strength: 1.0,
            num_inference_steps: 28,
          } as any,
        });
      } else {
        const prompt = isObjectEdit
          ? [
              `Real estate staging photo of a ${roomName.toLowerCase()}.`,
              `Targeted modification: ${translatedPrompt}.`,
              `CRITICAL CAMERA & BACKGROUND FREEZE: Maintain the EXACT SAME camera angle, zoom, doorway frames, windows, desk, rug, and bed position. Modify ONLY the target item described. Leave 100% of surrounding flooring and walls identical.`,
              `Photorealistic DSLR professional interior photography quality. 4K, no people, no text.`,
            ].join(" ")
          : [
              `Real estate staging photo of a ${roomName.toLowerCase()}.`,
              `Complete interior design style makeover to: ${translatedPrompt}. Transform all furniture materials, upholstery, wood tones, textiles, rugs, and lighting fixtures to fully embody this style aesthetic.`,
              `CRITICAL GEOMETRY CONSTRAINT: Maintain the exact same camera angle, architectural walls, doors, windows, and unmovable architectural fixtures. Only transform the interior styling, decor, and furniture materials.`,
              `Photorealistic DSLR professional interior photography quality. 4K, no people, no text.`,
            ].join(" ");

        result = await fal.run(MODEL_EDIT_RESTYLE, {
          input: {
            image_url: uploadedUrl,
            prompt: prompt,
            strength: isObjectEdit ? 0.58 : 0.62,
            num_inference_steps: 28,
          } as any,
        });
      }
    }

    const imageUrl = result?.data?.images?.[0]?.url || result?.images?.[0]?.url;
    if (!imageUrl) return null;
    return downloadImageUrl(imageUrl);
  } catch (err) {
    console.error(`[fal] Edit failed for ${roomName}:`, err);
    return null;
  }
}
