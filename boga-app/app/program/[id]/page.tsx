"use client";
import { useState, useEffect, useCallback } from "react";
import { auth } from "@/lib/firebase";
import { 
  getProgram, 
  getProgramDays, 
  addTrainingDay, 
  updateDayName, // Yeni eklendi
  deleteDay      // Yeni eklendi
} from "@/src/services/database";
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

  // Edit States
  const [editingDay, setEditingDay] = useState<{id: string, name: string} | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadData = useCallback(async (uid: string, pid: string) => {
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
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u && programId) {
        await loadData(u.uid, programId);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [programId, loadData]);

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

  const handleUpdateDay = async () => {
    if (!user || !editingDay) return;
    try {
      await updateDayName(user.uid, programId, editingDay.id, editingDay.name);
      setIsEditModalOpen(false);
      await loadData(user.uid, programId);
    } catch (error) {
      console.error("Update error:", error);
    }
  };

  const handleDeleteDay = async (dayId: string) => {
    if (!user || !window.confirm("Are you sure you want to delete this training day?")) return;
    try {
      await deleteDay(user.uid, programId, dayId);
      setIsEditModalOpen(false);
      await loadData(user.uid, programId);
    } catch (error) {
      console.error("Delete error:", error);
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
        <h1 className="text-xl font-black italic tracking-tighter text-red-600 uppercase leading-none text-center flex-1 mx-4">
          {program?.name || "Program"}
        </h1>
        <div className="w-8" />
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
              <div key={day.id} className="relative group">
                <Link href={`/program/${programId}/day/${day.id}`}>
                  <div className="bg-zinc-900/40 border border-zinc-800 p-7 rounded-[2.5rem] flex justify-between items-center active:scale-[0.98] transition-all group-hover:border-zinc-700">
                    <div>
                      <h3 className="text-xl font-black italic uppercase tracking-tight group-hover:text-red-600 transition-colors">
                        {day.name}
                      </h3>
                      <p className="text-[10px] text-zinc-600 uppercase mt-1 tracking-widest font-bold">Tap to see exercises</p>
                    </div>
                    <div className="text-red-600 font-black text-2xl pr-8">→</div>
                  </div>
                </Link>

                {/* Edit Icon Button */}
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditingDay({id: day.id, name: day.name});
                    setIsEditModalOpen(true);
                  }}
                  className="absolute right-6 top-1/2 -translate-y-1/2 p-3 text-zinc-700 hover:text-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* New Day Modal */}
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
                {isCreating ? 'Creating...' : 'Create Day'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Day Modal */}
      {isEditModalOpen && editingDay && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative bg-zinc-900 w-full max-w-sm rounded-[2.5rem] p-8 border border-zinc-800 shadow-2xl">
            <h3 className="text-xl font-black italic uppercase text-white mb-6">Edit Training Day</h3>
            <input 
              className="w-full bg-black border border-zinc-800 p-5 rounded-2xl mb-6 outline-none focus:border-red-600 text-white font-bold"
              value={editingDay.name}
              onChange={(e) => setEditingDay({...editingDay, name: e.target.value})}
            />
            <div className="flex flex-col gap-3">
              <button onClick={handleUpdateDay} className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-xs active:scale-95 transition-all">Save Changes</button>
              <button onClick={() => handleDeleteDay(editingDay.id)} className="w-full py-4 text-red-600 font-black uppercase text-[10px] tracking-widest border border-red-900/30 rounded-2xl">Delete Day</button>
              <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-600 font-bold uppercase text-[10px] mt-2">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}