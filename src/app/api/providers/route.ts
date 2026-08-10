import { NextResponse } from "next/server";
import { getStagingEngine } from "@/lib/staging";

export async function GET() {
  const engine = getStagingEngine();
  const statuses = engine.getProviderStatuses();
  
  return NextResponse.json({
    defaultProvider: engine.getDefaultProvider(),
    providers: statuses,
  });
}
