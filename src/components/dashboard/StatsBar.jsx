import React from "react";
import { Shield, FileCode, Lock, Eye } from "lucide-react";

export default function StatsBar({ scripts }) {
  const protected_ = scripts.filter(s => s.is_loadstring).length;
  const totalFetches = scripts.reduce((a, s) => a + (s.fetch_count || 0), 0);
  const totalBlocked = scripts.reduce((a, s) => a + (s.blocked_attempts || 0), 0);

  return (
    <div className="border-b border-[#1e2433] bg-[#0a0a0f] px-6 py-2 flex items-center gap-6 text-xs font-mono">
      <div className="flex items-center gap-2 text-gray-500">
        <FileCode className="w-3 h-3" />
        <span>{scripts.length} scripts</span>
      </div>
      <div className="flex items-center gap-2 text-cyan-600">
        <Lock className="w-3 h-3" />
        <span>{protected_} protected</span>
      </div>
      <div className="flex items-center gap-2 text-green-600">
        <Eye className="w-3 h-3" />
        <span>{totalFetches} deliveries</span>
      </div>
      <div className="flex items-center gap-2 text-red-600">
        <Shield className="w-3 h-3" />
        <span>{totalBlocked} blocked</span>
      </div>
      <div className="ml-auto flex items-center gap-2 text-green-500">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <span>VSG Active</span>
      </div>
    </div>
  );
}