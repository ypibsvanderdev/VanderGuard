import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Plus, Copy, Trash2, Key, LogOut } from "lucide-react";
import { createPageUrl } from "@/utils";

function generateKey(type) {
  const seg = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return `VANDER-${seg()}-${seg()}-${seg()}`;
}

export default function AdminKeys() {
  const [user, setUser] = useState(null);
  const [keyType, setKeyType] = useState("monthly");
  const [copied, setCopied] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u || u.role !== "admin") {
        window.location.href = createPageUrl("Dashboard");
      } else {
        setUser(u);
      }
    }).catch(() => base44.auth.redirectToLogin(createPageUrl("AdminKeys")));
  }, []);

  const { data: keys = [] } = useQuery({
    queryKey: ["access-keys"],
    queryFn: () => base44.entities.AccessKey.list("-created_date"),
    enabled: !!user
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AccessKey.create(data),
    onSuccess: () => queryClient.invalidateQueries(["access-keys"])
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AccessKey.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["access-keys"])
  });

  const handleGenerate = () => {
    const newKey = generateKey(keyType);
    const expiresAt = keyType === "monthly"
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;
    createMutation.mutate({ key_value: newKey, key_type: keyType, is_used: false, is_active: true, expires_at: expiresAt });
  };

  const handleCopy = (val) => {
    navigator.clipboard.writeText(val);
    setCopied(val);
    setTimeout(() => setCopied(""), 2000);
  };

  if (!user) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <Shield className="w-6 h-6 text-cyan-400 animate-pulse" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      <header className="border-b border-[#1e2433] bg-[#0d0d14] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Key className="w-5 h-5 text-cyan-400" />
          <span className="font-bold text-white font-mono">Admin Key Manager</span>
        </div>
        <div className="flex gap-3">
          <a href={createPageUrl("Dashboard")} className="text-sm text-gray-400 hover:text-cyan-400 font-mono">← Dashboard</a>
          <Button variant="ghost" size="sm" onClick={() => base44.auth.logout(createPageUrl("Home"))} className="text-gray-400 hover:text-red-400 gap-1">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Generate */}
        <div className="bg-[#0d0d14] border border-[#1e2433] rounded-xl p-5">
          <h2 className="text-sm font-mono text-gray-400 mb-4">Generate New Key</h2>
          <div className="flex gap-3 items-center">
            <div className="flex gap-2">
              {["monthly", "lifetime"].map(t => (
                <button
                  key={t}
                  onClick={() => setKeyType(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-mono border transition-all ${keyType === t ? "bg-cyan-600 border-cyan-500 text-white" : "bg-[#0a0a0f] border-[#1e2433] text-gray-400"}`}
                >
                  {t === "monthly" ? "$5 / Month" : "$50 / Lifetime"}
                </button>
              ))}
            </div>
            <Button onClick={handleGenerate} className="bg-cyan-600 hover:bg-cyan-500 font-mono gap-2" disabled={createMutation.isPending}>
              <Plus className="w-4 h-4" /> Generate Key
            </Button>
          </div>
        </div>

        {/* Keys Table */}
        <div className="bg-[#0d0d14] border border-[#1e2433] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1e2433] flex items-center justify-between">
            <span className="font-mono text-sm text-gray-400">Access Keys ({keys.length})</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-[#1e2433] hover:bg-transparent">
                <TableHead className="text-gray-500 font-mono text-xs">Key</TableHead>
                <TableHead className="text-gray-500 font-mono text-xs">Type</TableHead>
                <TableHead className="text-gray-500 font-mono text-xs">Status</TableHead>
                <TableHead className="text-gray-500 font-mono text-xs">Used By</TableHead>
                <TableHead className="text-gray-500 font-mono text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map(k => (
                <TableRow key={k.id} className="border-[#1e2433] hover:bg-white/[0.02]">
                  <TableCell className="font-mono text-xs text-cyan-300">{k.key_value}</TableCell>
                  <TableCell>
                    <Badge className={k.key_type === "lifetime" ? "bg-purple-500/20 text-purple-300 border-purple-500/30 font-mono text-xs" : "bg-blue-500/20 text-blue-300 border-blue-500/30 font-mono text-xs"}>
                      {k.key_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={k.is_used ? "bg-red-500/20 text-red-400 border-red-500/30 font-mono text-xs" : "bg-green-500/20 text-green-400 border-green-500/30 font-mono text-xs"}>
                      {k.is_used ? "Used" : "Available"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-500 font-mono text-xs">{k.used_by_email || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={() => handleCopy(k.key_value)} className="w-7 h-7 text-gray-500 hover:text-cyan-400">
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(k.id)} className="w-7 h-7 text-gray-500 hover:text-red-400">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}