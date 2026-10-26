"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { user, loading, login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        if (!username.trim()) throw new Error("Benutzername erforderlich");
        if (password.length < 6) throw new Error("Passwort mind. 6 Zeichen");
        await register(email, username, password);
      }
      router.replace("/");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Fehler bei Anmeldung / Registrierung";
      // Firebase Fehler lesbarer machen
      if (msg.includes("auth/email-already-in-use")) setError("E-Mail schon registriert");
      else if (msg.includes("auth/invalid-email")) setError("Ungültige E-Mail");
      else if (msg.includes("auth/wrong-password") || msg.includes("auth/invalid-credential"))
        setError("E-Mail oder Passwort falsch");
      else if (msg.includes("auth/user-not-found")) setError("Kein Konto mit dieser E-Mail");
      else if (msg.includes("auth/weak-password")) setError("Passwort zu schwach");
      else setError(msg);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
        Laden...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold mb-3">
            AI
          </div>
          <h1 className="text-xl font-semibold text-white">Aether</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {mode === "login" ? "Anmelden" : "Registrieren"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">E-Mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="name@email.com"
            />
          </div>

          {mode === "register" && (
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Benutzername</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="deinname"
                minLength={2}
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Passwort</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium text-sm disabled:opacity-50 hover:opacity-90 transition"
          >
            {busy ? "Bitte warten..." : mode === "login" ? "Anmelden" : "Registrieren"}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-400 mt-4">
          {mode === "login" ? (
            <>
              Noch kein Konto?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
                className="text-purple-400 hover:underline"
              >
                Registrieren
              </button>
            </>
          ) : (
            <>
              Schon ein Konto?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
                className="text-purple-400 hover:underline"
              >
                Anmelden
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
