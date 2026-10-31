"use client";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getUserProfile, createUserProfile, checkUsernameAvailability } from "@/src/services/database";
import { Icon, LoadingScreen, Logo } from "@/src/components/ui";

export default function ProfileSetupPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [username, setUsername] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [isChecking, setIsChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (u) => {
            setUser(u);
            if (u) {
                // Check if user already has a profile
                const profile = await getUserProfile(u.uid);
                if (profile && profile.username) {
                    // Already has profile, redirect to dashboard
                    router.push("/");
                } else {
                    // Pre-fill display name from Google
                    setDisplayName(u.displayName || "");
                }
            } else {
                router.push("/");
            }
        });
        return () => unsubscribe();
    }, [router]);

    const checkUsername = async (value: string) => {
        if (value.length < 3) {
            setIsAvailable(null);
            return;
        }

        setIsChecking(true);
        try {
            const available = await checkUsernameAvailability(value);
            setIsAvailable(available);
        } catch (err) {
            console.error(err);
        } finally {
            setIsChecking(false);
        }
    };

    const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
        setUsername(value);
        setError("");

        if (value.length >= 3) {
            checkUsername(value);
        } else {
            setIsAvailable(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) return;
        if (username.length < 3 || username.length > 20) {
            setError("Username must be 3-20 characters");
            return;
        }
        if (!isAvailable) {
            setError("Username not available");
            return;
        }
        if (!displayName.trim()) {
            setError("Display name is required");
            return;
        }

        setIsCreating(true);
        try {
            await createUserProfile(user.uid, username, displayName.trim());
            router.push("/");
        } catch (err: any) {
            setError(err.message || "Failed to create profile");
        } finally {
            setIsCreating(false);
        }
    };

    if (!user) return <LoadingScreen />;

    return (
        <main className="min-h-screen text-white px-5 max-w-md mx-auto">
            <div className="pt-10 animate-rise-in">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="flex justify-center mb-6"><Logo size={56} withText={false} /></div>
                    <h1 className="text-3xl font-bold tracking-tight">Welcome to BOGA</h1>
                    <p className="text-zinc-500 mt-2">Pick a name and handle for your profile.</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <label className="block">
                        <span className="text-xs font-medium text-zinc-500 ml-1">Display name</span>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="John Doe"
                            className="input mt-1"
                            maxLength={50}
                            required
                        />
                    </label>

                    <label className="block">
                        <span className="text-xs font-medium text-zinc-500 ml-1">Username</span>
                        <div className="relative mt-1">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">@</span>
                            <input
                                type="text"
                                value={username}
                                onChange={handleUsernameChange}
                                placeholder="johndoe"
                                className="input !pl-9 !pr-11"
                                minLength={3}
                                maxLength={20}
                                autoCapitalize="none"
                                autoCorrect="off"
                                required
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                {isChecking && <div className="w-4 h-4 border-2 border-zinc-600 border-t-red-500 rounded-full animate-spin" />}
                                {!isChecking && isAvailable === true && <Icon name="check" size={18} className="text-green-400" strokeWidth={2.5} />}
                                {!isChecking && isAvailable === false && <Icon name="close" size={18} className="text-red-400" strokeWidth={2.5} />}
                            </div>
                        </div>
                        <span className={`block text-xs mt-1.5 ml-1 ${isAvailable === false ? "text-red-400" : "text-zinc-600"}`}>
                            {isAvailable === false ? "That username is taken" : "3-20 characters: letters, numbers and underscores"}
                        </span>
                    </label>

                    {/* Error */}
                    {error && (
                        <div className="rounded-2xl bg-red-600/10 border border-red-600/25 px-4 py-3 text-sm text-red-400 text-center">{error}</div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isCreating || !isAvailable || !displayName.trim()}
                        className="btn btn-primary w-full h-14 text-base !mt-8"
                    >
                        {isCreating ? "Creating..." : "Create Profile"}
                    </button>
                </form>

                {/* Info */}
                <p className="mt-6 text-center text-xs text-zinc-600 leading-relaxed">
                    Your profile is <span className="text-zinc-400 font-medium">public</span> by default.<br />You can change this anytime in Settings.
                </p>
            </div>
        </main>
    );
}
