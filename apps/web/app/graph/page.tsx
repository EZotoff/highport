import Link from 'next/link';
import GraphCanvas from '../../components/graph/GraphCanvas';

export default function GraphPage() {
  return (
    <main className="bg-zinc-950 min-h-screen relative">
      <nav className="absolute top-4 left-4 z-50 flex flex-wrap gap-x-3 gap-y-1 bg-zinc-900/80 p-2 rounded backdrop-blur border border-zinc-800 pointer-events-none text-sm">
        <Link href="/" className="text-zinc-400 hover:text-zinc-200 px-2 transition-colors pointer-events-auto">Home</Link>
        <span className="text-zinc-600">|</span>
        <Link href="/graph" className="text-zinc-200 hover:text-white font-bold px-2 pointer-events-auto">Graph</Link>
        <Link href="/resources" className="text-zinc-400 hover:text-zinc-200 px-2 transition-colors pointer-events-auto">Resources</Link>
        <Link href="/reputation" className="text-zinc-400 hover:text-zinc-200 px-2 transition-colors pointer-events-auto">Reputation</Link>
      </nav>
      <div className="h-screen w-full">
        <GraphCanvas />
      </div>
    </main>
  );
}
