"use client";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, User } from "firebase/auth";
import { useState } from "react";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  const loginWithGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      setUser(res.user);
      console.log("Hoş geldin Boga:", res.user.displayName);
    } catch (err) {
      console.error("Giriş hatası:", err);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
      <div className="text-center">
        <h1 className="text-7xl font-black mb-2 italic tracking-tighter text-red-600">
          BOGA
        </h1>
        <p className="text-gray-400 mb-12 uppercase tracking-widest text-sm">
          Antrenman Takip Sistemi
        </p>

        {!user ? (
          <button
            onClick={loginWithGoogle}
            className="bg-white text-black px-10 py-4 rounded-xl font-bold hover:bg-gray-200 transition-all active:scale-95"
          >
            Google ile Giriş Yap
          </button>
        ) : (
          <div className="space-y-4">
            <p className="text-xl">Selam, <span className="font-bold text-red-500">{user.displayName}</span></p>
            <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
              <p className="text-gray-400">Antrenman programın yakında burada olacak...</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}