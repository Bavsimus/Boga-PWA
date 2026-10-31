"use client";
import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// --- ICONS (lucide tarzı, 24px çizgi ikonlar) ---
const paths: Record<string, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z" /></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  settings: <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  back: <><path d="m15 18-6-6 6-6" /></>,
  chevron: <><path d="m9 18 6-6-6-6" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></>,
  more: <><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></>,
  close: <><path d="M18 6 6 18M6 6l12 12" /></>,
  check: <><path d="M20 6 9 17l-5-5" /></>,
  flame: <><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></>,
  dumbbell: <><path d="M14.4 14.4 9.6 9.6" /><path d="M18.66 21.51a2 2 0 1 1-2.83-2.83l-1.77 1.77a2 2 0 1 1-2.83-2.83l6.37-6.37a2 2 0 1 1 2.83 2.83l-1.77 1.77a2 2 0 1 1 2.83 2.83z" /><path d="m21.5 21.5-1.4-1.4" /><path d="M3.9 3.9 2.5 2.5" /><path d="M6.4 12.77a2 2 0 1 1-2.83-2.83l1.77-1.77a2 2 0 1 1-2.83-2.83l2.83-2.83a2 2 0 1 1 2.83 2.83l1.77-1.77a2 2 0 1 1 2.83 2.83z" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  trophy: <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></>,
  timer: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2" /><path d="M10 2h4" /></>,
  play: <><path d="M6 4v16l14-8z" /></>,
  share: <><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><path d="m16 6-4-4-4 4" /><path d="M12 2v13" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  trash: <><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
};

