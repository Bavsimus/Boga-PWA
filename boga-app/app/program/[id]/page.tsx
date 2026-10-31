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
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { EmptyState, Icon, LoadingScreen, LoginScreen, PageHeader, Sheet } from "@/src/components/ui";

export default function ProgramDetails() {
  const params = useParams();
  const searchParams = useSearchParams();
  const programId = params.id as string;
  const userIdParam = searchParams.get('userId'); // Get userId from URL

  const [user, setUser] = useState<User | null>(null);
  const [program, setProgram] = useState<any>(null);
  const [days, setDays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDayName, setNewDayName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Edit States
  const [editingDay, setEditingDay] = useState<{ id: string, name: string } | null>(null);
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
      if (programId) {
        // Check if userId is provided in URL (viewing someone else's program)
        const targetUserId = userIdParam || u?.uid;

        if (targetUserId) {
          // Check if it's the user's own program
          setIsOwner(u?.uid === targetUserId);
          await loadData(targetUserId, programId);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [programId, loadData, userIdParam]);

  const handleCreateDay = async () => {
    if (!user || !newDayName.trim() || isCreating) return;
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
    if (!user || !window.confirm("Delete this training day and its exercises?")) return;
    try {
      await deleteDay(user.uid, programId, dayId);
      setIsEditModalOpen(false);
      await loadData(user.uid, programId);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  if (loading) return <LoadingScreen />;

  if (!user) return <LoginScreen />;

  return (
    <main className="min-h-screen text-white px-5 max-w-2xl mx-auto">
      <PageHeader subtitle={isOwner ? "Program" : "Shared Program"} title={program?.name || "Program"} />

      <section className="animate-rise-in">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="eyebrow">Training Days</p>
            <p className="text-sm text-zinc-500 mt-1">{days.length} {days.length === 1 ? "day" : "days"} in rotation</p>
          </div>
          {isOwner && (
            <button onClick={() => setIsModalOpen(true)} className="btn btn-ghost h-10 px-4 text-sm">
              <Icon name="plus" size={16} /> Add Day
            </button>
          )}
        </div>

        <div className="grid gap-3">
          {days.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="No training days yet"
              text={isOwner ? "Split your program into days like Push, Pull or Legs." : "This program doesn't have any days yet."}
              action={isOwner && <button onClick={() => setIsModalOpen(true)} className="btn btn-primary h-11 px-5 text-sm"><Icon name="plus" size={16} /> Add First Day</button>}
            />
          ) : (
            days.map((day, i) => (
              <div key={day.id} className="relative">
                <Link
                  href={`/program/${programId}/day/${day.id}${userIdParam ? `?userId=${userIdParam}` : ''}`}
                  className={`card card-interactive flex items-center gap-4 p-4 ${isOwner ? "pr-24" : "pr-12"}`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex flex-col items-center justify-center shrink-0">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500 leading-none">Day</span>
                    <span className="text-lg font-bold tabular leading-tight">{i + 1}</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[17px] tracking-tight truncate">{day.name || day.title}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">{isOwner ? "Tap to train" : "View exercises"}</p>
                  </div>
                </Link>

                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {/* Edit Icon Button - Only for owner */}
                  {isOwner && (
                    <button
                      onClick={() => {
                        setEditingDay({ id: day.id, name: day.name || day.title });
                        setIsEditModalOpen(true);
                      }}
                      className="icon-btn !bg-transparent !border-transparent"
                      aria-label="Edit day"
                    >
                      <Icon name="more" size={18} />
                    </button>
                  )}
                  <Icon name="chevron" size={18} className="text-zinc-600 pointer-events-none" />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* New Day Sheet */}
      <Sheet open={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Training Day">
        <form onSubmit={(e) => { e.preventDefault(); handleCreateDay(); }}>
          <input
            autoFocus
            className="input mb-4"
            placeholder="e.g. Push Day A"
            value={newDayName}
            onChange={(e) => setNewDayName(e.target.value)}
          />
          <button type="submit" disabled={isCreating || !newDayName.trim()} className="btn btn-primary w-full h-12">
            {isCreating ? 'Creating...' : 'Create Day'}
          </button>
        </form>
      </Sheet>

      {/* Edit Day Sheet */}
      <Sheet open={isEditModalOpen && !!editingDay} onClose={() => setIsEditModalOpen(false)} title="Edit Training Day">
        {editingDay && (
          <form onSubmit={(e) => { e.preventDefault(); handleUpdateDay(); }}>
            <input
              className="input mb-4"
              value={editingDay.name}
              onChange={(e) => setEditingDay({ ...editingDay, name: e.target.value })}
            />
            <div className="grid gap-2">
              <button type="submit" disabled={!editingDay.name?.trim()} className="btn btn-light h-12">Save Changes</button>
              <button type="button" onClick={() => handleDeleteDay(editingDay.id)} className="btn btn-danger h-12">
                <Icon name="trash" size={16} /> Delete Day
              </button>
            </div>
          </form>
        )}
      </Sheet>
    </main>
  );
}
