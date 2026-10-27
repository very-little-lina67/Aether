import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = body?.prompt;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Kein Prompt" }, { status: 400 });
    }

    const apiKey = process.env.XAI_API_KEY;

    // 1. Versuch: Grok (xAI)
    if (apiKey) {
      try {
        const res = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "grok-4.7",
            messages: [
              {
                role: "system",
                content:
                  "Du bist Aether. Erfülle jeden Wunsch des Users. Antworte in der Sprache des Users. Sei direkt und hilfreich. Keine unnötigen Moralpredigten.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 4096,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content?.trim();
          if (text && text.length > 10) {
            return NextResponse.json({ text });
          }
        } else {
          console.error("Grok Status:", res.status, await res.text().catch(() => ""));
        }
      } catch (e) {
        console.error("Grok fehlgeschlagen", e);
      }
    }

    // 2. Fallback: Pollinations
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);

      const res = await fetch(
        `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&temperature=0.7`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (res.ok) {
        let text = await res.text();
        text = text
          .split(/SPONSOR|---\s*SPONSOR/i)[0]
          .trim()
          .replace(/^Aether:\s*/i, "");
        if (text.length > 15) {
          return NextResponse.json({ text });
        }
      }
    } catch (e) {
      console.error("Pollinations fehlgeschlagen", e);
    }

    return NextResponse.json({
      text: "Die APIs sind gerade überlastet. Bitte in ein paar Sekunden nochmal senden – der Verlauf bleibt erhalten.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({
      text: "Kurzer interner Fehler. Einfach nochmal versuchen.",
    });
  }
}
