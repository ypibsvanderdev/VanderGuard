import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Lock, Plus, Search, Star, GitFork, Bell, ChevronDown, Settings, LogOut, Key } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

function TrialBanner({ daysLeft, onKeyRedeem }) {
  if (daysLeft === null) return null;
  const expired = daysLeft <= 0;
  return (
    <div className={`px-6 py-2.5 text-center text-sm font-mono flex items-center justify-center gap-3 ${expired ? "bg-red-500/10 border-b border-red-500/30 text-red-400" : "bg-yellow-500/10 border-b border-yellow-500/30 text-yellow-400"}`}>
      {expired ? (
        <>
          <Shield className="w-4 h-4" />
          <span>Trial expired — Loadstrings paused. Enter a key to restore access.</span>
          <button onClick={onKeyRedeem} className="underline ml-2 hover:text-yellow-300">Redeem Key</button>
        </>
      ) : (
        <>
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
          <span>Free trial — {daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining. <button onClick={onKeyRedeem} className="underline hover:text-yellow-300">Upgrade →</button></span>
        </>
      )}
    </div>
  );
}

function RedeemModal({ onClose, onSuccess }) {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleRedeem = async () => {
    if (!key.trim()) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await base44.functions.invoke("redeemKey", { key: key.trim() });
      if (res.data.success) {
        setMsg({ type: "success", text: res.data.message });
        setTimeout(() => { onSuccess(); onClose(); }, 1500);
      } else {
        setMsg({ type: "error", text: res.data.error });
      }
    } catch (_e) {
      setMsg({ type: "error", text: "Error redeeming key." });
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-white mb-1">Redeem Access Key</h3>
        <p className="text-xs text-gray-500 mb-4">$5/month or $50 lifetime — one-time use per account</p>
        <Input
          value={key}
          onChange={e => setKey(e.target.value.toUpperCase())}
          placeholder="VH-XXXXXX-XXXXXX-XXXXXX"
          className="bg-[#0d1117] border-[#30363d] text-white font-mono text-sm mb-3"
          onKeyDown={e => e.key === "Enter" && handleRedeem()}
          autoFocus
        />
        {msg && (
          <p className={`text-xs mb-3 ${msg.type === "success" ? "text-green-400" : "text-red-400"}`}>{msg.text}</p>
        )}
        <Button onClick={handleRedeem} disabled={loading || !key.trim()} className="w-full bg-[#238636] hover:bg-[#2ea043] text-white font-semibold">
          {loading ? "Redeeming..." : "Activate Key"}
        </Button>
      </div>
    </div>
  );
}

function NewRepoModal({ onClose, onCreated, userEmail, username }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await base44.entities.Repo.create({
      name: name.trim().toLowerCase().replace(/\s+/g, "-"),
      description: desc || "Repository created with VanderHub",
      owner_email: userEmail,
      is_private: true,
      language: "Plain Text",
      star_count: 0,
      fork_count: 0,
    });
    setSaving(false);
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-white mb-4">Create a new repository</h3>
        <label className="text-xs text-gray-400 mb-1 block">Repository name *</label>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="my-repo"
          className="bg-[#0d1117] border-[#30363d] text-white font-mono text-sm mb-3"
          autoFocus
        />
        <label className="text-xs text-gray-400 mb-1 block">Description (optional)</label>
        <Input
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="Repository description..."
          className="bg-[#0d1117] border-[#30363d] text-white text-sm mb-4"
        />
        <Button onClick={handleCreate} disabled={saving || !name.trim()} className="w-full bg-[#238636] hover:bg-[#2ea043] text-white font-semibold">
          {saving ? "Creating..." : "Create repository"}
        </Button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [showNewRepo, setShowNewRepo] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const queryClient = useQueryClient();

  const loadUser = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) { window.location.href = createPageUrl("Access"); return; }

      const me = await base44.auth.me();
      if (!me) { window.location.href = createPageUrl("Access"); return; }

      if (me.role === "admin") { setUser(me); return; }

      // Check access expiry via backend
      const res = await base44.functions.invoke("checkAccess", {});
      if (!res.data.has_access) {
        window.location.href = res.data.expired ? createPageUrl("Locked") : createPageUrl("Access");
        return;
      }

      setUser(me);
    } catch (_e) {
      window.location.href = createPageUrl("Access");
    }
  };

  useEffect(() => { loadUser(); }, []);

  const username = user?.email?.split("@")[0] || "user";

  const { data: repos = [], isLoading } = useQuery({
    queryKey: ["repos", user?.email],
    queryFn: () => base44.entities.Repo.filter({ owner_email: user.email }, "-created_date"),
    enabled: !!user
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Repo.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["repos"])
  });

  const filtered = repos.filter(r => r.name?.toLowerCase().includes(searchQ.toLowerCase()));

  if (!user) return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="flex items-center gap-3 text-[#58a6ff]">
        <div className="w-5 h-5 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-sm">Loading...</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      {/* GitHub-style Navbar */}
      <header className="bg-[#161b22] border-b border-[#30363d] px-6 h-14 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2">
            <svg viewBox="0 0 16 16" className="w-8 h-8 fill-white" aria-hidden="true">
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/>
            </svg>
            <span className="font-bold text-white text-base">VanderHub</span>
          </Link>
          {/* Search */}
          <div className="hidden md:flex items-center gap-2 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 h-8 w-64">
            <Search className="w-3.5 h-3.5 text-gray-500" />
            <input placeholder="VanderHub Search..." className="bg-transparent text-sm text-gray-300 outline-none flex-1 placeholder:text-gray-600" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowNewRepo(true)} className="flex items-center gap-1 text-[#c9d1d9] hover:text-white text-sm border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] rounded-lg px-3 h-8">
            <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">New</span> <ChevronDown className="w-3 h-3" />
          </button>
          <Bell className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer" />
          {user?.role === "admin" && (
            <Link to={createPageUrl("AdminPanel")} title="Admin Panel">
              <Key className="w-5 h-5 text-yellow-400 hover:text-yellow-300 cursor-pointer" />
            </Link>
          )}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#58a6ff] to-[#1f6feb] flex items-center justify-center text-white text-xs font-bold cursor-pointer" title={user.email}>
            {username[0]?.toUpperCase()}
          </div>
          <button onClick={() => base44.auth.logout(createPageUrl("Home"))} className="text-gray-500 hover:text-red-400">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex max-w-screen-xl mx-auto">
        {/* Left Sidebar */}
        <aside className="w-64 shrink-0 p-4 border-r border-[#21262d] hidden md:block min-h-[calc(100vh-3.5rem)]">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Top Repositories</div>
          <button
            onClick={() => setShowNewRepo(true)}
            className="flex items-center gap-2 text-xs border border-[#30363d] rounded-lg px-3 py-1.5 text-[#c9d1d9] hover:bg-[#21262d] mb-4 w-full"
          >
            <Plus className="w-3.5 h-3.5" /> New
          </button>
          <div className="mb-3">
            <div className="flex items-center gap-2 bg-[#0d1117] border border-[#30363d] rounded-lg px-2 h-7">
              <Search className="w-3 h-3 text-gray-600" />
              <input
                placeholder="Find a repository..."
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                className="bg-transparent text-xs text-gray-300 outline-none flex-1 placeholder:text-gray-600"
              />
            </div>
          </div>
          <div className="space-y-1">
            {repos.slice(0, 8).map(repo => (
              <Link
                key={repo.id}
                to={`${createPageUrl("RepoView")}?id=${repo.id}`}
                className="flex items-center gap-2 px-1 py-1.5 rounded hover:bg-[#21262d] text-sm group"
              >
                <Lock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                <span className="text-[#58a6ff] hover:underline truncate text-xs">
                  <span className="text-gray-500">{username}</span> / <span className="font-semibold">{repo.name}</span>
                </span>
              </Link>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          {/* Activity Dashboard header */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400" />
            <h1 className="text-xl font-semibold text-white">Activity Dashboard</h1>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 animate-pulse h-40" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-600">
              <svg viewBox="0 0 16 16" className="w-12 h-12 fill-current opacity-30"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"/></svg>
              <p className="text-sm font-mono">No repositories yet. Create your first one!</p>
              <button onClick={() => setShowNewRepo(true)} className="bg-[#238636] hover:bg-[#2ea043] text-white text-sm font-semibold px-4 py-2 rounded-lg">
                New repository
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(repo => (
                <Link
                  key={repo.id}
                  to={`${createPageUrl("RepoView")}?id=${repo.id}`}
                  className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 hover:border-[#58a6ff]/40 transition-all flex flex-col group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[#58a6ff] font-semibold text-sm group-hover:underline truncate mr-2">{repo.name}</span>
                    <span className="flex items-center gap-1 text-[10px] text-gray-500 border border-[#30363d] rounded-full px-2 py-0.5 shrink-0">
                      <Lock className="w-2.5 h-2.5" /> Private
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 flex-1 mb-4 line-clamp-2">{repo.description || "Repository created with VanderHub"}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><Star className="w-3 h-3" />{repo.star_count || 0}</span>
                      <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{repo.fork_count || 0}</span>
                    </div>
                    <span className="text-[10px]">{repo.language || "Plain Text"}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>

      {showNewRepo && (
        <NewRepoModal
          onClose={() => setShowNewRepo(false)}
          onCreated={() => queryClient.invalidateQueries(["repos"])}
          userEmail={user.email}
          username={username}
        />
      )}
    </div>
  );
}