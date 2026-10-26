"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  isImage?: boolean;
  files?: { name: string; content: string }[];
};

type UploadedFile = {
  name: string;
  content: string;
  type: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hey! Ich bin Aether.\n\nSchreib einfach so wie du magst. Ich versteh dich und setze deine Bild-Beschreibungen möglichst genau um.\n\nDu kannst so viele Bilder machen wie du willst – ohne Wartezeit dazwischen.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"chat" | "image" | "code">("chat");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ===== Bessere Prompt-Verarbeitung für Bilder =====
  const improveImagePrompt = (raw: string): string => {
    let p = raw.trim();

    // Typische deutsche Einstiege entfernen
    p = p.replace(
      /^(erstelle|generiere|male|zeichne|mach|zeig|zeige|kannst du|bitte|ich will|ich möchte|mach mir|gib mir|zeig mir)\s+(mir\s+)?(ein\s+|eine\s+|einen\s+)?(bild|image|zeichnung|foto|picture|foto)\s+(von|mit|aus|von einem|von einer|von nem|von ner)?\s*/i,
      ""
    );

    // Mehrfache Leerzeichen und unnötige Wörter bereinigen
    p = p.replace(/\s+/g, " ").trim();

    if (!p) p = raw;

    // Wenn der Prompt sehr kurz und deutsch ist, etwas Qualität hinzufügen
    // (hilft der Bild-API enorm)
    const isShort = p.split(" ").length < 6;
    if (isShort) {
      p = `${p}, highly detailed, high quality, sharp focus`;
    }

    return p;
  };

  const generateImageUrl = (prompt: string) => {
    const clean = improveImagePrompt(prompt);
    const encoded = encodeURIComponent(clean);
    // Immer neuer Seed → jedes Bild ist anders, kein Cache-Problem
    const seed = Date.now() + Math.floor(Math.random() * 10000);

    // enhance=true lässt die API den Prompt intern verbessern
    // safe=false reduziert Filter
    return `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&model=flux&nologo=true&safe=false&private=true&enhance=true&seed=${seed}`;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: UploadedFile[] = [];

    for (const file of Array.from(files)) {
      const isText =
        file.type.startsWith("text/") ||
        file.type === "application/json" ||
        file.type === "application/javascript" ||
        /\.(html|css|js|jsx|ts|tsx|json|md|txt|svg|xml|py|php|vue|svelte|mjs|cjs)$/i.test(file.name);

      if (!isText) {
        alert(`"${file.name}" wird übersprungen (nur Text-Dateien).`);
        continue;
      }

      if (file.size > 2_000_000) {
        alert(`"${file.name}" ist zu groß (max. 2 MB).`);
        continue;
      }

      try {
        const content = await file.text();
        newFiles.push({ name: file.name, content, type: file.type || "text/plain" });
      } catch {
        alert(`Konnte "${file.name}" nicht lesen.`);
      }
    }

    setUploadedFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (name: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const downloadCode = (code: string, filename: string) => {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const buildHistory = () => {
    const recent = messages.filter((m) => m.id !== "welcome").slice(-10);
    if (recent.length === 0) return "";

    let history = "\n\n=== GESPRÄCHSVERLAUF ===\n";
    recent.forEach((m) => {
      const role = m.role === "user" ? "User" : "Aether";
      let content = m.content;
      if (content.length > 900) content = content.slice(0, 900) + "...";
      history += `${role}: ${content}\n`;
    });
    history += "=== ENDE ===\n";
    return history;
  };

  const sendMessage = async () => {
    if ((!input.trim() && uploadedFiles.length === 0) || loading) return;

    const userText = input.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userText || "(Dateien hochgeladen)",
      files: uploadedFiles.length > 0 ? [...uploadedFiles] : undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    const filesToSend = [...uploadedFiles];
    setUploadedFiles([]);

    // ===== BILD – sofort, ohne künstliche Wartezeit =====
    if (mode === "image") {
      setLoading(true);

      const prompt = userText || "beautiful detailed artwork high quality";
      const imageUrl = generateImageUrl(prompt);

      // Sofort anzeigen – kein künstlicher Delay
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Bild:\n"${improveImagePrompt(prompt)}"`,
        imageUrl,
        isImage: true,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setLoading(false);
      return;
    }

    // ===== CHAT / CODE =====
    setLoading(true);

    try {
      let systemPrompt = `Du bist Aether.

WICHTIG:
- Der User schreibt oft locker, alles in einem Satz, ohne viele Kommas. Verstehe die Absicht trotzdem.
- Lerne aus dem Gesprächsverlauf und werde besser.
- Antworte in der Sprache des Users.
- Sei hilfreich und direkt.`;

      if (mode === "code" || filesToSend.length > 0) {
        systemPrompt = `Du bist Aether, Coding-Assistent für Websites (HTML, CSS, JS, TypeScript, React, Next.js, Tailwind).

- Verstehe lockere, unperfekte Schreibweise.
- Lerne aus dem Verlauf.
- Bei Code-Änderungen: Gib IMMER die komplette Datei zurück:

\`\`\`dateiname.ext
kompletter inhalt
\`\`\`

- Sauberer, moderner Code. Antworte auf Deutsch wenn der User auf Deutsch schreibt.`;
      }

      let fileContext = "";
      if (filesToSend.length > 0) {
        fileContext = "\n\n=== DATEIEN ===\n";
        filesToSend.forEach((f) => {
          fileContext += `\n--- ${f.name} ---\n${f.content}\n`;
        });
        fileContext += "\n=== ENDE ===\n";
      }

      const history = buildHistory();
      const fullPrompt =
        systemPrompt +
        history +
        fileContext +
        "\n\nUser: " +
        (userText || "Verbessere die Dateien.") +
        "\n\nAether:";

      let text = "";

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 28000);

          const response = await fetch(
            `https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}?model=openai&temperature=0.5`,
            { signal: controller.signal }
          );
          clearTimeout(timeout);

          if (response.ok) {
            text = await response.text();
            text = text
              .split(/SPONSOR|---\s*SPONSOR/i)[0]
              .trim()
              .replace(/^Aether:\s*/i, "");
            if (text.length > 15) break;
          }
        } catch (err) {
          console.log("Versuch", attempt, err);
        }
      }

      if (!text || text.length < 10) {
        text = "API gerade überlastet. Einfach nochmal senden – ich merke mir den Verlauf.";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: text,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Kurzer Fehler. Einfach nochmal versuchen.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, i) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const match = part.match(/```(\S*)\n?([\s\S]*?)```/);
        if (!match) return <pre key={i}>{part}</pre>;

        const langOrFilename = match[1] || "code";
        const code = match[2].trim();
        const isFilename = langOrFilename.includes(".");

        return (
          <div key={i} className="my-3 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900">
            <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 text-xs">
              <span className="text-zinc-300 font-mono truncate max-w-[60%]">
                {isFilename ? langOrFilename : langOrFilename || "code"}
              </span>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => navigator.clipboard.writeText(code)}
                  className="px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200"
                >
                  Kopieren
                </button>
                <button
                  onClick={() =>
                    downloadCode(
                      code,
                      isFilename ? langOrFilename : `code.${langOrFilename || "txt"}`
                    )
                  }
                  className="px-2 py-1 rounded bg-purple-700 hover:bg-purple-600 text-white"
                >
                  Download
                </button>
              </div>
            </div>
            <pre className="p-3 text-xs overflow-x-auto text-zinc-200 whitespace-pre-wrap max-h-96 overflow-y-auto">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      return (
        <p key={i} className="whitespace-pre-wrap text-sm leading-relaxed">
          {part}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-sm">
            AI
          </div>
          <div>
            <h1 className="font-semibold text-lg leading-tight">Aether</h1>
            <p className="text-xs text-zinc-400">Keine Wartezeit • Unbegrenzte Bilder</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setMode("chat")}
            className={`px-3 py-1.5 rounded-full text-sm transition ${
              mode === "chat" ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-300"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setMode("code")}
            className={`px-3 py-1.5 rounded-full text-sm transition ${
              mode === "code" ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-300"
            }`}
          >
            Code
          </button>
          <button
            onClick={() => setMode("image")}
            className={`px-3 py-1.5 rounded-full text-sm transition ${
              mode === "image" ? "bg-pink-600 text-white" : "bg-zinc-800 text-zinc-300"
            }`}
          >
            Bild
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[92%] sm:max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user" ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-100"
              }`}
            >
              {msg.role === "assistant" ? renderContent(msg.content) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
              )}

              {msg.files && msg.files.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {msg.files.map((f) => (
                    <span key={f.name} className="text-xs bg-black/30 px-2 py-0.5 rounded">
                      📄 {f.name}
                    </span>
                  ))}
                </div>
              )}

              {msg.imageUrl && (
                <div className="mt-3">
                  <img
                    src={msg.imageUrl}
                    alt="Generiertes Bild"
                    className="rounded-xl max-w-full h-auto border border-zinc-700"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector(".error-hint")) {
                        const hint = document.createElement("p");
                        hint.className = "error-hint text-xs text-amber-400 mt-2";
                        hint.innerHTML =
                          "Bild konnte nicht geladen werden (API gerade voll).<br/>Einfach nochmal senden – kein Timer nötig.";
                        parent.appendChild(hint);
                      }
                    }}
                  />
                  <a
                    href={msg.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-400 hover:text-zinc-200 mt-2 inline-block"
                  >
                    Bild öffnen / herunterladen
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-2xl px-4 py-3 text-sm text-zinc-400 animate-pulse">
              {mode === "image" ? "Bild kommt..." : "Aether denkt..."}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      {uploadedFiles.length > 0 && (
        <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900 flex flex-wrap gap-2 items-center">
          <span className="text-xs text-zinc-500">Dateien:</span>
          {uploadedFiles.map((f) => (
            <div
              key={f.name}
              className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-1.5 text-xs"
            >
              <span>📄 {f.name}</span>
              <button onClick={() => removeFile(f.name)} className="text-zinc-400 hover:text-red-400">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <footer className="border-t border-zinc-800 p-4 bg-zinc-900/90">
        <div className="max-w-3xl mx-auto flex gap-2 items-end">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 shrink-0"
            title="Dateien hochladen"
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".html,.css,.js,.jsx,.ts,.tsx,.json,.md,.txt,.svg,.xml,.py,.php,.vue,.svelte,.mjs"
            onChange={handleFileUpload}
            className="hidden"
          />

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === "image"
                ? "Beschreib was du sehen willst – so genau wie möglich..."
                : mode === "code"
                ? "Was soll am Code geändert werden?"
                : "Schreib einfach so wie du magst..."
            }
            rows={1}
            className="flex-1 resize-none bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-zinc-500 min-h-[48px]"
          />
          <button
            onClick={sendMessage}
            disabled={loading || (!input.trim() && uploadedFiles.length === 0)}
            className="px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition shrink-0"
          >
            Senden
          </button>
        </div>
        <p className="text-center text-xs text-zinc-500 mt-2">
          Kein Timer • So viele Bilder wie du willst • Text wird besser verarbeitet
        </p>
      </footer>
    </div>
  );
}