export function Icon({ name, size = 20, className = "", strokeWidth = 2 }: { name: keyof typeof paths | string; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

// --- BRAND ---
export function Logo({ size = 36, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/boga.png" alt="BOGA" width={size} height={size} className="object-contain drop-shadow-[0_4px_12px_rgba(220,38,38,0.35)]" />
      {withText && <span className="text-2xl font-black italic tracking-tighter text-white leading-none">BOGA</span>}
    </div>
  );
}

// --- NAVIGATION ---
// router.back() does nothing when the page was opened directly (shared link, PWA restore), so fall back to home
export function useGoBack() {
  const router = useRouter();
  return () => (window.history.length > 1 ? router.back() : router.push("/"));
}

// --- PAGE HEADER ---
export function PageHeader({ title, subtitle, back = true, action }: { title?: string; subtitle?: string; back?: boolean; action?: ReactNode }) {
  const goBack = useGoBack();
  return (
    <header className="flex items-center gap-3 mb-6 min-h-10">
      {back && (
        <button onClick={goBack} className="icon-btn shrink-0" aria-label="Back">
          <Icon name="back" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        {subtitle && <p className="eyebrow truncate">{subtitle}</p>}
        {title && <h1 className="text-xl font-bold tracking-tight truncate">{title}</h1>}
      </div>
      {action}
    </header>
  );
}

// --- BOTTOM SHEET / MODAL ---
// Mobilde alttan açılan panel, geniş ekranda ortada kart
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-md glass rounded-t-[2rem] sm:rounded-[2rem] px-6 pt-3 sm:pt-6 animate-sheet-up"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-white/15 sm:hidden" />
        {title && (
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold tracking-tight">{title}</h3>
            <button onClick={onClose} className="icon-btn !w-8 !h-8" aria-label="Close">
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// --- BOTTOM NAV ---
// Username is looked up once per session so every page can link to the profile
let cachedUsername = "";

export function BottomNav({ username: usernameProp }: { username?: string }) {
  const pathname = usePathname();
  const [username, setUsername] = useState(usernameProp || cachedUsername);

  useEffect(() => {
    if (usernameProp) {
      cachedUsername = usernameProp;
      setUsername(usernameProp);
      return;
    }
    if (cachedUsername) return;
    let cancelled = false;
    (async () => {
      const { auth } = await import("@/lib/firebase");
      const { getUserProfile } = await import("@/src/services/database");
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const profile = await getUserProfile(uid);
      if (!cancelled && profile?.username) {
        cachedUsername = profile.username;
        setUsername(profile.username);
      }
    })().catch(() => { });
    return () => { cancelled = true; };
  }, [usernameProp]);

  const items = [
    { href: "/", match: "/", icon: "home", label: "Home" },
    { href: "/history", match: "/history", icon: "history", label: "History" },
    { href: username ? `/profile/${username}` : "/", match: "/profile/", icon: "user", label: "Profile" },
    { href: "/settings", match: "/settings", icon: "settings", label: "Settings" },
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 flex justify-center px-4 pointer-events-none"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="glass pointer-events-auto flex items-center gap-1 rounded-full p-1.5 shadow-2xl shadow-black/60">
        {items.map((item) => {
          const active = item.match === "/" ? pathname === "/" : pathname.startsWith(item.match);
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-label={item.label}
              className={`flex items-center gap-2 rounded-full px-4 h-11 text-sm font-semibold transition-all ${active ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
            >
              <Icon name={item.icon} size={18} strokeWidth={active ? 2.4 : 2} />
              {active && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// --- TOGGLE ---
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-[52px] h-8 shrink-0 rounded-full transition-colors duration-200 ${checked ? "bg-red-600" : "bg-zinc-700/80"}`}
    >
      <span className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}

// --- STATES ---
const SLOW_LOAD_MS = 10000;

export function LoadingScreen({ variant = "list" }: { variant?: "list" | "dashboard" }) {
  const goBack = useGoBack();
  const router = useRouter();
  const [slow, setSlow] = useState(false);

  // Never leave the user staring at a skeleton: after a while, offer a way out
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), SLOW_LOAD_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="min-h-screen px-5 max-w-2xl mx-auto" aria-busy="true">
      <div className="flex items-center justify-between mb-8">
        {variant === "dashboard" ? (
          <div className="skeleton h-10 w-32 !rounded-full" />
        ) : (
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="icon-btn shrink-0" aria-label="Back">
              <Icon name="back" />
            </button>
            <div className="skeleton h-6 w-36 !rounded-full" />
          </div>
        )}
        <div className="skeleton h-10 w-10 !rounded-full" />
      </div>
      {slow && (
        <div className="card p-5 mb-6 animate-rise-in" role="status">
          <p className="font-semibold">This is taking longer than usual</p>
          <p className="text-sm text-zinc-500 mt-1">Your connection may be slow. You can try again or head back.</p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button onClick={() => window.location.reload()} className="btn btn-light h-11 text-sm">Try Again</button>
            <button onClick={() => router.push("/")} className="btn btn-ghost h-11 text-sm">Go Home</button>
          </div>
        </div>
      )}
      {variant === "dashboard" && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="skeleton h-24" />
          <div className="skeleton h-24" />
          <div className="skeleton h-24" />
        </div>
      )}
      <div className="skeleton h-44 mb-6" />
      <div className="space-y-3">
        <div className="skeleton h-20" />
        <div className="skeleton h-20" />
        <div className="skeleton h-20" />
      </div>
    </main>
  );
}

export function ErrorScreen({ onRetry }: { onRetry?: () => void }) {
  const router = useRouter();
  return (
    <main className="min-h-screen px-5 max-w-md mx-auto flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-3xl bg-red-600/10 border border-red-600/20 text-red-400 flex items-center justify-center mb-5">
        <Icon name="close" size={26} />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Couldn&apos;t load this page</h1>
      <p className="text-zinc-500 mt-2">Check your connection and try again.</p>
      <div className="grid grid-cols-2 gap-2 w-full mt-8">
        <button onClick={onRetry ?? (() => window.location.reload())} className="btn btn-light h-12">Try Again</button>
        <button onClick={() => router.push("/")} className="btn btn-ghost h-12">Go Home</button>
      </div>
    </main>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card border-dashed !bg-transparent px-6 py-12 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-600/10 border border-red-600/20 text-red-500 flex items-center justify-center mb-4">
        <Icon name={icon} size={24} />
      </div>
      <h3 className="font-semibold text-zinc-200">{title}</h3>
      {text && <p className="text-sm text-zinc-500 mt-1 max-w-xs">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Avatar({ src, name, size = 44 }: { src?: string | null; name?: string | null; size?: number }) {
  return (
    <div
      className="rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-red-500 to-red-800 flex items-center justify-center font-bold text-white ring-2 ring-white/10"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {src ? <img src={src} alt={name || "avatar"} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : (name?.charAt(0) || "B").toUpperCase()}
    </div>
  );
}

// --- LOGIN ---
export function LoginScreen() {
  const login = async () => {
    const { auth, googleProvider } = await import("@/lib/firebase");
    const { signInWithPopup } = await import("firebase/auth");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  return (
    <main className="min-h-screen flex flex-col px-6 max-w-md mx-auto">
      <div className="flex-1 flex flex-col items-center justify-center text-center animate-rise-in">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-red-600/30 blur-3xl rounded-full" />
          <img src="/boga.png" alt="BOGA" className="relative w-36 h-36 object-contain" />
        </div>
        <h1 className="text-6xl font-black italic tracking-tighter text-gradient leading-none">BOGA</h1>
        <p className="eyebrow mt-4">Training Systems</p>
        <p className="text-zinc-400 mt-6 max-w-xs leading-relaxed">Plan your programs, track every set, and build a streak that keeps you coming back.</p>
      </div>
      <div className="pb-6 animate-rise-in" style={{ animationDelay: "120ms" }}>
        <button onClick={login} className="btn btn-light w-full h-14 text-base">
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
          Continue with Google
        </button>
        <p className="text-center text-xs text-zinc-600 mt-4">Your data syncs securely across devices.</p>
      </div>
    </main>
  );
}
