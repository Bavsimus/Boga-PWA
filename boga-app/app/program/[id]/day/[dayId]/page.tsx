"use client";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { auth } from "@/lib/firebase";
import {
  addExercise,
  getExercises,
  finishWorkout,
  updateExercise,
  deleteExercise,
  getUserSettings,
  recordWorkoutCompletion,
  getDay
} from "@/src/services/database";
import { User } from "firebase/auth";
import { EmptyState, ErrorScreen, Icon, LoadingScreen, LoginScreen, PageHeader, Sheet } from "@/src/components/ui";
// confetti import removed from top level to be imported dynamically

const formatClock = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
};

export default function ExercisePage() {
  const { id, dayId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userIdParam = searchParams.get('userId'); // Get userId from URL
  const [user, setUser] = useState<User | null>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [completedSets, setCompletedSets] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [dayName, setDayName] = useState("");
  const [isOwner, setIsOwner] = useState(false);

  // Form State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");

  // Edit State
  const [editingEx, setEditingEx] = useState<any | null>(null);

  const [isFinishing, setIsFinishing] = useState(false);

  // --- WORKOUT CLOCK ---
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isWorkoutActive || !startedAt) return;
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isWorkoutActive, startedAt]);

  // --- REST TIMER STATE ---
  const [restTime, setRestTime] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(90);
  const [restTimerEnabled, setRestTimerEnabled] = useState(true);
  const [restDuration, setRestDuration] = useState(90);

  // Countdown is based on an end timestamp so it stays accurate when the phone
  // locks or the tab is backgrounded (intervals get throttled there)
  useEffect(() => {
    if (!isTimerActive || !restEndsAt) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((restEndsAt - Date.now()) / 1000));
      setRestTime(remaining);
      if (remaining <= 0) {
        setIsTimerActive(false);
        setRestEndsAt(null);
        navigator.vibrate?.([200, 100, 200]);
      }
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [isTimerActive, restEndsAt]);

  const skipRest = () => {
    setIsTimerActive(false);
    setRestEndsAt(null);
    setRestTime(0);
  };

  const extendRest = (seconds: number) => {
    if (!restEndsAt) return;
    setRestEndsAt(restEndsAt + seconds * 1000);
    setRestTotal(t => t + seconds);
  };

  // --- ACTIVE WORKOUT PERSISTENCE ---
  // Keep an in-progress session across reloads / app switches
  const progressKey = `boga-workout-${id}-${dayId}`;

  useEffect(() => {
    if (!isOwner) return;
    try {
      const saved = localStorage.getItem(progressKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // An abandoned session from hours ago shouldn't resume as "live"
        if (parsed.startedAt && Date.now() - parsed.startedAt > 6 * 60 * 60 * 1000) {
          localStorage.removeItem(progressKey);
          return;
        }
        setCompletedSets(parsed.completedSets || {});
        setStartedAt(parsed.startedAt || Date.now());
        setIsWorkoutActive(true);
      }
    } catch { }
  }, [isOwner, progressKey]);

  useEffect(() => {
    if (!isOwner) return;
    try {
      if (isWorkoutActive) {
        localStorage.setItem(progressKey, JSON.stringify({ completedSets, startedAt }));
      }
    } catch { }
  }, [isOwner, isWorkoutActive, completedSets, startedAt, progressKey]);

  const clearProgress = () => {
    try { localStorage.removeItem(progressKey); } catch { }
  };

  const startWorkout = () => {
    setCompletedSets({});
    setStartedAt(Date.now());
    setElapsed(0);
    setIsWorkoutActive(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelWorkout = () => {
    const hasProgress = Object.values(completedSets).some(Boolean);
    if (hasProgress && !window.confirm("Cancel this workout? Your progress will be lost.")) return;
    clearProgress();
    setCompletedSets({});
    setStartedAt(null);
    skipRest();
    setIsWorkoutActive(false);
  };

  const loadExercises = useCallback(async (uid: string, pId: string, dId: string) => {
    const [data, day] = await Promise.all([
      getExercises(uid, pId, dId),
      getDay(uid, pId, dId)
    ]);
    setExercises(data);
    if (day) {
      setDayName(day.name || day.title || "");
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      try {
        if (id && dayId) {
          // Use userId from URL if provided, otherwise use current user's ID
          const targetUserId = userIdParam || u?.uid;

          if (targetUserId) {
            // Check if viewing own workout
            setIsOwner(u?.uid === targetUserId);

            // Load settings only for own workouts (in parallel with the exercises).
            // Settings are optional: fall back to defaults rather than failing the page
            const [, settings] = await Promise.all([
              loadExercises(targetUserId, id as string, dayId as string),
              u?.uid === targetUserId ? getUserSettings(targetUserId).catch(() => null) : Promise.resolve(null)
            ]);
            if (settings) {
              setRestTimerEnabled(settings.restTimerEnabled);
              setRestDuration(settings.restDuration);
            }
          }
        }
      } catch (error) {
        console.error("Error loading workout:", error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [id, dayId, loadExercises, userIdParam]);

  const handleAdd = async () => {
    if (!user || !name.trim() || !id || !dayId) return;
    await addExercise(user.uid, id as string, dayId as string, {
      name: name.trim(),
      sets: Number(sets) || 3,
      reps: Number(reps) || 10,
      weight: Number(weight) || 0
    });
    setName(""); setSets(""); setReps(""); setWeight("");
    setIsAddOpen(false);
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
    const isNowDone = !completedSets[key];

    setCompletedSets(prev => ({ ...prev, [key]: isNowDone }));
    navigator.vibrate?.(15);

    // Eğer set tamamlandıysa ve timer enabled ise timer'ı başlat
    if (isNowDone && restTimerEnabled) {
      setRestTime(restDuration);
      setRestTotal(restDuration);
      setRestEndsAt(Date.now() + restDuration * 1000);
      setIsTimerActive(true);
    }
  };

  const doneCountFor = (ex: any) =>
    Array.from({ length: Number(ex.sets) || 0 }, (_, i) => completedSets[`${ex.id}-${i}`]).filter(Boolean).length;

  const handleFinishWorkout = async () => {
    if (!user || typeof id !== "string" || isFinishing) return;
    setIsFinishing(true);

    const summary = {
      programId: id,
      dayId: dayId,
      dayName,
      durationSeconds: elapsed,
      exercises: exercises.map(ex => ({
        name: ex.name,
        weight: ex.weight,
        completedSets: doneCountFor(ex)
      })),
      completedAt: new Date()
    };

    try {
      const saving = Promise.all([
        finishWorkout(user.uid, summary),
        recordWorkoutCompletion(user.uid, id as string, dayId as string, dayName)
      ]);
      // Offline, Firestore queues the writes in its local cache and syncs them later,
      // but the promise only resolves once the server confirms — so don't block on it
      if (navigator.onLine) {
        await Promise.race([saving, new Promise(resolve => setTimeout(resolve, 8000))]);
      } else {
        saving.catch(error => console.error("Queued save failed:", error));
      }
      clearProgress();
      skipRest();

      const confetti = (await import('canvas-confetti')).default;
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#dc2626', '#ffffff', '#000000']
      });

      setTimeout(() => {
        setIsWorkoutActive(false);
        router.push(`/program/${id}`);
      }, 2000);
    } catch (error) {
      console.error("Save error:", error);
      alert("Workout could not be saved. Check your connection and try again.");
      setIsFinishing(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginScreen />;
  if (loadError) return <ErrorScreen />;

  const totalSets = exercises.reduce((sum, ex) => sum + (Number(ex.sets) || 0), 0);
  const doneSets = exercises.reduce((sum, ex) => sum + doneCountFor(ex), 0);
  const progress = totalSets ? doneSets / totalSets : 0;
  const totalVolume = exercises.reduce((sum, ex) => sum + (Number(ex.sets) || 0) * (Number(ex.reps) || 0) * (Number(ex.weight) || 0), 0);

  // Rest ring geometry
  const R = 22;
  const C = 2 * Math.PI * R;

  return (
    <main className={`min-h-screen text-white px-5 max-w-2xl mx-auto ${isWorkoutActive ? "!pb-56" : ""}`}>
      {!isWorkoutActive ? (
        <PageHeader subtitle={isOwner ? "Training Day" : "Shared Training Day"} title={dayName || "Workout"} />
      ) : (
        /* --- ACTIVE WORKOUT HEADER --- */
        <header className="sticky z-40 -mx-5 px-5 pb-4 mb-4 glass !border-x-0 !border-t-0 animate-fade-in" style={{ top: 0, paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Live
              </p>
              <h1 className="text-lg font-bold tracking-tight truncate">{dayName || "Workout"}</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold tabular tracking-tight">{formatClock(elapsed)}</span>
              <button onClick={cancelWorkout} className="icon-btn !w-9 !h-9" aria-label="Cancel workout">
                <Icon name="close" size={16} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-red-600 to-orange-400 transition-all duration-500" style={{ width: `${progress * 100}%` }} />
            </div>
            <span className="text-xs font-semibold text-zinc-400 tabular">{doneSets}/{totalSets} sets</span>
          </div>
        </header>
      )}

      {/* --- OVERVIEW (not active) --- */}
      {!isWorkoutActive && exercises.length > 0 && (
        <section className="card p-5 mb-6 animate-rise-in">
          <div className="grid grid-cols-3 divide-x divide-white/5 text-center">
            <div>
              <p className="text-2xl font-bold tabular">{exercises.length}</p>
              <p className="text-xs text-zinc-500 mt-0.5">Exercises</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular">{totalSets}</p>
              <p className="text-xs text-zinc-500 mt-0.5">Sets</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular">{totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}t` : `${totalVolume}kg`}</p>
              <p className="text-xs text-zinc-500 mt-0.5">Volume</p>
            </div>
          </div>
          {isOwner && (
            <button onClick={startWorkout} className="btn btn-primary w-full h-14 text-base mt-5">
              <Icon name="play" size={18} /> Start Workout
            </button>
          )}
        </section>
      )}

      {/* --- EXERCISE LIST --- */}
      {!isWorkoutActive && (
        <div className="flex justify-between items-center mb-4">
          <p className="eyebrow">Exercises</p>
          {isOwner && exercises.length > 0 && (
            <button onClick={() => setIsAddOpen(true)} className="btn btn-ghost h-10 px-4 text-sm">
              <Icon name="plus" size={16} /> Add
            </button>
          )}
        </div>
      )}

      {exercises.length === 0 ? (
        <EmptyState
          icon="dumbbell"
          title="No exercises yet"
          text={isOwner ? "Add the movements for this day with target sets, reps and weight." : "This day doesn't have any exercises yet."}
          action={isOwner && <button onClick={() => setIsAddOpen(true)} className="btn btn-primary h-11 px-5 text-sm"><Icon name="plus" size={16} /> Add Exercise</button>}
        />
      ) : (
        <div className="space-y-3">
          {exercises.map((ex, exIndex) => {
            const setCount = Number(ex.sets) || 0;
            const done = doneCountFor(ex);
            const complete = setCount > 0 && done === setCount;

            return (
              <div
                key={ex.id}
                className={`card p-5 transition-all animate-rise-in ${isWorkoutActive && complete ? "!border-green-500/30" : ""}`}
                style={{ animationDelay: `${exIndex * 30}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${isWorkoutActive && complete ? "bg-green-500 text-black" : "bg-white/[0.05] text-zinc-400 border border-white/[0.07]"}`}>
                    {isWorkoutActive && complete ? <Icon name="check" size={16} strokeWidth={3} /> : exIndex + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[17px] tracking-tight leading-snug">{ex.name}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-xs font-medium text-zinc-300 bg-white/[0.06] rounded-full px-2.5 py-1 tabular">{ex.sets} × {ex.reps}</span>
                      <span className="text-xs font-medium text-zinc-300 bg-white/[0.06] rounded-full px-2.5 py-1 tabular">{ex.weight} kg</span>
                      {isWorkoutActive && (
                        <span className={`text-xs font-medium rounded-full px-2.5 py-1 tabular ${complete ? "bg-green-500/15 text-green-400" : "text-zinc-500"}`}>{done}/{setCount} done</span>
                      )}
                    </div>
                  </div>

                  {!isWorkoutActive && isOwner && (
                    <button onClick={() => setEditingEx(ex)} className="icon-btn !bg-transparent !border-transparent -mr-2 -mt-1" aria-label="Edit exercise">
                      <Icon name="more" size={18} />
                    </button>
                  )}
                </div>

                {isWorkoutActive && (
                  <div className="grid grid-cols-5 gap-2 mt-4">
                    {Array.from({ length: setCount }).map((_, i) => {
                      const isDone = completedSets[`${ex.id}-${i}`];
                      return (
                        <button
                          key={i}
                          onClick={() => toggleSet(ex.id, i)}
                          aria-pressed={!!isDone}
                          aria-label={`Set ${i + 1}`}
                          className={`h-14 rounded-2xl flex flex-col items-center justify-center font-bold transition-all active:scale-90 ${isDone
                            ? "bg-gradient-to-b from-red-500 to-red-700 text-white shadow-[0_6px_16px_-6px_rgba(239,68,68,0.8)] animate-check-pop"
                            : "bg-white/[0.04] border border-white/[0.08] text-zinc-400"
                            }`}
                        >
                          {isDone ? <Icon name="check" size={20} strokeWidth={3} /> : (
                            <>
                              <span className="text-base leading-none tabular">{i + 1}</span>
                              <span className="text-[10px] font-medium text-zinc-600 mt-1 tabular">{ex.reps}×{ex.weight}</span>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* --- REST TIMER --- */}
      {isWorkoutActive && isTimerActive && (
        <div className="fixed left-4 right-4 z-[60] flex justify-center animate-rise-in" style={{ bottom: "calc(max(1rem, env(safe-area-inset-bottom)) + 76px)" }}>
          <div className="glass w-full max-w-md rounded-3xl p-3 pr-4 flex items-center gap-4 shadow-2xl shadow-black/60">
            <div className="relative w-14 h-14 shrink-0">
              <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
                <circle cx="28" cy="28" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
                <circle
                  cx="28" cy="28" r={R} fill="none" stroke="#ef4444" strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={C * (1 - restTime / Math.max(restTotal, 1))}
                  className="transition-[stroke-dashoffset] duration-300 ease-linear"
                />
              </svg>
              <Icon name="timer" size={18} className="absolute inset-0 m-auto text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Rest</p>
              <p className="text-2xl font-bold tabular tracking-tight leading-tight">{formatClock(restTime)}</p>
            </div>
            <button onClick={() => extendRest(15)} className="btn btn-ghost h-10 px-3 text-sm tabular">+15s</button>
            <button onClick={skipRest} className="btn btn-light h-10 px-4 text-sm">Skip</button>
          </div>
        </div>
      )}

      {/* Finish Button */}
      {isWorkoutActive && exercises.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-50 px-4 flex justify-center bg-gradient-to-t from-black via-black/80 to-transparent pt-8" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <button
            onClick={handleFinishWorkout}
            disabled={isFinishing}
            className={`btn w-full max-w-md h-14 text-base ${progress === 1 ? "btn-primary" : "btn-light"}`}
          >
            <Icon name="check" size={18} strokeWidth={2.5} />
            {isFinishing ? 'Saving...' : progress === 1 ? 'Finish Workout' : `Finish Workout · ${Math.round(progress * 100)}%`}
          </button>
        </div>
      )}

      {/* Add Exercise Sheet */}
      <Sheet open={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Exercise">
        <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }} className="space-y-3">
          <input autoFocus className="input" placeholder="e.g. Bench Press" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Sets", value: sets, set: setSets, ph: "3" },
              { label: "Reps", value: reps, set: setReps, ph: "10" },
              { label: "Kg", value: weight, set: setWeight, ph: "0" },
            ].map(f => (
              <label key={f.label} className="block">
                <span className="text-xs font-medium text-zinc-500 ml-1">{f.label}</span>
                <input type="number" inputMode="decimal" className="input mt-1 text-center tabular" placeholder={f.ph} value={f.value} onChange={(e) => f.set(e.target.value)} />
              </label>
            ))}
          </div>
          <button type="submit" disabled={!name.trim()} className="btn btn-primary w-full h-12 !mt-5">Add to Routine</button>
        </form>
      </Sheet>

      {/* Edit Exercise Sheet */}
      <Sheet open={!!editingEx} onClose={() => setEditingEx(null)} title="Edit Exercise">
        {editingEx && (
          <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }} className="space-y-3">
            <input
              className="input"
              value={editingEx.name}
              onChange={(e) => setEditingEx({ ...editingEx, name: e.target.value })}
            />
            <div className="grid grid-cols-3 gap-2">
              {(["sets", "reps", "weight"] as const).map(field => (
                <label key={field} className="block">
                  <span className="text-xs font-medium text-zinc-500 ml-1 capitalize">{field === "weight" ? "Kg" : field}</span>
                  <input type="number" inputMode="decimal" className="input mt-1 text-center tabular" value={editingEx[field]} onChange={(e) => setEditingEx({ ...editingEx, [field]: e.target.value })} />
                </label>
              ))}
            </div>
            <div className="grid gap-2 !mt-5">
              <button type="submit" className="btn btn-light h-12">Save Changes</button>
              <button type="button" onClick={() => handleDelete(editingEx.id)} className="btn btn-danger h-12">
                <Icon name="trash" size={16} /> Delete Exercise
              </button>
            </div>
          </form>
        )}
      </Sheet>
    </main>
  );
}
