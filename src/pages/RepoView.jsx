import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, GitFork, Lock, Plus, File, Code, ChevronDown, ArrowLeft, X, CircleDot, Shield, Zap, Settings } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import IssuesTab from "../components/repo/IssuesTab";

function AddFileModal({ repoId, repoName, onClose, onCommitted }) {
  const [fileName, setFileName] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCommit = async () => {
    if (!fileName.trim()) return;
    setSaving(true);
    const token = Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, "0")).join("");

    // Always upload content as a file — no size limits this way
    const uploadFile = new Blob([content], { type: "text/plain" });
    const { file_url } = await base44.integrations.Core.UploadFile({ file: uploadFile });
    const contentToStore = file_url;

    await base44.entities.Script.create({
      name: fileName.trim(),
      content: contentToStore,
      repo_id: repoId,
      is_loadstring: false,
      loadstring_token: token,
    });
    setSaving(false);
    onCommitted();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Add file to {repoName}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500 hover:text-white" /></button>
        </div>
        <label className="text-sm text-[#c9d1d9] mb-1 block">File name (with extension) *</label>
        <Input
          value={fileName}
          onChange={e => setFileName(e.target.value)}
          placeholder="my_script.lua"
          className="bg-[#0d1117] border-[#30363d] text-white font-mono text-sm mb-4"
          autoFocus
        />
        <label className="text-sm text-[#c9d1d9] mb-1 block">File content</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Paste your script or code here..."
          className="w-full h-48 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#c9d1d9] font-mono text-sm p-3 resize-none outline-none focus:border-[#58a6ff] mb-4"
        />
        <Button
          onClick={handleCommit}
          disabled={saving || !fileName.trim()}
          className="w-full bg-[#238636] hover:bg-[#2ea043] text-white font-semibold"
        >
          {saving ? "Committing..." : "Commit new file"}
        </Button>
      </div>
    </div>
  );
}

