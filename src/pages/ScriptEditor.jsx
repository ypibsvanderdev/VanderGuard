import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Save, Shield, ShieldOff, ArrowLeft, RefreshCw, Loader2, ExternalLink, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import LoadstringModal from '../components/shared/LoadstringModal';
import useVanderAuth from '../components/hooks/useVanderAuth';

function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function ScriptEditor() {
  const { user, hasAccess, isLoading: authLoading } = useVanderAuth();
  const [scriptId, setScriptId] = useState(null);
  const [script, setScript] = useState(null);
  const [name, setName] = useState('');
  const [content, setContent] = useState('-- Your Lua script here\n\n');
  const [description, setDescription] = useState('');
  const [isLoadstring, setIsLoadstring] = useState(false);
  const [secureToken, setSecureToken] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const [showLoadstringModal, setShowLoadstringModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { base44.auth.redirectToLogin(createPageUrl('ScriptEditor')); return; }
    if (!hasAccess) { window.location.href = createPageUrl('Home'); return; }
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      setScriptId(id);
      loadScript(id);
    } else {
      setIsLoading(false);
    }
  }, [authLoading, user, hasAccess]);

  const loadScript = async (id) => {
    setIsLoading(true);
    try {
      const data = await base44.entities.Script.filter({ id });
      const s = data[0];
      if (s) {
        setScript(s);
        setName(s.name || '');
        setContent(s.content || '-- Your Lua script here\n\n');
        setDescription(s.description || '');
        setIsLoadstring(s.is_loadstring || false);
        setSecureToken(s.secure_token || '');
      }
    } catch (_e) {}
    setIsLoading(false);
  };

  const handleToggleLoadstring = (enabled) => {
    setIsLoadstring(enabled);
    if (enabled && !secureToken) setSecureToken(generateToken());
  };

  const handleSave = async () => {
    if (!name.trim() || isSaving) return;
    setIsSaving(true);
    setSaveState('saving');

    const token = isLoadstring ? (secureToken || generateToken()) : '';
    if (isLoadstring && !secureToken) setSecureToken(token);

    const data = {
      name: name.trim().replace(/\.lua$/, ''),
      content,
      description: description.trim(),
      is_loadstring: isLoadstring,
      secure_token: token,
    };

    try {
      if (scriptId) {
        await base44.entities.Script.update(scriptId, data);
        setScript(prev => ({ ...prev, ...data, id: scriptId }));
      } else {
        const newScript = await base44.entities.Script.create(data);
        setScript(newScript);
        setScriptId(newScript.id);
        window.history.replaceState({}, '', `${window.location.pathname}?id=${newScript.id}`);
      }
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (_e) {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
    setIsSaving(false);
  };

  const handleTabKey = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newContent = content.substring(0, start) + '    ' + content.substring(end);
      setContent(newContent);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 4;
      });
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const lineCount = content.split('\n').length;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 3.5rem)' }}>
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1a1a3e] bg-[#09091a] flex-shrink-0">
        <Link to={createPageUrl('Dashboard')}>
          <Button variant="ghost" size="sm" className="text-gray-500 hover:text-white h-7 w-7 p-0">
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
        </Link>

        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-xs text-gray-600 hidden sm:block">{user?.email?.split('@')[0]} /</span>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="script_name"
            className="bg-transparent border-0 border-b border-transparent focus:border-[#1a1a3e] rounded-none h-7 text-sm font-medium text-white focus-visible:ring-0 px-0 w-36 sm:w-48"
          />
          <span className="text-xs text-gray-600">.lua</span>
        </div>

        <div className="flex items-center gap-2 ml-auto flex-shrink-0">
          {/* Loadstring toggle */}
          <div className="hidden sm:flex items-center gap-2 border border-[#1a1a3e] rounded-lg px-2.5 py-1">
            {isLoadstring
              ? <Shield className="w-3.5 h-3.5 text-cyan-400" />
              : <ShieldOff className="w-3.5 h-3.5 text-gray-600" />}
            <span className="text-xs text-gray-500">Protected</span>
            <Switch
              checked={isLoadstring}
              onCheckedChange={handleToggleLoadstring}
              className="data-[state=checked]:bg-cyan-500 scale-75 origin-center"
            />
          </div>

          {isLoadstring && scriptId && (
            <Button size="sm" variant="ghost" onClick={() => setShowLoadstringModal(true)}
              className="text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/20 h-7 text-xs gap-1 hidden sm:flex">
              <ExternalLink className="w-3 h-3" /> Get URL
            </Button>
          )}

          <Button size="sm" onClick={handleSave} disabled={isSaving || !name.trim()}
            className={`h-7 text-xs gap-1 border ${
              saveState === 'saved'
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : saveState === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
            }`}>
            {saveState === 'saving' && <Loader2 className="w-3 h-3 animate-spin" />}
            {saveState === 'saved' && <Check className="w-3 h-3" />}
            {saveState === 'error' && <AlertTriangle className="w-3 h-3" />}
            {saveState === 'idle' && <Save className="w-3 h-3" />}
            {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Error' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Editor area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Line numbers + code */}
        <div className="flex flex-1 overflow-auto relative bg-[#070712]">
          {/* Line numbers */}
          <div className="sticky left-0 w-10 bg-[#09091a] border-r border-[#1a1a3e] text-right py-4 pr-2 select-none flex-shrink-0 overflow-hidden">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} className="text-[11px] text-gray-700 font-mono leading-[1.5rem]">{i + 1}</div>
            ))}
          </div>
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={handleTabKey}
            className="flex-1 bg-transparent text-gray-100 font-mono text-[13px] p-4 resize-none focus:outline-none leading-6 min-h-full"
            style={{ tabSize: 4 }}
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>

        {/* Settings panel (desktop) */}
        <div className="w-56 border-l border-[#1a1a3e] bg-[#09091a] p-4 space-y-5 overflow-y-auto flex-shrink-0 hidden lg:block">
          <div>
            <label className="text-[10px] text-gray-600 uppercase tracking-widest mb-2 block font-medium">Description</label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does this script do?"
              className="bg-black/40 border-[#1a1a3e] text-xs text-gray-400 placeholder:text-gray-700 resize-none h-20 focus-visible:ring-0 focus-visible:border-cyan-500/30"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-600 uppercase tracking-widest mb-2 block font-medium">Protection</label>
            <div className={`rounded-lg border p-3 transition-colors ${isLoadstring ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-[#1a1a3e]'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  {isLoadstring
                    ? <Shield className="w-3.5 h-3.5 text-cyan-400" />
                    : <ShieldOff className="w-3.5 h-3.5 text-gray-600" />}
                  <span className="text-xs text-gray-400">Loadstring</span>
                </div>
                <Switch
                  checked={isLoadstring}
                  onCheckedChange={handleToggleLoadstring}
                  className="data-[state=checked]:bg-cyan-500 scale-75 origin-right"
                />
              </div>
              {isLoadstring ? (
                <div className="text-[10px] text-green-400 space-y-0.5">
                  <div>✓ VSG protection on</div>
                  <div>✓ Browser requests blocked</div>
                  <div>✓ Decoys active</div>
                </div>
              ) : (
                <div className="text-[10px] text-gray-600">Enable to get a protected loadstring URL</div>
              )}
            </div>
          </div>

          {isLoadstring && secureToken && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] text-gray-600 uppercase tracking-widest font-medium">Token</label>
                <button onClick={() => setSecureToken(generateToken())}
                  className="text-[10px] text-yellow-500 hover:text-yellow-400 flex items-center gap-0.5">
                  <RefreshCw className="w-2.5 h-2.5" /> Reset
                </button>
              </div>
              <div className="bg-black/40 border border-[#1a1a3e] rounded p-2">
                <code className="text-[10px] text-gray-600 font-mono break-all">{secureToken.substring(0, 24)}…</code>
              </div>
              <div className="text-[10px] text-yellow-600 mt-1.5">
                ⚠ Resetting invalidates existing URLs
              </div>
            </div>
          )}

          {isLoadstring && scriptId && (
            <Button onClick={() => setShowLoadstringModal(true)} size="sm"
              className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs h-8 gap-1">
              <ExternalLink className="w-3 h-3" /> Get Loadstring URL
            </Button>
          )}

          <div className="text-[10px] text-gray-700 pt-2 border-t border-[#1a1a3e] space-y-1">
            <div><kbd className="bg-[#1a1a3e] px-1 rounded text-[10px]">Ctrl+S</kbd> Save</div>
            <div><kbd className="bg-[#1a1a3e] px-1 rounded text-[10px]">Tab</kbd> Indent</div>
          </div>
        </div>
      </div>

      {showLoadstringModal && (
        <LoadstringModal
          script={{ ...script, id: scriptId, secure_token: secureToken, name }}
          isOpen={showLoadstringModal}
          onClose={() => setShowLoadstringModal(false)}
        />
      )}
    </div>
  );
}