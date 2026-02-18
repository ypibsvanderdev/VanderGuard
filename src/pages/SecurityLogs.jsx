import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Activity, ShieldAlert, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import useVanderAuth from '../components/hooks/useVanderAuth';

const TYPE_CONFIG = {
  allowed: { icon: CheckCircle2, text: 'Allowed', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  decoy_served: { icon: AlertTriangle, text: 'Decoy Served', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  invalid_token: { icon: XCircle, text: 'Invalid Token', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  blocked: { icon: ShieldAlert, text: 'Blocked', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
};

export default function SecurityLogs() {
  const { user, isLoading: authLoading } = useVanderAuth();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { base44.auth.redirectToLogin(createPageUrl('SecurityLogs')); return; }
    loadLogs();
  }, [authLoading, user]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await base44.entities.SecurityLog.list('-created_date', 200);
      setLogs(data);
    } catch (_e) {}
    setIsLoading(false);
  };

  const filtered = logs.filter(log => {
    const matchFilter = filter === 'all' || log.request_type === filter;
    const matchSearch = !search
      || (log.user_agent || '').toLowerCase().includes(search.toLowerCase())
      || (log.script_id || '').includes(search);
    return matchFilter && matchSearch;
  });

  const counts = {
    allowed: logs.filter(l => l.request_type === 'allowed').length,
    decoy_served: logs.filter(l => l.request_type === 'decoy_served').length,
    invalid_token: logs.filter(l => l.request_type === 'invalid_token').length,
    blocked: logs.filter(l => l.request_type === 'blocked').length,
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" /> Security Logs
          </h1>
          <div className="text-xs text-gray-600 mt-0.5">{logs.length} events logged</div>
        </div>
        <button onClick={loadLogs} className="text-gray-600 hover:text-gray-300 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
          <button key={type} onClick={() => setFilter(filter === type ? 'all' : type)}
            className={`p-3 rounded-xl border text-left transition-all ${
              filter === type
                ? `${cfg.bg} ${cfg.border}`
                : 'bg-[#09091a] border-[#1a1a3e] hover:border-gray-700'
            }`}>
            <div className={`text-xl font-bold ${cfg.color}`}>{counts[type]}</div>
            <div className="text-xs text-gray-600 mt-0.5">{cfg.text}</div>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#09091a] border border-[#1a1a3e] rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#1a1a3e] flex items-center gap-3 bg-[#0a0a1e]">
          <Search className="w-3.5 h-3.5 text-gray-700" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by user-agent or script ID..."
            className="h-7 text-xs bg-transparent border-0 text-white placeholder:text-gray-700 focus-visible:ring-0 flex-1 px-0"
          />
        </div>

        <div className="px-4 py-2 border-b border-[#1a1a3e] grid grid-cols-12 text-[10px] text-gray-600 uppercase tracking-widest font-medium">
          <span className="col-span-3">Type</span>
          <span className="col-span-5">User-Agent</span>
          <span className="col-span-2">Script</span>
          <span className="col-span-2 text-right">Time</span>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-gray-600 text-sm flex flex-col items-center gap-3">
            <div className="w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-600 text-sm">
            {logs.length === 0 ? 'No security events yet. Events will appear once scripts are accessed.' : 'No events match your filter.'}
          </div>
        ) : (
          filtered.map(log => {
            const cfg = TYPE_CONFIG[log.request_type] || TYPE_CONFIG.blocked;
            const Icon = cfg.icon;
            const timeAgo = (() => {
              try { return formatDistanceToNow(new Date(log.created_date), { addSuffix: true }); }
              catch { return '—'; }
            })();
            return (
              <div key={log.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-[#1a1a3e] last:border-b-0 hover:bg-white/[0.02] items-center transition-colors">
                <div className="col-span-3">
                  <Badge className={`text-[10px] px-1.5 py-0 h-4 border ${cfg.bg} ${cfg.color} ${cfg.border} flex items-center gap-1 w-fit`}>
                    <Icon className="w-2.5 h-2.5" /> {cfg.text}
                  </Badge>
                </div>
                <div className="col-span-5 text-xs text-gray-500 truncate font-mono" title={log.user_agent}>
                  {log.user_agent || <span className="text-gray-700 italic">No UA</span>}
                </div>
                <div className="col-span-2 text-xs text-gray-600 font-mono truncate" title={log.script_id}>
                  {log.script_id ? log.script_id.substring(0, 8) + '…' : '—'}
                </div>
                <div className="col-span-2 text-right text-xs text-gray-700 whitespace-nowrap">{timeAgo}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}