"use client";
import { useState, useEffect, useCallback } from "react";
import { auth } from "@/lib/firebase";
import Image from "next/image";
import {
  createProgram,
  getUserPrograms,
  getTotalWorkoutsCount,
  updateProgramName,
  deleteProgram
} from "../src/services/database";
import { User, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [newProgramName, setNewProgramName] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  // Edit Mode States
  const [editingProgram, setEditingProgram] = useState<{ id: string, name: string } | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadInitialData = useCallback(async (uid: string) => {
    try {
      const [progs, count] = await Promise.all([
        getUserPrograms(uid),
        getTotalWorkoutsCount(uid)
      ]);
      setPrograms(progs);
      setWorkoutCount(count);
    } catch (error) {
      console.error("Initial data load error:", error);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        await loadInitialData(u.uid);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [loadInitialData]);

  const handleCreate = async () => {
    if (!user || !newProgramName || isCreating) return;
    setIsCreating(true);
    try {
      await createProgram(user.uid, newProgramName);
      setNewProgramName("");
      setIsModalOpen(false);
      await loadInitialData(user.uid);
    } catch (error) {
      console.error("Error creating program:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!user || !editingProgram) return;
    try {
      await updateProgramName(user.uid, editingProgram.id, editingProgram.name);
      setIsEditModalOpen(false);
      await loadInitialData(user.uid);
    } catch (error) {
      console.error("Update error:", error);
    }
  };

  const handleDelete = async (pId: string) => {
    if (!user || !window.confirm("Are you sure you want to delete this program?")) return;
    try {
      await deleteProgram(user.uid, pId);
      setIsEditModalOpen(false);
      await loadInitialData(user.uid);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  if (loading) return (
    <div className="bg-black min-h-screen flex items-center justify-center text-white italic tracking-[0.3em] font-black">
      BOGA IS LOADING...
    </div>
  );

  if (!user) return <LoginScreen />;

  return (
    <main className="min-h-screen bg-black text-white p-6 font-sans">
      {/* --- HEADER --- */}
      <header className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-4">
          {/* Logo Alanı */}


          <div>
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10">
                <Image
                  src="/boga.png"
                  alt="BOGA Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <h1 className="text-3xl font-black italic tracking-tighter text-red-600 leading-none">BOGA</h1>
            </div>
            <p className="text-[9px] text-zinc-500 uppercase tracking-[0.3em] mt-0.5">Training Systems</p>
          </div>
        </div>

        <button
          onClick={() => setIsProfileOpen(true)}
          className="w-12 h-12 rounded-full border-2 border-zinc-800 overflow-hidden active:scale-90 transition-all shadow-lg shadow-red-600/10"
        >
          {user.photoURL ? (
            <img src={user.photoURL} alt="profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-400">
              {user.displayName?.charAt(0) || "U"}
            </div>
          )}
        </button>
      </header>

      {/* --- PROGRAMS SECTION --- */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-zinc-500 text-xs uppercase tracking-[0.2em] font-black">Your Programs</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-zinc-900 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase border border-zinc-800 active:scale-95 transition-all"
          >
            + New Program
          </button>
        </div>

        <div className="grid gap-4">
          {programs.length === 0 ? (
            <div className="border border-zinc-900 border-dashed p-12 rounded-[2.5rem] text-center text-zinc-700 italic text-sm">
              No programs yet.
            </div>
          ) : (
            programs.map((p) => (
              <div key={p.id} className="relative group">
                <div
                  onClick={() => router.push(`/program/${p.id}`)}
                  className="bg-zinc-900/40 border border-zinc-800 p-7 rounded-[2.5rem] flex justify-between items-center active:scale-[0.98] transition-all cursor-pointer group-hover:border-zinc-700"
                >
                  <div>
                    <h3 className="text-xl font-black italic uppercase tracking-tight group-hover:text-red-600 transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-[10px] text-zinc-600 uppercase mt-1 tracking-widest font-bold">Manage days</p>
                  </div>
                  <div className="text-red-600 font-black text-2xl pr-8">→</div>
                </div>

                {/* Edit Icon Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingProgram({ id: p.id, name: p.name });
                    setIsEditModalOpen(true);
                  }}
                  className="absolute right-6 top-1/2 -translate-y-1/2 p-3 text-zinc-700 hover:text-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* --- PROFILE DRAWER --- */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsProfileOpen(false)} />
          <div className="relative w-full max-w-[320px] bg-zinc-950 h-full p-8 border-l border-zinc-800 flex flex-col shadow-2xl animate-in slide-in-from-right">
            <button onClick={() => setIsProfileOpen(false)} className="self-end text-zinc-600 font-black text-xs mb-12">CLOSE ✕</button>
            <div className="flex items-center gap-4 mb-10">
              <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center text-2xl font-black italic shadow-[0_0_20px_rgba(220,38,38,0.3)]">{user.displayName?.charAt(0)}</div>
              <div>
                <h3 className="text-lg font-black italic uppercase tracking-tight">{user.displayName}</h3>
                <p className="text-[9px] text-zinc-600 font-bold uppercase">{user.email}</p>
              </div>
            </div>
            <div className="space-y-3 flex-1">
              <div className="p-5 bg-red-600/10 rounded-[2rem] border border-red-600/20 mb-4">
                <p className="text-[9px] text-red-500 uppercase font-black mb-1 tracking-widest">Total Workouts Done</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black italic tracking-tighter text-white">{workoutCount}</p>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase">Sessions</p>
                </div>
              </div>
              <div className="p-5 bg-zinc-900/50 rounded-[2rem] border border-zinc-800">
                <p className="text-[9px] text-zinc-600 uppercase font-black mb-1 tracking-widest">Language</p>
                <p className="text-sm font-bold italic">English (Global)</p>
              </div>
            </div>
            <button
              onClick={() => router.push("/settings")}
              className="w-full py-5 mb-3 bg-zinc-900 text-white font-black uppercase text-[10px] border border-zinc-800 rounded-[2rem] active:scale-95 transition-all tracking-widest flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 1v6m0 6v6m-6-6h6m6 0h-6m-3.5-8.5 4 4m4 4 4 4m-16 0 4-4m4-4 4-4" /></svg>
              Settings
            </button>
            <button
              onClick={() => router.push("/history")}
              className="w-full py-5 mb-3 bg-zinc-900 text-white font-black uppercase text-[10px] border border-zinc-800 rounded-[2rem] active:scale-95 transition-all tracking-widest flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              View Workout History
            </button>
            <button onClick={() => signOut(auth)} className="w-full py-5 text-red-600 font-black uppercase text-[10px] border border-red-900/30 rounded-[2rem] bg-red-950/10 active:scale-95 transition-all">Sign Out Session</button>
          </div>
        </div>
      )}

      {/* --- NEW PROGRAM MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-zinc-900 w-full max-w-sm rounded-[2.5rem] p-8 border border-zinc-800 shadow-2xl">
            <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-6 text-red-600">New Program</h3>
            <input
              autoFocus
              className="w-full bg-black border border-zinc-800 p-5 rounded-2xl mb-6 outline-none focus:border-red-600 text-white font-bold"
              placeholder="e.g. POWERLIFTING 101"
              value={newProgramName}
              onChange={(e) => setNewProgramName(e.target.value)}
            />
            <div className="flex gap-4">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 text-zinc-600 font-black uppercase text-[10px]">Cancel</button>
              <button onClick={handleCreate} disabled={isCreating} className="flex-[2] bg-white text-black py-4 rounded-2xl font-black uppercase text-xs disabled:opacity-50">
                {isCreating ? 'Creating...' : 'Create Program'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT PROGRAM MODAL --- */}
      {isEditModalOpen && editingProgram && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative bg-zinc-900 w-full max-w-sm rounded-[2.5rem] p-8 border border-zinc-800 shadow-2xl">
            <h3 className="text-xl font-black italic uppercase text-white mb-6">Edit Program</h3>
            <input
              className="w-full bg-black border border-zinc-800 p-5 rounded-2xl mb-6 outline-none focus:border-red-600 text-white font-bold"
              value={editingProgram.name}
              onChange={(e) => setEditingProgram({ ...editingProgram, name: e.target.value })}
            />
            <div className="flex flex-col gap-3">
              <button onClick={handleUpdate} className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-xs active:scale-95 transition-all">Save Changes</button>
              <button onClick={() => handleDelete(editingProgram.id)} className="w-full py-4 text-red-600 font-black uppercase text-[10px] tracking-widest border border-red-900/30 rounded-2xl">Delete Program</button>
              <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-600 font-bold uppercase text-[10px] mt-2">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function LoginScreen() {
  const login = async () => {
    const { auth, googleProvider } = await import("@/lib/firebase");
    const { signInWithPopup } = await import("firebase/auth");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  return (
    <div className="bg-black min-h-screen flex flex-col items-center justify-center text-white p-6 text-center">
      <div className="mb-8 relative w-48 h-48 animate-pulse">
        <img
          src="/boga.png"
          alt="BOGA Logo"
          className="w-full h-full object-contain"
        />
      </div>
      <p className="text-zinc-500 font-black uppercase text-[10px] tracking-[0.5em] mb-12">
        Strength Tracker
      </p>
      <button onClick={login} className="bg-white text-black px-12 py-5 rounded-[2rem] font-black uppercase tracking-tighter shadow-2xl active:scale-95 transition-all">
        Google Login
      </button>
    </div>
  );
}