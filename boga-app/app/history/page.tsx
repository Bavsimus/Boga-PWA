"use client";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { getWorkoutHistory } from "@/src/services/database";
import { BottomNav, EmptyState, ErrorScreen, Icon, LoadingScreen, LoginScreen, PageHeader } from "@/src/components/ui";
import { User } from "firebase/auth";
import { QueryDocumentSnapshot } from "firebase/firestore";

const monthKey = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export default function HistoryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      try {
        if (u) {
          const page = await getWorkoutHistory(u.uid);
          setLogs(page.logs);
          setCursor(page.cursor);
          setHasMore(page.hasMore);
        }
      } catch (error) {
        console.error("Error loading history:", error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const loadMore = async () => {
    if (!user || !cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await getWorkoutHistory(user.uid, 20, cursor);
      setLogs(prev => [...prev, ...page.logs]);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    } catch (error) {
      console.error("Error loading more history:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginScreen />;
  if (loadError) return <ErrorScreen />;

  // Group sessions by month for a cleaner timeline
  const groups: { month: string; items: any[] }[] = [];
  logs.forEach((log) => {
    const date: Date | undefined = log.completedAt?.toDate?.();
    const month = date ? monthKey(date) : "Unknown";
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.items.push(log);
    else groups.push({ month, items: [log] });
  });

  return (
    <main className="min-h-screen text-white px-5 max-w-2xl mx-auto !pb-32">
      <PageHeader subtitle="Your sessions" title="History" />

      {logs.length === 0 ? (
        <EmptyState icon="history" title="No workouts yet" text="Finish your first workout and it will show up here." />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.month}>
              <p className="eyebrow mb-3">{group.month}</p>
              <div className="space-y-3">
                {group.items.map((log) => {
                  const date: Date | undefined = log.completedAt?.toDate?.();
                  const totalSets = log.exercises?.reduce((s: number, ex: any) => s + (ex.completedSets || 0), 0) || 0;
                  const minutes = log.durationSeconds ? Math.max(1, Math.round(log.durationSeconds / 60)) : null;

                  return (
                    <article key={log.id} className="card p-5 animate-rise-in">
                      <div className="flex items-start gap-4">
                        {date && (
                          <div className="w-12 shrink-0 text-center rounded-2xl bg-red-600/10 border border-red-600/20 py-1.5">
                            <p className="text-[10px] font-semibold uppercase text-red-400 leading-none">{date.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                            <p className="text-xl font-bold tabular leading-tight">{date.getDate()}</p>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[17px] tracking-tight truncate">{log.dayName || "Workout Session"}</h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-zinc-500">
                            {date && <span className="tabular">{date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>}
                            <span className="flex items-center gap-1 tabular"><Icon name="check" size={12} /> {totalSets} sets</span>
                            {minutes && <span className="flex items-center gap-1 tabular"><Icon name="timer" size={12} /> {minutes} min</span>}
                          </div>
                        </div>
                      </div>

                      {log.exercises?.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                          {log.exercises.map((ex: any, i: number) => (
                            <div key={i} className="flex justify-between items-center gap-3 text-sm">
                              <span className="text-zinc-300 truncate">{ex.name}</span>
                              <span className="text-zinc-500 tabular shrink-0">{ex.completedSets} × {ex.weight} kg</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}

          {hasMore && (
            <button onClick={loadMore} disabled={loadingMore} className="btn btn-ghost w-full h-12">
              {loadingMore ? "Loading..." : "Load older sessions"}
            </button>
          )}
        </div>
      )}

      <BottomNav />
    </main>
  );
}
