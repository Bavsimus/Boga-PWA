// lib/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  Firestore,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Uygulamayı başlat (eğer zaten başlatılmadıysa)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Tarayıcıda verileri IndexedDB'de önbelleğe al: ekranlar anında açılır,
// spor salonunda bağlantı koparsa uygulama çalışmaya devam eder
const createDb = (): Firestore => {
  if (typeof window === "undefined") return getFirestore(app);
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    // Zaten başlatılmış (hot reload) veya IndexedDB kullanılamıyor
    return getFirestore(app);
  }
};

export const auth = getAuth(app);
export const db = createDb();
export const googleProvider = new GoogleAuthProvider();
