import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { editRoomPhoto, FAL_AVAILABLE } from "@/lib/fal";
import fs from "fs";
import path from "path";

// POST /api/projects/[id]/stage
// Body: { prompt?: string, roomName?: string, isAngleChange?: boolean, angleName?: string }
// If roomName is provided, only edits that room's latest photo.
// If roomName is omitted, applies the edit to ALL staged rooms.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { prompt, roomName, isAngleChange, angleName, editMode = "style", maskDataUrl } = body;

    let maskBuffer: Buffer | undefined = undefined;
    if (maskDataUrl && typeof maskDataUrl === "string" && maskDataUrl.startsWith("data:image")) {
      const base64Data = maskDataUrl.replace(/^data:image\/\w+;base64,/, "");
      maskBuffer = Buffer.from(base64Data, "base64");
    }

    if (!prompt?.trim() && !isAngleChange) {
      return NextResponse.json({ error: "Missing prompt or angle change" }, { status: 400 });
    }

    if (!FAL_AVAILABLE) {
      return NextResponse.json(
        {
          error: "FAL_KEY not configured",
          hint: "Add your fal.ai API key to FAL_KEY= in .env and restart Docker.",
          getKey: "https://fal.ai/dashboard",
        },
        { status: 503 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: { assets: { orderBy: { createdAt: "asc" } } },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    // Get all staged assets, then pick the LATEST one per room
    const stagedAssets = project.assets.filter((a) => a.type === "render_staged");

    // Build a map: roomName -> latest asset
    const latestByRoom = new Map<string, typeof stagedAssets[0]>();
    for (const asset of stagedAssets) {
      const key = asset.roomName ?? "Room";
      latestByRoom.set(key, asset); // later assets overwrite earlier → we keep latest
    }

    // Filter to target rooms
    const targetAssets = roomName
      ? [latestByRoom.get(roomName)].filter(Boolean) as typeof stagedAssets
      : Array.from(latestByRoom.values());

    if (targetAssets.length === 0) {
      return NextResponse.json(
        { error: "No staged photos found. Run Generate first." },
        { status: 400 }
      );
    }

    const outputDir = path.join(/*turbopackIgnore: true*/ process.cwd(), "storage", "renders", id);
    fs.mkdirSync(outputDir, { recursive: true });

    const newAssets = [];

    for (const asset of targetAssets) {
      const localPath = path.join(/*turbopackIgnore: true*/ process.cwd(), asset.path);
      if (!fs.existsSync(localPath)) {
        console.warn(`[stage] File not found: ${localPath}`);
        continue;
      }

      const imageBuffer = fs.readFileSync(localPath);
      const roomLabel = asset.roomName ?? "room";

      console.log(`[stage] Editing ${roomLabel} with ${isAngleChange ? `angle: ${angleName}` : `prompt: "${prompt}"`}${maskBuffer ? " (masked inpainting)" : ""}`);

      const edited = await editRoomPhoto(
        imageBuffer,
        prompt || "",
        roomLabel,
        isAngleChange,
        angleName,
        editMode,
        maskBuffer
      );

      if (!edited) {
        console.warn(`[stage] Edit returned null for ${roomLabel}`);
        continue;
      }

      const slug = roomLabel.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
      const filename = `${slug}_edit_${Date.now()}.jpg`;
      const newLocalPath = path.join(outputDir, filename);
      const newRelativePath = `storage/renders/${id}/${filename}`;

      fs.writeFileSync(newLocalPath, edited);

      const newAsset = await prisma.uploadedAsset.create({
        data: {
          projectId: id,
          type: "render_staged",
          path: newRelativePath,
          filename,
          mimeType: "image/jpeg",
          roomName: asset.roomName,
          metadata: JSON.stringify({
            editPrompt: isAngleChange ? `Angle: ${angleName}` : prompt,
            basedOn: asset.id,
            angleName: isAngleChange ? angleName : undefined,
            editMode: isAngleChange ? undefined : editMode,
          }),
        },
      });

      newAssets.push(newAsset);
      console.log(`[stage] ✓ ${roomLabel} edited`);
    }

    // Update global style in roomStateJson if a style keyword was detected
    if (project.roomStateJson && !isAngleChange && prompt) {
      try {
        const state = JSON.parse(project.roomStateJson);
        const styleKeywords = [
          "modern", "scandinavian", "japandi", "industrial", "luxury",
          "minimalist", "coastal", "bohemian", "mid-century", "contemporary",
          "rustic", "farmhouse", "art deco",
        ];
        const promptLower = prompt.toLowerCase();
        const detectedStyle = styleKeywords.find((s) => promptLower.includes(s));
        if (detectedStyle) {
          if (!roomName) {
            // Global restyle
            state.globalStyle = detectedStyle;
            state.rooms?.forEach((r: any) => { r.style = detectedStyle; });
          } else {
            // Per-room restyle
            const room = state.rooms?.find((r: any) => r.name === roomName);
            if (room) room.style = detectedStyle;
          }
          await prisma.project.update({
            where: { id },
            data: { roomStateJson: JSON.stringify(state) },
          });
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      editedRooms: newAssets.length,
      assets: newAssets.map((a) => ({
        id: a.id,
        roomName: a.roomName,
        path: a.path,
      })),
    });
  } catch (error: any) {
    console.error("[stage] Error:", error);
    return NextResponse.json(
      { error: "Staging failed", details: error.message },
      { status: 500 }
    );
  }
}
