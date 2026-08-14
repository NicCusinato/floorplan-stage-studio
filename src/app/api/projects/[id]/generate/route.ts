import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "@/lib/db";
import {
  generateRoomPhotoPreview,
  generateRoomPhotoQuality,
  FAL_AVAILABLE,
  SKIP_ROOMS,
  buildRoomPrompt,
} from "@/lib/fal";
import { getStagingEngine } from "@/lib/staging/engine";
import fs from "fs";
import path from "path";

// Gemini Vision — ONLY for reading floor plan labels (text generation, no image gen quota hit)
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// ── Analyze floor plan with Gemini Vision ─────────────────────────────────────
async function analyzeFloorPlan(imagePath: string, designStyle?: string): Promise<{
  totalSqft: number;
  global_style_narrative: string;
  design_bible: {
    flooring: string;
    walls: string;
    trim: string;
    hardware: string;
    lighting: string;
  };
  rooms: Array<{
    name: string;
    sqft: number;
    features: string[];
    spatial_layout: string;
    furniture_scale: string;
    camera_alignment: string;
    appliance_layout: string;
    fixed_fixtures_layout: string;
    adjacent_openings: string;
    visible_adjacent_context: string;
    cameraAngle?: string;
  }>;
}> {
  if (!genAI) throw new Error("GEMINI_API_KEY not set — needed to read floor plan labels");

  const fullPath = path.join(/*turbopackIgnore: true*/ process.cwd(), imagePath);
  const imageData = fs.readFileSync(fullPath);
  const base64Image = imageData.toString("base64");
  const mimeType = imagePath.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";

  const visionModel = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-3.5-flash" });

  const prompt = `You are analyzing a real estate floor plan image. The user has chosen the target design style: "${designStyle || "modern scandinavian"}".

Identify every labeled room or space visible in the floor plan.

Develop a strict, cohesive "design_bible" specification mapping out exact textures, materials, and colors that will apply UNIFORMLY to the ENTIRE house. This must perfectly match the chosen design style:
- flooring: specific wood species, plank size, stain, and sheen (e.g. "Natural 6-inch Light Honey Oak Hardwood, satin finish")
- walls: specific paint color name and sheen (e.g. "Sherwin Williams Alabaster White, flat finish")
- trim: flat baseboard trim color and height (e.g. "4-inch flat white baseboards, satin finish")
- hardware: unified light fixture and handle metal finish (e.g. "matte black handles and brushed brass lighting accents")
- lighting: unified natural daylight warmth (e.g. "3000K warm afternoon daylight streaming from exterior windows, soft architectural fill light")

For each room, extract:
- name: the exact label as it appears (e.g. "BEDROOM", "KITCHEN", "LIVING ROOM", "DEN", "BATHROOM")
- sqft: estimated area in square feet. If the total sqft is shown (e.g. "840sqft"), use it to proportion rooms. Otherwise estimate from relative room sizes.
- features: list notable physical features (e.g. ["window", "island", "closet", "sliding door", "balcony"])
- spatial_layout: Highly detailed physical shape (e.g., "U-shaped wrap-around counter with open right side", "narrow hallway-like room", "L-shaped living space with window on long wall")
- furniture_scale: Strict scale instructions based on the room size (e.g., "Very small 90sqft room, strictly use a twin bed", "Massive 300sqft room, fits King bed and sitting area")
- camera_alignment: Find the entry door icon for this room on the floorplan. Write an explicit instruction placing the camera at that door looking inward into the room.
- appliance_layout: For rooms like kitchens or laundry, define appliance positions relative to a person standing at the entry doorway looking into the room (e.g., "Stacked washer and dryer in cubby immediately to the left upon entering; refrigerator along the right-hand wall"). Never use compass directions (North, South, East, West).
- fixed_fixtures_layout: For any room with permanent architectural fixtures (toilets, vanities, bathtubs, kitchen cabinets, islands, stoves, refrigerators, stacked washer/dryer, fireplaces, stairs), identify their exact positions relative to a person standing at the entry doorway looking into the room. Example: "Toilet immediately to the right upon entering; vanity sink along the left-hand wall; shower alcove straight ahead on the far wall". Never use compass directions.
- adjacent_openings: Identify any open doorways, archways, or open-concept connections to adjacent rooms relative to the doorway perspective (e.g., "Open archway to the left leading into LIVING ROOM; open counter straight ahead looking into DINING AREA").
- visible_adjacent_context: If there are adjacent openings, describe what specifically should be visible through them to maintain strict visual consistency across the entire house (e.g. "Through the left archway, show a modern grey sofa and oak hardwood floor in the living room").
- CAMERA-RELATIVE SPATIAL RULE: Always describe positions (left wall, right wall, straight ahead, immediate left upon entering) relative to a person standing at the entry door looking into the room. NEVER use compass directions (North, South, East, West) because image models cannot compute compass rotations.

The floor plan may include:
- Room labels printed inside rooms
- Total apartment size (e.g. "840sqft" or "1 BED+DEN 840sqft")
- Furniture shown from above (sofa, bed, toilet icons)
- Dimensions in feet or meters

Return ONLY valid JSON with no markdown, no code blocks, no explanation:
{"totalSqft":840,"global_style_narrative":"A cohesive design summary of the entire house...","design_bible":{"flooring":"...","walls":"...","trim":"...","hardware":"...","lighting":"..."},"rooms":[{"name":"BEDROOM","sqft":171,"features":["window","closet","bed"],"spatial_layout":"Square room with window on north wall","furniture_scale":"Medium room, fits Queen bed","camera_alignment":"Camera positioned at East door looking West","appliance_layout":"","fixed_fixtures_layout":"","adjacent_openings":"","visible_adjacent_context":""}]}`;

  const result = await visionModel.generateContent([
    prompt,
    { inlineData: { data: base64Image, mimeType } },
  ]);

  let text = result.response.text().trim();
  // Strip markdown code fences if present
  text = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  try {
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from the response
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`Could not parse floor plan analysis: ${text.substring(0, 200)}`);
  }
}

