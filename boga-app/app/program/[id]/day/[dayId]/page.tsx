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
  getDay,
  getWorkoutHistory
} from "@/src/services/database";
import { User } from "firebase/auth";
import Link from "next/link";
import { EmptyState, ErrorScreen, Icon, LoadingScreen, LoginScreen, PageHeader, Sheet } from "@/src/components/ui";
import type { CardioActivity, ExerciseKind, LoggedExercise, LoggedSet, StrengthCategory } from "@/src/types/workout";
import { CARDIO_ACTIVITIES, STRENGTH_CATEGORIES, estimateWorkoutCalories, guessCategory } from "@/src/utils/calories";
// confetti import removed from top level to be imported dynamically

const formatClock = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
};

const isCardio = (ex: any) => ex?.kind === "cardio";
const activityLabel = (a?: string) => CARDIO_ACTIVITIES.find(x => x.id === a)?.label || "Cardio";
const hasIncline = (a?: string) => a === "walking" || a === "running";
const formatSets = (sets: LoggedSet[]) => sets.map(s => `${s.weight}×${s.reps}`).join(" · ");
const formatCardio = (c: { minutes?: number | null; distanceKm?: number | null; inclinePct?: number | null }) =>
  [c.minutes ? `${c.minutes} min` : "", c.distanceKm ? `${c.distanceKm} km` : "", c.inclinePct ? `${c.inclinePct}% incline` : ""].filter(Boolean).join(" · ");

const setInputClass = "w-full min-w-0 h-11 rounded-xl bg-black/40 border border-white/[0.08] text-center font-semibold tabular outline-none focus:border-red-500/60 placeholder:text-zinc-500";

// --- ADD / EDIT FORM ---
type Draft = {
  kind: ExerciseKind;
  name: string;
  sets: string; reps: string; weight: string;
  category: StrengthCategory | null;
  activity: CardioActivity;
  minutes: string; distanceKm: string; inclinePct: string;
};

const emptyDraft: Draft = {
  kind: "strength", name: "", sets: "", reps: "", weight: "", category: null,
  activity: "walking", minutes: "", distanceKm: "", inclinePct: ""
};

const str = (v: any) => (v === undefined || v === null ? "" : String(v));

const toDraft = (ex: any): Draft => ({
  kind: ex.kind || "strength",
  name: ex.name || "",
  sets: str(ex.sets), reps: str(ex.reps), weight: str(ex.weight),
  category: ex.category ?? null,
  activity: ex.activity || "walking",
  minutes: str(ex.minutes), distanceKm: str(ex.distanceKm), inclinePct: str(ex.inclinePct)
});

// Firestore rejects undefined, so optional numbers are stored as null
const toPayload = (d: Draft) => {
  const opt = (v: string) => (Number(v) > 0 ? Number(v) : null);
  if (d.kind === "cardio") {
    return {
      kind: "cardio" as const,
      name: d.name.trim() || activityLabel(d.activity),
      activity: d.activity,
      minutes: Number(d.minutes) || 30,
      distanceKm: opt(d.distanceKm),
      inclinePct: hasIncline(d.activity) ? opt(d.inclinePct) : null,
      sets: 1, reps: 0, weight: 0
    };
  }
  return {
    kind: "strength" as const,
    name: d.name.trim(),
    sets: Number(d.sets) || 3,
    reps: Number(d.reps) || 10,
    weight: Number(d.weight) || 0,
    category: d.category
  };
};

const canSave = (d: Draft) => d.kind === "cardio" || !!d.name.trim();

const chipClass = (active: boolean) =>
  `h-10 px-3 rounded-xl text-sm font-semibold transition-all active:scale-95 ${active
    ? "bg-white text-black"
    : "bg-white/[0.05] text-zinc-400 border border-white/[0.06]"}`;

