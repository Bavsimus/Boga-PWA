"use client";
import { StreakData } from '@/src/types/workout';

interface StreakCounterProps {
    streakData: StreakData;
}

export default function StreakCounter({ streakData }: StreakCounterProps) {
    const { currentStreak, longestStreak, totalWorkouts } = streakData;

    return (
        <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-[2.5rem] p-6 relative overflow-hidden">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-red-600/5 blur-3xl" />

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-black">Your Streak</h2>
                    <div className="text-zinc-600 text-xs font-bold">
                        {totalWorkouts} total
                    </div>
                </div>

                {/* Main Streak Display */}
                <div className="flex items-center gap-6 mb-6">
                    {/* Fire Icon with Animation */}
                    <div className="relative">
                        <div className={`text-6xl ${currentStreak > 0 ? 'animate-pulse' : 'opacity-30'}`}>
                            🔥
                        </div>
                        {currentStreak > 0 && (
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-[10px] font-black">{currentStreak}</span>
                            </div>
                        )}
                    </div>

                    {/* Streak Info */}
                    <div className="flex-1">
                        <div className="text-5xl font-black italic text-white tracking-tighter leading-none mb-2">
                            {currentStreak}
                        </div>
                        <div className="text-zinc-500 text-sm font-bold uppercase tracking-wider">
                            {currentStreak === 1 ? 'Day Streak' : 'Days Streak'}
                        </div>
                    </div>
                </div>

                {/* Longest Streak Record */}
                {longestStreak > 0 && (
                    <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                        <span className="text-zinc-600 text-xs font-bold uppercase tracking-wider">
                            Personal Best
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-black italic text-red-600 tracking-tighter">
                                {longestStreak}
                            </span>
                            <span className="text-zinc-500 text-xs font-bold">days</span>
                        </div>
                    </div>
                )}

                {/* Motivational Message */}
                {currentStreak === 0 && (
                    <div className="mt-4 text-center text-zinc-600 text-xs italic">
                        Complete a workout to start your streak! 💪
                    </div>
                )}
                {currentStreak >= 7 && (
                    <div className="mt-4 text-center text-red-600 text-xs font-black uppercase tracking-wider">
                        On Fire! Keep it up! 🚀
                    </div>
                )}
            </div>
        </div>
    );
}
