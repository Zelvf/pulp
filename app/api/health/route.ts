import { NextResponse } from "next/server";

export function GET() {
  const integrations = { openai: Boolean(process.env.OPENAI_API_KEY), solana: Boolean(process.env.SOLANA_RPC_URL && process.env.PULP_TREASURY_ADDRESS), database: Boolean(process.env.DATABASE_URL), pinata: Boolean(process.env.PINATA_JWT) };
  return NextResponse.json({ status: Object.values(integrations).every(Boolean) ? "ready" : "misconfigured", integrations });
}
