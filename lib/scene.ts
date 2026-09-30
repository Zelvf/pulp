import OpenAI from "openai";
import { actionCatalog, type ActionType, type WorldState } from "@/lib/story";

export async function generateScene(action: ActionType, state: WorldState) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  const model = process.env.OPENAI_MODEL || "gpt-5.6-luna";
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model,
    reasoning: { effort: "low" },
    instructions: "You write restrained literary noir science fiction. Continue the PULP serial in 70-110 words. No sexual content, graphic violence, hate, self-harm, instructions for wrongdoing, token hype, or financial promises. Preserve canonical state exactly. Output only scene prose.",
    input: `Reader action: ${actionCatalog[action].prompt}\nCanonical state: ${JSON.stringify(state)}\nCharacters: Detective Mara Vale, courier Ilya Rook, journalist Sable Quine. Setting: rain-soaked Glass District, 03:17, a train absent from every map.`,
    max_output_tokens: 220,
  });
  const scene = response.output_text.trim();
  if (!scene) throw new Error("The story engine returned an empty scene");
  return { scene, model };
}
