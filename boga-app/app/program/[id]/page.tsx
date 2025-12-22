"use client";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { getProgram, getProgramDays, addTrainingDay } from "@/src/services/database";
import { User } from "firebase/auth";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function ProgramDetails() {
  const router = useRouter();
  const params = useParams();
  const programId = params.id as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [program, setProgram] = useState<any>(null);
  const [days, setDays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDayName, setNewDayName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u && programId) {
        await loadData(u.uid, programId);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [programId]);

  const loadData = async (uid: string, pid: string) => {
    try {
      const [progData, daysData] = await Promise.all([
        getProgram(uid, pid),
        getProgramDays(uid, pid)
      ]);
      setProgram(progData);
      setDays(daysData);
    } catch (error) {
      console.error("Error loading program data:", error);
    }
  };

  const handleCreateDay = async () => {
    if (!user || !newDayName || isCreating) return;
    setIsCreating(true);
    try {
      await addTrainingDay(user.uid, programId, newDayName, days.length + 1);
      setNewDayName("");
      setIsModalOpen(false);
      await loadData(user.uid, programId);
    } catch (error) {
      console.error("Error creating day:", error);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) return (
    <div className="bg-black min-h-screen flex items-center justify-center text-white italic tracking-[0.3em] font-black">
      LOADING...
    </div>
  );

  if (!user) return null; 

  return (
    <main className="min-h-screen bg-black text-white p-6 font-sans">
      <header className="flex justify-between items-center mb-8">
        <button onClick={() => router.back()} className="text-zinc-500 text-xs font-black uppercase tracking-widest">
          ← Back
        </button>
        <h1 className="text-xl font-black italic tracking-tighter text-red-600 uppercase">
          {program?.name || "Program"}
        </h1>
        <div className="w-8" /> {/* Spacer */}
      </header>

      <section>
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-zinc-500 text-xs uppercase tracking-[0.2em] font-black">Training Days</h2>
           <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-zinc-900 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase border border-zinc-800 active:scale-95 transition-all"
           >
             + Add Day
           </button>
        </div>

        <div className="grid gap-4">
          {days.length === 0 ? (
            <div className="border border-zinc-900 border-dashed p-12 rounded-[2.5rem] text-center text-zinc-700 italic text-sm">
              No training days yet. Add one to start.
            </div>
          ) : (
            days.map((day) => (
              <Link key={day.id} href={`/program/${programId}/day/${day.id}`}>
                <div className="bg-zinc-900/40 border border-zinc-800 p-7 rounded-[2.5rem] flex justify-between items-center active:scale-[0.98] transition-all group cursor-pointer">
                  <div>
                    <h3 className="text-xl font-black italic uppercase tracking-tight group-hover:text-red-600 transition-colors">
                      {day.title}
                    </h3>
                    <p className="text-[10px] text-zinc-600 uppercase mt-1 tracking-widest font-bold">
                      Day {day.order}
                    </p>
                  </div>
                  <div className="text-red-600 font-black text-2xl">→</div>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* --- NEW DAY MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-zinc-900 w-full max-w-sm rounded-[2.5rem] p-8 border border-zinc-800 shadow-2xl">
            <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-6 text-red-600">New Day</h3>
            <input 
              autoFocus
              className="w-full bg-black border border-zinc-800 p-5 rounded-2xl mb-6 outline-none focus:border-red-600 transition-all font-bold text-white placeholder:text-zinc-700"
              placeholder="e.g. PUSH DAY A"
              value={newDayName}
              onChange={(e) => setNewDayName(e.target.value)}
            />
            <div className="flex gap-4">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 text-zinc-600 font-black uppercase text-[10px] tracking-widest">Cancel</button>
              <button 
                onClick={handleCreateDay} 
                disabled={isCreating}
                className="flex-[2] bg-white text-black py-4 rounded-2xl font-black uppercase text-xs active:scale-95 transition-all disabled:opacity-50"
              >
                {isCreating ? 'Adding...' : 'Add Day'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}