import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function AddFileModal({ repoName, onClose, onCommit, isPending }) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) return;
    const isLua = name.endsWith(".lua");
    onCommit({
      name: name.trim(),
      content,
      is_loadstring: isLua,
      loadstring_token: isLua ? generateToken() : null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262d]">
          <h2 className="text-white font-semibold text-base">Add file to {repoName}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block font-medium">File name (with extension) *</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="my_script.lua"
              className="bg-[#0d1117] border-[#30363d] text-white focus-visible:ring-0 focus-visible:border-blue-500"
            />
            {name.endsWith(".lua") && (
              <p className="text-xs text-cyan-400 mt-1">🔒 Lua files are automatically loadstring-protected</p>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block font-medium">File content</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Paste your script or code here..."
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md text-gray-200 font-mono text-sm p-3 resize-none h-48 outline-none focus:border-blue-500 transition-colors"
              spellCheck={false}
            />
          </div>
        </div>
        <div className="px-6 pb-6">
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || isPending}
            className="w-full bg-[#238636] hover:bg-[#2ea043] text-white border-0"
          >
            {isPending ? "Committing..." : "Commit new file"}
          </Button>
        </div>
      </div>
    </div>
  );
}