function ExerciseForm({ value, onChange, autoFocus }: { value: Draft; onChange: (d: Draft) => void; autoFocus?: boolean }) {
  const set = (patch: Partial<Draft>) => onChange({ ...value, ...patch });
  const category = value.category ?? guessCategory(value.name);

  const field = (label: string, key: "sets" | "reps" | "weight" | "minutes" | "distanceKm" | "inclinePct", ph: string) => (
    <label key={key} className="block">
      <span className="text-xs font-medium text-zinc-500 ml-1">{label}</span>
      <input type="number" inputMode="decimal" className="input mt-1 text-center tabular" placeholder={ph} value={value[key]} onChange={(e) => set({ [key]: e.target.value })} />
    </label>
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-black/40 border border-white/[0.06]">
        {(["strength", "cardio"] as const).map(k => (
          <button key={k} type="button" onClick={() => set({ kind: k })} className={`h-10 rounded-xl text-sm font-semibold transition-all ${value.kind === k ? "bg-white/10 text-white" : "text-zinc-500"}`}>
            {k === "strength" ? "Strength" : "Cardio"}
          </button>
        ))}
      </div>

      {value.kind === "strength" ? (
        <>
          <input autoFocus={autoFocus} className="input" placeholder="e.g. Bench Press" value={value.name} onChange={(e) => set({ name: e.target.value })} />
          <div className="grid grid-cols-3 gap-2">
            {field("Sets", "sets", "3")}
            {field("Reps", "reps", "10")}
            {field("Kg", "weight", "0")}
          </div>
          <div>
            <span className="text-xs font-medium text-zinc-500 ml-1">Type <span className="text-zinc-600">· affects calorie estimate</span></span>
            <div className="flex flex-wrap gap-2 mt-1">
              {STRENGTH_CATEGORIES.map(c => (
                <button key={c.id} type="button" onClick={() => set({ category: c.id })} className={chipClass(category === c.id)}>{c.label}</button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            {CARDIO_ACTIVITIES.map(a => (
              <button key={a.id} type="button" onClick={() => set({ activity: a.id })} className={`${chipClass(value.activity === a.id)} !px-1 !text-xs`}>{a.label}</button>
            ))}
          </div>
          <input className="input" placeholder={`Name (default: ${activityLabel(value.activity)})`} value={value.name} onChange={(e) => set({ name: e.target.value })} />
          <div className={`grid gap-2 ${hasIncline(value.activity) ? "grid-cols-3" : "grid-cols-2"}`}>
            {field("Minutes", "minutes", "30")}
            {field("Km", "distanceKm", "—")}
            {hasIncline(value.activity) && field("Incline %", "inclinePct", "0")}
          </div>
        </>
      )}
    </div>
  );
}

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

  // Per-set values typed during the workout ("" or missing = use the suggestion)
  const [setInputs, setSetInputs] = useState<{ [key: string]: { weight?: string; reps?: string } }>({});
  const [cardioInputs, setCardioInputs] = useState<{ [exId: string]: { minutes?: string; distanceKm?: string; inclinePct?: string } }>({});
  const [extraSets, setExtraSets] = useState<{ [exId: string]: number }>({});
  // What was done for each exercise the last time this day was trained
  const [lastSession, setLastSession] = useState<{ [exId: string]: LoggedExercise }>({});
  const [bodyWeight, setBodyWeight] = useState<number | null>(null);
  const [finishedKcal, setFinishedKcal] = useState<number | null>(null);

  // Form State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  // Edit State
  const [editingEx, setEditingEx] = useState<(Draft & { id: string }) | null>(null);

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
        setSetInputs(parsed.setInputs || {});
        setCardioInputs(parsed.cardioInputs || {});
        setExtraSets(parsed.extraSets || {});
        setStartedAt(parsed.startedAt || Date.now());
        setIsWorkoutActive(true);
      }
    } catch { }
  }, [isOwner, progressKey]);

  useEffect(() => {
    if (!isOwner) return;
    try {
      if (isWorkoutActive) {
        localStorage.setItem(progressKey, JSON.stringify({ completedSets, setInputs, cardioInputs, extraSets, startedAt }));
      }
    } catch { }
  }, [isOwner, isWorkoutActive, completedSets, setInputs, cardioInputs, extraSets, startedAt, progressKey]);

  const clearProgress = () => {
    try { localStorage.removeItem(progressKey); } catch { }
  };

  const resetSession = () => {
    setCompletedSets({});
    setSetInputs({});
    setCardioInputs({});
    setExtraSets({});
  };

  const startWorkout = () => {
    resetSession();
    setStartedAt(Date.now());
    setElapsed(0);
    setIsWorkoutActive(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelWorkout = () => {
    const hasProgress = Object.values(completedSets).some(Boolean);
    if (hasProgress && !window.confirm("Cancel this workout? Your progress will be lost.")) return;
    clearProgress();
    resetSession();
    setStartedAt(null);
    skipRest();
    setIsWorkoutActive(false);
  };

  // Newest log of this day that contains each exercise (older logs have no exerciseId: match by name)
  const loadLastSession = useCallback(async (uid: string, pId: string, dId: string, exList: any[]) => {
    const { logs } = await getWorkoutHistory(uid, 30);
    const found: { [exId: string]: LoggedExercise } = {};
    for (const log of logs) {
      if (log.programId !== pId || log.dayId !== dId) continue;
      for (const ex of exList) {
        if (found[ex.id]) continue;
        const match = (log.exercises || []).find((l: LoggedExercise) =>
          l.completedSets > 0 && (l.exerciseId ? l.exerciseId === ex.id : l.name === ex.name));
        if (match) found[ex.id] = match;
      }
    }
    setLastSession(found);
  }, []);

  const loadExercises = useCallback(async (uid: string, pId: string, dId: string, withHistory = false) => {
    const [data, day] = await Promise.all([
      getExercises(uid, pId, dId),
      getDay(uid, pId, dId)
    ]);
    setExercises(data);
    if (withHistory) {
      // Only suggestions: never fail the page over it
      loadLastSession(uid, pId, dId, data).catch(error => console.error("Error loading last session:", error));
    }
    if (day) {
      setDayName(day.name || day.title || "");
    }
  }, [loadLastSession]);

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
              loadExercises(targetUserId, id as string, dayId as string, u?.uid === targetUserId),
              u?.uid === targetUserId ? getUserSettings(targetUserId).catch(() => null) : Promise.resolve(null)
            ]);
            if (settings) {
              setRestTimerEnabled(settings.restTimerEnabled);
              setRestDuration(settings.restDuration);
              setBodyWeight(Number(settings.bodyWeight) || null);
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
    if (!user || !canSave(draft) || !id || !dayId) return;
    await addExercise(user.uid, id as string, dayId as string, toPayload(draft));
    setDraft(emptyDraft);
    setIsAddOpen(false);
    loadExercises(user.uid, id as string, dayId as string, true);
  };

  const handleUpdate = async () => {
    if (!user || !editingEx || !id || !dayId) return;
    try {
      await updateExercise(user.uid, id as string, dayId as string, editingEx.id, toPayload(editingEx));
      setEditingEx(null);
      loadExercises(user.uid, id as string, dayId as string, true);
    } catch (error) {
      console.error("Update error:", error);
    }
  };

  const handleDelete = async (exId: string) => {
    if (!user || !id || !dayId || !window.confirm("Delete this exercise?")) return;
    try {
      await deleteExercise(user.uid, id as string, dayId as string, exId);
      setEditingEx(null);
      loadExercises(user.uid, id as string, dayId as string, true);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const setCountFor = (ex: any) => isCardio(ex) ? 1 : (Number(ex.sets) || 0) + (extraSets[ex.id] || 0);

  // Suggested values for a set: what was typed, else last session's same set (unless the target
  // weight was changed since), else the previous set, else the target
  const effectiveSet = (ex: any, i: number): LoggedSet => {
    const typed = setInputs[`${ex.id}-${i}`] || {};
    const last = lastSession[ex.id];
    const lastSet = last?.targetWeight === Number(ex.weight) ? last.sets?.[i] : undefined;
    const base = lastSet || (i > 0 ? effectiveSet(ex, i - 1) : { weight: Number(ex.weight) || 0, reps: Number(ex.reps) || 0 });
    return {
      weight: typed.weight ? Number(typed.weight) : base.weight,
      reps: typed.reps ? Number(typed.reps) : base.reps
    };
  };

  const effectiveCardio = (ex: any) => {
    const typed = cardioInputs[ex.id] || {};
    const last = lastSession[ex.id];
    const pick = (key: "minutes" | "distanceKm" | "inclinePct") =>
      typed[key] ? Number(typed[key]) : Number(last?.[key] ?? ex[key]) || 0;
    return { minutes: pick("minutes"), distanceKm: pick("distanceKm"), inclinePct: hasIncline(ex.activity) ? pick("inclinePct") : 0 };
  };

  const editSet = (key: string, field: "weight" | "reps", value: string) =>
    setSetInputs(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));

  const editCardio = (exId: string, field: "minutes" | "distanceKm" | "inclinePct", value: string) =>
    setCardioInputs(prev => ({ ...prev, [exId]: { ...prev[exId], [field]: value } }));

  const toggleSet = (ex: any, index: number) => {
    const key = `${ex.id}-${index}`;
    const isNowDone = !completedSets[key];

    // Lock in the suggested numbers so later edits to earlier sets don't change this one
    if (isNowDone && !isCardio(ex)) {
      const eff = effectiveSet(ex, index);
      setSetInputs(prev => ({ ...prev, [key]: { weight: String(eff.weight), reps: String(eff.reps) } }));
    }

    setCompletedSets(prev => ({ ...prev, [key]: isNowDone }));
    navigator.vibrate?.(15);

    // Eğer set tamamlandıysa ve timer enabled ise timer'ı başlat
    if (isNowDone && restTimerEnabled && !isCardio(ex)) {
      setRestTime(restDuration);
      setRestTotal(restDuration);
      setRestEndsAt(Date.now() + restDuration * 1000);
      setIsTimerActive(true);
    }
  };

  const doneSetsFor = (ex: any) =>
    Array.from({ length: setCountFor(ex) }, (_, i) => i).filter(i => completedSets[`${ex.id}-${i}`]);

  const doneCountFor = (ex: any) => doneSetsFor(ex).length;

  const estimateCalories = (seconds: number) => estimateWorkoutCalories({
    bodyWeightKg: bodyWeight || 0,
    sessionMinutes: seconds / 60,
    strength: exercises.filter(ex => !isCardio(ex)).map(ex => ({
      category: ex.category ?? guessCategory(ex.name),
      sets: doneCountFor(ex)
    })),
    cardio: exercises.filter(ex => isCardio(ex) && doneCountFor(ex) > 0).map(ex => ({ activity: ex.activity, ...effectiveCardio(ex) }))
  });

  const logEntryFor = (ex: any): LoggedExercise => {
    const done = doneSetsFor(ex);
    if (isCardio(ex)) {
      const c = effectiveCardio(ex);
      return {
        exerciseId: ex.id, name: ex.name, kind: "cardio", activity: ex.activity || "other",
        completedSets: done.length,
        minutes: done.length ? c.minutes : 0,
        distanceKm: done.length && c.distanceKm ? c.distanceKm : null,
        inclinePct: done.length && c.inclinePct ? c.inclinePct : null
      };
    }
    const sets = done.map(i => effectiveSet(ex, i));
    return {
      exerciseId: ex.id, name: ex.name, kind: "strength",
      category: ex.category ?? guessCategory(ex.name),
      completedSets: sets.length,
      weight: sets.length ? Math.max(...sets.map(s => s.weight)) : Number(ex.weight) || 0,
      sets,
      targetWeight: Number(ex.weight) || 0
    };
  };

  const handleFinishWorkout = async () => {
    if (!user || typeof id !== "string" || isFinishing) return;
    setIsFinishing(true);

    const calories = estimateCalories(elapsed);
    const summary = {
      programId: id,
      dayId: dayId,
      dayName,
      durationSeconds: elapsed,
      exercises: exercises.map(logEntryFor),
      calories,
      bodyWeight: bodyWeight || null,
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
      setFinishedKcal(calories);

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

  const totalSets = exercises.reduce((sum, ex) => sum + setCountFor(ex), 0);
  const doneSets = exercises.reduce((sum, ex) => sum + doneCountFor(ex), 0);
  const progress = totalSets ? doneSets / totalSets : 0;
  const totalVolume = exercises.filter(ex => !isCardio(ex)).reduce((sum, ex) => sum + (Number(ex.sets) || 0) * (Number(ex.reps) || 0) * (Number(ex.weight) || 0), 0);
  const liveKcal = isWorkoutActive ? estimateCalories(elapsed) : null;

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
            {liveKcal !== null && (
              <span className="flex items-center gap-1 text-xs font-semibold text-orange-400 tabular"><Icon name="flame" size={12} /> ~{liveKcal} kcal</span>
            )}
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
          {isOwner && !bodyWeight && (
            <p className="text-xs text-zinc-500 text-center mt-3">
              <Link href="/settings" className="text-zinc-300 underline underline-offset-2">Add your body weight</Link> to see calories burned.
            </p>
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
          text={isOwner ? "Add lifts with target sets, reps and weight, or cardio like walking." : "This day doesn't have any exercises yet."}
          action={isOwner && <button onClick={() => setIsAddOpen(true)} className="btn btn-primary h-11 px-5 text-sm"><Icon name="plus" size={16} /> Add Exercise</button>}
        />
      ) : (
        <div className="space-y-3">
          {exercises.map((ex, exIndex) => {
            const setCount = setCountFor(ex);
            const done = doneCountFor(ex);
            const complete = setCount > 0 && done === setCount;
            const cardio = isCardio(ex);
            const last = lastSession[ex.id];

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
                      {cardio ? (
                        <>
                          <span className="text-xs font-medium text-sky-300 bg-sky-500/10 rounded-full px-2.5 py-1">{activityLabel(ex.activity)}</span>
                          <span className="text-xs font-medium text-zinc-300 bg-white/[0.06] rounded-full px-2.5 py-1 tabular">{formatCardio(ex)}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs font-medium text-zinc-300 bg-white/[0.06] rounded-full px-2.5 py-1 tabular">{ex.sets} × {ex.reps}</span>
                          <span className="text-xs font-medium text-zinc-300 bg-white/[0.06] rounded-full px-2.5 py-1 tabular">{ex.weight} kg</span>
                        </>
                      )}
                      {isWorkoutActive && !cardio && (
                        <span className={`text-xs font-medium rounded-full px-2.5 py-1 tabular ${complete ? "bg-green-500/15 text-green-400" : "text-zinc-500"}`}>{done}/{setCount} done</span>
                      )}
                    </div>
                    {last && (
                      <p className="text-xs text-zinc-500 mt-2 tabular truncate">
                        <span className="text-zinc-600">Last:</span> {cardio ? formatCardio(last) : last.sets?.length ? formatSets(last.sets) : `${last.completedSets} × ${last.weight} kg`}
                      </p>
                    )}
                  </div>

                  {!isWorkoutActive && isOwner && (
                    <button onClick={() => setEditingEx({ id: ex.id, ...toDraft(ex) })} className="icon-btn !bg-transparent !border-transparent -mr-2 -mt-1" aria-label="Edit exercise">
                      <Icon name="more" size={18} />
                    </button>
                  )}
                </div>

                {isWorkoutActive && !cardio && (
                  <div className="mt-4 space-y-2">
                    {Array.from({ length: setCount }).map((_, i) => {
                      const key = `${ex.id}-${i}`;
                      const isDone = completedSets[key];
                      const typed = setInputs[key] || {};
                      const eff = effectiveSet(ex, i);
                      return (
                        <div key={i} className={`flex items-center gap-2 rounded-2xl p-1.5 pl-3 border transition-colors ${isDone ? "bg-red-600/10 border-red-500/25" : "bg-white/[0.03] border-white/[0.06]"}`}>
                          <span className="w-4 text-sm font-bold tabular text-zinc-500">{i + 1}</span>
                          <label className="flex-1 flex items-center gap-1.5 min-w-0">
                            <input
                              type="number" inputMode="decimal" step="0.5" aria-label={`Set ${i + 1} weight`}
                              className={setInputClass} value={typed.weight ?? ""} placeholder={String(eff.weight)}
                              onChange={(e) => editSet(key, "weight", e.target.value)}
                            />
                            <span className="text-xs text-zinc-500">kg</span>
                          </label>
                          <span className="text-zinc-600 text-sm">×</span>
                          <label className="flex-1 flex items-center gap-1.5 min-w-0">
                            <input
                              type="number" inputMode="numeric" aria-label={`Set ${i + 1} reps`}
                              className={setInputClass} value={typed.reps ?? ""} placeholder={String(eff.reps)}
                              onChange={(e) => editSet(key, "reps", e.target.value)}
                            />
                            <span className="text-xs text-zinc-500">reps</span>
                          </label>
                          <button
                            onClick={() => toggleSet(ex, i)}
                            aria-pressed={!!isDone}
                            aria-label={`Complete set ${i + 1}`}
                            className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center transition-all active:scale-90 ${isDone
                              ? "bg-gradient-to-b from-red-500 to-red-700 text-white shadow-[0_6px_16px_-6px_rgba(239,68,68,0.8)] animate-check-pop"
                              : "bg-white/[0.06] border border-white/[0.08] text-zinc-500"
                              }`}
                          >
                            <Icon name="check" size={18} strokeWidth={3} />
                          </button>
                        </div>
                      );
                    })}
                    <button
                      onClick={() => setExtraSets(prev => ({ ...prev, [ex.id]: (prev[ex.id] || 0) + 1 }))}
                      className="w-full h-10 rounded-2xl text-xs font-semibold text-zinc-500 border border-dashed border-white/10 active:scale-[0.98] transition-transform"
                    >
                      + Add set
                    </button>
                  </div>
                )}

                {isWorkoutActive && cardio && (() => {
                  const isDone = completedSets[`${ex.id}-0`];
                  const typed = cardioInputs[ex.id] || {};
                  const eff = effectiveCardio(ex);
                  const fields = [
                    { field: "minutes" as const, label: "Min" },
                    { field: "distanceKm" as const, label: "Km" },
                    ...(hasIncline(ex.activity) ? [{ field: "inclinePct" as const, label: "Incline %" }] : [])
                  ];
                  return (
                    <div className="mt-4 space-y-2">
                      <div className={`grid gap-2 ${fields.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                        {fields.map(f => (
                          <label key={f.field} className="block">
                            <span className="text-[11px] font-medium text-zinc-500 ml-1">{f.label}</span>
                            <input
                              type="number" inputMode="decimal"
                              className={`${setInputClass} mt-1`} value={typed[f.field] ?? ""} placeholder={eff[f.field] ? String(eff[f.field]) : "—"}
                              onChange={(e) => editCardio(ex.id, f.field, e.target.value)}
                            />
                          </label>
                        ))}
                      </div>
                      <button
                        onClick={() => toggleSet(ex, 0)}
                        aria-pressed={!!isDone}
                        className={`btn w-full h-12 text-sm ${isDone ? "btn-primary" : "btn-ghost"}`}
                      >
                        <Icon name="check" size={16} strokeWidth={3} /> {isDone ? "Done" : "Mark as done"}
                      </button>
                    </div>
                  );
                })()}
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
            {finishedKcal !== null ? `Saved · ~${finishedKcal} kcal burned` : isFinishing ? 'Saving...' : progress === 1 ? 'Finish Workout' : `Finish Workout · ${Math.round(progress * 100)}%`}
          </button>
        </div>
      )}

      {/* Add Exercise Sheet */}
      <Sheet open={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Exercise">
        <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }}>
          <ExerciseForm value={draft} onChange={setDraft} autoFocus />
          <button type="submit" disabled={!canSave(draft)} className="btn btn-primary w-full h-12 mt-5">Add to Routine</button>
        </form>
      </Sheet>

      {/* Edit Exercise Sheet */}
      <Sheet open={!!editingEx} onClose={() => setEditingEx(null)} title="Edit Exercise">
        {editingEx && (
          <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }}>
            <ExerciseForm value={editingEx} onChange={(d) => setEditingEx({ ...d, id: editingEx.id })} />
            <div className="grid gap-2 mt-5">
              <button type="submit" disabled={!canSave(editingEx)} className="btn btn-light h-12">Save Changes</button>
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
