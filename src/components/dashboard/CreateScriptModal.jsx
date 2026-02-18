import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileCode2, Loader2 } from 'lucide-react';

export default function CreateScriptModal({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    await onCreate({
      name: name.trim().replace(/\.lua$/, ''),
      description: description.trim(),
      content: '-- Your Lua script here\n\n',
      is_loadstring: false,
    });
    setName('');
    setDescription('');
    setIsCreating(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#0d0d1f] border border-[#1a1a3e] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <FileCode2 className="w-4 h-4 text-cyan-400" />
            Create New Script
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-1">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Script Name</label>
            <div className="flex items-center gap-0">
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="my_script"
                className="bg-black/40 border-[#1a1a3e] text-white placeholder:text-gray-700 text-sm rounded-r-none"
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
              <div className="bg-[#1a1a3e] border border-[#1a1a3e] border-l-0 rounded-r-md px-3 h-9 flex items-center text-xs text-gray-500 flex-shrink-0">
                .lua
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Description <span className="text-gray-700">(optional)</span></label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does this script do?"
              className="bg-black/40 border-[#1a1a3e] text-white placeholder:text-gray-700 resize-none h-20 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose} className="text-gray-500 hover:text-white text-xs h-8">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!name.trim() || isCreating}
              className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs h-8">
              {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              {isCreating ? 'Creating...' : 'Create Script'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}