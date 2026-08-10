import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(clients);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const client = await prisma.client.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        notes: data.notes,
      },
    });
    return NextResponse.json(client);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
