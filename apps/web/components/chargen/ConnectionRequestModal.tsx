import React, { useState, useEffect } from 'react';
import type { SharedSpawnedEntity, ConnectionRelationship } from '../../lib/chargen/types';
import { requestConnection } from '../../lib/chargen/state';
import { getYDoc } from '../../lib/ydoc';

interface ConnectionRequestModalProps {
  entity: SharedSpawnedEntity;
  originalOwnerName?: string;
  currentCharId: string;
  currentUserId: string;
  onClose: () => void;
  onSubmit?: (requestId: string) => void;
}

const RELATIONSHIP_OPTIONS: Array<{ value: ConnectionRelationship; label: string }> = [
  { value: 'ally', label: 'Ally' },
  { value: 'contact', label: 'Contact' },
  { value: 'rival', label: 'Rival' },
  { value: 'enemy', label: 'Enemy' },
  { value: 'colleague', label: 'Former Colleague' },
  { value: 'custom', label: 'Custom...' },
];

export function ConnectionRequestModal({
  entity,
  originalOwnerName,
  currentCharId,
  currentUserId,
  onClose,
  onSubmit,
}: ConnectionRequestModalProps) {
  const [relationship, setRelationship] = useState<ConnectionRelationship>('contact');
  const [customRelationship, setCustomRelationship] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const doc = getYDoc();
      const finalRelationship = relationship === 'custom' ? customRelationship : relationship;
      
      const requestId = requestConnection(
        doc,
        currentCharId,
        entity.id,
        finalRelationship as ConnectionRelationship,
        note,
        currentUserId
      );
      
      if (onSubmit) {
        onSubmit(requestId);
      }
      onClose();
    } catch (error) {
      console.error('Failed to submit connection request:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden">
        
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="text-lg font-semibold text-zinc-100 uppercase tracking-wide text-sm">
            Request Connection
          </h2>
        </div>

        <div className="p-6 space-y-6">
          
          <div className="space-y-1">
            <p className="text-zinc-300">
              <span className="text-zinc-500">Connect to:</span> <span className="font-medium text-white">{entity.name}</span>
            </p>
            {originalOwnerName && (
              <p className="text-sm text-zinc-400">
                <span className="text-zinc-600">Original:</span> {originalOwnerName}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="relationship" className="block text-sm font-medium text-zinc-400">
              Your relationship:
            </label>
            <div className="relative">
              <select
                id="relationship"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value as ConnectionRelationship)}
                className="w-full appearance-none bg-zinc-950 border border-zinc-700 text-zinc-200 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              >
                {RELATIONSHIP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>

          {relationship === 'custom' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <label htmlFor="customRelationship" className="block text-sm font-medium text-zinc-400">
                Specify relationship:
              </label>
              <input
                id="customRelationship"
                type="text"
                value={customRelationship}
                onChange={(e) => setCustomRelationship(e.target.value)}
                placeholder="e.g. Estranged Sibling"
                className="w-full bg-zinc-950 border border-zinc-700 text-zinc-200 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 placeholder:text-zinc-600"
                autoFocus
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="note" className="block text-sm font-medium text-zinc-400">
              How do you know them?
            </label>
            <textarea
              id="note"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="We served together on the ISS Resolute before their falling out with Marcus..."
              className="w-full bg-zinc-950 border border-zinc-700 text-zinc-200 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 placeholder:text-zinc-600 resize-none"
            />
          </div>

        </div>

        <div className="px-6 py-4 bg-zinc-900 border-t border-zinc-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500/50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (relationship === 'custom' && !customRelationship.trim())}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {isSubmitting ? 'Sending...' : 'Submit Request'}
          </button>
        </div>

      </div>
    </div>
  );
}
