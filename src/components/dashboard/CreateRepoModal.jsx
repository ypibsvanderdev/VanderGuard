import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

export default function CreateRepoModal({ onClose, onCreate, isPending }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) return;
    onCreate({ name: name.trim().replace(/\s+/g, "-").toLowerCase(), description: description.trim() });
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262d]">
          <h2 className="text-white font-semibold text-base">Create a new repository</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Repository name *</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="my-repo"
              className="bg-[#0d1117] border-[#30363d] text-white focus-visible:ring-0 focus-visible:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Description (optional)</label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="A short description..."
              className="bg-[#0d1117] border-[#30363d] text-white focus-visible:ring-0 focus-visible:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2">
            <span className="text-yellow-500">🔒</span> All repositories are <strong className="text-gray-400">Private</strong>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#21262d]">
          <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white text-sm">Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || isPending}
            className="bg-[#238636] hover:bg-[#2ea043] text-white border-0 text-sm"
          >
            {isPending ? "Creating..." : "Create repository"}
          </Button>
        </div>
      </div>
    </div>
  );
}