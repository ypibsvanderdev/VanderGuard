import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Star, GitFork, ChevronLeft, Copy, CheckCircle, Trash2, Pencil, FileText, Code } from "lucide-react";

export default function FileView() {
  const [user, setUser] = useState(null);
  const [script, setScript] = useState(null);
  const [repo, setRepo] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedLoadstring, setCopiedLoadstring] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const scriptId = urlParams.get("id");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin(createPageUrl("Dashboard")));
  }, []);

  useEffect(() => {
    if (scriptId) {
      base44.entities.Script.filter({ id: scriptId }).then(res => {
        if (res[0]) {
          setScript(res[0]);
          setEditContent(res[0].content || "");
          if (res[0].repo_id) {
            base44.entities.Repo.filter({ id: res[0].repo_id }).then(r => setRepo(r[0]));
          }
        }
      });
    }
  }, [scriptId]);

  const rawUrl = script?.loadstring_token
    ? `https://app.base44.com/api/functions/serveScript?id=${script.id}&t=${script.loadstring_token}`
    : null;

  const loadstringCode = rawUrl
    ? `loadstring(game:GetService("HttpService"):GetAsync("${rawUrl}"))()`
    : null;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(rawUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyLoadstring = () => {
    navigator.clipboard.writeText(loadstringCode);
    setCopiedLoadstring(true);
    setTimeout(() => setCopiedLoadstring(false), 2000);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this file?")) return;
    await base44.entities.Script.delete(script.id);
    window.location.href = createPageUrl(`Repo?id=${script.repo_id}`);
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Script.update(script.id, { content: editContent });
    setScript(s => ({ ...s, content: editContent }));
    setSaving(false);
    setEditing(false);
  };

  const username = user?.full_name || user?.email?.split("@")[0] || "user";
  const lines = (script?.content || "").split("\n");

  if (!script) return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-200">
      {/* Top Nav */}
      <header className="border-b border-[#21262d] bg-[#161b22] px-6 h-14 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <Shield className="w-4 h-4 text-[#0d1117]" />
          </div>
          <span className="font-bold text-white text-base">VanderHub</span>
        </div>
        <div
          onClick={() => window.location.href = createPageUrl("Dashboard")}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm cursor-pointer"
        >
          {username[0]?.toUpperCase()}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
              <FileText className="w-4 h-4" />
              <a href={createPageUrl("Dashboard")} className="text-blue-400 hover:underline">{username}</a>
              <span>/</span>
              {repo && <a href={createPageUrl(`Repo?id=${repo.id}`)} className="text-blue-400 hover:underline font-semibold">{repo.name}</a>}
              {repo && <span>/</span>}
              <span className="text-[10px] border border-[#30363d] text-gray-500 rounded-full px-2 py-0.5 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Private
              </span>
            </div>
            <p className="text-gray-500 text-sm">{repo?.description || "Repository created with VanderHub"}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="border-[#30363d] bg-[#21262d] text-gray-300 hover:bg-[#30363d] gap-1 text-xs h-8">
              <Star className="w-3.5 h-3.5" /> Star <span className="ml-1 text-gray-500">{repo?.star_count || 0}</span>
            </Button>
            <Button size="sm" variant="outline" className="border-[#30363d] bg-[#21262d] text-gray-300 hover:bg-[#30363d] gap-1 text-xs h-8">
              <GitFork className="w-3.5 h-3.5" /> Fork <span className="ml-1 text-gray-500">{repo?.fork_count || 0}</span>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-[#21262d] flex gap-4 mb-6 text-sm">
          {["Code", "Issues (0)", "Pull Requests", "Actions", "Security", "Settings"].map((tab, i) => (
            <button key={tab} className={`pb-3 px-1 text-sm border-b-2 transition-colors ${i === 0 ? "border-[#f78166] text-white flex items-center gap-1.5" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
              {i === 0 && <Code className="w-3.5 h-3.5" />}
              {tab}
            </button>
          ))}
        </div>

        {/* File viewer header */}
        <div className="border border-[#21262d] rounded-md overflow-hidden bg-[#161b22]">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#21262d]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.location.href = createPageUrl(`Repo?id=${script.repo_id}`)}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1 border border-[#30363d] rounded px-2 py-1 hover:bg-[#21262d]"
              >
                <ChevronLeft className="w-3 h-3" /> Back to files
              </button>
              <span className="text-white text-sm font-mono font-semibold">{script.name}</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleCopyUrl} className="border-[#30363d] bg-[#21262d] text-gray-300 hover:bg-[#30363d] gap-1 text-xs h-7">
                Raw
              </Button>
              {script.is_loadstring && (
                <Button size="sm" onClick={handleCopyLoadstring} className="bg-[#1f6feb]/30 hover:bg-[#1f6feb]/50 border border-[#1f6feb]/50 text-blue-300 gap-1 text-xs h-7">
                  {copiedLoadstring ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy Loadstring
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setEditing(!editing)} className="border-[#30363d] bg-[#21262d] text-gray-300 hover:bg-[#30363d] gap-1 text-xs h-7">
                <Pencil className="w-3 h-3" /> Edit
              </Button>
              <Button size="sm" onClick={handleDelete} className="bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 gap-1 text-xs h-7">
                <Trash2 className="w-3 h-3" /> Delete
              </Button>
            </div>
          </div>

          {/* Raw URL row */}
          {rawUrl && (
            <div className="flex items-center gap-2 px-4 py-2 border-b border-[#21262d] bg-[#0d1117]/50">
              <span className="text-green-400 text-xs">🔗</span>
              <span className="text-blue-400 text-xs font-mono truncate flex-1">{rawUrl}</span>
              <button onClick={handleCopyUrl} className="text-gray-500 hover:text-white transition-colors shrink-0">
                {copiedUrl ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {/* Loadstring row */}
          {loadstringCode && (
            <div className="border-b border-[#21262d] bg-[#161b22]">
              <div className="flex items-center gap-2 px-4 py-1.5 border-b border-[#30363d]/50">
                <span className="text-yellow-400 text-xs font-semibold">⚡ LOADSTRING — CLICK TO COPY</span>
                <button onClick={handleCopyLoadstring} className="ml-auto text-gray-500 hover:text-white">
                  {copiedLoadstring ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div
                onClick={handleCopyLoadstring}
                className="px-4 py-3 font-mono text-xs text-gray-300 cursor-pointer hover:bg-[#1c2128] transition-colors truncate"
              >
                {loadstringCode}
              </div>
            </div>
          )}

          {/* Line count */}
          {!editing && (
            <div className="px-4 py-2 border-b border-[#21262d] text-xs text-gray-600">{lines.length} lines</div>
          )}

          {/* Content */}
          {editing ? (
            <div className="flex flex-col">
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="w-full bg-[#0d1117] text-gray-200 font-mono text-sm p-4 resize-none outline-none min-h-[400px]"
                spellCheck={false}
              />
              <div className="flex gap-2 px-4 py-3 border-t border-[#21262d] bg-[#161b22]">
                <Button size="sm" onClick={handleSave} disabled={saving} className="bg-[#238636] hover:bg-[#2ea043] text-white border-0 text-xs">
                  {saving ? "Saving..." : "Commit changes"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="text-gray-400 hover:text-white text-xs">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full font-mono text-sm">
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i} className="hover:bg-[#1c2128] group">
                      <td className="select-none text-gray-600 text-right pr-4 pl-4 py-0.5 w-12 text-xs border-r border-[#21262d] group-hover:text-gray-400">
                        {i + 1}
                      </td>
                      <td className="pl-4 pr-4 py-0.5 text-gray-300 whitespace-pre">{line || " "}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
    </div>
  );
}