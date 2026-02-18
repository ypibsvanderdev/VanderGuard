import React from "react";
import { Shield, FileCode, Lock, Unlock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ScriptList({ scripts, isLoading, selectedId, onSelect }) {
  if (isLoading) return (
    <div className="p-4 space-y-2">
      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full bg-white/5" />)}
    </div>
  );

  if (!scripts.length) return (
    <div className="flex flex-col items-center justify-center flex-1 p-6 text-gray-600 text-sm font-mono">
      <FileCode className="w-8 h-8 mb-2 opacity-30" />
      No scripts yet
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-2">
      {scripts.map(script => (
        <button
          key={script.id}
          onClick={() => onSelect(script)}
          className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 flex items-center gap-3 transition-all group ${
            selectedId === script.id
              ? "bg-cyan-500/10 border border-cyan-500/20 text-white"
              : "text-gray-400 hover:bg-white/[0.03] hover:text-gray-200"
          }`}
        >
          {script.is_loadstring ? (
            <Lock className={`w-4 h-4 shrink-0 ${selectedId === script.id ? "text-cyan-400" : "text-cyan-600"}`} />
          ) : (
            <FileCode className="w-4 h-4 shrink-0 text-gray-500" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-mono truncate">{script.name}</div>
            {script.is_loadstring && (
              <div className="text-xs text-cyan-600 font-mono">loadstring protected</div>
            )}
          </div>
          {script.is_loadstring && (
            <Shield className="w-3 h-3 text-cyan-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>
      ))}
    </div>
  );
}