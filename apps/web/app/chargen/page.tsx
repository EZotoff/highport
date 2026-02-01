'use client';

import React from 'react';
import Link from 'next/link';
import ChargenWizard from '../../components/chargen/ChargenWizard';
import ChargenNotifications from '../../components/chargen/ChargenNotifications';

export default function ChargenPage() {
  return (
    <main className="bg-zinc-950 min-h-screen">
      <ChargenNotifications />
      <nav className="absolute top-4 left-4 z-50 flex gap-4 bg-zinc-900/80 p-2 rounded backdrop-blur border border-zinc-800">
        <Link href="/" className="text-zinc-400 hover:text-zinc-200 px-2 transition-colors">Home</Link>
        <span className="text-zinc-600">|</span>
        <Link href="/graph" className="text-zinc-400 hover:text-zinc-200 px-2 transition-colors">Graph</Link>
        <Link href="/chargen" className="text-zinc-200 hover:text-white font-bold px-2">Character Gen</Link>
        <Link href="/resources" className="text-zinc-400 hover:text-zinc-200 px-2 transition-colors">Resources</Link>
        <Link href="/reputation" className="text-zinc-400 hover:text-zinc-200 px-2 transition-colors">Reputation</Link>
      </nav>
      <div className="pt-20 px-6 pb-6 h-screen overflow-hidden">
        <ChargenWizard />
      </div>
    </main>
  );
}
