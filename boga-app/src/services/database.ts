import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from "firebase/firestore";
import { Program } from "../types/workout";



export const createProgram = async (userId: string, programName: string) => {
  const programsRef = collection(db, "users", userId, "programs");
  return await addDoc(programsRef, {
    name: programName,
    isActive: true,
    createdAt: serverTimestamp(),
  });
};

export const getUserPrograms = async (userId: string) => {
  const programsRef = collection(db, "users", userId, "programs");
  const q = query(programsRef, orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addTrainingDay = async (userId: string, programId: string, dayTitle: string, order: number) => {
  const daysRef = collection(db, "users", userId, "programs", programId, "days");
  return await addDoc(daysRef, {
    title: dayTitle,
    order: order,
    createdAt: serverTimestamp(),
  });
};

export const getProgramDays = async (userId: string, programId: string) => {
  const daysRef = collection(db, "users", userId, "programs", programId, "days");
  const q = query(daysRef, orderBy("order", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addExercise = async (userId: string, programId: string, dayId: string, exerciseData: any) => {
  const { db } = await import("@/lib/firebase");
  const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
  
  const exercisesRef = collection(db, "users", userId, "programs", programId, "days", dayId, "exercises");
  return await addDoc(exercisesRef, {
    ...exerciseData,
    createdAt: serverTimestamp(),
  });
};

export const getExercises = async (userId: string, programId: string, dayId: string) => {
  const { db } = await import("@/lib/firebase");
  const { collection, getDocs, query, orderBy } = await import("firebase/firestore");

  const exercisesRef = collection(db, "users", userId, "programs", programId, "days", dayId, "exercises");
  const q = query(exercisesRef, orderBy("createdAt", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const finishWorkout = async (userId: string, workoutSummary: any) => {
  const { db } = await import("@/lib/firebase");
  const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");

  const logsRef = collection(db, "users", userId, "logs");
  return await addDoc(logsRef, {
    ...workoutSummary,
    completedAt: serverTimestamp(),
  });
};