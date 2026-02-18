import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shield, Copy, Trash2, Save, Lock, Unlock, CheckCircle, ExternalLink } from "lucide-react";

function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function ScriptEditor({ script, onSaved, onDelete, onCancel }) {
  const [name, setName] = useState(script?.name || "");
  const [content, setContent] = useState(script?.content || "");
  const [isLoadstring, setIsLoadstring] = useState(script?.is_loadstring || false);
  const [token, setToken] = useState(script?.loadstring_token || "");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (script) {
      setName(script.name || "");
      setContent(script.content || "");
      setIsLoadstring(script.is_loadstring || false);
      setToken(script.loadstring_token || "");
    }
  }, [script?.id]);

  const handleToggleLoadstring = (val) => {
    setIsLoadstring(val);
    if (val && !token) setToken(generateToken());
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const data = {
      name: name.trim(),
      content,
      is_loadstring: isLoadstring,
      loadstring_token: isLoadstring ? (token || generateToken()) : null
    };
    if (script) {
      await base44.entities.Script.update(script.id, data);
    } else {
      await base44.entities.Script.create(data);
    }
    setSaving(false);
    onSaved();
  };

  const loadstringUrl = token
    ? `loadstring(game:GetService("HttpService"):GetAsync("https://app.base44.com/api/functions/serveScript"))({token="${token}"})`
    : "";

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(loadstringUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-[#1e2433] bg-[#0d0d14] px-6 py-4 flex items-center justify-between gap-4">
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="script_name.lua"
          className="bg-transparent border-0 border-b border-[#1e2433] rounded-none text-white font-mono text-base px-0 focus-visible:ring-0 w-64"
        />
        <div className="flex items-center gap-4">
          {/* Loadstring toggle */}
          <div className="flex items-center gap-2">
            {isLoadstring ? <Lock className="w-4 h-4 text-cyan-400" /> : <Unlock className="w-4 h-4 text-gray-500" />}
            <Label htmlFor="ls-toggle" className="font-mono text-sm text-gray-400 cursor-pointer">
              Loadstring
            </Label>
            <Switch
              id="ls-toggle"
              checked={isLoadstring}
              onCheckedChange={handleToggleLoadstring}
              className="data-[state=checked]:bg-cyan-600"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel} className="text-gray-500 font-mono">Cancel</Button>
            {onDelete && (
              <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500 hover:text-red-400 hover:bg-red-500/10 font-mono gap-1">
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()} className="bg-cyan-600 hover:bg-cyan-500 font-mono gap-2">
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>

      {/* Loadstring URL Banner */}
      {isLoadstring && token && (
        <div className="bg-cyan-500/5 border-b border-cyan-500/20 px-6 py-3 flex items-center gap-3">
          <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="flex-1 font-mono text-xs text-cyan-300 bg-[#0a0a0f] border border-cyan-500/20 rounded-lg px-3 py-2 overflow-x-auto whitespace-nowrap">
            {loadstringUrl}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyUrl}
            className={`shrink-0 font-mono gap-1 ${copied ? "text-green-400" : "text-cyan-400"}`}
          >
            {copied ? <><CheckCircle className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
          </Button>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 relative">
        <div className="absolute top-3 right-4 text-xs font-mono text-gray-600">Lua</div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="-- Write your Lua script here..."
          className="w-full h-full bg-[#080810] text-gray-200 font-mono text-sm p-6 resize-none outline-none leading-relaxed"
          spellCheck={false}
        />
      </div>

      {/* Footer stats */}
      <div className="border-t border-[#1e2433] bg-[#0d0d14] px-6 py-2 flex items-center gap-6 text-xs font-mono text-gray-600">
        <span>{content.split("\n").length} lines</span>
        <span>{content.length} chars</span>
        {script && <span>Fetched: {script.fetch_count || 0}×</span>}
        {script && <span className="text-red-600">Blocked: {script.blocked_attempts || 0} attempts</span>}
        {isLoadstring && <span className="text-cyan-600 flex items-center gap-1"><Lock className="w-3 h-3" /> Protected</span>}
      </div>
    </div>
  );
}