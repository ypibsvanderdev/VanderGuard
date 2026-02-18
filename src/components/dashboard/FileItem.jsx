import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { FileCode2, Shield, ExternalLink, Trash2, Edit3, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

export default function FileItem({ script, onDelete, onShowLoadstring }) {
  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(script.updated_date), { addSuffix: true });
    } catch {
      return '—';
    }
  })();

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1a1a3e] hover:bg-white/[0.02] transition-colors group">
      <FileCode2 className="w-4 h-4 text-blue-400 flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-200 font-medium truncate">{script.name}.lua</span>
          {script.is_loadstring && (
            <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] px-1.5 py-0 h-4 flex items-center gap-0.5">
              <Shield className="w-2.5 h-2.5" /> Protected
            </Badge>
          )}
        </div>
        {script.description && (
          <div className="text-xs text-gray-600 mt-0.5 truncate">{script.description}</div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="hidden sm:flex items-center gap-1 text-xs text-gray-700">
          <Clock className="w-3 h-3" /> {timeAgo}
        </span>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {script.is_loadstring && (
            <Button size="sm" variant="ghost" onClick={() => onShowLoadstring(script)}
              title="Get loadstring URL"
              className="h-7 w-7 p-0 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300">
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          )}
          <Link to={createPageUrl(`ScriptEditor?id=${script.id}`)}>
            <Button size="sm" variant="ghost" title="Edit script"
              className="h-7 w-7 p-0 text-gray-500 hover:bg-white/10 hover:text-gray-200">
              <Edit3 className="w-3.5 h-3.5" />
            </Button>
          </Link>
          <Button size="sm" variant="ghost" onClick={() => onDelete(script.id)}
            title="Delete script"
            className="h-7 w-7 p-0 text-gray-500 hover:text-red-400 hover:bg-red-500/5">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}