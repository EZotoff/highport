'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Plus, Trash2, Rocket, Calendar } from 'lucide-react';
import { CosmicBackground } from '@/components/ui/scifi';
import { SciFiButton } from '@/components/ui/scifi';
import { SciFiDialog } from '@/components/ui/scifi';
import { GlassPanel } from '@/components/ui/scifi';
import { useToast } from '@/components/ui/ToastContext';

const API_BASE = 'http://localhost:3012';

interface Campaign {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();
  const { data: session } = useSession();

  const fetchCampaigns = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch(`${API_BASE}/api/campaigns`, {
        headers: { 'X-User-Id': session.user.id },
      });
      if (!res.ok) throw new Error('Failed to fetch campaigns');
      const data = await res.json();
      setCampaigns(data);
    } catch (err) {
      showToast('Failed to load campaigns', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, session?.user?.id]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/campaigns/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': session?.user?.id || '' },
      });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete');
      setCampaigns((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      showToast('Campaign deleted', 'success');
    } catch {
      showToast('Failed to delete campaign', 'error');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <main className="relative min-h-screen p-8 overflow-hidden">
      <CosmicBackground showStars intensity="low" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/"
              className="text-xs uppercase tracking-widest mb-2 inline-block transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              ← Highport
            </Link>
            <h1
              className="text-3xl md:text-4xl font-bold tracking-tight font-['Orbitron']"
              style={{
                color: 'var(--text-primary)',
                textShadow: '0 0 20px rgba(0, 240, 255, 0.3)',
              }}
            >
              Campaigns
            </h1>
          </div>
          <SciFiButton
            theme="cyan"
            scifiVariant="primary"
            onClick={() => router.push('/campaigns/new')}
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </SciFiButton>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div
              className="text-sm uppercase tracking-widest animate-pulse"
              style={{ color: 'var(--text-muted)' }}
            >
              Loading campaigns...
            </div>
          </div>
        ) : campaigns.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
              style={{
                background: 'var(--nebula-mist-50)',
                border: '1px solid var(--asteroid-dust-50)',
              }}
            >
              <Rocket className="h-10 w-10" style={{ color: 'var(--plasma-cyan)', opacity: 0.6 }} />
            </div>
            <h2
              className="text-xl font-semibold mb-2 font-['Orbitron'] tracking-wide"
              style={{ color: 'var(--text-primary)' }}
            >
              No campaigns yet
            </h2>
            <p className="mb-8 max-w-md text-center" style={{ color: 'var(--text-secondary)' }}>
              Create your first campaign to start building your Traveller universe — map factions,
              track NPCs, and manage your story.
            </p>
            <SciFiButton
              theme="cyan"
              scifiVariant="primary"
              glow
              onClick={() => router.push('/campaigns/new')}
            >
              <Plus className="h-4 w-4" />
              Create Your First Campaign
            </SciFiButton>
          </div>
        ) : (
          /* Campaign Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((campaign) => (
              <GlassPanel
                key={campaign.id}
                theme="cyan"
                variant="default"
                hoverGlow
                className="group cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
              >
                <Link href={`/campaigns/${campaign.id}`} className="block p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-lg font-semibold font-['Orbitron'] tracking-wide truncate group-hover:text-[var(--plasma-cyan)] transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {campaign.name}
                      </h3>
                      <div
                        className="flex items-center gap-1.5 mt-2 text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(campaign.createdAt)}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteTarget(campaign);
                      }}
                      className="p-2 rounded-md opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-all hover:bg-red-500/10"
                      style={{ color: 'var(--hull-breach-red)' }}
                      title="Delete campaign"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Link>
              </GlassPanel>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <SciFiDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Campaign"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        theme="red"
        footer={
          <div className="flex gap-3 justify-end">
            <SciFiButton
              theme="cyan"
              scifiVariant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </SciFiButton>
            <SciFiButton
              theme="red"
              scifiVariant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Campaign'}
            </SciFiButton>
          </div>
        }
      >
        <div />
      </SciFiDialog>
    </main>
  );
}
