"use client";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { createProgram, getUserPrograms } from "@/src/services/database";
import { User } from "firebase/auth";
import Link from "next/link";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [newProgramName, setNewProgramName] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Auth Listener
  useEffect(() => {
    return auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) loadPrograms(u.uid);
    });
  }, []);

  const loadPrograms = async (uid: string) => {
    const data = await getUserPrograms(uid);
    setPrograms(data);
  };

  const handleCreate = async () => {
    if (!user || !newProgramName) return;
    await createProgram(user.uid, newProgramName);
    setNewProgramName("");
    setIsModalOpen(false);
    loadPrograms(user.uid);
  };

  if (!user) return <LoginScreen />; // Login bileşeni olduğunu varsayıyoruz

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter text-red-600">BOGA</h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em]">Training Systems</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-red-600 w-10 h-10 rounded-full flex items-center justify-center font-bold text-2xl"
        >
          +
        </button>
      </header>

      <section>
        <h2 className="text-zinc-400 text-xs uppercase tracking-widest mb-6 font-semibold">Your Programs</h2>

        <div className="grid gap-4">
          {programs.length === 0 ? (
            <div className="border border-zinc-800 border-dashed p-10 rounded-3xl text-center text-zinc-600">
              No programs yet. Tap + to start.
            </div>
          ) : (
            programs.map((p) => (
              <Link href={`/program/${p.id}`} key={p.id}>
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl flex justify-between items-center active:scale-[0.98] transition-all cursor-pointer">
                  <div>
                    <h3 className="text-xl font-bold text-white">{p.name}</h3>
                    <p className="text-xs text-zinc-500 mt-1 uppercase tracking-tighter">View Details</p>
                  </div>
                  <div className="text-red-600 font-black text-2xl">→</div>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* Simple Modal for New Program */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-zinc-900 w-full max-w-sm rounded-[2rem] p-8 border border-zinc-800">
            <h3 className="text-2xl font-bold mb-6">New Program</h3>
            <input
              autoFocus
              className="w-full bg-black border border-zinc-800 p-4 rounded-2xl mb-6 outline-none focus:border-red-600 transition"
              placeholder="Program Name (e.g. Push Pull Leg)"
              value={newProgramName}
              onChange={(e) => setNewProgramName(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 text-zinc-500 font-bold">Cancel</button>
              <button onClick={handleCreate} className="flex-[2] bg-white text-black py-4 rounded-2xl font-black uppercase">Create</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function LoginScreen() {
  const loginWithGoogle = async () => {
    const { signInWithPopup, GoogleAuthProvider } = await import("firebase/auth");
    const { auth, googleProvider } = await import("@/lib/firebase");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  return (
    <div className="bg-black min-h-screen flex flex-col items-center justify-center text-white p-6">
      <h1 className="text-6xl font-black italic text-red-600 mb-2">BOGA</h1>
      <p className="text-zinc-500 mb-10 uppercase tracking-[0.3em] text-[10px]">Access Denied</p>
      <button 
        onClick={loginWithGoogle}
        className="bg-white text-black px-12 py-4 rounded-2xl font-black uppercase active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)]"
      >
        Login with Google
      </button>
    </div>
  );
}

