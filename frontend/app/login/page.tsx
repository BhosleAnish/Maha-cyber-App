"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { ShieldAlert, Loader2, Mail, Lock, KeyRound, User, BadgeCheck } from "lucide-react";

const API = "/backend/api/auth";

type Mode = "login" | "register" | "otp";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [badge, setBadge] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [emailHint, setEmailHint] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const post = async (path: string, body: object) => {
    const res = await fetch(`${API}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Request failed");
    return data;
  };

  const run = async (fn: () => Promise<void>) => {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  const submitLogin = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const data = await post("login", { email, password });
      setChallengeId(data.challenge_id);
      setEmailHint(data.email_hint);
      setPassword("");
      setOtp("");
      setMode("otp");
    });
  };

  const submitRegister = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await post("register", { name, badge_number: badge, email, password });
      setPassword("");
      setMode("login");
      setInfo("Account created. Sign in to continue.");
    });
  };

  const submitOtp = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const res = await signIn("credentials", { challengeId, otp, redirect: false });
      if (!res || res.error) throw new Error("Incorrect or expired code. Please sign in again.");
      window.location.href = "/";
    });
  };

  const field =
    "w-full pl-10 pr-3 py-2.5 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-blue-400";
  const icon = "absolute left-3 top-3 w-4 h-4 text-slate-500";
  const button =
    "w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-semibold flex items-center justify-center gap-2";

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <ShieldAlert className="text-blue-400" size={32} />
          <div>
            <h1 className="font-bold text-lg leading-tight">Maha Cyber</h1>
            <p className="text-xs text-slate-400">Officer Portal</p>
          </div>
        </div>

        {error && <div className="mb-4 p-3 text-sm rounded-lg bg-red-950 text-red-300 border border-red-900">{error}</div>}
        {info && <div className="mb-4 p-3 text-sm rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-900">{info}</div>}

        {mode === "login" && (
          <form onSubmit={submitLogin} className="space-y-3">
            <h2 className="font-semibold mb-1">Sign in</h2>
            <div className="relative"><Mail className={icon} />
              <input className={field} type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="relative"><Lock className={icon} />
              <input className={field} type="password" required autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button className={button} disabled={loading}>{loading && <Loader2 className="w-4 h-4 animate-spin" />} Continue</button>
            <p className="text-xs text-slate-400 text-center pt-2">
              New officer?{" "}
              <button type="button" className="text-blue-400 hover:underline" onClick={() => { setError(""); setInfo(""); setMode("register"); }}>Create account</button>
            </p>
          </form>
        )}

        {mode === "register" && (
          <form onSubmit={submitRegister} className="space-y-3">
            <h2 className="font-semibold mb-1">Create account</h2>
            <div className="relative"><User className={icon} />
              <input className={field} required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="relative"><BadgeCheck className={icon} />
              <input className={field} required placeholder="Badge number" value={badge} onChange={(e) => setBadge(e.target.value)} />
            </div>
            <div className="relative"><Mail className={icon} />
              <input className={field} type="email" required autoComplete="email" placeholder="Official email (receives login codes)" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="relative"><Lock className={icon} />
              <input className={field} type="password" required minLength={10} autoComplete="new-password" placeholder="Password (min 10 characters)" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button className={button} disabled={loading}>{loading && <Loader2 className="w-4 h-4 animate-spin" />} Create account</button>
            <p className="text-xs text-slate-400 text-center pt-2">
              Already registered?{" "}
              <button type="button" className="text-blue-400 hover:underline" onClick={() => { setError(""); setMode("login"); }}>Sign in</button>
            </p>
          </form>
        )}

        {mode === "otp" && (
          <form onSubmit={submitOtp} className="space-y-3">
            <h2 className="font-semibold mb-1">Verify it&apos;s you</h2>
            <p className="text-xs text-slate-400">Enter the 6-digit code we emailed to {emailHint}. It expires in 5 minutes.</p>
            <div className="relative"><KeyRound className={icon} />
              <input className={`${field} tracking-[0.4em] text-center`} required inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} placeholder="••••••" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} autoFocus />
            </div>
            <button className={button} disabled={loading || otp.length !== 6}>{loading && <Loader2 className="w-4 h-4 animate-spin" />} Verify &amp; sign in</button>
            <p className="text-xs text-slate-400 text-center pt-2">
              <button type="button" className="text-blue-400 hover:underline" onClick={() => { setError(""); setMode("login"); }}>Back to sign in</button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
