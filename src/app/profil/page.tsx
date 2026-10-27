"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function ProfilePage() {
  const { user, profile, loading, isAdmin, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
        Laden...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between bg-zinc-900/80">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-zinc-400 hover:text-white">
            ← Zurück zum Chat
          </Link>
          <h1 className="font-semibold text-lg">Profil</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-xl">
              {(profile?.username || user.email || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-lg">{profile?.username || "User"}</p>
              <p className="text-sm text-zinc-400">{profile?.email || user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-zinc-800/80 px-3 py-2">
              <p className="text-xs text-zinc-500">Rolle</p>
              <p className={isAdmin ? "text-amber-400 font-medium" : "text-zinc-200"}>
                {isAdmin ? "Admin" : "User"}
              </p>
            </div>
            <div className="rounded-xl bg-zinc-800/80 px-3 py-2">
              <p className="text-xs text-zinc-500">Registriert</p>
              <p className="text-zinc-200">
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString("de-DE")
                  : "–"}
              </p>
            </div>
          </div>

          {isAdmin && (
            <Link
              href="/admin"
              className="block w-full text-center py-2.5 rounded-xl bg-amber-900/50 text-amber-300 border border-amber-800 hover:bg-amber-900 font-medium text-sm"
            >
              Admin Panel öffnen
            </Link>
          )}

          {!isAdmin && (
            <p className="text-xs text-zinc-500 leading-relaxed">
              Du hast noch keine Admin-Rechte. Der erste registrierte Account wird
              automatisch Admin. Ein bestehender Admin kann dir die Rolle im Admin
              Panel geben.
            </p>
          )}

          <button
            onClick={() => logout().then(() => router.push("/login"))}
            className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm"
          >
            Logout
          </button>
        </div>
      </main>
    </div>
  );
}
