import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Plus, Search, Lock, Star, GitFork, Bell, ChevronDown } from "lucide-react";
import CreateRepoModal from "@/components/dashboard/CreateRepoModal.jsx";
import TrialBanner from "@/components/dashboard/TrialBanner.jsx";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(async (me) => {
      // Check trial / access
      if (me.role !== "admin") {
        const now = new Date();
        // First login: start trial
        if (!me.has_access && !me.trial_start && !me.plan_type) {
          const trialExpires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
          await base44.auth.updateMe({ trial_start: now.toISOString(), trial_expires: trialExpires, plan_type: "trial" });
          me.trial_start = now.toISOString();
          me.trial_expires = trialExpires;
          me.plan_type = "trial";
        }
        // Trial expired?
        if (me.plan_type === "trial" && me.trial_expires && new Date() > new Date(me.trial_expires)) {
          base44.auth.logout(createPageUrl("Home"));
          return;
        }
        // Monthly expired?
        if (me.plan_type === "monthly" && me.access_expires && new Date() > new Date(me.access_expires)) {
          await base44.auth.updateMe({ has_access: false, plan_type: null });
          base44.auth.logout(createPageUrl("Home"));
          return;
        }
      }
      setUser(me);
      setLoading(false);
    }).catch(() => {
      base44.auth.redirectToLogin(createPageUrl("Dashboard"));
    });
  }, []);

  const { data: repos = [], isLoading: reposLoading } = useQuery({
    queryKey: ["repos", user?.email],
    queryFn: () => base44.entities.Repo.filter({ owner_email: user.email }, "-created_date"),
    enabled: !!user
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Repo.create({ ...data, owner_email: user.email }),
    onSuccess: () => { queryClient.invalidateQueries(["repos", user?.email]); setShowCreate(false); }
  });

  const filteredRepos = repos.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
  const username = user?.full_name || user?.email?.split("@")[0] || "user";

  if (loading) return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-200">
      {/* Top Nav */}
      <header className="border-b border-[#21262d] bg-[#161b22] px-6 h-14 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#0d1117]" />
            </div>
            <span className="font-bold text-white text-base">VanderHub</span>
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="VanderHub Search..."
              className="bg-[#0d1117] border-[#30363d] text-gray-300 text-sm pl-8 h-8 rounded-md placeholder:text-gray-600 focus-visible:ring-0 focus-visible:border-blue-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setShowCreate(true)} variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10 gap-1 text-sm h-8">
            <Plus className="w-4 h-4" /><ChevronDown className="w-3 h-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10">
            <Bell className="w-4 h-4" />
          </Button>
          <div
            onClick={() => user?.role === "admin" ? window.location.href = createPageUrl("AdminPanel") : null}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm cursor-pointer"
          >
            {username[0]?.toUpperCase()}
          </div>
        </div>
      </header>

      <TrialBanner user={user} />

      <div className="flex max-w-screen-xl mx-auto">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 p-4 border-r border-[#21262d] min-h-[calc(100vh-56px)] hidden md:block">
          <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3 px-1">Top Repositories</div>
          <Button onClick={() => setShowCreate(true)} size="sm" className="w-full bg-[#238636] hover:bg-[#2ea043] text-white border-0 text-xs mb-4 gap-1">
            <Plus className="w-3.5 h-3.5" /> New
          </Button>
          <Input
            placeholder="Find a repository..."
            className="bg-[#0d1117] border-[#30363d] text-gray-300 text-xs h-7 mb-3 focus-visible:ring-0"
          />
          <div className="space-y-1">
            {repos.slice(0, 8).map(r => (
              <a
                key={r.id}
                href={createPageUrl(`Repo?id=${r.id}`)}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors truncate"
              >
                <Lock className="w-3.5 h-3.5 shrink-0 text-gray-600" />
                <span className="truncate"><span className="text-gray-500">{username}</span> / <span className="text-white font-medium">{r.name}</span></span>
              </a>
            ))}
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {username[0]?.toUpperCase()}
            </div>
            <h1 className="text-lg font-semibold text-white">Activity Dashboard</h1>
          </div>

          {reposLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-36 bg-[#161b22] border border-[#21262d] rounded-lg animate-pulse" />)}
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="text-center py-24 text-gray-600">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm">No repositories yet. Create one to get started.</p>
              <Button onClick={() => setShowCreate(true)} className="mt-4 bg-[#238636] hover:bg-[#2ea043] text-white border-0 text-sm">
                <Plus className="w-4 h-4 mr-1" /> New Repository
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredRepos.map(repo => (
                <a
                  key={repo.id}
                  href={createPageUrl(`Repo?id=${repo.id}`)}
                  className="bg-[#161b22] border border-[#21262d] rounded-lg p-4 hover:border-[#30363d] transition-all hover:-translate-y-0.5 block"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-blue-400 font-semibold text-sm hover:underline truncate">{repo.name}</span>
                    <span className="text-[10px] border border-[#30363d] text-gray-500 rounded-full px-2 py-0.5 ml-2 shrink-0 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Private
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs mb-4 line-clamp-2">{repo.description || "Repository created with VanderHub"}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Star className="w-3 h-3" />{repo.star_count || 0}</span>
                    <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{repo.fork_count || 0}</span>
                    <span className="ml-auto">{repo.language || "Plain Text"}</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </main>
      </div>

      {showCreate && (
        <CreateRepoModal
          onClose={() => setShowCreate(false)}
          onCreate={(data) => createMutation.mutate(data)}
          isPending={createMutation.isPending}
        />
      )}
    </div>
  );
}