'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';
import { SciFiButton } from '@/components/ui/scifi';
import { exportObsidianVault } from '@/lib/obsidian-export';
import { getSessionId } from '@/lib/sync';
import { getNodesMap, getYDoc } from '@/lib/ydoc';
import { yMapToNode } from '@/lib/yjs-helpers';

export function ExportButton() {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);

    try {
      const doc = getYDoc();
      const nodesMap = getNodesMap(doc);
      const nodes = Array.from(nodesMap.values()).map((nodeMap) => yMapToNode(nodeMap));
      const campaignId = getSessionId('graph');

      const zipBytes = await exportObsidianVault(nodes, campaignId, new Date().toISOString());
      const browserBytes = new Uint8Array(zipBytes.byteLength);
      browserBytes.set(zipBytes);
      const blob = new Blob([browserBytes], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `highport-obsidian-${campaignId}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <SciFiButton
      type="button"
      onClick={handleExport}
      theme="emerald"
      scifiVariant="outline"
      size="sm"
      disabled={exporting}
    >
      <Download className="h-4 w-4" />
      {exporting ? 'Exporting...' : 'Export Vault'}
    </SciFiButton>
  );
}
