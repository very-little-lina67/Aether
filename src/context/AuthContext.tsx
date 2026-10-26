"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type UserRole = "admin" | "user";

export type UserProfile = {
  uid: string;
  email: string;
  username: string;
  role: UserRole;
  createdAt: number;
};

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  register: (email: string, username: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  // Admin functions
  listUsers: () => Promise<UserProfile[]>;
  setUserRole: (uid: string, role: UserRole) => Promise<void>;
  deleteUserAccount: (uid: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (u: User) => {
    const ref = doc(db, "users", u.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      setProfile(snap.data() as UserProfile);
    }
    // Hinweis: Falls das Dokument noch nicht existiert, wird es parallel 
    // von register() angelegt. Kein automatisches Überschreiben nötig.
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          await loadProfile(u);
        } catch (e) {
          console.error("Profil laden fehlgeschlagen", e);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const register = async (email: string, username: string, password: string) => {
    const name = username.trim();
    if (name.length < 2) throw new Error("Benutzername zu kurz");

    // 1. Zuerst Auth-Konto erstellen (dadurch ist request.auth vorhanden und Firestore-Aufrufe sind erlaubt)
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(cred.user, { displayName: name });

    try {
      // 2. Jetzt authentifiziert prüfen, ob der Benutzername bereits von jemand anderem genutzt wird
      const q = query(collection(db, "users"), where("username", "==", name));
      const existing = await getDocs(q);
      const isTakenByOther = existing.docs.some((d) => d.id !== cred.user.uid);

      if (isTakenByOther) {
        // Falls vergeben: frisch erstellten Auth-Nutzer aufräumen
        await cred.user.delete();
        throw new Error("Benutzername bereits vergeben");
      }

      // 3. Prüfen, ob es der erste registrierte Nutzer ist (wird Admin)
      const allUsers = await getDocs(collection(db, "users"));
      const otherUsers = allUsers.docs.filter((d) => d.id !== cred.user.uid);
      const role: UserRole = otherUsers.length === 0 ? "admin" : "user";

      // 4. Profil in Firestore anlegen
      const profileData: UserProfile = {
        uid: cred.user.uid,
        email: email.trim().toLowerCase(),
        username: name,
        role,
        createdAt: Date.now(),
      };
      await setDoc(doc(db, "users", cred.user.uid), profileData);
      setProfile(profileData);
    } catch (err) {
      // Falls nach dem Auth-Schritt etwas schiefging und der User noch existiert, aufräumen
      if (auth.currentUser && auth.currentUser.uid === cred.user.uid) {
        try {
          await cred.user.delete();
        } catch {
          // Ignorieren falls Löschen nicht möglich
        }
      }
      throw err;
    }
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  const listUsers = async (): Promise<UserProfile[]> => {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map((d) => d.data() as UserProfile);
  };

  const setUserRole = async (uid: string, role: UserRole) => {
    await updateDoc(doc(db, "users", uid), { role });
    if (profile?.uid === uid) {
      setProfile({ ...profile, role });
    }
  };

  // Löscht nur das Firestore-Profil (Auth-User kann nur der User selbst oder Admin SDK löschen)
  const deleteUserAccount = async (uid: string) => {
    await deleteDoc(doc(db, "users", uid));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        register,
        login,
        logout,
        isAdmin: profile?.role === "admin",
        listUsers,
        setUserRole,
        deleteUserAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth muss innerhalb von AuthProvider genutzt werden");
  return ctx;
}
