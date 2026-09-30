import { NextResponse } from "next/server";
import { z } from "zod";
import { actionCatalog } from "@/lib/story";

const schema = z.object({ action: z.enum(["witness", "paranoia", "location", "pressure"]), signature: z.string().min(20).optional(), wallet: z.string().optional(), demo: z.boolean().default(false) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid story action." }, { status: 400 });
  const { action, signature, demo } = parsed.data;
  if (demo) return NextResponse.json({ id: `evt-${crypto.randomUUID().slice(0, 8)}`, verified: false, action, prompt: actionCatalog[action].prompt });
  if (!signature) return NextResponse.json({ error: "A transaction signature is required." }, { status: 400 });
  const rpc = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  try {
    const rpcResponse = await fetch(rpc, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getTransaction", params: [signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" }] }), cache: "no-store" });
    const payload = await rpcResponse.json();
    if (!payload.result || payload.result.meta?.err) return NextResponse.json({ error: "Transaction was not found or did not succeed on devnet." }, { status: 422 });
    const treasury = process.env.PULP_TREASURY_ADDRESS;
    if (treasury) {
      const keys = payload.result.transaction?.message?.accountKeys || [];
      const touchesTreasury = keys.some((key: string | { pubkey: string }) => (typeof key === "string" ? key : key.pubkey) === treasury);
      if (!touchesTreasury) return NextResponse.json({ error: "Transaction does not include the configured PULP treasury." }, { status: 422 });
    }
    return NextResponse.json({ id: `evt-${crypto.randomUUID().slice(0, 8)}`, verified: true, signature, action, prompt: actionCatalog[action].prompt });
  } catch { return NextResponse.json({ error: "The Solana RPC could not verify this transaction." }, { status: 502 }); }
}
