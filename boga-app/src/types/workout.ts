export type ExerciseKind = "strength" | "cardio";
export type StrengthCategory = "compound" | "isolation" | "bodyweight";
export type CardioActivity = "walking" | "running" | "cycling" | "rowing" | "elliptical" | "stairs" | "other";

export interface Exercise {
  id?: string;
  name: string;
  kind?: ExerciseKind; // missing on older exercises = strength
  // strength targets
  sets: number;
  reps: number;
  weight: number;
  category?: StrengthCategory; // missing = guessed from the name
  // cardio targets
  activity?: CardioActivity;
  minutes?: number;
  distanceKm?: number | null;
  inclinePct?: number | null;
}

export interface LoggedSet {
  weight: number;
  reps: number;
}

// One exercise inside a finished workout log
export interface LoggedExercise {
  exerciseId?: string;
  name: string;
  kind?: ExerciseKind;
  completedSets: number;
  weight?: number; // heaviest weight used (older logs: the target weight)
  sets?: LoggedSet[];
  targetWeight?: number; // target at the time, so stale suggestions can be skipped
  category?: StrengthCategory;
  activity?: CardioActivity;
  minutes?: number;
  distanceKm?: number | null;
  inclinePct?: number | null;
}

export interface TrainingDay {
  id?: string;
  title: string; // örn: "Chest & Triceps"
  order: number;
  exercises: Exercise[];
}

export interface Program {
  id?: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: any;
}

export interface UserSettings {
  restTimerEnabled: boolean;
  restDuration: number; // in seconds
  bodyWeight?: number; // kg, used for calorie estimates
}

export interface WorkoutCompletion {
  id?: string;
  completedAt: any; // Firestore Timestamp
  programId: string;
  dayId: string;
  dayName: string;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
}

export interface UserProfile {
  userId: string;
  username: string; // unique, lowercase
  displayName: string;
  bio?: string;
  profilePicture?: string;
  isPublic: boolean;
  showPrograms: boolean;
  createdAt: any; // Firestore Timestamp
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  profilePicture?: string;
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
  rank: number;
}