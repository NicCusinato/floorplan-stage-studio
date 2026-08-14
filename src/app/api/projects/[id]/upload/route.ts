import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import fs from "fs";
import path from "path";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const projectId = id;
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Convert file to buffer and save to local storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const filename = `${projectId}_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const relativePath = `storage/uploads/${filename}`;
    const fullPath = path.join(/*turbopackIgnore: true*/ process.cwd(), relativePath);

    // Ensure the directory exists before writing
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, buffer);

    // Record asset in database
    const asset = await prisma.uploadedAsset.create({
      data: {
        projectId,
        type: "floorplan",
        path: relativePath,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      },
    });

    // Update project status
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "uploading" } // UI can then trigger conversion
    });

    return NextResponse.json({ success: true, asset });
  } catch (error) {
    return NextResponse.json({ error: "File upload failed", details: String(error) }, { status: 500 });
  }
}
