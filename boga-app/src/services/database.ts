import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, getCountFromServer, doc, updateDoc, deleteDoc } from "firebase/firestore";
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

export const getProgram = async (userId: string, programId: string) => {
  const { doc, getDoc } = await import("firebase/firestore");
  const programRef = doc(db, "users", userId, "programs", programId);
  const programSnap = await getDoc(programRef);
  if (programSnap.exists()) {
    return { id: programSnap.id, ...programSnap.data() };
  } else {
    return null;
  }
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
  const exercisesRef = collection(db, "users", userId, "programs", programId, "days", dayId, "exercises");
  return await addDoc(exercisesRef, {
    ...exerciseData,
    createdAt: serverTimestamp(),
  });
};

export const getExercises = async (userId: string, programId: string, dayId: string) => {
  const exercisesRef = collection(db, "users", userId, "programs", programId, "days", dayId, "exercises");
  const q = query(exercisesRef, orderBy("createdAt", "asc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const finishWorkout = async (userId: string, workoutSummary: any) => {
  const logsRef = collection(db, "users", userId, "logs");
  return await addDoc(logsRef, {
    ...workoutSummary,
    completedAt: serverTimestamp(),
  });
};

export const getTotalWorkoutsCount = async (userId: string) => {
  const logsRef = collection(db, "users", userId, "logs");
  const snapshot = await getCountFromServer(logsRef);
  return snapshot.data().count;
};

export const updateProgramName = async (userId: string, programId: string, newName: string) => {
  const programRef = doc(db, "users", userId, "programs", programId);
  return await updateDoc(programRef, { name: newName });
};

export const deleteProgram = async (userId: string, programId: string) => {
  const programRef = doc(db, "users", userId, "programs", programId);
  return await deleteDoc(programRef);
};

// --- GÜNLER İÇİN ---
export const updateDayName = async (userId: string, programId: string, dayId: string, newName: string) => {
  const { db } = await import("@/lib/firebase");
  const dayRef = doc(db, "users", userId, "programs", programId, "days", dayId);
  return await updateDoc(dayRef, { name: newName });
};

export const deleteDay = async (userId: string, programId: string, dayId: string) => {
  const { db } = await import("@/lib/firebase");
  const dayRef = doc(db, "users", userId, "programs", programId, "days", dayId);
  return await deleteDoc(dayRef);
};

// --- HAREKETLER İÇİN ---
export const updateExercise = async (userId: string, programId: string, dayId: string, exId: string, data: any) => {
  const { db } = await import("@/lib/firebase");
  const exRef = doc(db, "users", userId, "programs", programId, "days", dayId, "exercises", exId);
  return await updateDoc(exRef, data);
};

export const deleteExercise = async (userId: string, programId: string, dayId: string, exId: string) => {
  const { db } = await import("@/lib/firebase");
  const exRef = doc(db, "users", userId, "programs", programId, "days", dayId, "exercises", exId);
  return await deleteDoc(exRef);
};

export const getWorkoutHistory = async (userId: string) => {
  const { db } = await import("@/lib/firebase");
  const { collection } = await import("firebase/firestore");
  
  const logsRef = collection(db, "users", userId, "logs");
  const q = query(logsRef, orderBy("completedAt", "desc")); // En yeni en üstte
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};