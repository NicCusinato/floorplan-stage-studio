import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import fs from "fs";
import path from "path";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const asset = await prisma.uploadedAsset.findUnique({
      where: { id }
    });

    if (!asset || !asset.path) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const fullPath = path.join(process.cwd(), asset.path);
    
    if (!fs.existsSync(fullPath)) {
      return new NextResponse("File Not Found", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(fullPath);
    
    // Determine content type
    let contentType = "application/octet-stream";
    if (asset.path.endsWith(".jpg") || asset.path.endsWith(".jpeg")) contentType = "image/jpeg";
    if (asset.path.endsWith(".png")) contentType = "image/png";
    if (asset.path.endsWith(".webp")) contentType = "image/webp";
    if (asset.path.endsWith(".glb")) contentType = "model/gltf-binary";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    return new NextResponse("Server Error", { status: 500 });
  }
}
