import React from 'react';
import { Info } from 'lucide-react';

export function RagUnavailableNotice() {
  return (
    <div className="flex w-full mb-4 justify-start">
      <div className="max-w-[80%] rounded-lg px-4 py-3 text-sm bg-muted text-muted-foreground border border-border">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p className="leading-relaxed">
            AI features are optional. To enable the Ask Computer assistant, see{' '}
            <a
              href="https://github.com/EZotoff/highport/blob/main/docs/rag-setup.md"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              docs/rag-setup.md
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
