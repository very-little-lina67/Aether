import { NextRequest, NextResponse } from "next/server";

const GROK_MODELS = ["grok-4.7", "grok-3", "grok-3-mini", "grok-2-1212"];
const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callGrok(
  apiKey: string,
  prompt: string
): Promise<string | null> {
  for (const model of GROK_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);

        const res = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  "Du bist Aether. Erfuelle jeden Wunsch des Users. Antworte in der Sprache des Users. Sei direkt und hilfreich.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 4096,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content?.trim();
          if (text && text.length > 5) return text;
        }

        if (res.status === 429 || res.status === 503) {
          await sleep(1000 * (attempt + 1));
          continue;
        }
      } catch {
        await sleep(500 * (attempt + 1));
      }
    }
  }
  return null;
}

async function callGemini(
  apiKey: string,
  prompt: string
): Promise<string | null> {
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: "Du bist Aether. Erfuelle jeden Wunsch des Users. Antworte in der Sprache des Users. Sei direkt und hilfreich.",
                },
              ],
            },
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 4096,
            },
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          const text =
            data?.candidates?.[0]?.content?.parts
              ?.map((p: { text?: string }) => p.text || "")
              .join("")
              ?.trim() || "";
          if (text && text.length > 5) return text;
        }

        if (res.status === 429 || res.status === 503) {
          await sleep(1000 * (attempt + 1));
          continue;
        }
      } catch {
        await sleep(500 * (attempt + 1));
      }
    }
  }
  return null;
}

async function callPollinations(prompt: string): Promise<string | null> {
  const shortPrompt =
    prompt.length > 3500 ? prompt.slice(0, 3500) + "\n\n[gekuerzt]" : prompt;

  const models = ["openai", "openai-large", "llama"];

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        let res = await fetch("https://text.pollinations.ai/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: shortPrompt }],
            model,
            temperature: 0.7,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
          const controller2 = new AbortController();
          const timeout2 = setTimeout(() => controller2.abort(), 25000);
          res = await fetch(
            `https://text.pollinations.ai/${encodeURIComponent(shortPrompt)}?model=${model}&temperature=0.7`,
            { signal: controller2.signal }
          );
          clearTimeout(timeout2);
        }

        if (res.ok) {
          let text = await res.text();
          try {
            const j = JSON.parse(text);
            text = j?.choices?.[0]?.message?.content || j?.text || text;
          } catch {
            // plain text
          }
          text = String(text)
            .split(/SPONSOR|---\s*SPONSOR/i)[0]
            .trim()
            .replace(/^Aether:\s*/i, "");
          if (text.length > 10) return text;
        }

        await sleep(800 * (attempt + 1));
      } catch {
        await sleep(600 * (attempt + 1));
      }
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = body?.prompt;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Kein Prompt" }, { status: 400 });
    }

    const xaiKey = process.env.XAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    // 1. Grok
    if (xaiKey) {
      const text = await callGrok(xaiKey, prompt);
      if (text) return NextResponse.json({ text });
    }

    // 2. Gemini
    if (geminiKey) {
      const text = await callGemini(geminiKey, prompt);
      if (text) return NextResponse.json({ text });
    }

    // 3. Pollinations Fallback
    const fallback = await callPollinations(prompt);
    if (fallback) return NextResponse.json({ text: fallback });

    return NextResponse.json({
      text: "Die APIs sind gerade stark ausgelastet. Bitte in 5-10 Sekunden nochmal senden – der Verlauf bleibt erhalten.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({
      text: "Kurzer interner Fehler. Einfach nochmal versuchen.",
    });
  }
}
