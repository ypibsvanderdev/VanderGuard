import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Copy, Edit2, Trash2, Lock, CheckCircle, Code, GitFork, Star, ExternalLink } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

const BASE_URL = "https://app.base44.com/api/functions/serveScript";

export default function FileView() {
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [repo, setRepo] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedLs, setCopiedLs] = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const fileId = params.get("id");
  const repoId = params.get("repo");

  useEffect(() => {
    base44.auth.me().then(me => {
      setUser(me);
      if (me.plan_type === "trial" && me.trial_expires) {
        const expired = new Date(me.trial_expires) < new Date();
        setTrialExpired(expired);
      }
    }).catch(() => base44.auth.redirectToLogin(createPageUrl("Dashboard")));
  }, []);

  useEffect(() => {
    if (fileId) {
      base44.entities.Script.filter({ id: fileId }).then(r => {
        if (r[0]) { setFile(r[0]); setEditContent(r[0].content || ""); }
      });
    }
    if (repoId) {
      base44.entities.Repo.filter({ id: repoId }).then(r => { if (r[0]) setRepo(r[0]); });
    }
  }, [fileId, repoId]);

  const rawUrl = file ? `${BASE_URL}?t=${file.loadstring_token}&id=${file.id}` : "";
  const displayRawUrl = file ? `https://vander-hub.onrender.com/raw/${file.loadstring_token}/${encodeURIComponent(file.name)}?key=vander2026` : "";
  const loadstringUrl = file ? `loadstring(game:HttpGet("${displayRawUrl}"))()` : "";
  const username = user?.email?.split("@")[0] || "user";

  const handleSave = async () => {
    if (!file) return;
    setSaving(true);
    await base44.entities.Script.update(file.id, { content: editContent });
    setFile(prev => ({ ...prev, content: editContent }));
    setSaving(false);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!file || !window.confirm("Delete this file?")) return;
    await base44.entities.Script.delete(file.id);
    window.location.href = `${createPageUrl("RepoView")}?id=${repoId}`;
  };

  const copy = (text, setter) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const lines = (file?.content || "").split("\n");

  if (!user || !file) return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      {/* Navbar */}
      <header className="bg-[#161b22] border-b border-[#30363d] px-6 h-14 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2">
            <svg viewBox="0 0 16 16" className="w-7 h-7 fill-white"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/></svg>
            <span className="font-bold text-white">VanderHub</span>
          </Link>
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#58a6ff] to-[#1f6feb] flex items-center justify-center text-white text-xs font-bold">
          {username[0]?.toUpperCase()}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-1">
          <svg viewBox="0 0 16 16" className="w-4 h-4 fill-[#8b949e]"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"/></svg>
          <Link to={createPageUrl("Dashboard")} className="text-[#58a6ff] hover:underline">{username}</Link>
          <span className="text-gray-500">/</span>
          <Link to={`${createPageUrl("RepoView")}?id=${repoId}`} className="text-[#58a6ff] hover:underline">{repo?.name || "repo"}</Link>
          <Lock className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-[10px] border border-[#30363d] rounded-full px-2 py-0.5 text-gray-500">Private</span>
        </div>
        <p className="text-sm text-gray-500 mb-4">{repo?.description}</p>

        {/* Star / Fork */}
        <div className="flex gap-2 mb-5 justify-end">
          <button className="flex items-center gap-1.5 text-xs border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] rounded-lg px-3 py-1.5">
            <Star className="w-3.5 h-3.5" /> Star <span className="border-l border-[#30363d] pl-2 ml-1">{repo?.star_count || 0}</span>
          </button>
          <button className="flex items-center gap-1.5 text-xs border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] rounded-lg px-3 py-1.5">
            <GitFork className="w-3.5 h-3.5" /> Fork <span className="border-l border-[#30363d] pl-2 ml-1">{repo?.fork_count || 0}</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#30363d] mb-5">
          {["Code", "Issues (0)", "Pull Requests", "Actions", "Security", "Settings"].map((tab, i) => (
            <button key={i} className={`flex items-center gap-1.5 px-3 py-2 text-sm ${i === 0 ? "border-b-2 border-[#f78166] text-white font-semibold -mb-px" : "text-gray-500 hover:text-[#c9d1d9]"}`}>
              {i === 0 && <Code className="w-3.5 h-3.5" />}{tab}
            </button>
          ))}
        </div>

        {/* File action bar */}
        <div className="flex items-center gap-2 mb-3">
          <Link to={`${createPageUrl("RepoView")}?id=${repoId}`} className="flex items-center gap-1.5 text-xs border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] rounded-lg px-3 py-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to files
          </Link>
          <span className="text-sm text-[#c9d1d9] font-mono ml-2">{file.name}</span>
          <div className="ml-auto flex gap-2">
            <button onClick={() => copy(displayRawUrl, setCopiedUrl)} title="Copy Raw URL" className="flex items-center gap-1.5 text-xs border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] rounded-lg px-3 py-1.5">
              <ExternalLink className="w-3.5 h-3.5" /> Raw
            </button>
            {!trialExpired && (
              <button onClick={() => copy(loadstringUrl, setCopiedLs)} className={`flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 font-semibold border ${copiedLs ? "bg-green-600 border-green-500 text-white" : "bg-[#388bfd]/10 hover:bg-[#388bfd]/20 border-[#388bfd]/40 text-[#58a6ff]"}`}>
                {copiedLs ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLs ? "Copied!" : "Copy Loadstring"}
              </button>
            )}
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 text-xs border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] rounded-lg px-3 py-1.5">
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
            )}
            <button onClick={handleDelete} className="flex items-center gap-1.5 text-xs border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg px-3 py-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>

        {/* Trial expired warning on loadstring */}
        {trialExpired && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-3 text-xs text-red-400 flex items-center gap-2">
            <Lock className="w-4 h-4" /> Loadstrings paused — trial expired. Redeem a key to restore access.
          </div>
        )}

        {/* Raw URL bar */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl px-4 py-2.5 flex items-center gap-3 mb-2">
          <ExternalLink className="w-3.5 h-3.5 text-[#58a6ff] shrink-0" />
          <span className="text-xs font-mono text-[#58a6ff] truncate flex-1">{displayRawUrl}</span>
          <button onClick={() => copy(displayRawUrl, setCopiedUrl)} className="text-gray-500 hover:text-white shrink-0">
            {copiedUrl ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Loadstring bar */}
        {!trialExpired && (
          <div className="bg-[#161b22] border border-[#f0883e]/30 rounded-xl mb-4 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#f0883e]/20">
              <span className="text-xs font-bold text-[#f0883e] flex items-center gap-1.5">
                ⚡ LOADSTRING — CLICK TO COPY
              </span>
              <button onClick={() => copy(loadstringUrl, setCopiedLs)} className="text-gray-500 hover:text-white">
                {copiedLs ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div
              className="px-4 py-3 text-xs font-mono text-[#c9d1d9] cursor-pointer hover:bg-[#21262d] transition-colors"
              onClick={() => copy(loadstringUrl, setCopiedLs)}
            >
              {loadstringUrl}
            </div>
          </div>
        )}

        {/* Code viewer / editor */}
        <div className="border border-[#30363d] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
            <span className="text-xs text-gray-500">{lines.length} lines</span>
            {isEditing && (
              <div className="flex gap-2">
                <button onClick={() => setIsEditing(false)} className="text-xs text-gray-500 hover:text-white px-3 py-1 border border-[#30363d] rounded-lg">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="text-xs bg-[#238636] hover:bg-[#2ea043] text-white px-3 py-1 rounded-lg font-semibold">
                  {saving ? "Saving..." : "Commit changes"}
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full min-h-[500px] bg-[#0d1117] text-[#c9d1d9] font-mono text-sm p-4 resize-none outline-none"
              spellCheck={false}
              onKeyDown={e => {
                if (e.key === "Tab") { e.preventDefault(); const s = e.target.selectionStart; const v = editContent; setEditContent(v.slice(0, s) + "  " + v.slice(e.target.selectionEnd)); setTimeout(() => e.target.setSelectionRange(s + 2, s + 2), 0); }
                if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); }
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-sm">
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i} className="hover:bg-[#161b22]">
                      <td className="text-right pr-4 pl-3 py-0.5 text-xs text-gray-600 select-none w-12 border-r border-[#21262d]">{i + 1}</td>
                      <td className="pl-4 py-0.5 text-[#c9d1d9] whitespace-pre">{line || " "}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#21262d] mt-12 py-6 text-center">
        <svg viewBox="0 0 16 16" className="w-6 h-6 fill-[#30363d] mx-auto mb-3"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/></svg>
        <div className="flex items-center justify-center gap-4 text-xs text-gray-600 mb-1">
          <a href="#" className="hover:text-[#58a6ff]">Terms</a>
          <a href="#" className="hover:text-[#58a6ff]">Privacy</a>
          <a href="#" className="hover:text-[#58a6ff]">Docs</a>
          <a href="#" className="hover:text-[#58a6ff]">Contact</a>
        </div>
        <p className="text-[10px] text-gray-700">© 2026 VanderHub, Inc.</p>
      </footer>
    </div>
  );
}