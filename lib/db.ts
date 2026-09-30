import { neon } from "@neondatabase/serverless";
import type { ActionType, StoryEvent, WorldState } from "@/lib/story";

function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

export async function initializeStory() {
  const sql = database();
  await sql`CREATE TABLE IF NOT EXISTS pulp_story_state (
    id integer PRIMARY KEY CHECK (id = 1),
    pressure integer NOT NULL,
    trust integer NOT NULL,
    world_hour text NOT NULL,
    weather text NOT NULL,
    location text NOT NULL,
    active_thread text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS pulp_events (
    id text PRIMARY KEY,
    signature text UNIQUE NOT NULL,
    action text NOT NULL,
    label text NOT NULL,
    wallet text NOT NULL,
    detail text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS pulp_scenes (
    id text PRIMARY KEY,
    event_id text UNIQUE NOT NULL REFERENCES pulp_events(id),
    content text NOT NULL,
    model text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`;
  await sql`INSERT INTO pulp_story_state (id, pressure, trust, world_hour, weather, location, active_thread)
    VALUES (1, 67, 42, '03:17', 'Acid rain', 'The Glass District', 'Who sent the dead frequency?')
    ON CONFLICT (id) DO NOTHING`;
}

export async function getStoryData(): Promise<{ state: WorldState; events: StoryEvent[]; scenes: string[] }> {
  await initializeStory();
  const sql = database();
  const [stateRows, eventRows, sceneRows] = await Promise.all([
    sql`SELECT pressure, trust, world_hour, weather, location, active_thread FROM pulp_story_state WHERE id = 1`,
    sql`SELECT id, signature, action, label, wallet, detail, created_at FROM pulp_events ORDER BY created_at DESC LIMIT 20`,
    sql`SELECT content FROM pulp_scenes ORDER BY created_at ASC LIMIT 100`,
  ]);
  const row = stateRows[0];
  return {
    state: { pressure: row.pressure, trust: row.trust, hour: row.world_hour, weather: row.weather, location: row.location, activeThread: row.active_thread },
    events: eventRows.map((event) => ({
      id: event.id,
      action: event.action as ActionType,
      label: event.label,
      actor: `${event.wallet.slice(0, 4)}…${event.wallet.slice(-4)}`,
      detail: event.detail,
      time: new Date(event.created_at).toISOString(),
      signature: event.signature,
      verified: true,
    })),
    scenes: sceneRows.map((scene) => scene.content),
  };
}

export async function persistStoryChange(input: { event: StoryEvent; wallet: string; state: WorldState; scene: string; model: string }) {
  const sql = database();
  const inserted = await sql`INSERT INTO pulp_events (id, signature, action, label, wallet, detail)
    VALUES (${input.event.id}, ${input.event.signature!}, ${input.event.action}, ${input.event.label}, ${input.wallet}, ${input.event.detail})
    ON CONFLICT (signature) DO NOTHING RETURNING id`;
  if (inserted.length === 0) throw new Error("This transaction has already changed the story.");
  await sql`UPDATE pulp_story_state SET pressure=${input.state.pressure}, trust=${input.state.trust}, world_hour=${input.state.hour}, weather=${input.state.weather}, location=${input.state.location}, active_thread=${input.state.activeThread}, updated_at=now() WHERE id=1`;
  await sql`INSERT INTO pulp_scenes (id, event_id, content, model) VALUES (${`scene-${crypto.randomUUID()}`}, ${input.event.id}, ${input.scene}, ${input.model})`;
}

export async function isSignatureProcessed(signature: string) {
  await initializeStory();
  const sql = database();
  const rows = await sql`SELECT 1 FROM pulp_events WHERE signature = ${signature} LIMIT 1`;
  return rows.length > 0;
}
