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

export const initialEvents: StoryEvent[] = [
  { id: "evt-009", action: "pressure", label: "Pressure raised", actor: "7eQ…m91", detail: "The courier has six minutes left.", time: "2m ago", verified: true },
  { id: "evt-008", action: "witness", label: "Witness introduced", actor: "Bm4…x0P", detail: "A tram conductor saw the impossible passenger.", time: "11m ago", verified: true },
  { id: "evt-007", action: "paranoia", label: "Paranoia seeded", actor: "9Lk…2Vr", detail: "Vale no longer trusts Ilya's alibi.", time: "19m ago", verified: true },
];

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

export function fallbackScene(action: ActionType, state: WorldState): string {
  const lines: Record<ActionType, string> = {
    witness: "The conductor emerged from the rain with a punched ticket pressed into his palm. “I saw the passenger,” he said, looking past Vale toward the empty train. “The trouble is, detective, she had your face.”",
    paranoia: "Ilya's coat chimed. Not a phone—a second set of tram tokens, still warm from the machine. Vale had watched the city destroy every token twelve years ago. He caught her looking and slowly closed his hand.",
    location: "Behind the station map, a service door sighed open on stairs descending below the flooded rails. A brass plaque named the darkness THE UNDERTRAM ARCHIVE. Something below stamped a ticket.",
    pressure: "The departure board began counting backward. Six minutes became five. Across the platform, every pane of glass showed the train leaving, though the real carriage had not moved.",
  };
  return `${lines[action]} The pressure held at ${state.pressure}%, and the dead frequency kept breathing.`;
}
