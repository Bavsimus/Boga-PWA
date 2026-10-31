"use client";
import { StreakData } from '@/src/types/workout';
import { Icon } from './ui';

interface StreakCounterProps {
    streakData: StreakData;
}

export default function StreakCounter({ streakData }: StreakCounterProps) {
    const { currentStreak, longestStreak, totalWorkouts } = streakData;
    const active = currentStreak > 0;

    const message = !active
        ? 'Complete a workout to start your streak.'
        : currentStreak >= 7
            ? 'On fire. Keep the momentum going.'
            : 'Show up again tomorrow to keep it alive.';

    return (
        <div className="card overflow-hidden p-6">
            {/* Glow effect */}
            {active && <div className="absolute -top-16 -right-10 w-48 h-48 rounded-full bg-red-600/25 blur-3xl pointer-events-none" />}

            <div className="relative flex items-start justify-between">
                <div>
                    <p className="eyebrow">Current Streak</p>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-6xl font-bold tracking-tighter tabular leading-none">{currentStreak}</span>
                        <span className="text-zinc-400 font-medium">{currentStreak === 1 ? 'day' : 'days'}</span>
                    </div>
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${active ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg shadow-red-600/40' : 'bg-white/5 text-zinc-600'}`}>
                    <Icon name="flame" size={24} />
                </div>
            </div>

            <p className="relative text-sm text-zinc-500 mt-3">{message}</p>

            <div className="relative grid grid-cols-2 gap-3 mt-5">
                <div className="rounded-2xl bg-white/[0.03] border border-white/5 px-4 py-3">
                    <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-medium">
                        <Icon name="trophy" size={13} /> Best
                    </div>
                    <p className="text-xl font-bold tabular mt-0.5">{longestStreak} <span className="text-sm text-zinc-500 font-medium">days</span></p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] border border-white/5 px-4 py-3">
                    <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-medium">
                        <Icon name="dumbbell" size={13} /> Workouts
                    </div>
                    <p className="text-xl font-bold tabular mt-0.5">{totalWorkouts} <span className="text-sm text-zinc-500 font-medium">total</span></p>
                </div>
            </div>
        </div>
    );
}
