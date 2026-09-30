import { NextResponse } from "next/server";
import { getStoryData } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getStoryData(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Story state unavailable" }, { status: 503 });
  }
}
