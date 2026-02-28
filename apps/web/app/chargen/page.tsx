'use client';

import React from 'react';
import Link from 'next/link';
import ChargenWizard from '../../components/chargen/ChargenWizard';
import ChargenNotifications from '../../components/chargen/ChargenNotifications';
import { CosmicBackground } from '@/components/ui/scifi';
import { THEME_HEX, TEXT_COLORS } from '@/lib/design-system/themeUtils';

export default function ChargenPage() {
  return (
    <main
      className="min-h-screen relative overflow-hidden"
      style={{ backgroundColor: 'transparent' }}
    >
      <CosmicBackground intensity="high" showGrid />

      <ChargenNotifications />
      <nav
        className="absolute top-4 left-4 z-20 flex gap-4 p-2 rounded backdrop-blur-md pointer-events-none"
        style={{
          backgroundColor: 'rgba(10, 13, 20, 0.7)',
          border: `1px solid rgba(0, 240, 255, 0.15)`,
        }}
      >
        <Link
          href="/"
          className="px-2 transition-colors pointer-events-auto"
          style={{ color: TEXT_COLORS.label }}
          onMouseEnter={(e) => (e.currentTarget.style.color = TEXT_COLORS.hover)}
          onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_COLORS.label)}
        >
          Home
        </Link>
        <span style={{ color: 'rgba(148, 163, 184, 0.3)' }}>|</span>
        <Link
          href="/graph"
          className="px-2 transition-colors pointer-events-auto"
          style={{ color: TEXT_COLORS.label }}
          onMouseEnter={(e) => (e.currentTarget.style.color = TEXT_COLORS.hover)}
          onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_COLORS.label)}
        >
          Graph
        </Link>
        <Link
          href="/chargen"
          className="font-bold px-2 pointer-events-auto chromatic-text"
          style={{ color: THEME_HEX.cyan }}
        >
          Character Gen
        </Link>
        <Link
          href="/resources"
          className="px-2 transition-colors pointer-events-auto"
          style={{ color: TEXT_COLORS.label }}
          onMouseEnter={(e) => (e.currentTarget.style.color = TEXT_COLORS.hover)}
          onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_COLORS.label)}
        >
          Resources
        </Link>
        <Link
          href="/reputation"
          className="px-2 transition-colors pointer-events-auto"
          style={{ color: TEXT_COLORS.label }}
          onMouseEnter={(e) => (e.currentTarget.style.color = TEXT_COLORS.hover)}
          onMouseLeave={(e) => (e.currentTarget.style.color = TEXT_COLORS.label)}
        >
          Reputation
        </Link>
      </nav>
      <div className="relative z-10 pt-20 px-6 pb-6 h-screen overflow-hidden">
        <ChargenWizard />
      </div>
    </main>
  );
}
