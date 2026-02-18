import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Star, GitFork, Plus, FileText, ChevronLeft, Code } from "lucide-react";
import AddFileModal from "@/components/repo/AddFileModal.jsx";

export default function Repo() {
  const [user, setUser] = useState(null);
  const [repo, setRepo] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const repoId = urlParams.get("id");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin(createPageUrl("Dashboard")));
  }, []);

  useEffect(() => {
    if (repoId) {
      base44.entities.Repo.filter({ id: repoId }).then(res => setRepo(res[0]));
    }
  }, [repoId]);

  const { data: scripts = [], isLoading } = useQuery({
    queryKey: ["scripts", repoId],
    queryFn: () => base44.entities.Script.filter({ repo_id: repoId }, "-created_date"),
    enabled: !!repoId
  });

  const addMutation = useMutation({
    mutationFn: (data) => base44.entities.Script.create({ ...data, repo_id: repoId }),
    onSuccess: () => { queryClient.invalidateQueries(["scripts", repoId]); setShowAdd(false); }
  });

  const username = user?.full_name || user?.email?.split("@")[0] || "user";
  const commitHash = "732c65c";

  if (!repo) return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-200">
      {/* Top Nav */}
      <header className="border-b border-[#21262d] bg-[#161b22] px-6 h-14 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#0d1117]" />
            </div>
            <span className="font-bold text-white text-base">VanderHub</span>
          </div>
        </div>
        <div
          onClick={() => window.location.href = createPageUrl("Dashboard")}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm cursor-pointer"
        >
          {username[0]?.toUpperCase()}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Repo header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
              <FileText className="w-4 h-4" />
              <a href={createPageUrl("Dashboard")} className="text-blue-400 hover:underline">{username}</a>
              <span>/</span>
              <span className="text-white font-semibold">{repo.name}</span>
              <span className="text-[10px] border border-[#30363d] text-gray-500 rounded-full px-2 py-0.5 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Private
              </span>
            </div>
            <p className="text-gray-500 text-sm">{repo.description || "Repository created with VanderHub"}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="border-[#30363d] bg-[#21262d] text-gray-300 hover:bg-[#30363d] gap-1 text-xs h-8">
              <Star className="w-3.5 h-3.5" /> Star <span className="ml-1 text-gray-500">{repo.star_count || 0}</span>
            </Button>
            <Button size="sm" variant="outline" className="border-[#30363d] bg-[#21262d] text-gray-300 hover:bg-[#30363d] gap-1 text-xs h-8">
              <GitFork className="w-3.5 h-3.5" /> Fork <span className="ml-1 text-gray-500">{repo.fork_count || 0}</span>
            </Button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="border-b border-[#21262d] flex gap-4 mb-6 text-sm">
          {[
            { label: "Code", icon: Code, active: true },
            { label: "Issues (0)", icon: null },
            { label: "Pull Requests", icon: null },
            { label: "Actions", icon: null },
            { label: "Security", icon: null },
            { label: "Settings", icon: null },
          ].map(tab => (
            <button key={tab.label} className={`pb-3 px-1 text-sm flex items-center gap-1.5 border-b-2 transition-colors ${tab.active ? "border-[#f78166] text-white" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
              {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
              {tab.label}
            </button>
          ))}
        </div>

        {/* File browser */}
        <div className="border border-[#21262d] rounded-md overflow-hidden bg-[#161b22]">
          {/* Branch + actions bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#21262d]">
            <Button size="sm" variant="outline" className="border-[#30363d] bg-[#21262d] text-gray-300 hover:bg-[#30363d] gap-1 text-xs h-7">
              <GitFork className="w-3 h-3" /> main <ChevronLeft className="w-3 h-3 rotate-[-90deg]" />
            </Button>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setShowAdd(true)} variant="outline" className="border-[#30363d] bg-[#21262d] text-gray-300 hover:bg-[#30363d] gap-1 text-xs h-7">
                <Plus className="w-3.5 h-3.5" /> Add file
              </Button>
              <Button size="sm" className="bg-[#238636] hover:bg-[#2ea043] text-white border-0 gap-1 text-xs h-7">
                <Code className="w-3.5 h-3.5" /> Code
              </Button>
            </div>
          </div>

          {/* Latest commit row */}
          {scripts.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#21262d] bg-[#161b22]">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                {username[0]?.toUpperCase()}
              </div>
              <a href={createPageUrl("Dashboard")} className="text-blue-400 text-sm hover:underline">{username}</a>
              <span className="text-gray-400 text-sm">Add {repo.name}</span>
              <span className="ml-auto text-gray-600 text-xs font-mono">{commitHash} · Just now</span>
            </div>
          )}

          {/* Files list */}
          {isLoading ? (
            <div className="p-8 text-center text-gray-600 text-sm">Loading files...</div>
          ) : scripts.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 text-sm mb-4">No files yet. Add your first file.</p>
              <Button onClick={() => setShowAdd(true)} size="sm" className="bg-[#238636] hover:bg-[#2ea043] text-white border-0 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add file
              </Button>
            </div>
          ) : (
            scripts.map(script => (
              <a
                key={script.id}
                href={createPageUrl(`FileView?id=${script.id}`)}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-[#21262d] hover:bg-[#1c2128] transition-colors group"
              >
                <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="text-blue-400 text-sm hover:underline flex-1">{script.name}</span>
                <span className="text-gray-600 text-xs">Add {script.name}</span>
              </a>
            ))
          )}
        </div>

        {/* Back button */}
        <div className="mt-6">
          <a href={createPageUrl("Dashboard")} className="text-sm text-gray-500 hover:text-gray-300 flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </a>
        </div>

        {/* Footer */}
        <footer className="mt-16 border-t border-[#21262d] pt-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-gray-600" />
          </div>
          <div className="flex justify-center gap-6 text-xs text-gray-600 mb-2">
            <span>Terms</span><span>Privacy</span><span>Docs</span><span>Contact</span>
          </div>
          <div className="text-xs text-gray-700">© 2026 VanderHub, Inc.</div>
        </footer>
      </div>

      {showAdd && (
        <AddFileModal
          repoName={repo.name}
          onClose={() => setShowAdd(false)}
          onCommit={(data) => addMutation.mutate(data)}
          isPending={addMutation.isPending}
        />
      )}
    </div>
  );
}