import { NextResponse } from "next/server";
import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { z } from "zod";

const requestSchema = z.object({ wallet: z.string().min(32), action: z.enum(["witness", "paranoia", "location", "pressure"]) });
const submitSchema = z.object({ signedTransaction: z.string().min(100), blockhash: z.string(), lastValidBlockHeight: z.number() });
const memoProgram = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

function config() {
  const rpc = process.env.SOLANA_RPC_URL;
  const treasury = process.env.PULP_TREASURY_ADDRESS;
  const lamports = Number(process.env.PULP_MIN_LAMPORTS || "1000000");
  if (!rpc || !treasury || !Number.isSafeInteger(lamports) || lamports <= 0) throw new Error("The PULP transaction service is not configured");
  return { rpc, treasury, lamports };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if ("signedTransaction" in body) {
      const parsed = submitSchema.parse(body);
      const { rpc } = config();
      const connection = new Connection(rpc, "confirmed");
      const signature = await connection.sendRawTransaction(Buffer.from(parsed.signedTransaction, "base64"), { skipPreflight: false, maxRetries: 3 });
      const confirmation = await connection.confirmTransaction({ signature, blockhash: parsed.blockhash, lastValidBlockHeight: parsed.lastValidBlockHeight }, "confirmed");
      if (confirmation.value.err) throw new Error("Solana rejected the transaction");
      return NextResponse.json({ signature });
    }

    const parsed = requestSchema.parse(body);
    const { rpc, treasury, lamports } = config();
    const connection = new Connection(rpc, "confirmed");
    const payer = new PublicKey(parsed.wallet);
    const destination = new PublicKey(treasury);
    const latest = await connection.getLatestBlockhash("confirmed");
    const transaction = new Transaction({ feePayer: payer, recentBlockhash: latest.blockhash });
    transaction.add(SystemProgram.transfer({ fromPubkey: payer, toPubkey: destination, lamports }));
    transaction.add(new TransactionInstruction({ keys: [], programId: memoProgram, data: Buffer.from(`PULP_ACTION:${parsed.action}`, "utf8") }));
    return NextResponse.json({ transaction: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"), blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight, lamports });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Transaction unavailable" }, { status: 400 });
  }
}
