'use client';

import React, { useEffect } from 'react';
import SessionJoinModal from '../../../../components/chargen/SessionJoinModal';
import { getYDoc } from '../../../../lib/ydoc';
import { initProvider, destroyProvider, getProvider } from '../../../../lib/sync';
import { useParams } from 'next/navigation';

export default function JoinSessionPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  useEffect(() => {
    if (!sessionId) return;

    const doc = getYDoc();
    const currentProvider = getProvider();

    // Check if we need to switch connection
    // We assume the provider name should be `${sessionId}:graph`
    const targetName = `${sessionId}:graph`;

    if (currentProvider && currentProvider.configuration.name !== targetName) {
      console.log(
        `[Join] Switching session from ${currentProvider.configuration.name} to ${targetName}`,
      );
      destroyProvider();
    }

    // Connect (initProvider is idempotent if name matches)
    initProvider(doc, sessionId);
  }, [sessionId]);

  if (!sessionId) return null;

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-zinc-950 to-zinc-950 pointer-events-none" />

      <SessionJoinModal />
    </main>
  );
}
