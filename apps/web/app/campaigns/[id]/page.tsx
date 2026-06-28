'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, Map, Calendar, User } from 'lucide-react';
import { CosmicBackground } from '@/components/ui/scifi';
import { SciFiButton } from '@/components/ui/scifi';
import { GlassPanel } from '@/components/ui/scifi';
import { useToast } from '@/components/ui/ToastContext';

const API_BASE = 'http://localhost:18122';

interface Campaign {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { showToast } = useToast();
  const { data: session } = useSession();

  useEffect(() => {
    async function load() {
      if (!session?.user?.id) return;
      try {
        const res = await fetch(`${API_BASE}/api/campaigns/${params.id}`, {
          headers: { 'X-User-Id': session.user.id },
        });
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error('Failed to load campaign');
        const data = await res.json();
        setCampaign(data);
      } catch {
        showToast('Failed to load campaign', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, showToast, session?.user?.id]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <main className="relative min-h-screen p-8 overflow-hidden">
      <CosmicBackground showStars intensity="low" />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Back link */}
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest mb-6 transition-colors hover:text-[var(--plasma-cyan)]"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Campaigns
        </Link>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div
              className="text-sm uppercase tracking-widest animate-pulse"
              style={{ color: 'var(--text-muted)' }}
            >
              Loading...
            </div>
          </div>
        ) : notFound ? (
          <div className="flex flex-col items-center justify-center py-24">
            <h2
              className="text-xl font-semibold mb-2 font-['Orbitron'] tracking-wide"
              style={{ color: 'var(--text-primary)' }}
            >
              Campaign Not Found
            </h2>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
              This campaign doesn&apos;t exist or may have been deleted.
            </p>
            <Link href="/campaigns">
              <SciFiButton theme="cyan" scifiVariant="secondary">
                Back to Campaigns
              </SciFiButton>
            </Link>
          </div>
        ) : campaign ? (
          <>
            <h1
              className="text-3xl md:text-4xl font-bold tracking-tight font-['Orbitron'] mb-6"
              style={{
                color: 'var(--text-primary)',
                textShadow: '0 0 20px rgba(0, 240, 255, 0.3)',
              }}
            >
              {campaign.name}
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <GlassPanel theme="cyan" variant="default" className="p-5">
                <div className="flex items-center gap-3">
                  <Calendar
                    className="h-5 w-5 flex-shrink-0"
                    style={{ color: 'var(--plasma-cyan)' }}
                  />
                  <div>
                    <div
                      className="text-xs uppercase tracking-wider mb-0.5"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Created
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {formatDate(campaign.createdAt)}
                    </div>
                  </div>
                </div>
              </GlassPanel>

              <GlassPanel theme="violet" variant="default" className="p-5">
                <div className="flex items-center gap-3">
                  <User
                    className="h-5 w-5 flex-shrink-0"
                    style={{ color: 'var(--impulse-violet)' }}
                  />
                  <div>
                    <div
                      className="text-xs uppercase tracking-wider mb-0.5"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Owner
                    </div>
                    <div className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                      {campaign.ownerId}
                    </div>
                  </div>
                </div>
              </GlassPanel>
            </div>

            {/* Actions */}
            <GlassPanel theme="cyan" variant="bordered" className="p-6">
              <h2
                className="text-lg font-semibold font-['Orbitron'] tracking-wide mb-4"
                style={{ color: 'var(--text-primary)' }}
              >
                Campaign Tools
              </h2>
              <div className="flex flex-wrap gap-3">
                <Link href={`/graph?campaign=${campaign.id}`}>
                  <SciFiButton theme="cyan" scifiVariant="primary">
                    <Map className="h-4 w-4" />
                    Open Graph
                  </SciFiButton>
                </Link>
              </div>
            </GlassPanel>
          </>
        ) : null}
      </div>
    </main>
  );
}
