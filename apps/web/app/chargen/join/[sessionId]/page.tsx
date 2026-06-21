'use client';

import React, { useEffect, useState } from 'react';
import SessionJoinModal from '../../../../components/chargen/SessionJoinModal';
import { getYDoc } from '../../../../lib/ydoc';
import {
  initProvider,
  destroyProvider,
  getProvider,
  initAndWaitForPersistence,
} from '../../../../lib/sync';
import { useParams } from 'next/navigation';

export default function JoinSessionPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    const doc = getYDoc();
    const currentProvider = getProvider();
    const targetName = `${sessionId}:graph`;

    if (currentProvider && currentProvider.configuration.name !== targetName) {
      destroyProvider();
    }

    let cancelled = false;
    const fallback = setTimeout(() => {
      if (!cancelled) setIsReady(true);
    }, 3000);

    initAndWaitForPersistence(doc, `highport-graph-${sessionId}`).then(() => {
      if (cancelled) return;
      initProvider(doc, sessionId);
      clearTimeout(fallback);
      setIsReady(true);
    });

    sessionStorage.setItem('highport_session_id:graph', sessionId);

    return () => {
      cancelled = true;
      clearTimeout(fallback);
    };
  }, [sessionId]);

  if (!sessionId) return null;

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-zinc-950 to-zinc-950 pointer-events-none" />

      {isReady ? <SessionJoinModal /> : <JoinLoading />}
    </main>
  );
}

function JoinLoading() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-zinc-700 border-t-cyan-500 rounded-full animate-spin" />
      <p className="text-zinc-500 text-sm">Connecting to session...</p>
    </div>
  );
}
