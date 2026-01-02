import { WorkoutCompletion, StreakData } from '../types/workout';

/**
 * Calculate the current workout streak from completion history
 * A streak continues if workouts are completed on consecutive calendar days
 */
export function calculateCurrentStreak(completions: WorkoutCompletion[]): number {
    if (!completions || completions.length === 0) return 0;

    // Sort by date descending (most recent first)
    const sorted = [...completions].sort((a, b) => {
        const dateA = a.completedAt?.toDate?.() || new Date(a.completedAt);
        const dateB = b.completedAt?.toDate?.() || new Date(b.completedAt);
        return dateB.getTime() - dateA.getTime();
    });

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const completion of sorted) {
        const completionDate = completion.completedAt?.toDate?.() || new Date(completion.completedAt);
        completionDate.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor((currentDate.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === streak) {
            streak++;
            currentDate = new Date(completionDate);
        } else if (daysDiff > streak) {
            break;
        }
    }

    return streak;
}

/**
 * Calculate the longest streak in the user's history
 */
export function calculateLongestStreak(completions: WorkoutCompletion[]): number {
    if (!completions || completions.length === 0) return 0;

    const sorted = [...completions].sort((a, b) => {
        const dateA = a.completedAt?.toDate?.() || new Date(a.completedAt);
        const dateB = b.completedAt?.toDate?.() || new Date(b.completedAt);
        return dateA.getTime() - dateB.getTime();
    });

    let maxStreak = 0;
    let currentStreak = 1;
    let prevDate = sorted[0].completedAt?.toDate?.() || new Date(sorted[0].completedAt);
    prevDate.setHours(0, 0, 0, 0);

    for (let i = 1; i < sorted.length; i++) {
        const currentDate = sorted[i].completedAt?.toDate?.() || new Date(sorted[i].completedAt);
        currentDate.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === 1) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
        } else if (daysDiff > 1) {
            currentStreak = 1;
        }

        prevDate = currentDate;
    }

    return Math.max(maxStreak, currentStreak);
}

/**
 * Get workout count for the last N days
 */
export function getWeeklyStats(completions: WorkoutCompletion[], days: number = 7): number[] {
    const stats = new Array(days).fill(0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    completions.forEach(completion => {
        const completionDate = completion.completedAt?.toDate?.() || new Date(completion.completedAt);
        completionDate.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor((today.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff >= 0 && daysDiff < days) {
            stats[days - 1 - daysDiff]++;
        }
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
