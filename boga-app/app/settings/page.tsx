"use client";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { User, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getUserSettings, updateUserSettings, getUserProfile, updateUserProfile } from "@/src/services/database";
import { Avatar, BottomNav, ErrorScreen, Icon, LoadingScreen, LoginScreen, PageHeader, Toggle } from "@/src/components/ui";

const PRESETS = [30, 60, 90, 120, 180];

export default function SettingsPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Settings state
    const [restTimerEnabled, setRestTimerEnabled] = useState(true);
    const [restDuration, setRestDuration] = useState(90);

    // Profile state
    const [username, setUsername] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [bio, setBio] = useState("");
    const [isPublic, setIsPublic] = useState(true);
    const [showPrograms, setShowPrograms] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (u) => {
            setUser(u);
            try {
                if (u) {
                    // Load user settings and profile
                    const [settings, profile] = await Promise.all([
                        getUserSettings(u.uid),
                        getUserProfile(u.uid)
                    ]);
                    setRestTimerEnabled(settings.restTimerEnabled);
                    setRestDuration(settings.restDuration);
                    if (profile) {
                        setUsername(profile.username || "");
                        setDisplayName(profile.displayName || u.displayName || "");
                        setBio(profile.bio || "");
                        setIsPublic(profile.isPublic ?? true);
                        setShowPrograms(profile.showPrograms ?? true);
                    }
                }
            } catch (error) {
                // Showing defaults here would let "Save" overwrite the real settings
                console.error("Error loading settings:", error);
                setLoadError(true);
            } finally {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            await Promise.all([
                updateUserSettings(user.uid, {
                    restTimerEnabled,
                    restDuration: Math.min(600, Math.max(10, restDuration || 90))
                }),
                updateUserProfile(user.uid, {
                    displayName: displayName.trim() || user.displayName || "BOGA User",
                    bio: bio.trim(),
                    isPublic,
                    showPrograms
                })
            ]);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Settings could not be saved. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <LoadingScreen />;
    if (!user) return <LoginScreen />;
    if (loadError) return <ErrorScreen />;

    return (
        <main className="min-h-screen text-white px-5 max-w-2xl mx-auto !pb-48">
            <PageHeader subtitle="Preferences" title="Settings" />

            <div className="space-y-8 animate-rise-in">
                {/* --- PROFILE --- */}
                <section>
                    <p className="eyebrow mb-3">Profile</p>
                    <div className="card p-5 space-y-4">
                        <div className="flex items-center gap-4">
                            <Avatar src={user.photoURL} name={displayName} size={52} />
                            <div className="min-w-0">
                                <p className="font-semibold truncate">{displayName || "Your name"}</p>
                                {username && <p className="text-sm text-zinc-500 truncate">@{username}</p>}
                            </div>
                        </div>
                        <label className="block">
                            <span className="text-xs font-medium text-zinc-500 ml-1">Display name</span>
                            <input className="input mt-1" value={displayName} maxLength={50} onChange={(e) => setDisplayName(e.target.value)} />
                        </label>
                        <label className="block">
                            <span className="text-xs font-medium text-zinc-500 ml-1">Bio</span>
                            <textarea className="input mt-1 resize-none" rows={3} maxLength={160} placeholder="What are you training for?" value={bio} onChange={(e) => setBio(e.target.value)} />
                            <span className="block text-right text-[11px] text-zinc-600 mt-1 tabular">{bio.length}/160</span>
                        </label>
                    </div>
                </section>

                {/* --- PRIVACY --- */}
                <section>
                    <p className="eyebrow mb-3">Privacy</p>
                    <div className="card divide-y divide-white/5">
                        <div className="flex items-center justify-between gap-4 p-5">
                            <div>
                                <h3 className="font-semibold">Public profile</h3>
                                <p className="text-sm text-zinc-500 mt-0.5">Anyone with your link can see your stats</p>
                            </div>
                            <Toggle checked={isPublic} onChange={setIsPublic} label="Public profile" />
                        </div>
                        <div className="flex items-center justify-between gap-4 p-5">
                            <div>
                                <h3 className="font-semibold">Show programs</h3>
                                <p className="text-sm text-zinc-500 mt-0.5">Let visitors browse your programs</p>
                            </div>
                            <Toggle checked={showPrograms} onChange={setShowPrograms} label="Show programs" />
                        </div>
                    </div>
                </section>

                {/* --- REST TIMER --- */}
                <section>
                    <p className="eyebrow mb-3">Rest Timer</p>
                    <div className="card divide-y divide-white/5">
                        <div className="flex items-center justify-between gap-4 p-5">
                            <div>
                                <h3 className="font-semibold">Auto rest timer</h3>
                                <p className="text-sm text-zinc-500 mt-0.5">Start a countdown after every completed set</p>
                            </div>
                            <Toggle checked={restTimerEnabled} onChange={setRestTimerEnabled} label="Rest timer" />
                        </div>

                        <div className={`p-5 transition-opacity ${restTimerEnabled ? "" : "opacity-40 pointer-events-none"}`}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold">Duration</h3>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setRestDuration(d => Math.max(10, d - 15))} className="icon-btn !w-9 !h-9" aria-label="Decrease">−</button>
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        min="10"
                                        max="600"
                                        value={restDuration}
                                        onChange={(e) => setRestDuration(Number(e.target.value))}
                                        className="w-16 bg-transparent text-center text-xl font-bold tabular outline-none"
                                        aria-label="Rest duration in seconds"
                                    />
                                    <button onClick={() => setRestDuration(d => Math.min(600, d + 15))} className="icon-btn !w-9 !h-9" aria-label="Increase">+</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                                {PRESETS.map((preset) => (
                                    <button
                                        key={preset}
                                        onClick={() => setRestDuration(preset)}
                                        className={`h-10 rounded-xl text-sm font-semibold tabular transition-all active:scale-95 ${restDuration === preset
                                            ? 'bg-white text-black'
                                            : 'bg-white/[0.05] text-zinc-400 border border-white/[0.06]'
                                            }`}
                                    >
                                        {preset < 120 ? `${preset}s` : `${preset / 60}m`}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- ACCOUNT --- */}
                <section>
                    <p className="eyebrow mb-3">Account</p>
                    <div className="card p-2">
                        <div className="px-3 py-3 text-sm text-zinc-500 truncate">{user.email}</div>
                        <button
                            onClick={async () => { await signOut(auth); router.push("/"); }}
                            className="btn w-full h-12 !justify-start px-3 text-red-400 hover:bg-red-600/10"
                        >
                            <Icon name="logout" size={18} /> Sign Out
                        </button>
                    </div>
                </section>
            </div>

            {/* Save Button */}
            <div className="fixed inset-x-0 z-40 px-4 flex justify-center pointer-events-none" style={{ bottom: "calc(max(0.75rem, env(safe-area-inset-bottom)) + 68px)" }}>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-primary pointer-events-auto w-full max-w-md h-12"
                >
                    {saved ? <><Icon name="check" size={18} strokeWidth={2.5} /> Saved</> : saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <BottomNav username={username} />
        </main>
    );
}
