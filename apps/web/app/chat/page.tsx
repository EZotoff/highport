import Link from 'next/link';
import { ChatInterface } from '../../components/chat/ChatInterface';

export const metadata = {
  title: 'Chat - Highport',
  description: 'Ask questions about your campaign',
};

export default function ChatPage() {
  return (
    <main className="bg-zinc-950 min-h-screen relative">
      <nav className="absolute top-4 left-4 z-50 flex gap-4 bg-zinc-900/80 p-2 rounded backdrop-blur border border-zinc-800">
        <Link href="/" className="text-zinc-400 hover:text-zinc-200 px-2 transition-colors">Home</Link>
        <span className="text-zinc-600">|</span>
        <Link href="/graph" className="text-zinc-400 hover:text-zinc-200 px-2 transition-colors">Graph</Link>
        <Link href="/resources" className="text-zinc-400 hover:text-zinc-200 px-2 transition-colors">Resources</Link>
        <Link href="/reputation" className="text-zinc-400 hover:text-zinc-200 px-2 transition-colors">Reputation</Link>
        <Link href="/chat" className="text-zinc-200 hover:text-white font-bold px-2">Chat</Link>
      </nav>
      <div className="h-screen w-full flex items-center justify-center p-4">
        <ChatInterface />
      </div>
    </main>
  );
}
