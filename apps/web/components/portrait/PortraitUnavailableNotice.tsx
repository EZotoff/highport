'use client';

import React from 'react';
import { Info } from 'lucide-react';
import { THEME_HEX, TEXT_COLORS } from '@/lib/design-system/themeUtils';

export function PortraitUnavailableNotice() {
  return (
    <div
      className="rounded-lg px-4 py-3 text-sm border"
      style={{
        backgroundColor: THEME_HEX.cyan + '0d',
        borderColor: THEME_HEX.cyan + '26',
        color: TEXT_COLORS.subtle,
      }}
    >
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 mt-0.5 shrink-0" style={{ color: THEME_HEX.cyan }} />
        <p className="leading-relaxed">
          AI features are optional. To enable portrait generation and remixing, see{' '}
          <a
            href="https://github.com/EZotoff/highport/blob/main/docs/rag-setup.md"
            target="_blank"
            rel="noopener noreferrer"
            className="underline transition-colors"
            style={{ color: THEME_HEX.cyan }}
          >
            docs/rag-setup.md
          </a>
          .
        </p>
      </div>
    </div>
  );
}
