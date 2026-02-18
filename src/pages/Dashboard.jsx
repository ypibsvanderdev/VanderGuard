import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ScriptList from "@/components/dashboard/ScriptList";
import ScriptEditor from "@/components/dashboard/ScriptEditor";
import StatsBar from "@/components/dashboard/StatsBar";
import { Button } from "@/components/ui/button";
import { Shield, LogOut, Plus, Lock } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [selectedScript, setSelectedScript] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {
      base44.auth.redirectToLogin(createPageUrl("Dashboard"));
    });
  }, []);

  const { data: scripts = [], isLoading } = useQuery({
    queryKey: ["scripts"],
    queryFn: () => base44.entities.Script.list("-created_date"),
    enabled: !!user
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Script.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["scripts"]);
      setSelectedScript(null);
    }
  });

  const handleLogout = () => base44.auth.logout(createPageUrl("Home"));

  const handleNewScript = () => {
    setSelectedScript(null);
    setIsCreating(true);
  };

  const handleSelectScript = (script) => {
    setIsCreating(false);
    setSelectedScript(script);
  };

  const handleSaved = () => {
    queryClient.invalidateQueries(["scripts"]);
    setIsCreating(false);
  };

  if (!user) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="flex items-center gap-3 text-cyan-400">
        <Shield className="w-6 h-6 animate-pulse" />
        <span className="font-mono">Authenticating...</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100 flex flex-col">
      {/* Top Nav */}
      <header className="border-b border-[#1e2433] bg-[#0d0d14] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Lock className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-wide text-white">Vander<span className="text-cyan-400">Hub</span></span>
          <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-mono">VSG v4.2</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400 font-mono">{user.email}</span>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-400 hover:text-red-400 hover:bg-red-400/10 gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Stats */}
      <StatsBar scripts={scripts} />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 border-r border-[#1e2433] bg-[#0d0d14] flex flex-col">
          <div className="p-4 border-b border-[#1e2433]">
            <Button onClick={handleNewScript} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white gap-2 font-mono text-sm">
              <Plus className="w-4 h-4" />
              New Script
            </Button>
          </div>
          <ScriptList
            scripts={scripts}
            isLoading={isLoading}
            selectedId={selectedScript?.id}
            onSelect={handleSelectScript}
          />
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-auto">
          {(isCreating || selectedScript) ? (
            <ScriptEditor
              script={selectedScript}
              onSaved={handleSaved}
              onDelete={selectedScript ? () => deleteMutation.mutate(selectedScript.id) : null}
              onCancel={() => { setIsCreating(false); setSelectedScript(null); }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-600">
              <Shield className="w-16 h-16 opacity-20" />
              <p className="font-mono text-sm">Select a script or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}