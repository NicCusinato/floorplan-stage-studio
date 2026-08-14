import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import fs from "fs";
import path from "path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: { client: true, assets: true, extractions: true, renderViews: true, jobs: true },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const project = await prisma.project.update({ where: { id }, data });
    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: { assets: true },
    });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Remove asset files from disk
    for (const asset of project.assets) {
      try {
        const fullPath = path.join(/*turbopackIgnore: true*/ process.cwd(), asset.path);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      } catch {}
    }
    // Remove the renders folder
    try {
      const rendersDir = path.join(/*turbopackIgnore: true*/ process.cwd(), "storage", "renders", id);
      if (fs.existsSync(rendersDir)) fs.rmSync(rendersDir, { recursive: true, force: true });
    } catch {}

    // Cascade deletes child records
    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[delete project]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
