import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "@/lib/db";
import {
  generateRoomPhotoPreview,
  generateRoomPhotoQuality,
  FAL_AVAILABLE,
  SKIP_ROOMS,
} from "@/lib/fal";
import fs from "fs";
import path from "path";

// Gemini Vision — ONLY for reading floor plan labels (text generation, no image gen quota hit)
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// ── Analyze floor plan with Gemini Vision ─────────────────────────────────────
async function analyzeFloorPlan(imagePath: string): Promise<{
  totalSqft: number;
  rooms: Array<{ name: string; sqft: number; features: string[]; cameraAngle?: string }>;
}> {
  if (!genAI) throw new Error("GEMINI_API_KEY not set — needed to read floor plan labels");

  const fullPath = path.join(process.cwd(), imagePath);
  const imageData = fs.readFileSync(fullPath);
  const base64Image = imageData.toString("base64");
  const mimeType = imagePath.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";

  const visionModel = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

  const prompt = `You are analyzing a real estate floor plan image.

Identify every labeled room or space visible in the floor plan.

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
- CAMERA-RELATIVE SPATIAL RULE: Always describe positions (left wall, right wall, straight ahead, immediate left upon entering) relative to a person standing at the entry door looking into the room. NEVER use compass directions (North, South, East, West) because image models cannot compute compass rotations.

The floor plan may include:
- Room labels printed inside rooms
- Total apartment size (e.g. "840sqft" or "1 BED+DEN 840sqft")
- Furniture shown from above (sofa, bed, toilet icons)
- Dimensions in feet or meters

Return ONLY valid JSON with no markdown, no code blocks, no explanation:
{"totalSqft":840,"rooms":[{"name":"BEDROOM","sqft":171,"features":["window","closet","bed"],"spatial_layout":"Square room with window on north wall","furniture_scale":"Medium room, fits Queen bed","camera_alignment":"Camera positioned at East door looking West","appliance_layout":"","fixed_fixtures_layout":"","adjacent_openings":""}]}`;

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

    if (!FAL_AVAILABLE) throw new Error("FAL_KEY not set — add it to .env to generate photos");

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
      const analysis = await analyzeFloorPlan(floorplanPath);
      console.log(`[generate] Found ${analysis.rooms.length} rooms, ${analysis.totalSqft} sqft`);

      const defaultStyle = "modern scandinavian";
      const defaultWallColor = "warm white";
      const defaultFloor = "light oak hardwood";

      roomState = {
        totalSqft: analysis.totalSqft,
        globalStyle: defaultStyle,
        globalWallColor: defaultWallColor,
        globalFloorMaterial: defaultFloor,
        generationMode: mode,
        rooms: analysis.rooms.map((r: any) => ({
          name: r.name,
          sqft: r.sqft,
          features: r.features ?? [],
          spatial_layout: r.spatial_layout || "",
          furniture_scale: r.furniture_scale || "",
          camera_alignment: r.camera_alignment || "",
          appliance_layout: r.appliance_layout || "",
          fixed_fixtures_layout: r.fixed_fixtures_layout || r.appliance_layout || "",
          adjacent_openings: r.adjacent_openings || "",
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

    // ── Step 3: Generate one photo per stageable room ──────────────────────
    const outputDir = path.join(process.cwd(), "storage", "renders", projectId);
    fs.mkdirSync(outputDir, { recursive: true });

    const stageableRooms = roomState.rooms.filter(
      (r: any) => !SKIP_ROOMS.has(r.name.toUpperCase().trim())
    );

    console.log(
      `[generate] Generating ${stageableRooms.length} rooms in ${mode} mode via fal.ai`
    );

    let lastError: string | null = null;

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
        const imgBuffer =
          mode === "preview"
            ? await generateRoomPhotoPreview(
                room.name, room.sqft, room.features,
                room.style, room.wallColor, room.floorMaterial, room.cameraAngle,
                room.spatial_layout, room.furniture_scale, room.camera_alignment, room.appliance_layout,
                room.adjacent_openings, room.fixed_fixtures_layout, projectSeed
              )
            : await generateRoomPhotoQuality(
                room.name, room.sqft, room.features,
                room.style, room.wallColor, room.floorMaterial, room.cameraAngle,
                room.spatial_layout, room.furniture_scale, room.camera_alignment, room.appliance_layout,
                room.adjacent_openings, room.fixed_fixtures_layout, projectSeed
              );

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
        console.log(`[generate] ✓ ${room.name} saved`);
      } catch (roomErr: any) {
        lastError = roomErr?.message ?? String(roomErr);
        console.error(`[generate] Image gen failed for ${room.name}: ${lastError}`);
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

    if (!FAL_AVAILABLE) {
      return NextResponse.json(
        {
          error: "FAL_KEY not configured",
          hint: "Add your fal.ai API key to FAL_KEY= in the .env file, then restart Docker.",
          getKey: "https://fal.ai/dashboard",
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
        provider: `fal-ai-flux-${mode}`,
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
