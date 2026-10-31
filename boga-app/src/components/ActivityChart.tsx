"use client";

interface ActivityChartProps {
    weeklyData: number[]; // Array of 7 numbers representing workout count per day
}

export default function ActivityChart({ weeklyData }: ActivityChartProps) {
    // weeklyData covers the last N days ending today, so label bars by their actual weekday
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const today = new Date().getDay();
    const days = weeklyData.map((_, i) => dayNames[(today - (weeklyData.length - 1 - i) + 7 * 7) % 7]);
    const maxValue = Math.max(...weeklyData, 1);
    const total = weeklyData.reduce((a, b) => a + b, 0);
    const activeDays = weeklyData.filter(c => c > 0).length;

    return (
        <div className="card p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <p className="eyebrow">Last 7 Days</p>
                    <p className="mt-2 text-2xl font-bold tracking-tight tabular">
                        {activeDays}<span className="text-zinc-500 text-base font-medium">/7 active days</span>
                    </p>
                </div>
                <span className="text-xs font-medium text-zinc-400 bg-white/5 border border-white/5 rounded-full px-3 py-1 tabular">
                    {total} {total === 1 ? 'session' : 'sessions'}
                </span>
            </div>

            {/* Chart */}
            <div className="flex items-end justify-between gap-2.5">
                {weeklyData.map((count, index) => {
                    const isToday = index === weeklyData.length - 1;
                    const hasWorkout = count > 0;
                    const heightPercent = hasWorkout ? Math.max((count / maxValue) * 100, 35) : 10;

                    return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-2">
                            <div className="w-full h-24 flex items-end">
                                <div
                                    title={`${count} workout${count === 1 ? '' : 's'}`}
                                    className={`w-full rounded-lg transition-all duration-500 ${hasWorkout
                                        ? 'bg-gradient-to-t from-red-700 to-red-400 shadow-[0_0_16px_-2px_rgba(239,68,68,0.5)]'
                                        : 'bg-white/[0.06]'
                                        }`}
                                    style={{ height: `${heightPercent}%` }}
                                />
                            </div>
                            <span className={`text-[11px] font-semibold ${isToday ? 'text-white' : 'text-zinc-600'}`}>
                                {days[index]}
                            </span>
                            <span className={`-mt-1.5 w-1 h-1 rounded-full ${isToday ? 'bg-red-500' : 'bg-transparent'}`} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
