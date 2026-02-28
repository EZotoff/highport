'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CosmicBackground } from '@/components/ui/scifi';
import { SciFiButton } from '@/components/ui/scifi';
import { SciFiInput } from '@/components/ui/scifi';
import { GlassPanel } from '@/components/ui/scifi';
import { useToast } from '@/components/ui/ToastContext';

const API_BASE = 'http://localhost:3012';

export default function NewCampaignPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast('Campaign name is required', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          ownerId: 'anonymous', // Will be replaced when auth is wired in Task 11
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create campaign');
      }

      const created = await res.json();
      showToast('Campaign created!', 'success');
      router.push(`/campaigns/${created.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create campaign', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen p-8 overflow-hidden">
      <CosmicBackground showStars intensity="low" />

      <div className="relative z-10 max-w-xl mx-auto">
        {/* Back link */}
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest mb-6 transition-colors hover:text-[var(--plasma-cyan)]"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Campaigns
        </Link>

        <h1
          className="text-2xl md:text-3xl font-bold tracking-tight font-['Orbitron'] mb-8"
          style={{
            color: 'var(--text-primary)',
            textShadow: '0 0 20px rgba(0, 240, 255, 0.3)',
          }}
        >
          New Campaign
        </h1>

        <GlassPanel theme="cyan" variant="bordered" className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <SciFiInput
              label="Campaign Name"
              placeholder="e.g. Pirates of Drinax"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              maxLength={255}
            />

            <div className="w-full space-y-1.5">
              <label
                htmlFor="description"
                className="text-xs font-bold uppercase tracking-wider ml-1"
                style={{ color: 'var(--text-label)' }}
              >
                Description (optional)
              </label>
              <textarea
                id="description"
                placeholder="A brief note about your campaign..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-lg text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-200 resize-none"
                style={{
                  background: 'var(--star-metal)',
                  border: '1px solid var(--asteroid-dust-50)',
                }}
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <SciFiButton
                type="button"
                theme="cyan"
                scifiVariant="ghost"
                onClick={() => router.push('/campaigns')}
                disabled={submitting}
              >
                Cancel
              </SciFiButton>
              <SciFiButton
                type="submit"
                theme="cyan"
                scifiVariant="primary"
                disabled={submitting || !name.trim()}
              >
                {submitting ? 'Creating...' : 'Create Campaign'}
              </SciFiButton>
            </div>
          </form>
        </GlassPanel>
      </div>
    </main>
  );
}
