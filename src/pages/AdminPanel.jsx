import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield, Key, Users, Plus, Copy, Trash2, LogOut, CheckCircle, Lock, Eye, EyeOff } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

const ADMIN_USERNAME = "ypibs";
const ADMIN_PASSWORD = "Eman165*";

function generateKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `VH-${seg(6)}-${seg(6)}-${seg(6)}`;
}

export default function AdminPanel() {
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [keyType, setKeyType] = useState("monthly");
  const [copied, setCopied] = useState("");
  const [tab, setTab] = useState("keys");
  const queryClient = useQueryClient();

  // Also check if real app user is admin
  const [appUser, setAppUser] = useState(null);
  useEffect(() => {
    base44.auth.me().then(setAppUser).catch(() => {});
  }, []);

  const handleLogin = () => {
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setAuthed(true);
      setLoginError("");
    } else {
      setLoginError("Invalid username or password.");
    }
  };

  const { data: keys = [] } = useQuery({
    queryKey: ["admin-keys"],
    queryFn: () => base44.entities.AccessKey.list("-created_date", 200),
    enabled: authed
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => base44.entities.User.list("-created_date", 200),
    enabled: authed && tab === "users"
  });

  const createKeyMutation = useMutation({
    mutationFn: (data) => base44.entities.AccessKey.create(data),
    onSuccess: () => queryClient.invalidateQueries(["admin-keys"])
  });

  const deleteKeyMutation = useMutation({
    mutationFn: (id) => base44.entities.AccessKey.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["admin-keys"])
  });

  const handleGenerate = () => {
    const kv = generateKey();
    createKeyMutation.mutate({
      key_value: kv,
      key_type: keyType,
      is_used: false,
      is_active: true,
      expires_at: keyType === "monthly" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
    });
  };

  const handleCopy = (v) => {
    navigator.clipboard.writeText(v);
    setCopied(v);
    setTimeout(() => setCopied(""), 2000);
  };

  const planLabel = (u) => {
    if (!u) return "—";
    if (u.has_access) {
      if (u.plan_type === "lifetime") return "💎 Lifetime ($50)";
      if (u.plan_type === "monthly") return "🔵 Monthly ($5/mo)";
    }
    if (u.plan_type === "trial") {
      if (u.trial_expires) {
        const days = Math.max(0, Math.ceil((new Date(u.trial_expires) - new Date()) / 86400000));
        return days > 0 ? `🟡 Trial (${days}d left)` : "🔴 Trial Expired";
      }
      return "🟡 Trial";
    }
    return "—";
  };

  if (!authed) return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-8 w-full max-w-sm mx-4">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-6 h-6 text-[#58a6ff]" />
          <span className="font-bold text-white text-lg">VanderHub Admin</span>
        </div>
        <label className="text-xs text-gray-400 block mb-1">Username</label>
        <Input
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Username"
          className="bg-[#0d1117] border-[#30363d] text-white mb-3"
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          autoFocus
        />
        <label className="text-xs text-gray-400 block mb-1">Password</label>
        <div className="relative mb-4">
          <Input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            className="bg-[#0d1117] border-[#30363d] text-white pr-10"
            onKeyDown={e => e.key === "Enter" && handleLogin()}
          />
          <button onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {loginError && <p className="text-xs text-red-400 mb-3">{loginError}</p>}
        <Button onClick={handleLogin} className="w-full bg-[#238636] hover:bg-[#2ea043] text-white font-semibold">
          Sign In
        </Button>
        <div className="mt-4 text-center">
          <Link to={createPageUrl("Dashboard")} className="text-xs text-gray-600 hover:text-[#58a6ff]">← Back to Dashboard</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      {/* Header */}
      <header className="bg-[#161b22] border-b border-[#30363d] px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-[#58a6ff]" />
          <span className="font-bold text-white">VanderHub Admin Panel</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("Dashboard")} className="text-xs text-gray-500 hover:text-[#58a6ff]">← Dashboard</Link>
          <button onClick={() => setAuthed(false)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#30363d] mb-6">
          {[
            { id: "keys", label: "Access Keys", icon: <Key className="w-3.5 h-3.5" /> },
            { id: "users", label: "Users & Plans", icon: <Users className="w-3.5 h-3.5" /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all ${tab === t.id ? "border-b-2 border-[#f78166] text-white -mb-px" : "text-gray-500 hover:text-[#c9d1d9]"}`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {tab === "keys" && (
          <div className="space-y-5">
            {/* Generate */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-3">Generate New Key</h2>
              <div className="flex flex-wrap gap-3 items-center">
                {["monthly", "lifetime"].map(t => (
                  <button
                    key={t}
                    onClick={() => setKeyType(t)}
                    className={`px-4 py-2 rounded-lg text-sm font-mono border transition-all ${keyType === t ? "bg-[#238636] border-[#2ea043] text-white" : "bg-[#0d1117] border-[#30363d] text-gray-400 hover:border-gray-500"}`}
                  >
                    {t === "monthly" ? "Monthly — $5/mo" : "Lifetime — $50"}
                  </button>
                ))}
                <Button onClick={handleGenerate} disabled={createKeyMutation.isPending} className="bg-[#58a6ff] hover:bg-[#388bfd] text-black font-semibold gap-2">
                  <Plus className="w-4 h-4" /> Generate
                </Button>
              </div>
            </div>

            {/* Keys table */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#30363d] text-xs text-gray-500 font-semibold">
                Access Keys ({keys.length})
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#21262d]">
                      {["Key", "Type", "Status", "Used By", "Expires", "Actions"].map(h => (
                        <th key={h} className="text-left px-4 py-2 text-xs text-gray-600 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map(k => (
                      <tr key={k.id} className="border-b border-[#21262d] hover:bg-[#0d1117]">
                        <td className="px-4 py-2.5 font-mono text-xs text-[#58a6ff]">{k.key_value}</td>
                        <td className="px-4 py-2.5">
                          <Badge className={k.key_type === "lifetime" ? "bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px]" : "bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]"}>
                            {k.key_type === "lifetime" ? "💎 Lifetime" : "🔵 Monthly"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge className={k.is_used ? "bg-red-500/20 text-red-400 border-red-500/30 text-[10px]" : "bg-green-500/20 text-green-400 border-green-500/30 text-[10px]"}>
                            {k.is_used ? "Used" : "Available"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">{k.used_by_email || "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{k.expires_at ? new Date(k.expires_at).toLocaleDateString() : "Never"}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1">
                            <button onClick={() => handleCopy(k.key_value)} className="p-1.5 text-gray-500 hover:text-[#58a6ff]" title="Copy">
                              {copied === k.key_value ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => deleteKeyMutation.mutate(k.id)} className="p-1.5 text-gray-500 hover:text-red-400" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {keys.length === 0 && <div className="text-center py-8 text-gray-600 text-sm">No keys yet.</div>}
              </div>
            </div>
          </div>
        )}

        {tab === "users" && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#30363d] text-xs text-gray-500 font-semibold">
              Users & Plans ({allUsers.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#21262d]">
                    {["Email", "Plan", "Trial Expires", "Access Expires", "HWID Bound"].map(h => (
                      <th key={h} className="text-left px-4 py-2 text-xs text-gray-600 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map(u => (
                    <tr key={u.id} className="border-b border-[#21262d] hover:bg-[#0d1117]">
                      <td className="px-4 py-2.5 text-xs text-[#c9d1d9] font-mono">{u.email}</td>
                      <td className="px-4 py-2.5 text-xs">{planLabel(u)}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{u.trial_expires ? new Date(u.trial_expires).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{u.access_expires ? new Date(u.access_expires).toLocaleDateString() : u.plan_type === "lifetime" ? "Never" : "—"}</td>
                      <td className="px-4 py-2.5 text-xs">{u.hwid ? <span className="text-green-400 flex items-center gap-1"><Lock className="w-3 h-3" />Yes</span> : <span className="text-gray-600">No</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allUsers.length === 0 && <div className="text-center py-8 text-gray-600 text-sm">No users yet.</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}