// ── Call OpenAI GPT-4o with floorplan image + context to generate a highly accurate room prompt ──
async function generateMultimodalRoomPrompt(
  floorplanPath: string,
  roomName: string,
  room: any,
  designBible: any,
  previousRoomsContext: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[generate] OPENAI_API_KEY not set - skipping multimodal prompting");
    return "";
  }

  const fullPath = path.join(/*turbopackIgnore: true*/ process.cwd(), floorplanPath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`[generate] Floorplan image not found: ${fullPath}`);
    return "";
  }

  const imageData = fs.readFileSync(fullPath);
  const base64Image = imageData.toString("base64");
  const mimeType = floorplanPath.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";

  const promptText = `You are an expert AI staging photographer and prompt engineer.
You are staging the room: "${roomName}" (${room.sqft} sqft).

Look at the attached 2D floorplan image, locate the "${roomName}", and see where the entry doors, windows, and adjacent rooms are.

Target Design Bible for the entire home (ensure exact match):
- Flooring: ${designBible.flooring || "Oak wood flooring"}
- Walls: ${designBible.walls || "Warm white walls"}
- Trim: ${designBible.trim || "Flat white baseboards"}
- Hardware: ${designBible.hardware || "Matte black hardware"}
- Lighting: ${designBible.lighting || "3000K warm daylight"}

Existing rooms already generated in this home for visual context (ensure matching flooring, style, and transitions):
${previousRoomsContext || "No rooms generated yet."}

Room details from floorplan analysis:
- Spatial Layout: ${room.spatial_layout}
- Furniture Scale: ${room.furniture_scale}
- Camera Alignment: ${room.camera_alignment}
- Appliance Layout: ${room.appliance_layout}
- Fixed Fixtures Layout: ${room.fixed_fixtures_layout}
- Adjacent Openings: ${room.adjacent_openings}

Write a highly detailed, photorealistic 3D interior photography text prompt for a diffusion model (like Flux or DALL-E) to generate the staged "${roomName}".
Adhere strictly to:
1. The exact flooring, wall paint, lighting, and hardware from the Design Bible.
2. The exact camera perspective (usually standing at the doorway looking inward).
3. Placing the furniture, appliances, and permanent fixtures in the exact locations described.
4. Ensuring that any visible openings leading to adjacent rooms match the styles and visual descriptions of already-generated rooms.
5. Do not include any meta-text, markdown, formatting, or introductory phrases. Return ONLY the direct prompt string (under 180 words).`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: promptText },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64Image}` },
              },
            ],
          },
        ],
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.warn(`[generate] OpenAI GPT-4o prompting API error: ${response.status} - ${err}`);
      return "";
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content?.trim();
    return resultText || "";
  } catch (error) {
    console.warn("[generate] Multimodal room prompting failed:", error);
    return "";
  }
}

// ── Background generation process ─────────────────────────────────────────────
async function processGeneration(
  jobId: string,
  projectId: string,
  floorplanPath: string,
  mode: "preview" | "quality"
) {
  try {
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "running" },
    });

    // We no longer strictly require FAL_KEY if using OpenAI
    // if (!FAL_AVAILABLE) throw new Error("FAL_KEY not set — add it to .env to generate photos");

    // ── Step 1 & 2: Analyze floor plan or use existing state ─────────────────
    let roomState: any;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (project?.roomStateJson) {
      console.log(`[generate] Using existing room state (preserving user edits)`);
      roomState = JSON.parse(project.roomStateJson);
      // Update generation mode if needed
      roomState.generationMode = mode;
    } else {
      console.log(`[generate] Analyzing floor plan: ${floorplanPath}`);
      const analysis = await analyzeFloorPlan(floorplanPath, project?.designStyle || undefined);
      console.log(`[generate] Found ${analysis.rooms.length} rooms, ${analysis.totalSqft} sqft`);

      const defaultStyle = project?.designStyle || "modern scandinavian";
      const defaultWallColor = "warm white";
      const defaultFloor = "light oak hardwood";

      roomState = {
        totalSqft: analysis.totalSqft,
        globalStyle: defaultStyle,
        globalWallColor: defaultWallColor,
        globalFloorMaterial: defaultFloor,
        generationMode: mode,
        designBible: analysis.design_bible || {
          flooring: defaultFloor,
          walls: defaultWallColor,
          trim: "4-inch flat white baseboards, satin finish",
          hardware: "matte black handles and light fixtures",
          lighting: "3000K warm daylight streaming from windows"
        },
        rooms: analysis.rooms.map((r: any) => ({
          name: r.name,
          sqft: r.sqft,
          features: r.features ?? [],
          spatial_layout: r.spatial_layout || "",
          furniture_scale: r.furniture_scale || "",
          camera_alignment: r.camera_alignment || "",
          appliance_layout: r.appliance_layout || "",
          fixed_fixtures_layout: r.fixed_fixtures_layout || r.appliance_layout || "",
          adjacent_openings: (r.adjacent_openings || "") + (r.visible_adjacent_context ? ` Context: ${r.visible_adjacent_context}` : ""),
          style: defaultStyle,
          wallColor: defaultWallColor,
          floorMaterial: r.floor_material || defaultFloor,
          cameraAngle: r.cameraAngle || "doorway",
          furniture: [],
          stagedPhotoPaths: [] as string[],
        })),
      };

      // Save initial analysis so UI can show room list
      await prisma.project.update({
        where: { id: projectId },
        data: { roomStateJson: JSON.stringify(roomState), status: "staging" },
      });
    }
    const stageableRooms = roomState.rooms.filter(
      (r: any) => !SKIP_ROOMS.has(r.name.toUpperCase().trim())
    );

    // Prioritize main living spaces so sequential generation builds a logical style context
    const roomPriority = [
      "FOYER", "ENTRY", "HALLWAY", 
      "LIVING ROOM", "LIVINGROOM", "LIVING", 
      "DINING ROOM", "DININGROOM", "DINING AREA", "DINING", 
      "KITCHEN", "BEDROOM", "DEN", "STUDIO", "OFFICE"
    ];
    const getPriority = (name: string) => {
      const upper = name.toUpperCase().trim();
      const idx = roomPriority.findIndex(p => upper.includes(p));
      return idx === -1 ? 99 : idx;
    };
    stageableRooms.sort((a: any, b: any) => getPriority(a.name) - getPriority(b.name));

    const providerName = project?.provider || "openai";
    console.log(
      `[generate] Generating ${stageableRooms.length} rooms in ${mode} mode via ${providerName}`
    );

    let lastError: string | null = null;
    const previousRooms: Array<{ name: string; promptUsed: string }> = [];

    // Compute a deterministic seed from projectId for consistent latent noise/flooring texture across rooms
    let projectSeed = 0;
    for (let i = 0; i < projectId.length; i++) {
      projectSeed = ((projectSeed << 5) - projectSeed) + projectId.charCodeAt(i);
      projectSeed |= 0;
    }
    projectSeed = Math.abs(projectSeed) % 2147483647;
    console.log(`[generate] Deterministic project seed: ${projectSeed}`);

    for (const room of stageableRooms) {
      console.log(`[generate] → ${room.name} (${room.sqft} sqft)`);

      try {
        const previousRoomsContext = previousRooms
          .map((r) => `- Room: ${r.name}\n  Staging prompt used: ${r.promptUsed}`)
          .join("\n\n");

        let prompt = await generateMultimodalRoomPrompt(
          floorplanPath,
          room.name,
          room,
          roomState.designBible || {},
          previousRoomsContext
        );

        if (!prompt) {
          console.log(`[generate] Multimodal prompting returned empty for ${room.name}, falling back to buildRoomPrompt`);
          prompt = buildRoomPrompt(
            room.name, room.sqft, room.features,
            room.style, room.wallColor, room.floorMaterial, room.cameraAngle,
            room.spatial_layout, room.furniture_scale, room.camera_alignment, room.appliance_layout,
            room.adjacent_openings, room.fixed_fixtures_layout
          );
        } else {
          console.log(`[generate] Spatially chained prompt for ${room.name}: "${prompt.substring(0, 120)}..."`);
        }

        const engine = getStagingEngine();

        const stageResult = await engine.stageRoomWithFallback({
          mode: "stage_empty",
          provider: providerName as any,
          inputImagePath: "", // from scratch
          roomType: "LIVINGROOM" as any, // Not strictly needed because we pass the custom prompt
          designStyle: "MODERN" as any,
          prompt: prompt,
          numImages: 1,
          quality: mode === "quality" ? "high" : "low",
        });

        if (!stageResult.success || stageResult.images.length === 0) {
           throw new Error(stageResult.error || "No image returned from AI provider");
        }

        const imgData = stageResult.images[0];
        let imgBuffer: Buffer | null = null;
        if (imgData.base64) {
          imgBuffer = Buffer.from(imgData.base64, "base64");
        } else if (imgData.url) {
          const dlRes = await fetch(imgData.url);
          imgBuffer = Buffer.from(await dlRes.arrayBuffer());
        }

        if (!imgBuffer) {
          console.warn(`[generate] No image returned for ${room.name}, skipping`);
          continue;
        }

        const slug = room.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
        const filename = `${slug}_${mode}_${Date.now()}.jpg`;
        const localPath = path.join(outputDir, filename);
        const relativePath = `storage/renders/${projectId}/${filename}`;

        fs.writeFileSync(localPath, imgBuffer);

        await prisma.uploadedAsset.create({
          data: {
            projectId,
            type: "render_staged",
            path: relativePath,
            filename,
            mimeType: "image/jpeg",
            roomName: room.name,
            metadata: JSON.stringify({ mode, sqft: room.sqft, style: room.style }),
          },
        });

        if (!room.stagedPhotoPaths) room.stagedPhotoPaths = [];
        room.stagedPhotoPaths.push(relativePath);
        previousRooms.push({ name: room.name, promptUsed: prompt });
        console.log(`[generate] ✓ ${room.name} saved`);
      } catch (roomErr: any) {
        lastError = roomErr?.message ?? String(roomErr);
      }
    }

    // If zero photos were saved, treat as a failure
    const totalSaved = stageableRooms.reduce((n: number, r: any) => n + (r.stagedPhotoPaths?.length || 0), 0);
    if (totalSaved === 0 && lastError) {
      const isBalance = lastError.toLowerCase().includes("balance") || lastError.toLowerCase().includes("locked");
      const userMessage = isBalance
        ? "Exhausted balance — top up at fal.ai/dashboard/billing"
        : `All rooms failed: ${lastError}`;
      throw new Error(userMessage);
    }

    // ── Step 4: Save final state ───────────────────────────────────────────
    await prisma.project.update({
      where: { id: projectId },
      data: {

        status: "complete",
        roomStateJson: JSON.stringify(roomState),
      },
    });

    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "complete", finishedAt: new Date() },
    });

    console.log(`[generate] ✅ Generation complete for project ${projectId}`);
  } catch (error: any) {
    console.error("[generate] Generation failed:", error);
    await prisma.generationJob
      .update({ where: { id: jobId }, data: { status: "failed", errorMessage: String(error) } })
      .catch(() => {});
    await prisma.project
      .update({ where: { id: projectId }, data: { status: "failed" } })
      .catch(() => {});
  }
}

// ── POST /api/projects/[id]/generate ──────────────────────────────────────────
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    // mode: "preview" (fast, Schnell) or "quality" (best, Flux Pro)
    const mode: "preview" | "quality" = body.mode === "quality" ? "quality" : "preview";

    if (!process.env.OPENAI_API_KEY && !FAL_AVAILABLE) {
      return NextResponse.json(
        {
          error: "No AI Provider Configured",
          hint: "Add OPENAI_API_KEY or FAL_KEY to your .env file, then restart Docker.",
          getKey: "https://platform.openai.com/api-keys",
        },
        { status: 503 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: { assets: true },
    });

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const floorplanAsset = project.assets.find((a) => a.type === "floorplan");
    if (!floorplanAsset) {
      return NextResponse.json({ error: "No floor plan uploaded yet" }, { status: 400 });
    }

    // Create job record
    const job = await prisma.generationJob.create({
      data: {
        projectId: id,
        type: "stage",
        status: "pending",
        provider: project.provider || "openai",
      },
    });

    await prisma.project.update({ where: { id }, data: { status: "staging" } });

    // Fire and forget — runs in background while we return 202
    processGeneration(job.id, id, floorplanAsset.path, mode);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      mode,
      message: `Generating ${mode === "preview" ? "quick previews" : "high-quality photos"} for all rooms…`,
    });
  } catch (error: any) {
    console.error("[generate] Route error:", error);
    return NextResponse.json(
      { error: "Failed to start generation", details: error.message },
      { status: 500 }
    );
  }
}
