'use client';

import { useState, KeyboardEvent } from 'react';
import { Shield, Lock, Users, Globe, X, Plus, Loader2 } from 'lucide-react';

interface ScopeEditorProps {
  documentId: string;
  initialScope: string[];
  onUpdate: () => void;
}

const PRESET_SCOPES = [
  { tag: 'public', label: 'Public', icon: Globe, description: 'Anyone can see' },
  { tag: 'gm', label: 'GM Only', icon: Shield, description: 'Game Master only' },
  { tag: 'party', label: 'Party', icon: Users, description: 'All player characters' },
] as const;

export function ScopeEditor({ documentId, initialScope, onUpdate }: ScopeEditorProps) {
  const [scope, setScope] = useState<string[]>(initialScope);
  const [secretInput, setSecretInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePreset = (tag: string) => {
    setScope(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
    setError(null);
  };

  const normalizeSecretTag = (input: string): string => {
    return input.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  };

  const addSecret = () => {
    const normalized = normalizeSecretTag(secretInput);
    if (!normalized) return;

    const tag = `secret:${normalized}`;
    if (!scope.includes(tag)) {
      setScope(prev => [...prev, tag]);
    }
    setSecretInput('');
    setError(null);
  };

  const handleSecretKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSecret();
    }
  };

  const removeTag = (tag: string) => {
    setScope(prev => prev.filter(t => t !== tag));
    setError(null);
  };

  const handleSave = async () => {
    if (scope.length === 0) {
      setError('At least one scope tag is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/scope`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessScope: scope }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update scope');
      }

      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const secretTags = scope.filter(t => t.startsWith('secret:'));
  const hasChanges = JSON.stringify(scope.sort()) !== JSON.stringify(initialScope.sort());

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/80 backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-700 bg-zinc-800/50">
        <h3 className="font-semibold text-zinc-100 flex items-center gap-2">
          <Shield size={18} className="text-amber-500" />
          Access Control
        </h3>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {PRESET_SCOPES.map(preset => {
            const Icon = preset.icon;
            const isActive = scope.includes(preset.tag);
            return (
              <button
                key={preset.tag}
                onClick={() => togglePreset(preset.tag)}
                className={`
                  flex flex-col items-center gap-1 p-3 rounded-lg border transition-all
                  ${isActive
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                    : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800'
                  }
                `}
              >
                <Icon size={20} />
                <span className="text-sm font-medium">{preset.label}</span>
                <span className="text-xs opacity-60">{preset.description}</span>
              </button>
            );
          })}
        </div>

        <div className="border-t border-zinc-700 pt-4">
          <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
            <Lock size={14} className="text-purple-400" />
            Secret Tags
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400 text-sm font-mono">
                secret:
              </span>
              <input
                type="text"
                value={secretInput}
                onChange={e => setSecretInput(e.target.value)}
                onKeyDown={handleSecretKeyDown}
                placeholder="ancient-ruins"
                className="w-full pl-16 pr-4 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <button
              onClick={addSecret}
              disabled={!secretInput.trim()}
              className="px-4 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              <Plus size={16} />
              Add
            </button>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Characters must be granted matching secret tags to access this content
          </p>
        </div>

        {secretTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {secretTags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm font-mono"
              >
                <Lock size={12} />
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-1 text-purple-400 hover:text-red-400 transition-colors"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}

        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-900/30 border border-red-800 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="border-t border-zinc-700 pt-4 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            {scope.length} tag{scope.length !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
