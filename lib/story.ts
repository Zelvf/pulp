export type ActionType = "witness" | "paranoia" | "location" | "pressure";

export type StoryEvent = {
  id: string;
  action: ActionType;
  label: string;
  actor: string;
  detail: string;
  time: string;
  signature?: string;
  verified: boolean;
};

export type WorldState = {
  pressure: number;
  trust: number;
  hour: string;
  weather: string;
  location: string;
  activeThread: string;
};

export const actionCatalog: Record<ActionType, { label: string; prompt: string; cost: string }> = {
  witness: { label: "Introduce a witness", prompt: "A witness enters with one dangerous fact.", cost: "0.001 SOL" },
  paranoia: { label: "Seed paranoia", prompt: "Make Detective Vale doubt her closest ally.", cost: "0.001 SOL" },
  location: { label: "Open a location", prompt: "Reveal a new place connected to the signal.", cost: "0.001 SOL" },
  pressure: { label: "Raise the pressure", prompt: "Accelerate the threat without adding violence.", cost: "0.001 SOL" },
};

export const initialState: WorldState = {
  pressure: 67,
  trust: 42,
  hour: "03:17",
  weather: "Acid rain",
  location: "The Glass District",
  activeThread: "Who sent the dead frequency?",
};

export const openingScene = [
  "The rain came down in straight silver lines, too disciplined to be weather. It hissed against the tram cables and made every window in the Glass District look briefly occupied.",
  "Detective Mara Vale stood beneath the dead clock at Platform Nine, watching a train that did not appear on the municipal map. Its doors were open. No one got off. Somewhere inside, a telephone kept ringing.",
  "\"You hear it too,\" Ilya said. The courier had arrived without an umbrella and without the package he had sworn was chained to his wrist. A pale groove circled the skin where the cuff should have been.",
  "Vale counted seven rings. On the eighth, the station lights blinked and every departure board displayed the same impossible time: 03:17. The city had been stuck there for eleven seconds yesterday. Today it stayed for twelve.",
  "At the far end of the platform, Sable Quine lifted her camera. She was the kind of journalist who photographed a secret before deciding whether it could kill her. The flash revealed a fourth shadow between them, tall and narrow and attached to no body at all.",
  "Then the phone stopped. A voice spilled from every speaker in the station, warm as an old recording: \"Detective Vale, the next chapter belongs to whoever finds the passenger.\"",
];

export function applyAction(state: WorldState, action: ActionType): WorldState {
  const next = { ...state };
  if (action === "witness") { next.trust = Math.min(100, next.trust + 6); next.activeThread = "What did the conductor erase?"; }
  if (action === "paranoia") { next.trust = Math.max(0, next.trust - 9); next.activeThread = "Why did Ilya lie about the package?"; }
  if (action === "location") { next.location = "The Undertram Archive"; next.pressure = Math.min(100, next.pressure + 4); }
  if (action === "pressure") { next.pressure = Math.min(100, next.pressure + 8); next.hour = "03:18"; }
  return next;
}
