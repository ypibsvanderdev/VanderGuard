import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Shield, CheckCircle2, XCircle, Zap, Lock, GitBranch, Activity, Clock, Key, ChevronRight, Infinity } from "lucide-react";
import { Link } from "react-router-dom";

const FEATURES = [
  { icon: Shield, title: "VSG v4.2 Protection", desc: "Multi-layer browser fingerprinting. Decoy scripts served to every unauthorized client.", color: "cyan" },
  { icon: Lock, title: "Zero Browser Access", desc: "Scripts are 100% inaccessible from any browser — only valid executors receive real payloads.", color: "blue" },
  { icon: Zap, title: "Honeypot Traps", desc: "Reverse engineers receive rotating fake scripts, wasting months of analysis time.", color: "yellow" },
  { icon: GitBranch, title: "GitHub-style Repos", desc: "Manage all your Lua scripts in a clean, professional file browser.", color: "purple" },
  { icon: Activity, title: "Security Logging", desc: "Every unauthorized access attempt logged with full headers and timestamps.", color: "red" },
  { icon: Key, title: "Key-Based Access", desc: "$5/month or $200 lifetime. HWID + IP bound keys, cryptographically verified.", color: "green" },
];

const COLOR_MAP = {
  cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20" },
  blue: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  yellow: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  green: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20" },
  red: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
};

