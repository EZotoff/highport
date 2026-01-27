import Link from 'next/link';

export default function Home() {
  return (
    <main className="bg-zinc-950 min-h-screen flex flex-col items-center justify-center text-center p-8">
      <h1 className="text-4xl font-bold text-zinc-100 mb-8 tracking-tighter">PlaneShift</h1>
      <div className="flex gap-6">
        <Link 
          href="/graph" 
          className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg border border-zinc-700 transition-all hover:scale-105"
        >
          Graph
        </Link>
        <Link 
          href="/reputation" 
          className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg border border-zinc-700 transition-all hover:scale-105"
        >
          Reputation
        </Link>
        <Link 
          href="/resources" 
          className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg border border-zinc-700 transition-all hover:scale-105"
        >
          Resources
        </Link>
      </div>
    </main>
  );
}
