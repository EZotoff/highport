import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-950/50 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        <p className="text-sm font-medium text-zinc-500">Loading graph...</p>
      </div>
    </div>
  );
}
