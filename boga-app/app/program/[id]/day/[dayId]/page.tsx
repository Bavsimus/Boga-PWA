"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { 
  addExercise, 
  getExercises, 
  finishWorkout, 
  updateExercise, // Yeni eklendi
  deleteExercise  // Yeni eklendi
} from "@/src/services/database";
import { User, signInWithPopup } from "firebase/auth";
import confetti from 'canvas-confetti';

export default function ExercisePage() {
  const { id, dayId } = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [completedSets, setCompletedSets] = useState<{[key: string]: boolean}>({});
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");

  // Edit State
  const [editingEx, setEditingEx] = useState<any | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u && id && dayId) {
        loadExercises(u.uid, id as string, dayId as string);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id, dayId]);

  const loadExercises = async (uid: string, pId: string, dId: string) => {
    const data = await getExercises(uid, pId, dId);
    setExercises(data);
  };

  const handleAdd = async () => {
    if (!user || !name || !id || !dayId) return;
    await addExercise(user.uid, id as string, dayId as string, {
      name,
      sets: Number(sets),
      reps: Number(reps),
      weight: Number(weight)
    });
    setName(""); setSets(""); setReps(""); setWeight("");
    loadExercises(user.uid, id as string, dayId as string);
  };

  const handleUpdate = async () => {
    if (!user || !editingEx || !id || !dayId) return;
    try {
      await updateExercise(user.uid, id as string, dayId as string, editingEx.id, {
        name: editingEx.name,
        sets: Number(editingEx.sets),
        reps: Number(editingEx.reps),
        weight: Number(editingEx.weight)
      });
      setEditingEx(null);
      loadExercises(user.uid, id as string, dayId as string);
    } catch (error) {
      console.error("Update error:", error);
    }
  };

  const handleDelete = async (exId: string) => {
    if (!user || !id || !dayId || !window.confirm("Delete this exercise?")) return;
    try {
      await deleteExercise(user.uid, id as string, dayId as string, exId);
      setEditingEx(null);
      loadExercises(user.uid, id as string, dayId as string);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const toggleSet = (exId: string, index: number) => {
    const key = `${exId}-${index}`;
    setCompletedSets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFinishWorkout = async () => {
    if (!user || typeof id !== "string") return;

    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#dc2626', '#ffffff', '#000000']
    });

    const summary = {
      programId: id,
      dayId: dayId,
      exercises: exercises.map(ex => ({
        name: ex.name,
        weight: ex.weight,
        completedSets: Object.keys(completedSets).filter(k => k.startsWith(ex.id) && completedSets[k]).length
      }))
    };

    try {
      await finishWorkout(user.uid, summary);
      setTimeout(() => {
        setIsWorkoutActive(false);
        router.push(`/program/${id}`);
      }, 2000);
    } catch (error) {
      console.error("Save error:", error);
      alert("Something went wrong while saving.");
    }
  };

  if (loading) return <div className="bg-black min-h-screen flex items-center justify-center text-white italic tracking-widest font-black uppercase">BOGA Loading...</div>;
  if (!user) return <LoginScreen />;

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <header className="flex items-center justify-between mb-8">
        <button onClick={() => router.back()} className="text-zinc-500 text-xs font-bold uppercase tracking-widest">← Back</button>
        <h1 className="text-xl font-black italic text-red-600 tracking-tighter">BOGA</h1>
      </header>

      {!isWorkoutActive ? (
        <section className="mb-10">
          <button 
            onClick={() => setIsWorkoutActive(true)}
            className="w-full bg-red-600 text-white font-black py-6 rounded-[2.5rem] text-2xl italic mb-10 shadow-lg active:scale-95 transition-all"
          >
            START WORKOUT
          </button>

          <div className="bg-zinc-900 p-6 rounded-[2rem] border border-zinc-800">
            <h2 className="text-xs font-bold mb-4 uppercase text-zinc-500 tracking-widest text-center">Add New Movement</h2>
            <div className="space-y-3">
              <input className="w-full bg-black border border-zinc-800 p-4 rounded-2xl outline-none focus:border-red-600 font-bold" placeholder="Movement Name" value={name} onChange={(e) => setName(e.target.value)} />
              <div className="grid grid-cols-3 gap-2">
                <input type="number" className="bg-black border border-zinc-800 p-4 rounded-2xl outline-none text-center font-bold" placeholder="Sets" value={sets} onChange={(e) => setSets(e.target.value)} />
                <input type="number" className="bg-black border border-zinc-800 p-4 rounded-2xl outline-none text-center font-bold" placeholder="Reps" value={reps} onChange={(e) => setReps(e.target.value)} />
                <input type="number" className="bg-black border border-zinc-800 p-4 rounded-2xl outline-none text-center font-bold" placeholder="Kg" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </div>
              <button onClick={handleAdd} className="w-full bg-white text-black font-black py-4 rounded-2xl uppercase mt-2 active:scale-95 transition-all">Add to Routine</button>
            </div>
          </div>
        </section>
      ) : (
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-black italic text-red-600 uppercase">Training Active</h2>
          <button onClick={() => setIsWorkoutActive(false)} className="text-xs font-bold text-zinc-500 underline uppercase">Cancel</button>
        </div>
      )}

      <div className="space-y-4 pb-24">
        {exercises.map((ex) => (
          <div key={ex.id} className={`p-6 rounded-[2rem] relative group transition-all ${isWorkoutActive ? 'bg-zinc-900 border-l-8 border-red-600' : 'bg-zinc-900/40 border border-zinc-800'}`}>
            <div className="mb-4">
              <h3 className="font-black text-xl italic uppercase tracking-tighter">{ex.name}</h3>
              <p className="text-zinc-500 text-xs font-bold uppercase">{ex.weight} KG • {ex.sets} Sets • {ex.reps} Reps</p>
            </div>

            {/* Edit Icon (Sadece antrenman aktif değilken görünür) */}
            {!isWorkoutActive && (
              <button 
                onClick={() => setEditingEx(ex)}
                className="absolute right-6 top-8 p-2 text-zinc-700 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
            )}

            {isWorkoutActive && (
              <div className="flex gap-3 flex-wrap">
                {[...Array(ex.sets)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => toggleSet(ex.id, i)}
                    className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center font-black transition-all active:scale-90 ${completedSets[`${ex.id}-${i}`] ? 'bg-red-600 border-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'border-zinc-800 text-zinc-500'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit Exercise Modal */}
      {editingEx && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setEditingEx(null)} />
          <div className="relative bg-zinc-900 w-full max-w-sm rounded-[2.5rem] p-8 border border-zinc-800 shadow-2xl">
            <h3 className="text-xl font-black italic uppercase text-white mb-6">Edit Movement</h3>
            <div className="space-y-4">
              <input 
                className="w-full bg-black border border-zinc-800 p-4 rounded-2xl outline-none focus:border-red-600 text-white font-bold"
                value={editingEx.name}
                onChange={(e) => setEditingEx({...editingEx, name: e.target.value})}
              />
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-black">Sets</label>
                  <input type="number" className="w-full bg-black border border-zinc-800 p-3 rounded-xl outline-none text-center font-bold mt-1" value={editingEx.sets} onChange={(e) => setEditingEx({...editingEx, sets: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-black">Reps</label>
                  <input type="number" className="w-full bg-black border border-zinc-800 p-3 rounded-xl outline-none text-center font-bold mt-1" value={editingEx.reps} onChange={(e) => setEditingEx({...editingEx, reps: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase font-black">Kg</label>
                  <input type="number" className="w-full bg-black border border-zinc-800 p-3 rounded-xl outline-none text-center font-bold mt-1" value={editingEx.weight} onChange={(e) => setEditingEx({...editingEx, weight: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 mt-8">
              <button onClick={handleUpdate} className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-xs active:scale-95 transition-all">Save Changes</button>
              <button onClick={() => handleDelete(editingEx.id)} className="w-full py-4 text-red-600 font-black uppercase text-[10px] tracking-widest border border-red-900/30 rounded-2xl">Delete Movement</button>
              <button onClick={() => setEditingEx(null)} className="text-zinc-600 font-bold uppercase text-[10px] mt-2">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isWorkoutActive && exercises.length > 0 && (
        <div className="fixed bottom-6 left-6 right-6">
          <button 
            onClick={handleFinishWorkout}
            className="w-full bg-green-600 text-white font-black py-5 rounded-[2rem] text-xl shadow-2xl active:scale-95 transition-all"
          >
            FINISH & SAVE WORKOUT 🔥
          </button>
        </div>
      )}
    </main>
  );
}

function LoginScreen() {
  const login = async () => {
    const { auth, googleProvider } = await import("@/lib/firebase");
    await signInWithPopup(auth, googleProvider);
  };
  return (
    <div className="bg-black min-h-screen flex flex-col items-center justify-center text-white p-6">
      <h1 className="text-7xl font-black italic text-red-600 mb-8">BOGA</h1>
      <button onClick={login} className="bg-white text-black px-12 py-4 rounded-2xl font-black uppercase">Google Login</button>
    </div>
  );
}