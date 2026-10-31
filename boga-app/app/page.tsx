"use client";
import { useState, useEffect, useCallback } from "react";
import { auth } from "@/lib/firebase";
import {
  createProgram,
  getUserPrograms,
  getTotalWorkoutsCount,
  updateProgramName,
  deleteProgram,
  getWorkoutCompletions,
  getUserProfile,
  createAutoProfile
} from "../src/services/database";
import { User, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StreakCounter from "@/src/components/StreakCounter";
import ActivityChart from "@/src/components/ActivityChart";
import { Avatar, BottomNav, EmptyState, Icon, LoadingScreen, LoginScreen, Logo, Sheet } from "@/src/components/ui";
import { calculateStreakData, getWeeklyStats } from "@/src/utils/streak-utils";
import { WorkoutCompletion, StreakData } from "@/src/types/workout";

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

  // Streak & Analytics States
  const [completions, setCompletions] = useState<WorkoutCompletion[]>([]);
  const [streakData, setStreakData] = useState<StreakData>({ currentStreak: 0, longestStreak: 0, totalWorkouts: 0 });
  const [weeklyData, setWeeklyData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  // Profile
  const [username, setUsername] = useState("");

  const loadInitialData = useCallback(async (uid: string) => {
    try {
      const [progs, count, comps] = await Promise.all([
        getUserPrograms(uid),
        getTotalWorkoutsCount(uid),
        getWorkoutCompletions(uid, 30)
      ]);
      setPrograms(progs);
      setWorkoutCount(count);
      setCompletions(comps as WorkoutCompletion[]);

      // Calculate streak data
      const streak = calculateStreakData(comps as WorkoutCompletion[]);
      setStreakData(streak);

      // Calculate weekly stats
      const weekly = getWeeklyStats(comps as WorkoutCompletion[], 7);
      setWeeklyData(weekly);
    } catch (error) {
      console.error("Initial data load error:", error);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        // Profile check and dashboard data don't depend on each other, so load them in parallel
        const ensureProfile = async () => {
          try {
            const profile = await getUserProfile(u.uid);
            if (!profile || !profile.username) {
              // Auto-create profile on first login
              const autoUsername = await createAutoProfile(
                u.uid,
                u.displayName || "BOGA User",
                u.email || ""
              );
              setUsername(autoUsername);
            } else {
              setUsername(profile.username);
            }
          } catch (error) {
            console.error("Error in profile setup:", error);
          }
        };

        await Promise.all([ensureProfile(), loadInitialData(u.uid)]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [loadInitialData]);

  const handleCreate = async () => {
    if (!user || !newProgramName.trim() || isCreating) return;
    setIsCreating(true);
    try {
      await createProgram(user.uid, newProgramName.trim());
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
    if (!user || !window.confirm("Delete this program and all of its training days?")) return;
    try {
      await deleteProgram(user.uid, pId);
      setIsEditModalOpen(false);
      await loadInitialData(user.uid);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  if (loading) return <LoadingScreen variant="dashboard" />;

  if (!user) return <LoginScreen />;

  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Late night grind" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = user.displayName?.split(" ")[0] || "Athlete";

  return (
    <main className="min-h-screen text-white px-5 max-w-2xl mx-auto !pb-32">
      {/* --- HEADER --- */}
      <header className="flex justify-between items-center mb-8 animate-rise-in">
        <Logo size={34} />
        <button onClick={() => setIsProfileOpen(true)} className="active:scale-95 transition-transform" aria-label="Account">
          <Avatar src={user.photoURL} name={user.displayName} size={40} />
        </button>
      </header>

      <section className="mb-6 animate-rise-in" style={{ animationDelay: "40ms" }}>
        <p className="text-zinc-500 text-sm font-medium">{greeting},</p>
        <h1 className="text-3xl font-bold tracking-tight mt-0.5">{firstName}</h1>
      </section>

      {/* --- STATS SECTION --- */}
      <section className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-4 animate-rise-in" style={{ animationDelay: "80ms" }}>
        <StreakCounter streakData={streakData} />
        <ActivityChart weeklyData={weeklyData} />
      </section>

      {/* --- PROGRAMS SECTION --- */}
      <section className="animate-rise-in" style={{ animationDelay: "120ms" }}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="eyebrow">Your Programs</p>
            <p className="text-sm text-zinc-500 mt-1">{programs.length} {programs.length === 1 ? "program" : "programs"}</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="btn btn-ghost h-10 px-4 text-sm">
            <Icon name="plus" size={16} /> New
          </button>
        </div>

        <div className="grid gap-3">
          {programs.length === 0 ? (
            <EmptyState
              icon="dumbbell"
              title="No programs yet"
              text="Create your first program and add training days to get started."
              action={<button onClick={() => setIsModalOpen(true)} className="btn btn-primary h-11 px-5 text-sm"><Icon name="plus" size={16} /> Create Program</button>}
            />
          ) : (
            programs.map((p, i) => (
              <div key={p.id} className="relative">
                <Link href={`/program/${p.id}`} className="card card-interactive flex items-center gap-4 p-4 pr-24">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-900/10 border border-red-500/20 flex items-center justify-center text-red-400 font-bold tabular shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[17px] tracking-tight truncate">{p.name}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">View training days</p>
                  </div>
                </Link>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingProgram({ id: p.id, name: p.name });
                      setIsEditModalOpen(true);
                    }}
                    className="icon-btn !bg-transparent !border-transparent"
                    aria-label="Edit program"
                  >
                    <Icon name="more" size={18} />
                  </button>
                  <Icon name="chevron" size={18} className="text-zinc-600 pointer-events-none" />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <BottomNav username={username} />

      {/* --- ACCOUNT SHEET --- */}
      <Sheet open={isProfileOpen} onClose={() => setIsProfileOpen(false)}>
        <div className="flex items-center gap-4 mb-6">
          <Avatar src={user.photoURL} name={user.displayName} size={56} />
          <div className="min-w-0">
            <h3 className="text-lg font-bold tracking-tight truncate">{user.displayName}</h3>
            <p className="text-sm text-zinc-500 truncate">{username ? `@${username}` : user.email}</p>
          </div>
        </div>
        <div className="card p-4 mb-4 flex items-center justify-between">
          <span className="text-sm text-zinc-400">Total workouts logged</span>
          <span className="text-xl font-bold tabular">{workoutCount}</span>
        </div>
        <div className="grid gap-2">
          <button onClick={() => username && router.push(`/profile/${username}`)} className="btn btn-ghost h-12 !justify-start px-4">
            <Icon name="user" size={18} /> My Profile
          </button>
          <button onClick={() => router.push("/history")} className="btn btn-ghost h-12 !justify-start px-4">
            <Icon name="history" size={18} /> Workout History
          </button>
          <button onClick={() => router.push("/settings")} className="btn btn-ghost h-12 !justify-start px-4">
            <Icon name="settings" size={18} /> Settings
          </button>
          <button onClick={() => signOut(auth)} className="btn btn-danger h-12 !justify-start px-4 mt-2">
            <Icon name="logout" size={18} /> Sign Out
          </button>
        </div>
      </Sheet>

      {/* --- NEW PROGRAM SHEET --- */}
      <Sheet open={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Program">
        <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
          <input
            autoFocus
            className="input mb-4"
            placeholder="e.g. Push Pull Legs"
            value={newProgramName}
            onChange={(e) => setNewProgramName(e.target.value)}
          />
          <button type="submit" disabled={isCreating || !newProgramName.trim()} className="btn btn-primary w-full h-12">
            {isCreating ? "Creating..." : "Create Program"}
          </button>
        </form>
      </Sheet>

      {/* --- EDIT PROGRAM SHEET --- */}
      <Sheet open={isEditModalOpen && !!editingProgram} onClose={() => setIsEditModalOpen(false)} title="Edit Program">
        {editingProgram && (
          <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }}>
            <input
              className="input mb-4"
              value={editingProgram.name}
              onChange={(e) => setEditingProgram({ ...editingProgram, name: e.target.value })}
            />
            <div className="grid gap-2">
              <button type="submit" disabled={!editingProgram.name.trim()} className="btn btn-light h-12">Save Changes</button>
              <button type="button" onClick={() => handleDelete(editingProgram.id)} className="btn btn-danger h-12">
                <Icon name="trash" size={16} /> Delete Program
              </button>
            </div>
          </form>
        )}
      </Sheet>
    </main>
  );
}
