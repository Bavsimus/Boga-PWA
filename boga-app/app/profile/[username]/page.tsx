"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { User } from "firebase/auth";
import {
    getUserByUsername,
    getWorkoutCompletions,
    getUserPrograms
} from "@/src/services/database";
import { calculateStreakData, getWeeklyStats } from "@/src/utils/streak-utils";
import { WorkoutCompletion, StreakData, UserProfile } from "@/src/types/workout";
import StreakCounter from "@/src/components/StreakCounter";
import ActivityChart from "@/src/components/ActivityChart";

export default function PublicProfilePage() {
    const { username } = useParams();
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [streakData, setStreakData] = useState<StreakData>({ currentStreak: 0, longestStreak: 0, totalWorkouts: 0 });
    const [weeklyData, setWeeklyData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
    const [programs, setPrograms] = useState<any[]>([]);
    const [isOwnProfile, setIsOwnProfile] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((u) => {
            setCurrentUser(u);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const loadProfile = async () => {
            if (!username || typeof username !== "string") return;

            try {
                const profileData = await getUserByUsername(username);

                if (!profileData) {
                    setLoading(false);
                    return;
                }

                setProfile(profileData as UserProfile);
                setIsOwnProfile(currentUser?.uid === profileData.userId);

                // Check privacy
                if (!profileData.isPublic && currentUser?.uid !== profileData.userId) {
                    setLoading(false);
                    return;
                }

                // Load stats
                const completions = await getWorkoutCompletions(profileData.userId, 30);
                const streak = calculateStreakData(completions as WorkoutCompletion[]);
                const weekly = getWeeklyStats(completions as WorkoutCompletion[], 7);

                setStreakData(streak);
                setWeeklyData(weekly);

                // Load programs if public
                if (profileData.showPrograms || currentUser?.uid === profileData.userId) {
                    const progs = await getUserPrograms(profileData.userId);
                    setPrograms(progs);
                }
            } catch (error) {
                console.error("Error loading profile:", error);
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [username, currentUser]);

    const handleShare = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="bg-black min-h-screen flex items-center justify-center text-white">
                <p className="italic tracking-widest font-black uppercase">Loading...</p>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="bg-black min-h-screen flex flex-col items-center justify-center text-white p-6">
                <h1 className="text-6xl font-black italic text-red-600 mb-4">404</h1>
                <p className="text-zinc-500 text-lg font-bold mb-8">Profile not found</p>
                <button
                    onClick={() => router.push("/")}
                    className="bg-zinc-900 text-white px-6 py-3 rounded-full font-black uppercase text-xs border border-zinc-800"
                >
                    Go Home
                </button>
            </div>
        );
    }

    if (!profile.isPublic && !isOwnProfile) {
        return (
            <div className="bg-black min-h-screen flex flex-col items-center justify-center text-white p-6">
                <div className="text-6xl mb-6">🔒</div>
                <h1 className="text-3xl font-black italic text-red-600 mb-2">Private Profile</h1>
                <p className="text-zinc-500 text-sm font-bold mb-8">This profile is private</p>
                <button
                    onClick={() => router.push("/")}
                    className="bg-zinc-900 text-white px-6 py-3 rounded-full font-black uppercase text-xs border border-zinc-800"
                >
                    Go Home
                </button>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-black text-white p-6">
            {/* Header */}
            <header className="flex items-center justify-between mb-8">
                <button
                    onClick={() => router.back()}
                    className="text-zinc-500 text-xs font-bold uppercase tracking-widest"
                >
                    ← Back
                </button>
                <button
                    onClick={handleShare}
                    className="bg-zinc-900 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase border border-zinc-800 active:scale-95 transition-all"
                >
                    {copied ? "✓ Copied!" : "Share Profile"}
                </button>
            </header>

            <div className="max-w-2xl mx-auto">
                {/* Profile Header */}
                <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-[2.5rem] p-8 mb-6">
                    <div className="flex items-center gap-6 mb-6">
                        {/* Avatar */}
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-4xl font-black">
                            {profile.profilePicture ? (
                                <img src={profile.profilePicture} alt={profile.displayName} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                profile.displayName.charAt(0).toUpperCase()
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                            <h1 className="text-3xl font-black italic text-white tracking-tighter mb-1">
                                {profile.displayName}
                            </h1>
                            <p className="text-zinc-500 text-sm font-bold">
                                @{profile.username}
                            </p>
                            {profile.bio && (
                                <p className="text-zinc-400 text-sm mt-3">
                                    {profile.bio}
                                </p>
                            )}
                        </div>
                    </div>

                    {isOwnProfile && (
                        <button
                            onClick={() => router.push("/settings")}
                            className="w-full bg-zinc-800 text-white py-3 rounded-2xl font-black uppercase text-xs border border-zinc-700 active:scale-95 transition-all"
                        >
                            Edit Profile
                        </button>
                    )}
                </div>

                {/* Stats */}
                <section className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <StreakCounter streakData={streakData} />
                    <ActivityChart weeklyData={weeklyData} />
                </section>

                {/* Programs */}
                {(profile.showPrograms || isOwnProfile) && programs.length > 0 && (
                    <section>
                        <h2 className="text-zinc-500 text-xs uppercase tracking-[0.2em] font-black mb-4">
                            Active Programs
                        </h2>
                        <div className="space-y-3">
                            {programs.map((program) => (
                                <div
                                    key={program.id}
                                    className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-[2rem]"
                                >
                                    <h3 className="text-lg font-black italic text-white tracking-tight">
                                        {program.name}
                                    </h3>
                                    {program.description && (
                                        <p className="text-zinc-500 text-sm mt-1">{program.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </main>
    );
}
