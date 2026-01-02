"use client";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getUserSettings, updateUserSettings } from "@/src/services/database";

export default function SettingsPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Settings state
    const [restTimerEnabled, setRestTimerEnabled] = useState(true);
    const [restDuration, setRestDuration] = useState(90);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (u) => {
            setUser(u);
            if (u) {
                // Load user settings
                const settings = await getUserSettings(u.uid);
                setRestTimerEnabled(settings.restTimerEnabled);
                setRestDuration(settings.restDuration);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            await updateUserSettings(user.uid, {
                restTimerEnabled,
                restDuration
            });
            // Navigate back to dashboard
            router.push("/");
        } catch (error) {
            console.error("Error saving settings:", error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-black min-h-screen flex items-center justify-center text-white italic tracking-widest font-black uppercase">
                BOGA Loading...
            </div>
        );
    }

    if (!user) {
        router.push("/");
        return null;
    }

    return (
        <main className="min-h-screen bg-black text-white p-6">
            <header className="flex items-center justify-between mb-8">
                <button
                    onClick={() => router.back()}
                    className="text-zinc-500 text-xs font-bold uppercase tracking-widest"
                >
                    ← Back
                </button>
                <h1 className="text-xl font-black italic text-red-600 tracking-tighter">BOGA</h1>
            </header>

            <div className="max-w-md mx-auto">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">Settings</h2>
                <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-8">Rest Timer Configuration</p>

                <div className="space-y-6">
                    {/* Rest Timer Toggle */}
                    <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-[2rem]">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <h3 className="font-black uppercase text-sm tracking-tight">Enable Rest Timer</h3>
                                <p className="text-zinc-500 text-[10px] mt-1 font-bold">Show countdown after completing sets</p>
                            </div>
                            <button
                                onClick={() => setRestTimerEnabled(!restTimerEnabled)}
                                className={`relative w-14 h-8 rounded-full transition-all ${restTimerEnabled ? 'bg-red-600' : 'bg-zinc-700'
                                    }`}
                            >
                                <div
                                    className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${restTimerEnabled ? 'right-1' : 'left-1'
                                        }`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Rest Duration Input */}
                    <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-[2rem]">
                        <h3 className="font-black uppercase text-sm tracking-tight mb-3">Rest Duration</h3>
                        <p className="text-zinc-500 text-[10px] mb-4 font-bold">How long to rest between sets (seconds)</p>
                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                min="10"
                                max="600"
                                value={restDuration}
                                onChange={(e) => setRestDuration(Number(e.target.value))}
                                className="flex-1 bg-black border border-zinc-800 p-4 rounded-2xl outline-none focus:border-red-600 text-white font-black text-center text-2xl"
                                disabled={!restTimerEnabled}
                            />
                            <span className="text-zinc-500 font-bold text-sm">seconds</span>
                        </div>
                        {!restTimerEnabled && (
                            <p className="text-zinc-600 text-[9px] mt-3 italic text-center">Enable rest timer to adjust duration</p>
                        )}
                    </div>

                    {/* Preset Buttons */}
                    {restTimerEnabled && (
                        <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-[2rem]">
                            <h3 className="font-black uppercase text-[10px] tracking-widest mb-3 text-zinc-500">Quick Presets</h3>
                            <div className="grid grid-cols-4 gap-2">
                                {[30, 60, 90, 120].map((preset) => (
                                    <button
                                        key={preset}
                                        onClick={() => setRestDuration(preset)}
                                        className={`py-3 rounded-xl font-black text-sm transition-all ${restDuration === preset
                                                ? 'bg-red-600 text-white'
                                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                            }`}
                                    >
                                        {preset}s
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-red-600 text-white font-black py-5 rounded-[2rem] text-xl shadow-2xl active:scale-95 transition-all uppercase italic tracking-tighter mt-8 disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
        </main>
    );
}
