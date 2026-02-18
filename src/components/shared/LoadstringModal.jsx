import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check, Shield, Link2, AlertTriangle, Info } from 'lucide-react';

export default function LoadstringModal({ script, isOpen, onClose }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [functionUrl, setFunctionUrl] = useState(
    () => localStorage.getItem('vh_function_url') || ''
  );
  const [editingUrl, setEditingUrl] = useState(!localStorage.getItem('vh_function_url'));

  const rawUrl = functionUrl
    ? `${functionUrl.replace(/\/$/, '')}?id=${script?.id}&t=${script?.secure_token}`
    : `YOUR_FUNCTION_URL?id=${script?.id}&t=${script?.secure_token}`;

  const loadstringCode = `loadstring(game:GetService("HttpService"):GetAsync("${rawUrl}"))()`;

  const copy = async (text, setCopied) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveUrl = (val) => {
    if (val.trim()) {
      localStorage.setItem('vh_function_url', val.trim());
      setFunctionUrl(val.trim());
      setEditingUrl(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0d0d1f] border border-[#1a1a3e] text-white max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm text-cyan-400">
            <Shield className="w-4 h-4" />
            Loadstring — <span className="text-gray-300">{script?.name}.lua</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {/* Function URL setup */}
          {(editingUrl || !functionUrl) && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 mb-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                Set your serveScript function URL first
              </div>
              <div className="text-xs text-gray-500 mb-2">
                Find it in your Base44 dashboard → Code → Functions → serveScript
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://your-function-url.base44.app/..."
                  defaultValue={functionUrl}
                  className="flex-1 bg-black/40 border border-[#1a1a3e] rounded-md px-2 py-1.5 text-xs text-white placeholder:text-gray-700 focus:outline-none focus:border-cyan-500/40"
                  onBlur={e => { if (e.target.value.trim()) saveUrl(e.target.value); }}
                  onKeyDown={e => { if (e.key === 'Enter') saveUrl(e.target.value); }}
                />
                <Button size="sm" className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs h-7"
                  onClick={e => { const inp = e.target.closest('.space-y-4').querySelector('input'); if (inp) saveUrl(inp.value); }}>
                  Save
                </Button>
              </div>
            </div>
          )}

          {functionUrl && !editingUrl && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 flex items-center gap-1"><Info className="w-3 h-3" /> Function URL set</span>
              <button onClick={() => setEditingUrl(true)} className="text-cyan-400 hover:underline">Change</button>
            </div>
          )}

          {/* Raw URL */}
          <div>
            <div className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
              <Link2 className="w-3 h-3" /> Raw Script URL
            </div>
            <div className="flex gap-2">
              <code className="flex-1 bg-black/40 border border-[#1a1a3e] rounded-lg p-2.5 text-xs text-cyan-300 font-mono break-all leading-relaxed">
                {rawUrl}
              </code>
              <Button size="sm" variant="ghost" onClick={() => copy(rawUrl, setCopiedUrl)}
                className="h-auto border border-[#1a1a3e] hover:bg-white/5 flex-shrink-0 self-stretch px-2">
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
              </Button>
            </div>
          </div>

          {/* Loadstring code */}
          <div>
            <div className="text-xs text-gray-500 mb-1.5">Roblox Loadstring</div>
            <div className="flex gap-2">
              <code className="flex-1 bg-black/40 border border-[#1a1a3e] rounded-lg p-2.5 text-xs text-green-300 font-mono break-all leading-relaxed">
                {loadstringCode}
              </code>
              <Button size="sm" onClick={() => copy(loadstringCode, setCopiedCode)}
                className="h-auto bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex-shrink-0 self-stretch px-2">
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          {/* Protection info */}
          <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 text-xs space-y-1 text-green-400">
            <div className="font-medium flex items-center gap-1"><Shield className="w-3 h-3" /> Active Protection Layers</div>
            <div className="text-green-500/70 space-y-0.5 pl-4">
              <div>• Browser UA + header fingerprinting → decoy served</div>
              <div>• Invalid token attempts → rotating honeypot scripts</div>
              <div>• Artificial delay injected on all blocked requests</div>
              <div>• All attempts logged with full header snapshots</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}