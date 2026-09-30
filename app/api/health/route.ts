import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", integrations: { openai: Boolean(process.env.OPENAI_API_KEY), solana: Boolean(process.env.SOLANA_RPC_URL), pinata: Boolean(process.env.PINATA_JWT) } });
}
