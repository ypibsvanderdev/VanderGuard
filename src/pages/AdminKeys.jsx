import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Key, Plus, Copy, Check, Loader2, Trash2, Crown, Users, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import useVanderAuth from '../components/hooks/useVanderAuth';
import { formatDistanceToNow } from 'date-fns';

export default function AdminKeys() {
  const { user, isLoading: authLoading } = useVanderAuth();
  const [keys, setKeys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [planType, setPlanType] = useState('monthly');
  const [count, setCount] = useState('1');
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { base44.auth.redirectToLogin(createPageUrl('AdminKeys')); return; }
    if (user.role !== 'admin') { window.location.href = createPageUrl('Dashboard'); return; }
    loadKeys();
  }, [authLoading, user]);

  const loadKeys = async () => {
    setIsLoading(true);
    try {
      const data = await base44.entities.AccessKey.list('-created_date', 200);
      setKeys(data);
    } catch (_e) {}
    setIsLoading(false);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await base44.functions.invoke('generateKey', {
        plan_type: planType,
        count: parseInt(count) || 1,
      });
      if (res.data.success) {
        await loadKeys();
      }
    } catch (_e) {}
    setIsGenerating(false);
  };

  const copyKey = async (keyValue, id) => {
    await navigator.clipboard.writeText(keyValue);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteKey = async (id) => {
    if (!window.confirm('Delete this key?')) return;
    await base44.entities.AccessKey.delete(id);
    setKeys(prev => prev.filter(k => k.id !== id));
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const available = keys.filter(k => !k.is_used);
  const redeemed = keys.filter(k => k.is_used);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" /> Key Management
          </h1>
          <div className="flex gap-3 text-xs text-gray-600 mt-1">
            <span className="text-green-400">{available.length} available</span>
            <span>·</span>
            <span className="text-gray-400">{redeemed.length} redeemed</span>
          </div>
        </div>
        <button onClick={loadKeys} className="text-gray-600 hover:text-gray-300 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Generator card */}
      <div className="bg-[#09091a] border border-[#1a1a3e] rounded-xl p-5 mb-5">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Plus className="w-3.5 h-3.5 text-cyan-400" /> Generate Keys
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={planType} onValueChange={setPlanType}>
            <SelectTrigger className="w-44 bg-black/40 border-[#1a1a3e] text-white text-sm h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0d0d1f] border-[#1a1a3e] text-white">
              <SelectItem value="monthly">Monthly — $5/mo</SelectItem>
              <SelectItem value="lifetime">Lifetime — $50</SelectItem>
            </SelectContent>
          </Select>

          <Select value={count} onValueChange={setCount}>
            <SelectTrigger className="w-32 bg-black/40 border-[#1a1a3e] text-white text-sm h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0d0d1f] border-[#1a1a3e] text-white">
              {['1', '2', '5', '10', '20', '50'].map(n => (
                <SelectItem key={n} value={n}>{n} key{parseInt(n) > 1 ? 's' : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleGenerate} disabled={isGenerating}
            className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-sm h-9">
            {isGenerating
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Generating...</>
              : <><Key className="w-3.5 h-3.5 mr-1.5" /> Generate</>}
          </Button>
        </div>
      </div>

      {/* Keys table */}
      <div className="bg-[#09091a] border border-[#1a1a3e] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a1a3e] grid grid-cols-12 text-[10px] text-gray-600 uppercase tracking-widest font-medium">
          <span className="col-span-5">Key</span>
          <span className="col-span-2">Plan</span>
          <span className="col-span-3">Status</span>
          <span className="col-span-2 text-right">Actions</span>
        </div>

        {keys.length === 0 ? (
          <div className="p-10 text-center text-gray-600 text-sm">
            No keys generated yet. Use the generator above.
          </div>
        ) : (
          keys.map(k => (
            <div key={k.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-[#1a1a3e] last:border-b-0 hover:bg-white/[0.02] items-center group transition-colors">
              <code className="col-span-5 font-mono text-sm text-gray-300 truncate">{k.key_value}</code>

              <div className="col-span-2">
                <Badge className={`text-[10px] px-1.5 py-0 h-4 border ${
                  k.plan_type === 'lifetime'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}>
                  {k.plan_type === 'lifetime' ? <Crown className="w-2.5 h-2.5 mr-0.5 inline" /> : null}
                  {k.plan_type}
                </Badge>
              </div>

              <div className="col-span-3 flex items-center gap-1.5">
                {k.is_used ? (
                  <Badge className="bg-gray-500/10 text-gray-400 border border-gray-500/20 text-[10px] px-1.5 py-0 h-4 flex items-center gap-1">
                    <Users className="w-2.5 h-2.5" />
                    <span className="truncate max-w-[100px]">{k.used_by_email?.split('@')[0]}</span>
                  </Badge>
                ) : (
                  <Badge className="bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] px-1.5 py-0 h-4">
                    Available
                  </Badge>
                )}
              </div>

              <div className="col-span-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!k.is_used && (
                  <Button size="sm" variant="ghost" onClick={() => copyKey(k.key_value, k.id)}
                    title="Copy key"
                    className="h-6 w-6 p-0 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/5">
                    {copiedId === k.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => deleteKey(k.id)}
                  title="Delete key"
                  className="h-6 w-6 p-0 text-gray-500 hover:text-red-400 hover:bg-red-500/5">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}