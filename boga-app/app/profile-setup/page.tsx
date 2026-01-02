"use client";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getUserProfile, createUserProfile, checkUsernameAvailability } from "@/src/services/database";

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

    if (!user) {
        return (
            <div className="bg-black min-h-screen flex items-center justify-center text-white">
                <p className="italic tracking-widest font-black uppercase">Loading...</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-black text-white p-6">
            <div className="max-w-md mx-auto pt-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-black italic text-red-600 tracking-tighter mb-2">
                        Welcome to BOGA
                    </h1>
                    <p className="text-zinc-500 text-sm font-bold uppercase tracking-wider">
                        Set up your profile
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Display Name */}
                    <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-[2rem]">
                        <label className="block text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-black mb-3">
                            Display Name
                        </label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="John Doe"
                            className="w-full bg-black border border-zinc-800 p-4 rounded-2xl outline-none focus:border-red-600 text-white font-bold text-lg"
                            maxLength={50}
                            required
                        />
                        <p className="text-zinc-600 text-[10px] mt-2 font-bold">
                            Your public name shown on your profile
                        </p>
                    </div>

                    {/* Username */}
                    <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-[2rem]">
                        <label className="block text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-black mb-3">
                            Username
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 font-black text-lg">
                                @
                            </span>
                            <input
                                type="text"
                                value={username}
                                onChange={handleUsernameChange}
                                placeholder="johndoe"
                                className="w-full bg-black border border-zinc-800 p-4 pl-10 rounded-2xl outline-none focus:border-red-600 text-white font-bold text-lg"
                                minLength={3}
                                maxLength={20}
                                required
                            />
                            {isChecking && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <div className="w-5 h-5 border-2 border-zinc-600 border-t-red-600 rounded-full animate-spin" />
                                </div>
                            )}
                            {!isChecking && isAvailable === true && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 text-xl">
                                    ✓
                                </div>
                            )}
                            {!isChecking && isAvailable === false && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 text-xl">
                                    ✗
                                </div>
                            )}
                        </div>
                        <p className="text-zinc-600 text-[10px] mt-2 font-bold">
                            3-20 characters, letters, numbers, and underscores only
                        </p>
                        {isAvailable === false && (
                            <p className="text-red-500 text-xs mt-2 font-bold">
                                Username already taken
                            </p>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-600/10 border border-red-600/30 p-4 rounded-2xl">
                            <p className="text-red-500 text-sm font-bold text-center">{error}</p>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isCreating || !isAvailable || !displayName.trim()}
                        className="w-full bg-red-600 text-white font-black py-5 rounded-[2rem] text-xl shadow-2xl active:scale-95 transition-all uppercase italic tracking-tighter disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isCreating ? "Creating..." : "Create Profile"}
                    </button>
                </form>

                {/* Info */}
                <div className="mt-8 text-center text-zinc-600 text-xs">
                    <p className="mb-2">Your profile will be <span className="text-red-600 font-bold">public</span> by default</p>
                    <p>You can change privacy settings later</p>
                </div>
            </div>
        </main>
    );
}
