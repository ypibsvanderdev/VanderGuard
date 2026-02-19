import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Shield, CheckCircle2, XCircle, Key, Infinity, Calendar, CreditCard, Copy, Check, Clock, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

const MONTHLY_FEATURES = [
  "30 days full access",
  "All VSG protection features",
  "HWID + IP bound key",
  "GitHub-style repo manager",
  "Security logging dashboard",
  "Priority support",
];

const LIFETIME_FEATURES = [
  "Permanent access — never expires",
  "All VSG protection features",
  "HWID + IP bound key",
  "GitHub-style repo manager",
  "Security logging dashboard",
  "Premium obfuscation layers",
  "Dedicated support",
];

export default function Pricing() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("pricing"); // "pricing" | "redeem" | "success"
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [key, setKey] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [message, setMessage] = useState(null);
  const [copied, setCopied] = useState(false);
  const [newKey, setNewKey] = useState(null); // key from URL after Stripe redirect

  useEffect(() => {
    base44.auth.isAuthenticated().then(auth => {
      if (auth) base44.auth.me().then(setUser).catch(() => {});
    });

    // Check for success redirect with generated key
    const params = new URLSearchParams(window.location.search);
    if (params.get("purchase") === "success") {
      setTab("success");
      // Poll for the key that was generated for this user
      pollForKey();
    }
  }, []);

  const pollForKey = async () => {
    // Poll up to 10 times (webhook may take a few seconds)
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const me = await base44.auth.me();
        if (!me) break;
        // Find the latest unused key for this email
        const keys = await base44.entities.AccessKey.filter({ used_by_email: "" });
        // We can't directly filter unused keys by email since used_by_email is set on redeem
        // Instead fetch all unused active keys sorted by creation and find one created recently
        const allKeys = await base44.entities.AccessKey.list("-created_date", 5);
        const freshKey = allKeys.find(k =>
          !k.is_used &&
          k.is_active &&
          k.notes?.includes(me.email) &&
          new Date(k.created_date) > new Date(Date.now() - 5 * 60 * 1000)
        );
        if (freshKey) {
          setNewKey(freshKey.key_value);
          break;
        }
      } catch (_e) {}
    }
  };

  const handleCheckout = async (planType) => {
    if (!user) {
      base44.auth.redirectToLogin(createPageUrl("Pricing") + "?plan=" + planType);
      return;
    }

    // Check if running in iframe
    if (window.self !== window.top) {
      alert("Checkout only works from the published app. Please open the app in a new tab.");
      return;
    }

    setLoadingPlan(planType);
    try {
      const successUrl = window.location.origin + createPageUrl("Pricing") + "?purchase=success";
      const cancelUrl = window.location.origin + createPageUrl("Pricing");
      const res = await base44.functions.invoke("createCheckout", {
        plan_type: planType,
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
      if (res.data.url) {
        window.location.href = res.data.url;
      } else {
        setMessage({ type: "error", text: res.data.error || "Failed to create checkout session." });
      }
    } catch (_e) {
      setMessage({ type: "error", text: "Something went wrong. Try again." });
    }
    setLoadingPlan(null);
  };

  const handleRedeem = async () => {
    if (!key.trim() || isRedeeming) return;
    if (!user) {
      base44.auth.redirectToLogin(createPageUrl("Pricing"));
      return;
    }
    setIsRedeeming(true);
    setMessage(null);
    try {
      const hwid = btoa(`${navigator.userAgent}|${navigator.language}|${screen.width}x${screen.height}`).substring(0, 32);
      const res = await base44.functions.invoke("redeemKey", { key: key.trim().toUpperCase(), hwid });
      if (res.data.success) {
        setMessage({ type: "success", text: res.data.message + " Redirecting to dashboard..." });
        setTimeout(() => { window.location.href = createPageUrl("Dashboard"); }, 2000);
      } else {
        setMessage({ type: "error", text: res.data.error || "Invalid key." });
      }
    } catch (_e) {
      setMessage({ type: "error", text: "An error occurred. Please try again." });
    }
    setIsRedeeming(false);
  };

  const copyKey = () => {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#080b14] text-white overflow-x-hidden">
      <div className="fixed top-0 left-1/4 w-[600px] h-[400px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[300px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 px-6 h-14 flex items-center justify-between border-b border-white/5">
        <Link to={createPageUrl("Access")} className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-white">Vander Hub</span>
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <Link to={createPageUrl("Dashboard")} className="text-xs text-gray-400 hover:text-cyan-400 border border-white/10 px-3 py-1.5 rounded-lg">
              Dashboard →
            </Link>
          ) : (
            <button onClick={() => base44.auth.redirectToLogin(createPageUrl("Pricing"))} className="text-xs bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 px-3 py-1.5 rounded-lg">
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* Tab nav */}
      {tab !== "success" && (
        <div className="relative z-10 flex items-center justify-center pt-8 pb-2">
          <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setTab("pricing")}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "pricing" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
            >
              Plans & Pricing
            </button>
            <button
              onClick={() => setTab("redeem")}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "redeem" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
            >
              Redeem Key
            </button>
          </div>
        </div>
      )}

      {/* ── PRICING TAB ── */}
      {tab === "pricing" && (
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
            <p className="text-sm text-gray-400">Pay with Stripe. Key is generated instantly and shown to you after checkout.</p>
          </div>

          {message && (
            <div className={`flex items-center gap-2 text-sm mb-6 justify-center ${message.type === "error" ? "text-red-400" : "text-green-400"}`}>
              <XCircle className="w-4 h-4 shrink-0" />{message.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Monthly */}
            <div className="bg-[#0f1623] border border-white/10 rounded-2xl p-7 flex flex-col">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-orange-400" />
                </div>
                <span className="text-xl font-bold">Monthly</span>
              </div>
              <div className="flex items-end gap-1 mb-7">
                <span className="text-5xl font-bold">$5</span>
                <span className="text-gray-400 mb-1.5">/month</span>
              </div>
              <div className="space-y-2.5 flex-1 mb-8">
                {MONTHLY_FEATURES.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-gray-500 shrink-0" />{f}
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleCheckout("monthly")}
                disabled={loadingPlan === "monthly"}
                className="w-full bg-[#1a2133] hover:bg-[#1f2940] border border-white/10 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loadingPlan === "monthly"
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><CreditCard className="w-4 h-4" /> Buy Monthly — $5</>}
              </button>
            </div>

            {/* Lifetime */}
            <div className="bg-[#0f1623] border border-cyan-500/30 rounded-2xl p-7 flex flex-col relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-gradient-to-r from-cyan-400 to-blue-500 text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                BEST VALUE
              </div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                  <Infinity className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="text-xl font-bold">Lifetime</span>
              </div>
              <div className="flex items-end gap-1 mb-7">
                <span className="text-5xl font-bold">$50</span>
                <span className="text-gray-400 mb-1.5">one-time</span>
              </div>
              <div className="space-y-2.5 flex-1 mb-8">
                {LIFETIME_FEATURES.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />{f}
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleCheckout("lifetime")}
                disabled={loadingPlan === "lifetime"}
                className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loadingPlan === "lifetime"
                  ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  : <><CreditCard className="w-4 h-4" /> Buy Lifetime — $50</>}
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-gray-600 mt-6">
            Already have a key? <button onClick={() => setTab("redeem")} className="text-cyan-400 hover:underline">Redeem it here →</button>
          </p>
          <p className="text-center text-xs text-gray-700 mt-2">
            Free trial also available on the <Link to={createPageUrl("Access")} className="text-gray-500 hover:text-gray-300">Access page</Link>.
          </p>
        </div>
      )}

      {/* ── REDEEM TAB ── */}
      {tab === "redeem" && (
        <div className="relative z-10 max-w-md mx-auto px-6 py-16">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4">
              <Key className="w-7 h-7 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Redeem Your Key</h2>
            <p className="text-sm text-gray-400">Enter your access key to unlock VanderHub.</p>
          </div>

          <div className="bg-[#0f1623] border border-white/10 rounded-2xl p-6">
            {!user ? (
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-4">You need to be logged in to redeem a key.</p>
                <button onClick={() => base44.auth.redirectToLogin(createPageUrl("Pricing"))} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-2.5 rounded-xl text-sm">
                  Login to Redeem
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-4">Logged in as <span className="text-gray-300">{user.email}</span></p>
                <input
                  value={key}
                  onChange={e => setKey(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && handleRedeem()}
                  placeholder="VH-XXXXXX-XXXXXX-XXXXXX"
                  className="w-full bg-black/40 border border-white/10 text-white font-mono text-sm rounded-lg px-3 py-2.5 outline-none focus:border-cyan-500/50 mb-3 placeholder:text-gray-700"
                  autoFocus
                />
                {message && (
                  <div className={`flex items-center gap-2 text-xs mb-3 ${message.type === "success" ? "text-green-400" : "text-red-400"}`}>
                    {message.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                    {message.text}
                  </div>
                )}
                <button
                  onClick={handleRedeem}
                  disabled={!key.trim() || isRedeeming}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-40 transition-all"
                >
                  {isRedeeming ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : "Activate Key"}
                </button>
                <p className="text-xs text-gray-600 text-center mt-4">
                  Don't have a key? <button onClick={() => setTab("pricing")} className="text-cyan-400 hover:underline">Buy one →</button>
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── SUCCESS TAB ── */}
      {tab === "success" && (
        <div className="relative z-10 max-w-md mx-auto px-6 py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
          <p className="text-sm text-gray-400 mb-8">Your access key has been generated. Copy it below and redeem it to unlock VanderHub.</p>

          <div className="bg-[#0f1623] border border-green-500/20 rounded-2xl p-6 mb-5">
            {newKey ? (
              <>
                <p className="text-xs text-gray-500 mb-2">Your Access Key</p>
                <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-4 py-3 mb-4">
                  <span className="font-mono text-cyan-400 text-sm flex-1 select-all">{newKey}</span>
                  <button onClick={copyKey} className="text-gray-400 hover:text-white transition-colors">
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-600 mb-4">Save this key somewhere safe — it's shown only once here.</p>
                <button
                  onClick={() => { setKey(newKey); setTab("redeem"); }}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-2.5 rounded-xl text-sm"
                >
                  Redeem Key Now →
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Generating your key...</p>
                <p className="text-xs text-gray-600">This usually takes a few seconds.</p>
              </div>
            )}
          </div>

          <Link to={createPageUrl("Pricing") + "?tab=redeem"} className="text-xs text-gray-600 hover:text-gray-400">
            ← Back to pricing
          </Link>
        </div>
      )}
    </div>
  );
}