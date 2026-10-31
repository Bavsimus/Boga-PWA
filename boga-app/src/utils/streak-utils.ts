import { WorkoutCompletion, StreakData } from '../types/workout';

const toDate = (value: any): Date => value?.toDate?.() || new Date(value);

/**
 * Local calendar day key (YYYY-MM-DD) so multiple workouts on one day count once
 */
const dayKey = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const addDays = (date: Date, amount: number): Date => {
    const d = new Date(date);
    d.setDate(d.getDate() + amount);
    return d;
};

const startOfToday = (): Date => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Calculate the current workout streak from completion history
 * A streak continues if workouts are completed on consecutive calendar days.
 * Today without a workout yet doesn't break the streak (it's still alive until midnight).
 */
export function calculateCurrentStreak(completions: WorkoutCompletion[]): number {
    if (!completions || completions.length === 0) return 0;

    const days = new Set(completions.map(c => dayKey(toDate(c.completedAt))));

    let cursor = startOfToday();
    if (!days.has(dayKey(cursor))) {
        cursor = addDays(cursor, -1);
    }

    let streak = 0;
    while (days.has(dayKey(cursor))) {
        streak++;
        cursor = addDays(cursor, -1);
    }

    return streak;
}

/**
 * Calculate the longest streak in the user's history
 */
export function calculateLongestStreak(completions: WorkoutCompletion[]): number {
    if (!completions || completions.length === 0) return 0;

    const days = new Set(completions.map(c => dayKey(toDate(c.completedAt))));

    let maxStreak = 0;
    for (const key of days) {
        const [y, m, d] = key.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        // Only start counting from the first day of a run
        if (days.has(dayKey(addDays(date, -1)))) continue;

        let length = 1;
        let cursor = addDays(date, 1);
        while (days.has(dayKey(cursor))) {
            length++;
            cursor = addDays(cursor, 1);
        }
        maxStreak = Math.max(maxStreak, length);
    }

    return maxStreak;
}

/**
 * Get workout count for the last N days (oldest first, today last)
 */
export function getWeeklyStats(completions: WorkoutCompletion[], days: number = 7): number[] {
    const today = startOfToday();
    const keys = Array.from({ length: days }, (_, i) => dayKey(addDays(today, i - (days - 1))));
    const stats = new Array(days).fill(0);

    completions.forEach(completion => {
        const index = keys.indexOf(dayKey(toDate(completion.completedAt)));
        if (index !== -1) stats[index]++;
    });

    return stats;
}

/**
 * Calculate all streak data at once
 */
export function calculateStreakData(completions: WorkoutCompletion[]): StreakData {
    return {
        currentStreak: calculateCurrentStreak(completions),
        longestStreak: calculateLongestStreak(completions),
        totalWorkouts: completions.length,
    };
}
