import React, { useState, useEffect } from 'react';
import type { SharedSpawnedEntity, ConnectionRelationship } from '../../lib/chargen/types';
import { requestConnection } from '../../lib/chargen/state';
import { getYDoc } from '../../lib/ydoc';
import { SciFiInput, SciFiSelect, SciFiButton } from '@/components/ui/scifi';

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
  const modalRef = React.useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!modalRef.current) return;
    const container = modalRef.current;
    const selectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusables = Array.from(container.querySelectorAll<HTMLElement>(selectors)).filter(el => !el.hasAttribute('disabled'));
    focusables[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = Array.from(container.querySelectorAll<HTMLElement>(selectors)).filter(el => !el.hasAttribute('disabled'));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', onKeyDown);
    return () => container.removeEventListener('keydown', onKeyDown);
  }, []);

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

      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="connection-request-title" className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden">
        
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
           <h2 id="connection-request-title" className="text-lg font-semibold text-heading uppercase tracking-wide text-sm font-display">
            Request Connection
          </h2>
        </div>

        <div className="p-6 space-y-6">
          
          <div className="space-y-1">
            <p className="text-label">
              <span className="text-subtle">Connect to:</span> <span className="font-medium text-heading">{entity.name}</span>
            </p>
            {originalOwnerName && (
              <p className="text-sm text-subtle">
                <span className="text-subtle">Original:</span> {originalOwnerName}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="relationship" className="block text-sm font-medium text-subtle">
              Your relationship:
            </label>
            <SciFiSelect
              id="relationship"
              ariaLabel="Relationship type"
              value={relationship}
              onValueChange={(val) => setRelationship(val as ConnectionRelationship)}
              options={RELATIONSHIP_OPTIONS}
              theme="cyan"
            />
          </div>

          {relationship === 'custom' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <label htmlFor="customRelationship" className="block text-sm font-medium text-subtle">
                Specify relationship:
              </label>
              <SciFiInput
                id="customRelationship"
                type="text"
                value={customRelationship}
                onChange={(e) => setCustomRelationship(e.target.value)}
                placeholder="e.g. Estranged Sibling"
                theme="cyan"
                autoFocus
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="note" className="block text-sm font-medium text-subtle">
              How do you know them?
            </label>
            <textarea
              id="note"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="We served together on the ISS Resolute before their falling out with Marcus..."
              className="w-full min-h-[44px] bg-zinc-950 border border-zinc-700 text-default text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 resize-none"
            />
          </div>

        </div>

        <div className="px-6 py-4 bg-zinc-900 border-t border-zinc-800 flex justify-end gap-3">
          <SciFiButton
            onClick={onClose}
            theme="slate"
            scifiVariant="ghost"
          >
            Cancel
          </SciFiButton>
          <SciFiButton
            onClick={handleSubmit}
            disabled={isSubmitting || (relationship === 'custom' && !customRelationship.trim())}
            theme="cyan"
            glow
          >
            {isSubmitting ? 'Sending...' : 'Submit Request'}
          </SciFiButton>
        </div>

      </div>
    </div>
  );
}
