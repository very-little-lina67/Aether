import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAoD2v_861Z-pYxLvJcA3ZEVIpvTxg4fS0",
  authDomain: "aether-da9d4.firebaseapp.com",
  projectId: "aether-da9d4",
  storageBucket: "aether-da9d4.firebasestorage.app",
  messagingSenderId: "383635700136",
  appId: "1:383635700136:web:c1639007b5f207be4e059d",
  measurementId: "G-ETKXXFD3BT",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
