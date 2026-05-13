import { openrouterClient } from "./openrouter";
import { getSystemPrompt } from "./db";

export async function triageMessage(message: string): Promise<"handle" | "escalate"> {
  const { text: systemPrompt } = getSystemPrompt();
  if (!systemPrompt?.trim()) return "handle";

  try {
    const response = await openrouterClient.chat.completions.create({
      model: process.env.TRIAGE_MODEL ?? "meta-llama/llama-3.3-70b-instruct:free",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      max_tokens: 30,
    });

    const raw = response.choices[0].message.content ?? "";
    try {
      const data = JSON.parse(raw) as { action?: string };
      return data.action === "escalate" ? "escalate" : "handle";
    } catch {
      return raw.toLowerCase().includes("escalate") ? "escalate" : "handle";
    }
  } catch (err) {
    console.error("[triage] error, defaulting to handle:", err);
    return "handle";
  }
}
