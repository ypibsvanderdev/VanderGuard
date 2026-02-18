import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, CheckCircle, XCircle } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function Activate() {
  const [status, setStatus] = useState("checking"); // checking | activating | done | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const key = params.get("key");
      if (!key) { setStatus("error"); setMessage("No key provided."); return; }

      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        base44.auth.redirectToLogin(createPageUrl("Activate") + "?key=" + encodeURIComponent(key));
        return;
      }

      setStatus("activating");
      const res = await base44.functions.invoke("activateKey", { key });
      if (res.data?.success) {
        setStatus("done");
        setTimeout(() => { window.location.href = createPageUrl("Dashboard"); }, 2000);
      } else {
        setStatus("error");
        setMessage(res.data?.error || "Activation failed.");
      }
    };
    run();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-center space-y-4">
        {status === "checking" || status === "activating" ? (
          <>
            <Shield className="w-12 h-12 text-cyan-400 animate-pulse mx-auto" />
            <p className="text-cyan-400 font-mono">{status === "checking" ? "Checking auth..." : "Activating key..."}</p>
          </>
        ) : status === "done" ? (
          <>
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
            <p className="text-green-400 font-mono">Access granted. Redirecting...</p>
          </>
        ) : (
          <>
            <XCircle className="w-12 h-12 text-red-400 mx-auto" />
            <p className="text-red-400 font-mono">{message}</p>
            <a href={createPageUrl("Home")} className="text-cyan-400 text-sm font-mono underline">Go back</a>
          </>
        )}
      </div>
    </div>
  );
}