export default function Access() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);
  const [msg, setMsg] = useState(null);
  const [accessInfo, setAccessInfo] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) { setLoading(false); return; }
        const me = await base44.auth.me();
        setUser(me);
        // Check access status
        const res = await base44.functions.invoke("checkAccess", {});
        setAccessInfo(res.data);
        if (res.data.has_access) {
          window.location.href = createPageUrl("Dashboard");
          return;
        }
      } catch (_e) {}
      setLoading(false);
    })();
  }, []);

  const handleStartTrial = async () => {
    setStartingTrial(true);
    setMsg(null);
    try {
      const res = await base44.functions.invoke("startTrial", {});
      if (res.data.success) {
        setMsg({ type: "success", text: "30-day free trial activated! Redirecting..." });
        setTimeout(() => { window.location.href = createPageUrl("Dashboard"); }, 1500);
      } else {
        setMsg({ type: "error", text: res.data.error });
      }
    } catch (_e) {
      setMsg({ type: "error", text: "Something went wrong. Try again." });
    }
    setStartingTrial(false);
  };

  const handleRedeem = async () => {
    if (!key.trim()) return;
    setRedeeming(true);
    setMsg(null);
    try {
      const hwid = btoa(`${navigator.userAgent}|${screen.width}x${screen.height}|${navigator.language}`).substring(0, 32);
      const res = await base44.functions.invoke("redeemKey", { key: key.trim().toUpperCase(), hwid });
      if (res.data.success) {
        setMsg({ type: "success", text: res.data.message + " Redirecting..." });
        setTimeout(() => { window.location.href = createPageUrl("Dashboard"); }, 1500);
      } else {
        setMsg({ type: "error", text: res.data.error });
      }
    } catch (_e) {
      setMsg({ type: "error", text: "Something went wrong. Try again." });
    }
    setRedeeming(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070712] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070712] text-gray-100 overflow-x-hidden">
      {/* Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 border-b border-[#1a1a3e] bg-[#070712]/80 backdrop-blur-sm px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-white">Vander Hub</span>
          <span className="hidden sm:inline text-[10px] text-cyan-400 font-mono bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded-full">VSG v4.2</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("Pricing")} className="text-xs text-gray-400 hover:text-cyan-400">Pricing</Link>
          {user ? (
            <button onClick={() => base44.auth.logout(createPageUrl("Access"))} className="text-xs text-gray-500 hover:text-red-400 border border-[#1a1a3e] px-3 py-1.5 rounded-lg">
              Logout
            </button>
          ) : (
            <button onClick={() => base44.auth.redirectToLogin(createPageUrl("Access"))} className="text-xs bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 px-3 py-1.5 rounded-lg">
              Sign In / Sign Up
            </button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-green-500/5 border border-green-500/20 rounded-full px-4 py-1.5 text-xs text-green-400 mb-8">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          VSG v4.2 — All Protection Layers Active
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold mb-5 leading-tight">
          <span className="bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
            The Most Secure<br />Script Platform
          </span>
        </h1>
        <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
          Host and distribute Roblox Lua scripts with multi-layer protection. Zero browser access.
          Rotating honeypot traps. HWID + IP binding on every key.
        </p>

        {/* Action Cards */}
        {!user ? (
          /* Not logged in — show sign in CTA */
          <div className="max-w-sm mx-auto">
            <button
              onClick={() => base44.auth.redirectToLogin(createPageUrl("Access"))}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
            >
              Sign In / Create Account <ChevronRight className="w-4 h-4" />
            </button>
            <p className="text-xs text-gray-600 mt-3">Free 30-day trial available after sign up</p>
          </div>
        ) : (
          /* Logged in — show access options */
          <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Free Trial Card */}
            <div className="bg-[#0d0d1f] border border-[#1a1a3e] rounded-2xl p-6 text-left flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-yellow-400" />
                </div>
                <span className="font-semibold text-white">Free Trial</span>
              </div>
              <p className="text-xs text-gray-500 mb-1 flex-1">30 days of full access. No key required. One-time per account.</p>
              <ul className="space-y-1 mb-5 mt-2">
                {["30 days full access", "All features included", "One-time use"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-gray-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-yellow-400 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              {accessInfo?.trial_used ? (
                <div className="text-xs text-gray-600 border border-[#1a1a3e] rounded-lg py-2 text-center">Trial already used</div>
              ) : (
                <button
                  onClick={handleStartTrial}
                  disabled={startingTrial}
                  className="w-full bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 font-semibold text-sm py-2.5 rounded-xl transition-all disabled:opacity-40"
                >
                  {startingTrial ? "Activating..." : "Start Free Trial"}
                </button>
              )}
            </div>

            {/* Key Redeem Card */}
            <div className="bg-[#0d0d1f] border border-cyan-500/20 rounded-2xl p-6 text-left flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <Key className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="font-semibold text-white">Redeem Key</span>
              </div>
              <p className="text-xs text-gray-500 mb-3 flex-1">Have an access key? Enter it below to unlock the platform.</p>
              <input
                value={key}
                onChange={e => setKey(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && handleRedeem()}
                placeholder="VH-XXXXXX-XXXXXX-XXXXXX"
                className="w-full bg-black/40 border border-[#1a1a3e] text-white font-mono text-xs rounded-lg px-3 py-2 outline-none focus:border-cyan-500/50 mb-3 placeholder:text-gray-700"
              />
              {msg && (
                <div className={`flex items-center gap-2 text-xs mb-3 ${msg.type === "success" ? "text-green-400" : "text-red-400"}`}>
                  {msg.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                  {msg.text}
                </div>
              )}
              <button
                onClick={handleRedeem}
                disabled={!key.trim() || redeeming}
                className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-semibold text-sm py-2.5 rounded-xl transition-all disabled:opacity-40"
              >
                {redeeming ? "Activating..." : "Activate Key"}
              </button>
              <Link to={createPageUrl("Pricing")} className="text-center text-[11px] text-gray-600 hover:text-cyan-400 mt-3">
                Buy a key → $5/mo · $200 lifetime
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Pricing preview */}
      {!user && (
        <div className="relative z-10 max-w-2xl mx-auto px-6 pb-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            <div className="bg-[#09091a] border border-[#1a1a3e] rounded-xl p-4">
              <Clock className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
              <div className="text-sm font-semibold text-white mb-1">Free Trial</div>
              <div className="text-xs text-gray-500">30 days free</div>
            </div>
            <div className="bg-[#09091a] border border-[#1a1a3e] rounded-xl p-4">
              <Key className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
              <div className="text-sm font-semibold text-white mb-1">Monthly</div>
              <div className="text-xs text-gray-500">$5 / month</div>
            </div>
            <div className="bg-[#09091a] border border-cyan-500/20 rounded-xl p-4">
              <Infinity className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
              <div className="text-sm font-semibold text-white mb-1">Lifetime</div>
              <div className="text-xs text-gray-500">$200 one-time</div>
            </div>
          </div>
        </div>
      )}

      {/* Features */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-8">
          <div className="text-xs text-gray-600 uppercase tracking-widest font-medium">Platform Features</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => {
            const c = COLOR_MAP[f.color];
            return (
              <div key={i} className="bg-[#09091a] border border-[#1a1a3e] rounded-xl p-5 hover:border-cyan-500/20 transition-all hover:-translate-y-0.5">
                <div className={`w-8 h-8 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center mb-3`}>
                  <f.icon className={`w-4 h-4 ${c.text}`} />
                </div>
                <div className="font-semibold text-sm text-white mb-1.5">{f.title}</div>
                <div className="text-xs text-gray-500 leading-relaxed">{f.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}