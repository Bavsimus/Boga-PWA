"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { addTrainingDay, getProgramDays } from "@/src/services/database";
import { User } from "firebase/auth";

export default function ProgramDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [days, setDays] = useState<any[]>([]);
  const [newDayTitle, setNewDayTitle] = useState("");
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    return auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u && typeof id === "string") loadDays(u.uid, id);
    });
  }, [id]);

  const loadDays = async (uid: string, progId: string) => {
    const data = await getProgramDays(uid, progId);
    setDays(data);
  };

  const handleAddDay = async () => {
    if (!user || !newDayTitle || typeof id !== "string") return;
    await addTrainingDay(user.uid, id, newDayTitle, days.length + 1);
    setNewDayTitle("");
    setShowInput(false);
    loadDays(user.uid, id);
  };

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <header className="flex items-center justify-between mb-10">
        <button onClick={() => router.push("/")} className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em]">
          ← Dashboard
        </button>
        <h1 className="text-xl font-black italic text-red-600">BOGA</h1>
      </header>

      <div className="mb-8">
        <h2 className="text-4xl font-bold italic uppercase tracking-tighter">Training Days</h2>
        <p className="text-zinc-500 text-xs mt-2 uppercase">Build your weekly routine</p>
      </div>

      <div className="grid gap-4">
        {days.map((day) => (
          <div 
            key={day.id} 
            className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] flex justify-between items-center active:scale-[0.98] transition-all"
            onClick={() => router.push(`/program/${id}/day/${day.id}`)}
          >
            <span className="text-lg font-bold">{day.title}</span>
            <span className="text-red-600 font-black">→</span>
          </div>
        ))}

        {showInput ? (
          <div className="bg-zinc-900 p-4 rounded-[2rem] border border-red-600/50">
            <input 
              autoFocus
              className="w-full bg-transparent p-2 outline-none text-lg font-bold"
              placeholder="Day Name (e.g. Leg Day)"
              value={newDayTitle}
              onChange={(e) => setNewDayTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddDay()}
            />
            <div className="flex justify-end gap-4 mt-2">
              <button onClick={() => setShowInput(false)} className="text-xs text-zinc-500 font-bold uppercase">Cancel</button>
              <button onClick={handleAddDay} className="text-xs text-red-600 font-bold uppercase">Confirm</button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setShowInput(true)}
            className="border-2 border-dashed border-zinc-800 p-6 rounded-[2rem] text-zinc-500 font-bold uppercase text-sm hover:border-zinc-600 transition"
          >
            + Add New Day
          </button>
        )}
      </div>
    </main>
  );
}