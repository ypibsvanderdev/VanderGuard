import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Shield, Lock, Key, CheckCircle2, XCircle, Clock, Infinity } from "lucide-react";
import { Link } from "react-router-dom";

export default function Locked() {
  const [user, setUser] = useState(null);
  const [key, setKey] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [msg, setMsg] = useState(null);
  const [planInfo, setPlanInfo] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        const res = await base44.functions.invoke("checkAccess", {});
        setPlanInfo(res.data);
        if (res.data.has_access) {
          window.location.href = createPageUrl("Dashboard");
        }
      } catch (_e) {}
    })();
  }, []);

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

  const expiredType = planInfo?.plan_type;

  return (
    <div className="min-h-screen bg-[#070712] text-gray-100 flex flex-col items-center justify-center px-6">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
          <Lock className="w-8 h-8 text-red-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Access Locked</h1>
        <p className="text-sm text-gray-500 mb-2">
          {expiredType === "trial"
            ? "Your 30-day free trial has expired."
            : expiredType === "monthly"
            ? "Your monthly subscription has expired."
            : "Your access has expired or been revoked."}
        </p>
        <p className="text-xs text-gray-600 mb-8">Enter a new key to restore access, or purchase one below.</p>

        {/* Redeem form */}
        <div className="bg-[#0d0d1f] border border-[#1a1a3e] rounded-2xl p-6 mb-4">
          <input
            value={key}
            onChange={e => setKey(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && handleRedeem()}
            placeholder="VH-XXXXXX-XXXXXX-XXXXXX"
            className="w-full bg-black/40 border border-[#1a1a3e] text-white font-mono text-sm rounded-lg px-3 py-2.5 outline-none focus:border-cyan-500/50 mb-3 placeholder:text-gray-700"
            autoFocus
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
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2.5 rounded-xl text-sm disabled:opacity-40 transition-all"
          >
            {redeeming ? "Activating..." : "Activate Key"}
          </button>
        </div>

        {/* Buy options */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-[#09091a] border border-[#1a1a3e] rounded-xl p-3 text-center">
            <Key className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
            <div className="text-sm font-semibold text-white">Monthly</div>
            <div className="text-xs text-gray-500">$5 / month</div>
          </div>
          <div className="bg-[#09091a] border border-cyan-500/20 rounded-xl p-3 text-center">
            <Infinity className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
            <div className="text-sm font-semibold text-white">Lifetime</div>
            <div className="text-xs text-gray-500">$50 one-time</div>
          </div>
        </div>

        <Link to={createPageUrl("Pricing")} className="block w-full text-center text-sm text-cyan-400 hover:underline mb-4">
          View Pricing & Purchase →
        </Link>

        <button
          onClick={() => base44.auth.logout(createPageUrl("Access"))}
          className="text-xs text-gray-600 hover:text-gray-400"
        >
          Logout
        </button>
      </div>
    </div>
  );
}