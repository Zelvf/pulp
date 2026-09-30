import { NextResponse } from "next/server";
import { z } from "zod";
import { Connection } from "@solana/web3.js";
import bs58 from "bs58";
import { actionCatalog, applyAction, type StoryEvent } from "@/lib/story";
import { getStoryData, isSignatureProcessed, persistStoryChange } from "@/lib/db";
import { generateScene } from "@/lib/scene";

const schema = z.object({ action: z.enum(["witness", "paranoia", "location", "pressure"]), signature: z.string().min(40), wallet: z.string().min(32) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid story action." }, { status: 400 });
  const { action, signature, wallet } = parsed.data;
  const rpc = process.env.SOLANA_RPC_URL;
  const treasury = process.env.PULP_TREASURY_ADDRESS;
  const minimum = Number(process.env.PULP_MIN_LAMPORTS || "1000000");
  if (!rpc || !treasury) return NextResponse.json({ error: "The onchain action service is not configured." }, { status: 503 });
  try {
    const connection = new Connection(rpc, "confirmed");
    const transaction = await connection.getParsedTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
    if (!transaction || transaction.meta?.err) return NextResponse.json({ error: "The Solana transaction was not confirmed successfully." }, { status: 422 });
    const signerMatches = transaction.transaction.message.accountKeys.some((key) => key.signer && key.pubkey.toBase58() === wallet);
    const validTransfer = transaction.transaction.message.instructions.some((instruction) => {
      if (!("parsed" in instruction) || instruction.program !== "system") return false;
      const parsedInstruction = instruction.parsed as { type?: string; info?: { source?: string; destination?: string; lamports?: number } };
      return parsedInstruction.type === "transfer" && parsedInstruction.info?.source === wallet && parsedInstruction.info?.destination === treasury && Number(parsedInstruction.info?.lamports) >= minimum;
    });
    const validMemo = transaction.transaction.message.instructions.some((instruction) => {
      if ("parsed" in instruction || instruction.programId.toBase58() !== "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr") return false;
      return Buffer.from(bs58.decode(instruction.data)).toString("utf8") === `PULP_ACTION:${action}`;
    });
    if (!signerMatches || !validTransfer || !validMemo) return NextResponse.json({ error: "The transaction does not contain the required signed PULP action." }, { status: 422 });
    if (await isSignatureProcessed(signature)) return NextResponse.json({ error: "This transaction has already changed the story." }, { status: 409 });

    const current = await getStoryData();
    const nextState = applyAction(current.state, action);
    const generated = await generateScene(action, nextState);
    const event: StoryEvent = { id: `evt-${crypto.randomUUID().slice(0, 8)}`, action, label: actionCatalog[action].label, actor: wallet, detail: actionCatalog[action].prompt, time: new Date().toISOString(), signature, verified: true };
    await persistStoryChange({ event, wallet, state: nextState, scene: generated.scene, model: generated.model });
    return NextResponse.json({ event: { ...event, actor: `${wallet.slice(0, 4)}…${wallet.slice(-4)}` }, state: nextState, scene: generated.scene });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The story action could not be completed.";
    const status = message.includes("already changed") ? 409 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
