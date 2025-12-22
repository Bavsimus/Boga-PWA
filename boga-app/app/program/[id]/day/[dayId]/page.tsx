"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { addExercise, getExercises, finishWorkout } from "@/src/services/database";
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

  const toggleSet = (exId: string, index: number) => {
    const key = `${exId}-${index}`;
    setCompletedSets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFinishWorkout = async () => {
    if (!user || typeof id !== "string") return;

    // 1. Havai Fişek Patlat!
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#dc2626', '#ffffff', '#000000']
    });

    // 2. Özeti Hazırla
    const summary = {
      programId: id,
      dayId: dayId,
      exercises: exercises.map(ex => ({
        name: ex.name,
        weight: ex.weight,
        completedSets: Object.keys(completedSets).filter(k => k.startsWith(ex.id) && completedSets[k]).length
      }))
    };

    // 3. Veritabanına Kaydet
    try {
      await finishWorkout(user.uid, summary);
      
      // 4. Kısa bir süre sonra yönlendir ki konfetiler görünsün
      setTimeout(() => {
        setIsWorkoutActive(false);
        router.push(`/program/${id}`);
      }, 2000);
    } catch (error) {
      console.error("Save error:", error);
      alert("Something went wrong while saving.");
    }
  };

  if (loading) return <div className="bg-black min-h-screen flex items-center justify-center text-white italic tracking-widest">BOGA IS LOADING...</div>;
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
              <input className="w-full bg-black border border-zinc-800 p-4 rounded-2xl outline-none focus:border-red-600" placeholder="Movement Name" value={name} onChange={(e) => setName(e.target.value)} />
              <div className="grid grid-cols-3 gap-2">
                <input type="number" className="bg-black border border-zinc-800 p-4 rounded-2xl outline-none text-center" placeholder="Sets" value={sets} onChange={(e) => setSets(e.target.value)} />
                <input type="number" className="bg-black border border-zinc-800 p-4 rounded-2xl outline-none text-center" placeholder="Reps" value={reps} onChange={(e) => setReps(e.target.value)} />
                <input type="number" className="bg-black border border-zinc-800 p-4 rounded-2xl outline-none text-center" placeholder="Kg" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </div>
              <button onClick={handleAdd} className="w-full bg-white text-black font-black py-4 rounded-2xl uppercase mt-2">Add to Routine</button>
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
          <div key={ex.id} className={`p-6 rounded-[2rem] transition-all ${isWorkoutActive ? 'bg-zinc-900 border-l-8 border-red-600' : 'bg-zinc-900/40 border border-zinc-800'}`}>
            <div className="mb-4">
              <h3 className="font-black text-xl italic uppercase tracking-tighter">{ex.name}</h3>
              <p className="text-zinc-500 text-xs font-bold uppercase">{ex.weight} KG • {ex.sets} Sets</p>
            </div>

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