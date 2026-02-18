import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleDot, CheckCircle2, X, Plus, Tag } from "lucide-react";

const LABEL_COLORS = {
  bug: "bg-red-500/20 text-red-400 border-red-500/30",
  feature: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  question: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  enhancement: "bg-green-500/20 text-green-400 border-green-500/30",
  "": "",
};

function NewIssueForm({ repoId, authorEmail, issueCount, onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await base44.entities.Issue.create({
      repo_id: repoId,
      title: title.trim(),
      body,
      label,
      status: "open",
      author_email: authorEmail,
      number: issueCount + 1,
    });
    setSaving(false);
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">New Issue</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500 hover:text-white" /></button>
        </div>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Issue title"
          className="w-full bg-[#0d1117] border border-[#30363d] text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-[#58a6ff] mb-3"
          autoFocus
        />
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Leave a comment (optional)"
          className="w-full h-32 bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] rounded-lg px-3 py-2 text-sm resize-none outline-none focus:border-[#58a6ff] mb-3"
        />
        <select
          value={label}
          onChange={e => setLabel(e.target.value)}
          className="w-full bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] rounded-lg px-3 py-2 text-sm outline-none mb-4"
        >
          <option value="">No label</option>
          <option value="bug">bug</option>
          <option value="feature">feature</option>
          <option value="question">question</option>
          <option value="enhancement">enhancement</option>
        </select>
        <button
          onClick={handleSubmit}
          disabled={saving || !title.trim()}
          className="w-full bg-[#238636] hover:bg-[#2ea043] disabled:opacity-40 text-white text-sm font-semibold py-2 rounded-lg"
        >
          {saving ? "Submitting..." : "Submit new issue"}
        </button>
      </div>
    </div>
  );
}

export default function IssuesTab({ repoId, user }) {
  const [filter, setFilter] = useState("open");
  const [showNew, setShowNew] = useState(false);
  const queryClient = useQueryClient();

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ["issues", repoId],
    queryFn: () => base44.entities.Issue.filter({ repo_id: repoId }, "-created_date"),
    enabled: !!repoId,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Issue.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries(["issues", repoId]),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Issue.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["issues", repoId]),
  });

  const openCount = issues.filter(i => i.status === "open").length;
  const closedCount = issues.filter(i => i.status === "closed").length;
  const filtered = issues.filter(i => i.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-4 text-sm">
          <button onClick={() => setFilter("open")} className={`flex items-center gap-1.5 ${filter === "open" ? "text-white font-semibold" : "text-gray-500 hover:text-[#c9d1d9]"}`}>
            <CircleDot className="w-4 h-4 text-green-400" /> {openCount} Open
          </button>
          <button onClick={() => setFilter("closed")} className={`flex items-center gap-1.5 ${filter === "closed" ? "text-white font-semibold" : "text-gray-500 hover:text-[#c9d1d9]"}`}>
            <CheckCircle2 className="w-4 h-4 text-[#8b949e]" /> {closedCount} Closed
          </button>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
        >
          <Plus className="w-3.5 h-3.5" /> New issue
        </button>
      </div>

      <div className="border border-[#30363d] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center text-gray-600 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-600 text-sm">
            {filter === "open" ? "No open issues." : "No closed issues."}
          </div>
        ) : (
          filtered.map((issue, idx) => (
            <div key={issue.id} className={`flex items-start gap-3 px-4 py-3 ${idx !== filtered.length - 1 ? "border-b border-[#30363d]" : ""} hover:bg-[#161b22]`}>
              {issue.status === "open"
                ? <CircleDot className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                : <CheckCircle2 className="w-4 h-4 text-[#8b949e] mt-0.5 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-white font-medium">{issue.title}</span>
                  {issue.label && (
                    <span className={`text-[10px] border px-2 py-0.5 rounded-full ${LABEL_COLORS[issue.label]}`}>{issue.label}</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  #{issue.number} opened by {issue.author_email?.split("@")[0]}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleMutation.mutate({ id: issue.id, status: issue.status === "open" ? "closed" : "open" })}
                  className="text-xs text-gray-500 hover:text-white border border-[#30363d] rounded px-2 py-1"
                >
                  {issue.status === "open" ? "Close" : "Reopen"}
                </button>
                <button
                  onClick={() => deleteMutation.mutate(issue.id)}
                  className="text-xs text-gray-600 hover:text-red-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showNew && (
        <NewIssueForm
          repoId={repoId}
          authorEmail={user?.email}
          issueCount={issues.length}
          onClose={() => setShowNew(false)}
          onCreated={() => queryClient.invalidateQueries(["issues", repoId])}
        />
      )}
    </div>
  );
}