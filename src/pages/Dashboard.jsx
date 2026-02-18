import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Plus, Shield, Search, Folder, Code2, GitBranch, RefreshCw, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FileItem from '../components/dashboard/FileItem';
import CreateScriptModal from '../components/dashboard/CreateScriptModal';
import LoadstringModal from '../components/shared/LoadstringModal';
import useVanderAuth from '../components/hooks/useVanderAuth';

export default function Dashboard() {
  const { user, hasAccess, isLoading: authLoading } = useVanderAuth();
  const [scripts, setScripts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [loadstringScript, setLoadstringScript] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { base44.auth.redirectToLogin(createPageUrl('Dashboard')); return; }
    if (!hasAccess) { window.location.href = createPageUrl('Home'); return; }
    loadScripts();
  }, [authLoading, user, hasAccess]);

  const loadScripts = async () => {
    setIsLoading(true);
    try {
      const data = await base44.entities.Script.filter(
        { created_by: user.email },
        '-updated_date',
        200
      );
      setScripts(data);
    } catch (_e) {}
    setIsLoading(false);
  };

  const handleCreate = async (scriptData) => {
    try {
      const newScript = await base44.entities.Script.create(scriptData);
      setShowCreate(false);
      window.location.href = createPageUrl(`ScriptEditor?id=${newScript.id}`);
    } catch (_e) {}
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this script permanently? This cannot be undone.')) return;
    await base44.entities.Script.delete(id);
    setScripts(prev => prev.filter(s => s.id !== id));
  };

  const filtered = scripts.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const protectedCount = scripts.filter(s => s.is_loadstring).length;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Repo header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <GitBranch className="w-3.5 h-3.5" />
            <span>{user?.email?.split('@')[0]}</span>
            <span className="text-gray-700">/</span>
            <span className="text-white font-medium">scripts</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <span>{scripts.length} file{scripts.length !== 1 ? 's' : ''}</span>
            {protectedCount > 0 && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1 text-cyan-400">
                  <Lock className="w-3 h-3" /> {protectedCount} protected
                </span>
              </>
            )}
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)}
          className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs h-8 flex-shrink-0">
          <Plus className="w-3.5 h-3.5 mr-1" /> New Script
        </Button>
      </div>

      {/* File browser */}
      <div className="bg-[#09091a] border border-[#1a1a3e] rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-2.5 border-b border-[#1a1a3e] flex items-center gap-3 bg-[#0a0a1e]">
          <Folder className="w-3.5 h-3.5 text-gray-600" />
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-700" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search scripts..."
              className="pl-7 h-7 text-xs bg-black/30 border-[#1a1a3e] text-white placeholder:text-gray-700 focus-visible:ring-0 focus-visible:border-cyan-500/30"
            />
          </div>
          <button onClick={loadScripts} className="ml-auto text-gray-600 hover:text-gray-300 transition-colors" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Files list */}
        {isLoading ? (
          <div className="p-10 text-center text-gray-600 text-sm flex flex-col items-center gap-3">
            <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
            Loading scripts...
          </div>
        ) : filtered.length === 0 && search ? (
          <div className="p-10 text-center text-gray-600 text-sm">
            No scripts match "<span className="text-gray-400">{search}</span>"
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-14 text-center">
            <Code2 className="w-8 h-8 text-gray-800 mx-auto mb-3" />
            <div className="text-sm text-gray-500 mb-1">No scripts yet</div>
            <div className="text-xs text-gray-700 mb-4">Create your first Lua script to get started</div>
            <Button onClick={() => setShowCreate(true)} size="sm"
              className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Create Script
            </Button>
          </div>
        ) : (
          filtered.map(script => (
            <FileItem
              key={script.id}
              script={script}
              onDelete={handleDelete}
              onShowLoadstring={setLoadstringScript}
            />
          ))
        )}
      </div>

      <CreateScriptModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />

      {loadstringScript && (
        <LoadstringModal
          script={loadstringScript}
          isOpen={!!loadstringScript}
          onClose={() => setLoadstringScript(null)}
        />
      )}
    </div>
  );
}