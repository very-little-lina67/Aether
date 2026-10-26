"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, UserProfile, UserRole } from "@/context/AuthContext";

export default function AdminPage() {
  const { user, profile, loading, isAdmin, listUsers, setUserRole, deleteUserAccount, logout } =
    useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    else if (!loading && user && !isAdmin) router.replace("/");
  }, [user, loading, isAdmin, router]);

  const refresh = async () => {
    try {
      const list = await listUsers();
      list.sort((a, b) => b.createdAt - a.createdAt);
      setUsers(list);
    } catch (e) {
      console.error(e);
      setMsg("Nutzer konnten nicht geladen werden. Prüfe Firestore-Regeln.");
    }
  };

  useEffect(() => {
    if (isAdmin) refresh();
  }, [isAdmin]);

  const changeRole = async (uid: string, role: UserRole) => {
    setBusy(true);
    setMsg("");
    try {
      await setUserRole(uid, role);
      await refresh();
      setMsg("Rolle aktualisiert.");
    } catch {
      setMsg("Rolle konnte nicht geändert werden.");
    } finally {
      setBusy(false);
    }
  };

  const removeUser = async (uid: string, username: string) => {
    if (uid === profile?.uid) {
      setMsg("Du kannst dich nicht selbst löschen.");
      return;
    }
    if (!confirm(`Konto von "${username}" wirklich löschen? (nur Profil in der Datenbank)`)) return;
    setBusy(true);
    setMsg("");
    try {
      await deleteUserAccount(uid);
      await refresh();
      setMsg("Nutzer-Profil gelöscht.");
    } catch {
      setMsg("Löschen fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !isAdmin) {
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
          <h1 className="font-semibold text-lg">Admin Panel</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-zinc-400">
            {profile?.username} · <span className="text-amber-400">Admin</span>
          </span>
          <button
            onClick={() => logout().then(() => router.push("/login"))}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-400">
            Registrierte Nutzer: <strong className="text-white">{users.length}</strong>
          </p>
          <button
            onClick={refresh}
            disabled={busy}
            className="text-sm px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
          >
            Aktualisieren
          </button>
        </div>

        {msg && (
          <p className="text-sm text-emerald-400 bg-emerald-950/30 border border-emerald-900 rounded-lg px-3 py-2">
            {msg}
          </p>
        )}

        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-zinc-400 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Benutzername</th>
                <th className="px-3 py-2 font-medium">E-Mail</th>
                <th className="px-3 py-2 font-medium">Rolle</th>
                <th className="px-3 py-2 font-medium">Erstellt</th>
                <th className="px-3 py-2 font-medium">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid} className="border-t border-zinc-800 hover:bg-zinc-900/50">
                  <td className="px-3 py-2 font-medium">
                    {u.username}
                    {u.uid === profile?.uid && (
                      <span className="ml-2 text-xs text-zinc-500">(du)</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-zinc-400">{u.email}</td>
                  <td className="px-3 py-2">
                    <select
                      value={u.role}
                      disabled={busy || u.uid === profile?.uid}
                      onChange={(e) => changeRole(u.uid, e.target.value as UserRole)}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-zinc-500 text-xs">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString("de-DE") : "–"}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      disabled={busy || u.uid === profile?.uid}
                      onClick={() => removeUser(u.uid, u.username)}
                      className="text-red-400 hover:text-red-300 text-xs disabled:opacity-40"
                    >
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                    Keine Nutzer gefunden
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-zinc-500 space-y-1 border border-zinc-800 rounded-xl p-3 bg-zinc-900/50">
          <p>
            <strong>Hinweis:</strong> „Löschen“ entfernt das Profil in Firestore. Der Firebase-Auth-Login
            bleibt bestehen (komplettes Löschen braucht Firebase Admin SDK / Console).
          </p>
          <p>
            Der <strong>erste</strong> registrierte Account wird automatisch <strong>Admin</strong>.
          </p>
        </div>
      </main>
    </div>
  );
}
