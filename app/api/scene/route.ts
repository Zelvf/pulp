import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { actionCatalog, fallbackScene } from "@/lib/story";

const schema = z.object({ action: z.enum(["witness", "paranoia", "location", "pressure"]), state: z.object({ pressure: z.number(), trust: z.number(), hour: z.string(), weather: z.string(), location: z.string(), activeThread: z.string() }) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid scene request." }, { status: 400 });
  const { action, state } = parsed.data;
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ scene: fallbackScene(action, state), source: "deterministic" });
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      instructions: "You write restrained literary noir science fiction. Continue the PULP serial in 70-110 words. No sexual content, graphic violence, hate, self-harm, instructions for wrongdoing, token hype, or financial promises. Preserve canonical state. Output only the scene prose.",
      input: `Reader action: ${actionCatalog[action].prompt}\nCanonical state: ${JSON.stringify(state)}\nCharacters: Detective Mara Vale, courier Ilya Rook, journalist Sable Quine. Setting: rain-soaked Glass District, 03:17, a train absent from every map.`,
      max_output_tokens: 220,
    });
    const scene = response.output_text.trim();
    if (!scene) throw new Error("Empty scene");
    return NextResponse.json({ scene, source: "openai" });
  } catch { return NextResponse.json({ scene: fallbackScene(action, state), source: "deterministic-fallback" }); }
}
