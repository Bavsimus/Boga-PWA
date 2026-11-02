import type { CardioActivity, StrengthCategory } from "@/src/types/workout";

// Energy estimates use METs (metabolic equivalents) from the Compendium of Physical Activities:
//   kcal = MET × body weight (kg) × hours
// Resistance training can't be measured precisely this way, so treat results as ±25% estimates.

export const STRENGTH_CATEGORIES: { id: StrengthCategory; label: string; met: number }[] = [
  { id: "compound", label: "Compound", met: 6.0 },     // squat, deadlift, bench, rows, presses
  { id: "bodyweight", label: "Bodyweight", met: 5.0 }, // pull-ups, push-ups, dips
  { id: "isolation", label: "Isolation", met: 3.5 },   // curls, extensions, raises, machines
];

export const CARDIO_ACTIVITIES: { id: CardioActivity; label: string; met: number }[] = [
  { id: "walking", label: "Walking", met: 3.5 },    // ~5 km/h on flat ground
  { id: "running", label: "Running", met: 9.8 },    // ~10 km/h
  { id: "cycling", label: "Cycling", met: 7.0 },
  { id: "rowing", label: "Rowing", met: 7.0 },
  { id: "elliptical", label: "Elliptical", met: 5.0 },
  { id: "stairs", label: "Stairs", met: 9.0 },
  { id: "other", label: "Other", met: 5.0 },
];

const COMPOUND_WORDS = ["squat", "deadlift", "bench", "press", "row", "lunge", "clean", "snatch", "thrust", "rdl", "leg press", "çömel", "kürek"];
const BODYWEIGHT_WORDS = ["pull-up", "pull up", "pullup", "chin", "push-up", "push up", "pushup", "dip", "plank", "burpee", "şınav", "barfiks", "mekik", "sit-up", "crunch"];

// Best guess from the exercise name when the user hasn't picked a category
export const guessCategory = (name: string = ""): StrengthCategory => {
  const n = name.toLocaleLowerCase("tr-TR");
  if (BODYWEIGHT_WORDS.some(w => n.includes(w))) return "bodyweight";
  if (COMPOUND_WORDS.some(w => n.includes(w))) return "compound";
  return "isolation";
};

export const strengthMet = (category: StrengthCategory) =>
  STRENGTH_CATEGORIES.find(c => c.id === category)?.met ?? 3.5;

// Walking and running on a known distance use the ACSM metabolic equations, which account
// for speed and incline. Everything else falls back to the activity's average MET.
export const cardioMet = (activity: CardioActivity, minutes: number, distanceKm?: number, inclinePct?: number) => {
  const fallback = CARDIO_ACTIVITIES.find(a => a.id === activity)?.met ?? 5.0;
  if ((activity !== "walking" && activity !== "running") || !distanceKm || !minutes) return fallback;

  const speed = (distanceKm * 1000) / minutes; // m/min
  const grade = Math.max(0, inclinePct || 0) / 100;
  const isRunning = activity === "running" || speed > 134; // ~8 km/h: gait switches to running
  const vo2 = isRunning
    ? 3.5 + 0.2 * speed + 0.9 * speed * grade
    : 3.5 + 0.1 * speed + 1.8 * speed * grade;
  return vo2 / 3.5;
};

export const kcal = (met: number, bodyWeightKg: number, minutes: number) =>
  met * bodyWeightKg * (minutes / 60);

export interface CalorieInput {
  bodyWeightKg: number;
  sessionMinutes: number;
  strength: { category: StrengthCategory; sets: number }[]; // completed sets per exercise
  cardio: { activity: CardioActivity; minutes: number; distanceKm?: number; inclinePct?: number }[];
}

// Cardio is counted from its own logged minutes; the rest of the session is lifting time,
// weighted by how many sets of each kind of exercise were done.
export const estimateWorkoutCalories = ({ bodyWeightKg, sessionMinutes, strength, cardio }: CalorieInput) => {
  if (!bodyWeightKg) return null;

  const cardioMinutes = cardio.reduce((sum, c) => sum + (c.minutes || 0), 0);
  const cardioKcal = cardio.reduce(
    (sum, c) => sum + kcal(cardioMet(c.activity, c.minutes, c.distanceKm, c.inclinePct), bodyWeightKg, c.minutes || 0),
    0
  );

  const totalSets = strength.reduce((sum, s) => sum + s.sets, 0);
  const liftingMinutes = totalSets ? Math.max(0, sessionMinutes - cardioMinutes) : 0;
  const avgMet = totalSets
    ? strength.reduce((sum, s) => sum + strengthMet(s.category) * s.sets, 0) / totalSets
    : 0;
  const strengthKcal = kcal(avgMet, bodyWeightKg, liftingMinutes);

  return Math.round(cardioKcal + strengthKcal);
};
