# PULP — `$PULP`

## Hook

**A public novel is alive: each onchain event changes what happens next, and every completed chapter is permanently sealed.**

## What it does

PULP is a live serial novel with a visible world-state. Community actions add characters, locations, wounds, alliances, and plot pressure; the engine converts those events into the next short scene. A chapter can never be silently rewritten once sealed.

## Token / Solana role

`$PULP` is the story-action token. A verified action (initially a small devnet transfer or burn) grants a narrowly defined prompt such as “introduce a witness” or “make the detective paranoid.” The app can also display indexed market activity as an artistic signal, but it must not promise economic outcomes.

## Public proof loop

`Solana action → event ledger → deterministic story-state change → new scene → chapter hash on IPFS/Arweave + Solana checkpoint`

Readers can inspect the event that caused every state change and compare a sealed chapter to its stored content hash.

## One-day MVP scope

- One noir/scifi world, three recurring characters, and a 1,000-word opening chapter.
- Four safe action types mapped to deterministic state changes.
- Live event timeline, story-state panel, and reader page.
- One LLM-generated scene every few minutes, with guardrails and manual kill switch.
- Seal Chapter 1 to IPFS (or a content hash in a Solana memo) and show its proof card.

## Architecture

- **Frontend:** Next.js/Vite reader, event stream, and world-state inspector.
- **API:** TypeScript action verifier, scene scheduler, content moderation, and chapter sealer.
- **State:** Postgres/Supabase tables for events, state snapshots, scenes, and hashes.
- **Solana:** wallet adapter, RPC signature verification, token-account/event indexing.
- **AI:** structured-output model constrained to a canonical state schema.

## External dependencies

- Solana RPC/indexer (Helius, Birdeye, or standard RPC).
- LLM API and moderation layer.
- IPFS pinning service such as Pinata, or Arweave uploader.
- Hosted database and cron/scheduler.

## Running the MVP

PULP is now a working Next.js application. It includes the live reader, canonical world-state inspector, deterministic story actions, event ledger, draft chapter proof, Solana signature verification, and an optional OpenAI scene generator. With no credentials it runs in demo mode and remains fully interactive.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Add environment variables when you are ready to enable external services.

### Environment variables

- `OPENAI_API_KEY` and optional `OPENAI_MODEL`: generate scenes with the Responses API. Without these, the deterministic story engine is used.
- `SOLANA_RPC_URL`: RPC used to confirm submitted signatures (defaults to Solana devnet).
- `PULP_TREASURY_ADDRESS`: when set, verified transactions must include this address.
- `PULP_TOKEN_MINT` and `PULP_MIN_LAMPORTS`: reserved for a production token-transfer policy.
- `PINATA_JWT` and `PINATA_GATEWAY`: reserved for the final chapter-sealing flow.
- `CRON_SECRET`: reserved for an authenticated scheduled scene job.

### Commands

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
```

The `/api/health` endpoint reports which optional integrations are configured without exposing secret values.
