import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Plus, Copy, Trash2, Key, LogOut, Users, CheckCircle, Clock, Crown, RefreshCw } from "lucide-react";

const ADMIN_USER = "ypibs";
const ADMIN_PASS = "Eman165*";

function generateKeyValue(type) {
  const seg = () => Math.random().toString(36).substring(2, 8).toUpperCase();
  return `VH-${type === "lifetime" ? "LT" : "MO"}-${seg()}-${seg()}`;
}

export default function AdminPanel() {
  const [authed, setAuthed] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [user, setUser] = useState(null);
  const [keyType, setKeyType] = useState("monthly");
  const [copied, setCopied] = useState("");
  const [tab, setTab] = useState("keys");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u || u.role !== "admin") {
        window.location.href = createPageUrl("Dashboard");
        return;
      }
      setUser(u);
    }).catch(() => base44.auth.redirectToLogin(createPageUrl("AdminPanel")));
  }, []);

  const { data: keys = [] } = useQuery({
    queryKey: ["admin-keys"],
    queryFn: () => base44.entities.AccessKey.list("-created_date"),
    enabled: !!user && authed
  });

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => base44.entities.User.list("-created_date", 100),
    enabled: !!user && authed && tab === "users"
  });

  const createKeyMutation = useMutation({
    mutationFn: (data) => base44.entities.AccessKey.create(data),
    onSuccess: () => queryClient.invalidateQueries(["admin-keys"])
  });

  const deleteKeyMutation = useMutation({
    mutationFn: (id) => base44.entities.AccessKey.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["admin-keys"])
  });

  const handleLogin = () => {
    if (loginUser === ADMIN_USER && loginPass === ADMIN_PASS) {
      setAuthed(true);
      setLoginError("");
    } else {
      setLoginError("Invalid credentials");
    }
  };

  const handleGenerate = () => {
    const newKey = generateKeyValue(keyType);
    createKeyMutation.mutate({
      key_value: newKey,
      key_type: keyType,
      is_used: false,
      is_active: true,
      expires_at: keyType === "monthly" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null
    });
  };

  const handleCopy = (val) => {
    navigator.clipboard.writeText(val);
    setCopied(val);
    setTimeout(() => setCopied(""), 2000);
  };

  const getPlanBadge = (u) => {
    if (!u.plan_type) return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">No plan</Badge>;
    if (u.plan_type === "lifetime") return <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">Lifetime $50</Badge>;
    if (u.plan_type === "monthly") return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">Monthly $5/mo</Badge>;
    if (u.plan_type === "trial") {
      const daysLeft = u.trial_expires ? Math.max(0, Math.ceil((new Date(u.trial_expires) - new Date()) / (1000 * 60 * 60 * 24))) : 0;
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">Trial ({daysLeft}d left)</Badge>;
    }
    return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">{u.plan_type}</Badge>;
  };

  if (!user) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!authed) return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="w-full max-w-sm bg-[#161b22] border border-[#21262d] rounded-xl p-8 shadow-2xl">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Shield className="w-6 h-6 text-cyan-400" />
          <span className="font-bold text-white text-lg">Admin Access</span>
        </div>
        <div className="space-y-3">
          <Input
            value={loginUser}
            onChange={e => setLoginUser(e.target.value)}
            placeholder="Username"
            className="bg-[#0d1117] border-[#30363d] text-white focus-visible:ring-0"
          />
          <Input
            type="password"
            value={loginPass}
            onChange={e => setLoginPass(e.target.value)}
            placeholder="Password"
            className="bg-[#0d1117] border-[#30363d] text-white focus-visible:ring-0"
            onKeyDown={e => e.key === "Enter" && handleLogin()}
          />
          {loginError && <p className="text-red-400 text-xs">{loginError}</p>}
          <Button onClick={handleLogin} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white">Login</Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-200">
      <header className="border-b border-[#21262d] bg-[#161b22] px-6 h-14 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-cyan-400" />
          <span className="font-bold text-white font-mono">VanderHub Admin</span>
        </div>
        <div className="flex gap-3">
          <a href={createPageUrl("Dashboard")} className="text-sm text-gray-400 hover:text-cyan-400">← Dashboard</a>
          <Button variant="ghost" size="sm" onClick={() => base44.auth.logout(createPageUrl("Home"))} className="text-gray-400 hover:text-red-400 gap-1 text-xs">
            <LogOut className="w-3.5 h-3.5" /> Logout
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 border border-[#21262d] rounded-lg p-1 bg-[#161b22] w-fit">
          <button onClick={() => setTab("keys")} className={`px-4 py-1.5 rounded-md text-sm font-mono transition-all flex items-center gap-1.5 ${tab === "keys" ? "bg-cyan-600 text-white" : "text-gray-400 hover:text-white"}`}>
            <Key className="w-3.5 h-3.5" /> Keys
          </button>
          <button onClick={() => setTab("users")} className={`px-4 py-1.5 rounded-md text-sm font-mono transition-all flex items-center gap-1.5 ${tab === "users" ? "bg-cyan-600 text-white" : "text-gray-400 hover:text-white"}`}>
            <Users className="w-3.5 h-3.5" /> Users
          </button>
        </div>

        {tab === "keys" && (
          <>
            {/* Generate */}
            <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
              <h2 className="text-sm font-mono text-gray-400 mb-4">Generate Access Key</h2>
              <div className="flex gap-3 items-center flex-wrap">
                <div className="flex gap-2">
                  {[
                    { id: "trial", label: "30-Day Trial", icon: Clock },
                    { id: "monthly", label: "$5 / Month", icon: RefreshCw },
                    { id: "lifetime", label: "$50 Lifetime", icon: Crown }
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setKeyType(id)}
                      className={`px-4 py-2 rounded-lg text-sm font-mono border transition-all flex items-center gap-1.5 ${keyType === id ? "bg-cyan-600 border-cyan-500 text-white" : "bg-[#0d1117] border-[#21262d] text-gray-400 hover:border-[#30363d]"}`}
                    >
                      <Icon className="w-3.5 h-3.5" /> {label}
                    </button>
                  ))}
                </div>
                <Button onClick={handleGenerate} className="bg-[#238636] hover:bg-[#2ea043] text-white border-0 font-mono gap-2" disabled={createKeyMutation.isPending}>
                  <Plus className="w-4 h-4" /> Generate
                </Button>
              </div>
            </div>

            {/* Keys Table */}
            <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#21262d] text-xs text-gray-500 font-mono">
                Keys ({keys.length}) — Each key is single-use & HWID+IP bound on first redemption
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-[#21262d] hover:bg-transparent">
                    <TableHead className="text-gray-500 font-mono text-xs">Key</TableHead>
                    <TableHead className="text-gray-500 font-mono text-xs">Plan</TableHead>
                    <TableHead className="text-gray-500 font-mono text-xs">Status</TableHead>
                    <TableHead className="text-gray-500 font-mono text-xs">Used By</TableHead>
                    <TableHead className="text-gray-500 font-mono text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map(k => (
                    <TableRow key={k.id} className="border-[#21262d] hover:bg-white/[0.02]">
                      <TableCell className="font-mono text-xs text-cyan-300">{k.key_value}</TableCell>
                      <TableCell>
                        <Badge className={
                          k.key_type === "lifetime" ? "bg-purple-500/20 text-purple-300 border-purple-500/30 font-mono text-xs" :
                          k.key_type === "trial" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 font-mono text-xs" :
                          "bg-blue-500/20 text-blue-300 border-blue-500/30 font-mono text-xs"
                        }>
                          {k.key_type === "lifetime" ? "$50 Lifetime" : k.key_type === "trial" ? "30-Day Trial" : "$5/mo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={k.is_used ? "bg-red-500/20 text-red-400 border-red-500/30 font-mono text-xs" : "bg-green-500/20 text-green-400 border-green-500/30 font-mono text-xs"}>
                          {k.is_used ? "Used" : "Available"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500 font-mono text-xs max-w-32 truncate">{k.used_by_email || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="icon" variant="ghost" onClick={() => handleCopy(k.key_value)} className="w-7 h-7 text-gray-500 hover:text-cyan-400">
                            {copied === k.key_value ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteKeyMutation.mutate(k.id)} className="w-7 h-7 text-gray-500 hover:text-red-400">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {tab === "users" && (
          <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#21262d] text-xs text-gray-500 font-mono">
              All Users ({users.length})
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-[#21262d] hover:bg-transparent">
                  <TableHead className="text-gray-500 font-mono text-xs">User</TableHead>
                  <TableHead className="text-gray-500 font-mono text-xs">Plan</TableHead>
                  <TableHead className="text-gray-500 font-mono text-xs">Access</TableHead>
                  <TableHead className="text-gray-500 font-mono text-xs">HWID Bound</TableHead>
                  <TableHead className="text-gray-500 font-mono text-xs">IP Bound</TableHead>
                  <TableHead className="text-gray-500 font-mono text-xs">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id} className="border-[#21262d] hover:bg-white/[0.02]">
                    <TableCell className="font-mono text-xs">
                      <div className="text-white">{u.full_name || "—"}</div>
                      <div className="text-gray-500">{u.email}</div>
                    </TableCell>
                    <TableCell>{getPlanBadge(u)}</TableCell>
                    <TableCell>
                      <Badge className={u.has_access || u.plan_type === "trial" ? "bg-green-500/20 text-green-400 border-green-500/30 text-xs" : "bg-red-500/20 text-red-400 border-red-500/30 text-xs"}>
                        {u.has_access ? "Active" : u.plan_type === "trial" ? "Trial" : "None"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">{u.hwid ? u.hwid.substring(0, 12) + "..." : "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">{u.bound_ip || "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">
                      {u.created_date ? new Date(u.created_date).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}