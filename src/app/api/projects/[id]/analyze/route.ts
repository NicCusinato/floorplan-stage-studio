import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "@/lib/db";
import fs from "fs";
import path from "path";

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: { assets: true },
    });

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const floorplanAsset = project.assets.find((a) => a.type === "floorplan");
    if (!floorplanAsset) {
      return NextResponse.json({ error: "No floorplan uploaded" }, { status: 400 });
    }

    if (!genAI) {
      return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });
    }

    // Read floorplan image
    const fullPath = path.join(process.cwd(), floorplanAsset.path);
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: "Floorplan file not found on disk" }, { status: 404 });
    }

    const imageData = fs.readFileSync(fullPath);
    const base64Image = imageData.toString("base64");
    const mimeType = (floorplanAsset.mimeType || "image/jpeg") as string;

    // Call Gemini Vision to analyze the floorplan
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || "gemini-3.5-flash" });

    const prompt = `You are an expert architect analyzing a floor plan image.

Carefully examine this floor plan and identify every labeled room or space.

For each room/space, return:
- name: the room label exactly as written (e.g. "BEDROOM", "KITCHEN", "DEN", "BATHROOM", "LIVING ROOM")
- sqft: estimated area in square feet (use any dimension labels visible, or estimate from proportions)
- features: list of notable features visible (windows, closets, doors, islands, etc.)
- approximate_dimensions: width x length in feet if estimable
- spatial_layout: Highly detailed physical shape (e.g., "U-shaped wrap-around counter with open right side", "narrow hallway-like room", "L-shaped living space with window on long wall")
- furniture_scale: Strict scale instructions based on the room size (e.g., "Very small 90sqft room, strictly use a twin bed", "Massive 300sqft room, fits King bed and sitting area")
- camera_alignment: Find the entry door icon for this room on the floorplan. Write an explicit instruction placing the camera at that door looking inward into the room.
- appliance_layout: For rooms like kitchens or laundry, define appliance positions relative to a person standing at the entry doorway looking into the room (e.g., "Stacked washer and dryer in cubby immediately to the left upon entering; refrigerator along the right-hand wall"). Never use compass directions (North, South, East, West).
- fixed_fixtures_layout: For any room with permanent architectural fixtures (toilets, vanities, bathtubs, kitchen cabinets, islands, stoves, refrigerators, stacked washer/dryer, fireplaces, stairs), identify their exact positions relative to a person standing at the entry doorway looking into the room. Example: "Toilet immediately to the right upon entering; vanity sink along the left-hand wall; shower alcove straight ahead on the far wall". Never use compass directions.
- adjacent_openings: Identify any open doorways, archways, or open-concept connections to adjacent rooms relative to the doorway perspective (e.g., "Open archway to the left leading into LIVING ROOM; open counter straight ahead looking into DINING AREA").
- floor_material: Carefully inspect the visual flooring pattern and texture drawn inside this specific room on the floorplan image. Determine the exact floor material shown (e.g., "light oak hardwood plank", "plush grey carpet", "beige carpet", "light marble stone tile", "ceramic floor tile", "polished concrete", "terracotta tile", "travertine outdoor patio pavers"). Specify the exact floor material for this room.
- CAMERA-RELATIVE SPATIAL RULE: Always describe positions (left wall, right wall, straight ahead, immediate left upon entering) relative to a person standing at the entry door looking into the room. NEVER use compass directions (North, South, East, West) because image models cannot compute compass rotations.

Return ONLY a JSON object with this exact structure, no markdown, no explanation:
{
  "totalSqft": 840,
  "rooms": [
    {
      "name": "BEDROOM",
      "sqft": 180,
      "approximate_dimensions": "12x15",
      "features": ["window", "closet"],
      "spatial_layout": "Rectangular room with a closet on the west wall and window on the north wall",
      "furniture_scale": "Medium room, fits a Queen bed comfortably but not much else",
      "camera_alignment": "Camera positioned at the East entry door looking West toward the far wall",
      "appliance_layout": "",
      "fixed_fixtures_layout": "",
      "adjacent_openings": "",
      "floor_material": "grey plush carpet"
    }
  ]
}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType,
        },
      },
    ]);

    let responseText = result.response.text().trim();
    // Strip any markdown code fences
    responseText = responseText.replace(/```json|```/g, "").trim();

    let analysisData;
    try {
      analysisData = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        { error: "Gemini returned invalid JSON", raw: responseText },
        { status: 500 }
      );
    }

    // Store analysis in DB
    await prisma.floorplanExtraction.create({
      data: {
        projectId: id,
        rawImagePath: floorplanAsset.path,
        editableJson: JSON.stringify(analysisData),
        dimensions: JSON.stringify({ totalSqft: analysisData.totalSqft }),
        confidence: 0.9,
      },
    });

    // Store room state on the project
    await prisma.project.update({
      where: { id },
      data: {
        status: "analyzed",
        prompt: JSON.stringify(analysisData),
      },
    });

    return NextResponse.json({ success: true, analysis: analysisData });
  } catch (error: any) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: "Analysis failed", details: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id]/analyze
// Saves user-edited room data back without re-running Gemini
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    // body: { totalSqft: number, rooms: Room[] }
    await prisma.project.update({
      where: { id },
      data: { roomStateJson: JSON.stringify(body), status: "analyzed" },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
