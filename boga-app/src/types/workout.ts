export interface Exercise {
  id?: string;
  name: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  order: number;
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