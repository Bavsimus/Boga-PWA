"use client";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { getWorkoutHistory } from "@/src/services/database";
import { useRouter } from "next/navigation";

export default function HistoryPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const data = await getWorkoutHistory(user.uid);
        setLogs(data);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return <div className="bg-black min-h-screen flex items-center justify-center text-white font-black italic">LOADING HISTORY...</div>;

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <header className="flex items-center justify-between mb-10">
        <button onClick={() => router.back()} className="text-zinc-500 text-xs font-bold uppercase tracking-widest">← Back</button>
        <h1 className="text-xl font-black italic text-red-600">HISTORY</h1>
      </header>

      <div className="space-y-6">
        {logs.length === 0 ? (
          <p className="text-zinc-600 italic text-center py-20">No workouts recorded yet. Get to work!</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="bg-zinc-900/50 border border-zinc-800 rounded-[2rem] p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] text-red-500 font-black uppercase tracking-widest">
                    {log.completedAt?.toDate().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <h3 className="text-xl font-black italic uppercase tracking-tighter mt-1">Workout Session</h3>
                </div>
                <span className="bg-zinc-800 text-zinc-400 text-[9px] px-3 py-1 rounded-full font-bold uppercase">
                   {log.completedAt?.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="space-y-2 border-t border-zinc-800 pt-4">
                {log.exercises?.map((ex: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span className="text-zinc-300 font-bold uppercase tracking-tight">{ex.name}</span>
                    <span className="text-zinc-500 font-black italic">
                      {ex.completedSets} SETS • {ex.weight} KG
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}