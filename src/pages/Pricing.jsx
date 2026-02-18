import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { CheckCircle2, CreditCard, Shield, Infinity, Calendar, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const MONTHLY_FEATURES = [
  "30 Days Access",
  "One-Time HWID Key",
  "Full Script Protection",
  "VanderHub Access",
  "Priority Support",
];

const LIFETIME_FEATURES = [
  "Permanent Access",
  "One-Time HWID Key",
  "Full Script Protection",
  "VanderHub Access",
  "Premium Obfuscation",
  "Exclusive Scripts",
  "Dedicated Support",
];

export default function Pricing() {
  const [user, setUser] = useState(null);
  const [key, setKey] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState("pricing"); // "pricing" | "redeem"

  useEffect(() => {
    base44.auth.isAuthenticated().then(auth => {
      if (auth) base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

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
      const res = await base44.functions.invoke("redeemKey", { key: key.trim(), hwid });
      if (res.data.success) {
        setMessage({ type: "success", text: res.data.message || "Access granted! Redirecting..." });
        setTimeout(() => { window.location.href = createPageUrl("Dashboard"); }, 1800);
      } else {
        setMessage({ type: "error", text: res.data.error || "Invalid key." });
      }
    } catch (_e) {
      setMessage({ type: "error", text: "An error occurred. Please try again." });
    }
    setIsRedeeming(false);
  };

  return (
    <div className="min-h-screen bg-[#080b14] text-white overflow-x-hidden">
      {/* Background glows */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[400px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[300px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 px-6 h-16 flex items-center justify-between border-b border-white/5">
        <Link to={createPageUrl("Home")} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-base">Vander Defender</span>
        </Link>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab("pricing")}
            className={`text-sm font-medium transition-colors ${activeTab === "pricing" ? "text-white" : "text-gray-400 hover:text-white"}`}
          >
            Pricing
          </button>
          {user ? (
            user.has_access ? (
              <Link to={createPageUrl("Dashboard")}>
                <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold border-0 px-5">
                  Launch App →
                </Button>
              </Link>
            ) : (
              <Button size="sm" onClick={() => setActiveTab("redeem")} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold border-0 px-5">
                Redeem Key →
              </Button>
            )
          ) : (
            <Button size="sm" onClick={() => base44.auth.redirectToLogin(createPageUrl("Pricing"))} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold border-0 px-5">
              Launch App →
            </Button>
          )}
        </div>
      </nav>

      {/* Tab Switcher */}
      <div className="relative z-10 flex items-center justify-center pt-8 pb-2">
        <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
          <button
            onClick={() => setActiveTab("pricing")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "pricing" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
          >
            Plans & Pricing
          </button>
          <button
            onClick={() => setActiveTab("redeem")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "redeem" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
          >
            Redeem Key
          </button>
        </div>
      </div>

      {activeTab === "pricing" && (
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-14">
          {/* Header */}
          <div className="text-center mb-12">
            <p className="text-sm text-gray-400 tracking-widest uppercase mb-3">One payment. One key. Full protection.</p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Monthly */}
            <div className="bg-[#0f1623] border border-white/10 rounded-2xl p-7 flex flex-col">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                  <Calendar className="w-4.5 h-4.5 text-orange-400" />
                </div>
                <span className="text-xl font-bold">Monthly</span>
              </div>

              <div className="flex items-end gap-1 mb-7">
                <span className="text-4xl font-bold text-white">$<span className="text-6xl">5</span></span>
                <span className="text-gray-400 mb-2">/month</span>
              </div>

              <div className="space-y-3 flex-1 mb-8">
                {MONTHLY_FEATURES.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-gray-500 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>

              <button
                onClick={() => setActiveTab("redeem")}
                className="w-full bg-[#1a2133] hover:bg-[#1f2940] border border-white/10 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <CreditCard className="w-4 h-4" /> Purchase Monthly
              </button>
            </div>

            {/* Lifetime */}
            <div className="bg-[#0f1623] border border-cyan-500/30 rounded-2xl p-7 flex flex-col relative overflow-hidden">
              {/* Best Value badge */}
              <div className="absolute top-4 right-4 bg-gradient-to-r from-cyan-400 to-blue-500 text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                BEST VALUE
              </div>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                  <Infinity className="w-4.5 h-4.5 text-cyan-400" />
                </div>
                <span className="text-xl font-bold">Lifetime</span>
              </div>

              <div className="flex items-end gap-1 mb-7">
                <span className="text-4xl font-bold text-white">$<span className="text-6xl">50</span></span>
                <span className="text-gray-400 mb-2">one-time</span>
              </div>

              <div className="space-y-3 flex-1 mb-8">
                {LIFETIME_FEATURES.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>

              <button
                onClick={() => setActiveTab("redeem")}
                className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <CreditCard className="w-4 h-4" /> Purchase Lifetime
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-gray-600 mt-8">
            Keys are provided by the platform admin. Contact them to purchase access.
          </p>
        </div>
      )}

      {activeTab === "redeem" && (
        <div className="relative z-10 max-w-md mx-auto px-6 py-20">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Redeem Your Key</h2>
            <p className="text-sm text-gray-400">Enter your access key below to unlock VanderHub.</p>
          </div>

          <div className="bg-[#0f1623] border border-white/10 rounded-2xl p-6">
            {!user ? (
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-4">You need to be logged in to redeem a key.</p>
                <Button
                  onClick={() => base44.auth.redirectToLogin(createPageUrl("Pricing"))}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold border-0 w-full"
                >
                  Login to Redeem
                </Button>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-1">Logged in as <span className="text-gray-300">{user.email}</span></p>
                <div className="mb-4 mt-3">
                  <Input
                    value={key}
                    onChange={e => setKey(e.target.value.toUpperCase())}
                    placeholder="VH-XXXXXX-XXXXXX-XXXXXX"
                    className="bg-black/40 border-white/10 text-white font-mono text-sm placeholder:text-gray-700"
                    onKeyDown={e => e.key === "Enter" && handleRedeem()}
                    autoFocus
                  />
                </div>

                {message && (
                  <div className={`flex items-center gap-2 text-xs mb-4 ${message.type === "success" ? "text-green-400" : "text-red-400"}`}>
                    {message.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                    {message.text}
                  </div>
                )}

                <Button
                  onClick={handleRedeem}
                  disabled={!key.trim() || isRedeeming}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold border-0 py-3 h-auto"
                >
                  {isRedeeming
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : "Activate Key"}
                </Button>

                <p className="text-xs text-gray-600 text-center mt-4">
                  Don't have a key? <button onClick={() => setActiveTab("pricing")} className="text-cyan-400 hover:underline">View plans →</button>
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}