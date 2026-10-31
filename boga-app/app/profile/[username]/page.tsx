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
import { Avatar, BottomNav, ErrorScreen, Icon, LoadingScreen, PageHeader } from "@/src/components/ui";
import Link from "next/link";

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
    const [authReady, setAuthReady] = useState(false);
    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((u) => {
            setCurrentUser(u);
            setAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const loadProfile = async () => {
            // Wait for auth so the profile is fetched once, not again after sign-in resolves
            if (!authReady || !username || typeof username !== "string") return;

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

                // Load stats and programs (if visible) in parallel
                const canSeePrograms = profileData.showPrograms || currentUser?.uid === profileData.userId;
                const [completions, progs] = await Promise.all([
                    getWorkoutCompletions(profileData.userId, 30),
                    canSeePrograms ? getUserPrograms(profileData.userId) : Promise.resolve([])
                ]);

                setStreakData(calculateStreakData(completions as WorkoutCompletion[]));
                setWeeklyData(getWeeklyStats(completions as WorkoutCompletion[], 7));
                setPrograms(progs);
            } catch (error) {
                console.error("Error loading profile:", error);
                setLoadError(true);
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [username, currentUser, authReady]);

    const handleShare = async () => {
        const url = window.location.href;
        // Use the native share sheet on phones, fall back to copying the link
        if (navigator.share) {
            try {
                await navigator.share({ title: `${profile?.displayName} on BOGA`, url });
                return;
            } catch { }
        }
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) return <LoadingScreen />;
    if (loadError) return <ErrorScreen />;

    if (!profile || (!profile.isPublic && !isOwnProfile)) {
        const isPrivate = !!profile;
        return (
            <main className="min-h-screen text-white px-5 max-w-md mx-auto flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-3xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-zinc-400 mb-5">
                    <Icon name={isPrivate ? "lock" : "user"} size={28} />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">{isPrivate ? "This profile is private" : "Profile not found"}</h1>
                <p className="text-zinc-500 mt-2">{isPrivate ? "Only the owner can see these stats." : `There's no athlete called @${username}.`}</p>
                <button onClick={() => router.push("/")} className="btn btn-light h-12 px-6 mt-8">Go Home</button>
            </main>
        );
    }

    return (
        <main className="min-h-screen text-white px-5 max-w-2xl mx-auto !pb-32">
            <PageHeader
                action={
                    <button onClick={handleShare} className="btn btn-ghost h-10 px-4 text-sm">
                        {copied ? <><Icon name="check" size={16} /> Copied</> : <><Icon name="share" size={16} /> Share</>}
                    </button>
                }
            />

            {/* Profile Header */}
            <section className="flex flex-col items-center text-center mb-8 animate-rise-in">
                <div className="relative mb-4">
                    <div className="absolute inset-0 bg-red-600/30 blur-2xl rounded-full" />
                    <div className="relative">
                        <Avatar src={profile.profilePicture} name={profile.displayName} size={96} />
                    </div>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">{profile.displayName}</h1>
                <p className="text-zinc-500 mt-1">@{profile.username}</p>
                {profile.bio && <p className="text-zinc-300 mt-4 max-w-sm leading-relaxed">{profile.bio}</p>}

                {isOwnProfile && (
                    <button onClick={() => router.push("/settings")} className="btn btn-ghost h-10 px-5 text-sm mt-5">
                        <Icon name="edit" size={15} /> Edit Profile
                    </button>
                )}
            </section>

            {/* Stats */}
            <section className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 animate-rise-in" style={{ animationDelay: "60ms" }}>
                <StreakCounter streakData={streakData} />
                <ActivityChart weeklyData={weeklyData} />
            </section>

            {/* Programs */}
            {(profile.showPrograms || isOwnProfile) && programs.length > 0 && (
                <section className="animate-rise-in" style={{ animationDelay: "120ms" }}>
                    <p className="eyebrow mb-4">Programs</p>
                    <div className="grid gap-3">
                        {programs.map((program) => (
                            <Link
                                key={program.id}
                                href={`/program/${program.id}?userId=${profile.userId}`}
                                className="card card-interactive flex items-center justify-between gap-4 p-5"
                            >
                                <div className="min-w-0">
                                    <h3 className="font-semibold text-[17px] tracking-tight truncate">{program.name}</h3>
                                    <p className="text-xs text-zinc-500 mt-0.5 truncate">{program.description || "View program"}</p>
                                </div>
                                <Icon name="chevron" size={18} className="text-zinc-600 shrink-0" />
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {currentUser && <BottomNav />}
        </main>
    );
}