export default function RepoView() {
  const [user, setUser] = useState(null);
  const [repo, setRepo] = useState(null);
  const [showAddFile, setShowAddFile] = useState(false);
  const [activeTab, setActiveTab] = useState("code");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const params = new URLSearchParams(window.location.search);
  const repoId = params.get("id");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin(createPageUrl("Dashboard")));
  }, []);

  useEffect(() => {
    if (repoId) {
      base44.entities.Repo.filter({ id: repoId }).then(results => {
        if (results[0]) setRepo(results[0]);
      });
    }
  }, [repoId]);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["scripts", repoId],
    queryFn: () => base44.entities.Script.filter({ repo_id: repoId }, "-created_date"),
    enabled: !!repoId
  });

  const deleteFileMutation = useMutation({
    mutationFn: (id) => base44.entities.Script.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["scripts", repoId])
  });

  const handleDeleteRepo = async () => {
    if (deleteConfirm !== repo.name) return;
    setIsDeleting(true);
    // Delete all files in repo first
    for (const file of files) {
      await base44.entities.Script.delete(file.id);
    }
    await base44.entities.Repo.delete(repoId);
    window.location.href = createPageUrl("Dashboard");
  };

  const username = user?.email?.split("@")[0] || "user";
  const commitHash = repo ? repo.id?.substring(0, 7) : "0000000";

  if (!user || !repo) return (
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
        {/* Repo header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm mb-1">
            <svg viewBox="0 0 16 16" className="w-4 h-4 fill-[#8b949e]"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"/></svg>
            <Link to={createPageUrl("Dashboard")} className="text-[#58a6ff] hover:underline font-semibold">{username}</Link>
            <span className="text-gray-500">/</span>
            <span className="text-white font-semibold">{repo.name}</span>
            <Lock className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-[10px] border border-[#30363d] rounded-full px-2 py-0.5 text-gray-500">Private</span>
          </div>
          <p className="text-sm text-gray-500">{repo.description}</p>
        </div>

        {/* Star / Fork */}
        <div className="flex gap-2 mb-5 justify-end">
          <button className="flex items-center gap-1.5 text-xs border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] rounded-lg px-3 py-1.5">
            <Star className="w-3.5 h-3.5" /> Star <span className="border-l border-[#30363d] pl-2 ml-1">{repo.star_count || 0}</span>
          </button>
          <button className="flex items-center gap-1.5 text-xs border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] rounded-lg px-3 py-1.5">
            <GitFork className="w-3.5 h-3.5" /> Fork <span className="border-l border-[#30363d] pl-2 ml-1">{repo.fork_count || 0}</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#30363d] mb-5 overflow-x-auto">
          {[
            { id: "code", label: "Code", icon: <Code className="w-3.5 h-3.5" /> },
            { id: "issues", label: `Issues`, icon: <CircleDot className="w-3.5 h-3.5" /> },
            { id: "security", label: "Security", icon: <Shield className="w-3.5 h-3.5" /> },
            { id: "actions", label: "Actions", icon: <Zap className="w-3.5 h-3.5" /> },
            { id: "settings", label: "Settings", icon: <Settings className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap ${activeTab === tab.id ? "border-b-2 border-[#f78166] text-white font-semibold -mb-px" : "text-gray-500 hover:text-[#c9d1d9]"}`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Issues Tab */}
        {activeTab === "issues" && (
          <IssuesTab repoId={repoId} user={user} />
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <div className="space-y-4">
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-green-400" />
                <h3 className="font-semibold text-white">Vander Secure Gate</h3>
                <span className="text-[10px] bg-green-500/10 border border-green-500/30 text-green-400 px-2 py-0.5 rounded-full">Active</span>
              </div>
              <p className="text-xs text-gray-500 mb-4">All scripts in this repository are protected by VSG v4.2. Browser access is blocked and decoy scripts are served to reverse engineers.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "Browser fingerprinting", status: "Enabled" },
                  { label: "Honeypot traps", status: "Enabled" },
                  { label: "Executor validation", status: "Enabled" },
                ].map((item, i) => (
                  <div key={i} className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">{item.label}</div>
                    <div className="text-xs text-green-400 font-semibold">{item.status}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
              <h3 className="font-semibold text-white mb-3">Security Advisories</h3>
              <div className="text-xs text-gray-500">No security advisories published for this repository.</div>
            </div>
          </div>
        )}

        {/* Actions Tab */}
        {activeTab === "actions" && (
          <div className="space-y-4">
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#30363d] flex items-center justify-between">
                <h3 className="font-semibold text-white text-sm">Workflow Runs</h3>
                <span className="text-xs text-gray-500">{files.length} scripts active</span>
              </div>
              {files.length === 0 ? (
                <div className="p-8 text-center text-gray-600 text-sm">No workflow runs yet.</div>
              ) : (
                files.map((file, idx) => (
                  <div key={file.id} className={`flex items-center gap-3 px-5 py-3 ${idx !== files.length - 1 ? "border-b border-[#30363d]" : ""}`}>
                    <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm text-white">{file.name}</div>
                      <div className="text-xs text-gray-500">
                        {file.is_loadstring ? "Loadstring protected" : "Standard script"} · {file.fetch_count || 0} fetches
                      </div>
                    </div>
                    <span className="text-[10px] text-green-400 border border-green-500/30 bg-green-500/10 px-2 py-0.5 rounded-full">success</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
              <h3 className="font-semibold text-white mb-1">Repository Name</h3>
              <p className="text-xs text-gray-500 mb-3">This is the repository name.</p>
              <div className="flex gap-3 items-center">
                <input
                  readOnly
                  value={repo.name}
                  className="bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] rounded-lg px-3 py-2 text-sm font-mono flex-1 outline-none"
                />
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-[#161b22] border border-red-500/30 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-red-500/20 bg-red-500/5">
                <h3 className="font-semibold text-red-400">Danger Zone</h3>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-4 pb-5 border-b border-[#21262d] mb-5">
                  <div>
                    <div className="font-medium text-sm text-white mb-1">Delete this repository</div>
                    <div className="text-xs text-gray-500">Once you delete a repository, there is no going back. All files will be permanently deleted.</div>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-2">
                  Please type <span className="font-mono text-white bg-[#0d1117] px-1.5 py-0.5 rounded border border-[#30363d]">{repo.name}</span> to confirm.
                </p>
                <input
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder={repo.name}
                  className="bg-[#0d1117] border border-[#30363d] text-white rounded-lg px-3 py-2 text-sm font-mono w-full outline-none focus:border-red-500/50 mb-3"
                />
                <button
                  onClick={handleDeleteRepo}
                  disabled={deleteConfirm !== repo.name || isDeleting}
                  className="bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all"
                >
                  {isDeleting ? "Deleting..." : "I understand, delete this repository"}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "code" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <button className="flex items-center gap-2 text-sm border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] rounded-lg px-3 py-1.5">
                <GitFork className="w-3.5 h-3.5" /> main <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowAddFile(true)}
                  size="sm"
                  className="bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#c9d1d9] gap-1.5 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add file
                </Button>
                <Button
                  size="sm"
                  className="bg-[#238636] hover:bg-[#2ea043] text-white gap-1.5 text-xs font-semibold"
                >
                  <Code className="w-3.5 h-3.5" /> Code <ChevronDown className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="border border-[#30363d] rounded-xl overflow-hidden mb-6">
              <div className="flex items-center gap-3 px-4 py-2.5 bg-[#161b22] border-b border-[#30363d]">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#58a6ff] to-[#1f6feb] flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                  {username[0]?.toUpperCase()}
                </div>
                <span className="text-sm text-[#c9d1d9] font-medium">{username}</span>
                <span className="text-sm text-gray-500">Initial commit</span>
                <span className="ml-auto text-xs text-gray-500 font-mono">{commitHash} · Just now</span>
              </div>

              {isLoading ? (
                <div className="p-6 text-center text-gray-600 text-sm">Loading files...</div>
              ) : files.length === 0 ? (
                <div className="p-8 text-center text-gray-600 text-sm">
                  No files yet. <button onClick={() => setShowAddFile(true)} className="text-[#58a6ff] hover:underline">Add a file</button>
                </div>
              ) : (
                files.map(file => (
                  <Link
                    key={file.id}
                    to={`${createPageUrl("FileView")}?id=${file.id}&repo=${repoId}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#161b22] border-b border-[#30363d] last:border-0 group"
                  >
                    <File className="w-4 h-4 text-[#8b949e] shrink-0" />
                    <span className="text-[#58a6ff] text-sm group-hover:underline flex-1">{file.name}</span>
                    <span className="text-xs text-gray-600 hidden sm:block">Add {file.name?.split(".")[0]}</span>
                  </Link>
                ))
              )}
            </div>

            <Link to={createPageUrl("Dashboard")} className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-[#c9d1d9] border border-[#30363d] rounded-lg px-3 py-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
          </>
        )}
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

      {showAddFile && (
        <AddFileModal
          repoId={repoId}
          repoName={repo.name}
          onClose={() => setShowAddFile(false)}
          onCommitted={() => queryClient.invalidateQueries(["scripts", repoId])}
        />
      )}
    </div>
  );
}