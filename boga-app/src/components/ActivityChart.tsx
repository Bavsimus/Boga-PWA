"use client";

interface ActivityChartProps {
    weeklyData: number[]; // Array of 7 numbers representing workout count per day
}

export default function ActivityChart({ weeklyData }: ActivityChartProps) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const maxValue = Math.max(...weeklyData, 1);

    return (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-black">
                    This Week
                </h2>
                <div className="text-zinc-600 text-xs font-bold">
                    {weeklyData.reduce((a, b) => a + b, 0)} workouts
                </div>
            </div>

            {/* Chart */}
            <div className="flex items-end justify-between gap-2 h-32">
                {weeklyData.map((count, index) => {
                    const heightPercent = maxValue > 0 ? (count / maxValue) * 100 : 0;
                    const hasWorkout = count > 0;

                    return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-2">
                            {/* Bar */}
                            <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                                <div
                                    className={`w-full rounded-t-lg transition-all duration-300 ${hasWorkout
                                            ? 'bg-gradient-to-t from-red-600 to-red-500 shadow-lg shadow-red-600/20'
                                            : 'bg-zinc-800'
                                        }`}
                                    style={{ height: `${Math.max(heightPercent, hasWorkout ? 15 : 8)}%` }}
                                >
                                    {/* Count Badge */}
                                    {count > 0 && (
                                        <div className="w-full flex justify-center -mt-6">
                                            <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                                                {count}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Day Label */}
                            <div className={`text-[10px] font-bold uppercase tracking-wider ${hasWorkout ? 'text-red-600' : 'text-zinc-600'
                                }`}>
                                {days[index]}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-center gap-4 text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-600 rounded-sm" />
                    <span>Active</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-zinc-800 rounded-sm" />
                    <span>Rest</span>
                </div>
            </div>
        </div>
    );
}
