import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Lock, Zap, Eye, EyeOff, ChevronRight, AlertTriangle } from "lucide-react";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function Home() {
  const [tab, setTab] = useState("login"); // login | signup
  const [keyInput, setKeyInput] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [keyValid, setKeyValid] = useState(null);
  const [keyType, setKeyType] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then(auth => {
      if (auth) window.location.href = createPageUrl("Dashboard");
    });
  }, []);

  const handleValidateKey = async () => {
    if (!keyInput.trim()) return;
    setLoading(true);
    setError("");
    const res = await base44.functions.invoke("validateKey", { key: keyInput.trim() });
    setLoading(false);
    if (res.data?.valid) {
      setKeyValid(true);
      setKeyType(res.data.key_type);
    } else {
      setKeyValid(false);
      setError(res.data?.error || "Invalid key");
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!keyValid) { setError("Validate your access key first"); return; }
    setLoading(true);
    setError("");
    // Redirect to base44 login with account creation context
    base44.auth.redirectToLogin(createPageUrl("Activate") + "?key=" + encodeURIComponent(keyInput.trim()));
  };

  const handleLogin = (e) => {
    e.preventDefault();
    base44.auth.redirectToLogin(createPageUrl("Dashboard"));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 mb-4 shadow-lg shadow-cyan-500/20">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Vander<span className="text-cyan-400">Hub</span></h1>
          <p className="text-gray-500 text-sm mt-1 font-mono">Zero-Browser Source Protection</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-1 rounded font-mono flex items-center gap-1">
              <Shield className="w-3 h-3" /> VSG v4.2 Active
            </span>
            <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded font-mono flex items-center gap-1">
              <Zap className="w-3 h-3" /> Multi-Layer Enc
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#0d0d14] border border-[#1e2433] rounded-2xl p-6 shadow-2xl">
          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-[#0a0a0f] rounded-lg p-1">
            {["login", "signup"].map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); setKeyValid(null); }}
                className={`flex-1 py-2 rounded-md text-sm font-mono transition-all ${tab === t ? "bg-cyan-600 text-white" : "text-gray-500 hover:text-gray-300"}`}
              >
                {t === "login" ? "Login" : "Get Access"}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm font-mono">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <p className="text-gray-400 text-sm font-mono text-center">Login with your registered account</p>
              <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 font-mono gap-2">
                Continue to Login <ChevronRight className="w-4 h-4" />
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-400 text-sm font-mono">Enter your access key to register</p>
              <div className="relative">
                <Input
                  value={keyInput}
                  onChange={e => { setKeyInput(e.target.value); setKeyValid(null); }}
                  type={showKey ? "text" : "password"}
                  placeholder="VANDER-XXXX-XXXX-XXXX"
                  className="bg-[#0a0a0f] border-[#1e2433] text-white font-mono pr-10"
                />
                <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {keyValid === false && <p className="text-red-400 text-xs font-mono">✗ {error}</p>}
              {keyValid === true && <p className="text-green-400 text-xs font-mono">✓ Key valid — {keyType === "lifetime" ? "Lifetime Access" : "Monthly Access"}</p>}
              <Button onClick={handleValidateKey} disabled={loading || !keyInput} variant="outline" className="w-full border-[#1e2433] text-gray-300 font-mono hover:border-cyan-500/50 hover:text-cyan-400">
                {loading ? "Validating..." : "Validate Key"}
              </Button>
              {keyValid && (
                <Button onClick={handleSignup} disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-500 font-mono gap-2">
                  Continue to Register <ChevronRight className="w-4 h-4" />
                </Button>
              )}
              <div className="pt-4 border-t border-[#1e2433] grid grid-cols-2 gap-3 text-center text-xs text-gray-500 font-mono">
                <div className="bg-[#0a0a0f] rounded-lg p-3">
                  <div className="text-cyan-400 text-base font-bold">$5</div>
                  <div>Monthly</div>
                </div>
                <div className="bg-[#0a0a0f] rounded-lg p-3 border border-cyan-500/20">
                  <div className="text-cyan-400 text-base font-bold">$50</div>
                  <div>Lifetime ✦</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-gray-600 text-xs font-mono mt-4">
          Protected by Vander Secure Gate • All fetches monitored
        </p>
      </motion.div>
    </div>
  );
}