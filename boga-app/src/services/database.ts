import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, getCountFromServer, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Program } from "../types/workout";



export const createProgram = async (userId: string, programName: string) => {
  const programsRef = collection(db, "users", userId, "programs");
  return await addDoc(programsRef, {
    userId: userId, // Store owner's userId
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

export const getDay = async (userId: string, programId: string, dayId: string) => {
  const { doc, getDoc } = await import("firebase/firestore");
  const dayRef = doc(db, "users", userId, "programs", programId, "days", dayId);
  const daySnap = await getDoc(dayRef);
  if (daySnap.exists()) {
    return { id: daySnap.id, ...daySnap.data() };
  } else {
    return null;
  }
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

// --- USER SETTINGS ---
export const getUserSettings = async (userId: string) => {
  const { db } = await import("@/lib/firebase");
  const { doc, getDoc, setDoc } = await import("firebase/firestore");

  const settingsRef = doc(db, "users", userId, "settings", "preferences");
  const settingsSnap = await getDoc(settingsRef);

  if (settingsSnap.exists()) {
    return settingsSnap.data();
  } else {
    // Return default settings if none exist
    const defaultSettings = {
      restTimerEnabled: true,
      restDuration: 90
    };
    // Create default settings in database
    await setDoc(settingsRef, defaultSettings);
    return defaultSettings;
  }
};

export const updateUserSettings = async (userId: string, settings: { restTimerEnabled: boolean; restDuration: number }) => {
  const { db } = await import("@/lib/firebase");
  const { doc, setDoc } = await import("firebase/firestore");

  const settingsRef = doc(db, "users", userId, "settings", "preferences");
  return await setDoc(settingsRef, settings, { merge: true });
};

// Workout Completion Tracking
export const recordWorkoutCompletion = async (
  userId: string,
  programId: string,
  dayId: string,
  dayName: string
) => {
  const completionsRef = collection(db, "users", userId, "completions");
  return await addDoc(completionsRef, {
    completedAt: serverTimestamp(),
    programId,
    dayId,
    dayName,
  });
};

export const getWorkoutCompletions = async (userId: string, limit: number = 30) => {
  const completionsRef = collection(db, "users", userId, "completions");
  const q = query(completionsRef, orderBy("completedAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getCompletionsInRange = async (
  userId: string,
  startDate: Date,
  endDate: Date
) => {
  const { Timestamp, where } = await import("firebase/firestore");
  const completionsRef = collection(db, "users", userId, "completions");
  const q = query(
    completionsRef,
    where("completedAt", ">=", Timestamp.fromDate(startDate)),
    where("completedAt", "<=", Timestamp.fromDate(endDate)),
    orderBy("completedAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Profile Management
export const createAutoProfile = async (userId: string, displayName: string, email: string) => {
  const { setDoc } = await import("firebase/firestore");

  // Generate username from email or random
  let baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  if (baseUsername.length < 3) {
    baseUsername = 'user';
  }

  // Find available username
  let username = baseUsername;
  let counter = 1;
  while (!(await checkUsernameAvailability(username))) {
    username = `${baseUsername}${counter}`;
    counter++;
  }

  const usernameLower = username.toLowerCase();

  // Create profile
  const profileRef = doc(db, "users", userId);
  await setDoc(profileRef, {
    username: usernameLower,
    displayName: displayName || "BOGA User",
    bio: "",
    profilePicture: "",
    isPublic: true,
    showPrograms: true,
    createdAt: serverTimestamp()
  }, { merge: true });

  // Reserve username
  const usernameRef = doc(db, "usernames", usernameLower);
  await setDoc(usernameRef, { userId });

  return usernameLower;
};

export const createUserProfile = async (userId: string, username: string, displayName: string) => {
  const { setDoc } = await import("firebase/firestore");

  // Check username availability
  const isAvailable = await checkUsernameAvailability(username);
  if (!isAvailable) {
    throw new Error("Username already taken");
  }

  const usernameLower = username.toLowerCase();

  // Create profile
  const profileRef = doc(db, "users", userId);
  await setDoc(profileRef, {
    username: usernameLower,
    displayName,
    bio: "",
    profilePicture: "",
    isPublic: true,
    showPrograms: true,
    createdAt: serverTimestamp()
  }, { merge: true });

  // Reserve username
  const usernameRef = doc(db, "usernames", usernameLower);
  await setDoc(usernameRef, { userId });

  return usernameLower;
};

export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const usernameLower = username.toLowerCase();
  const usernameRef = doc(db, "usernames", usernameLower);
  const usernameSnap = await getDoc(usernameRef);
  return !usernameSnap.exists();
};

export const getUserProfile = async (userId: string) => {
  const { doc, getDoc } = await import("firebase/firestore");
  const profileRef = doc(db, "users", userId);
  const profileSnap = await getDoc(profileRef);
  if (profileSnap.exists()) {
    return { userId, ...profileSnap.data() };
  }
  return null;
};

export const getUserByUsername = async (username: string) => {
  const { doc, getDoc } = await import("firebase/firestore");
  const usernameLower = username.toLowerCase();

  // Get userId from username
  const usernameRef = doc(db, "usernames", usernameLower);
  const usernameSnap = await getDoc(usernameRef);

  if (!usernameSnap.exists()) {
    return null;
  }

  const userId = usernameSnap.data().userId;
  return await getUserProfile(userId);
};

export const updateUserProfile = async (
  userId: string,
  updates: {
    displayName?: string;
    bio?: string;
    profilePicture?: string;
    isPublic?: boolean;
    showPrograms?: boolean;
  }
) => {
  const { setDoc } = await import("firebase/firestore");
  const profileRef = doc(db, "users", userId);
  return await setDoc(profileRef, updates, { merge: true });
};

// Leaderboard
export const getLeaderboard = async (type: 'currentStreak' | 'totalWorkouts' | 'longestStreak', limit: number = 100) => {
  // This is a simplified version. In production, you'd want to:
  // 1. Maintain a separate leaderboard collection updated via Cloud Functions
  // 2. Use composite indexes for efficient queries
  // For now, we'll return an empty array as this requires more complex setup

  // TODO: Implement proper leaderboard with Cloud Functions
  return [];
};

export const getUserRank = async (userId: string, type: 'currentStreak' | 'totalWorkouts' | 'longestStreak'): Promise<number | null> => {
  // TODO: Implement rank calculation
  return null;
};