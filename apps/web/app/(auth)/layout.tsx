import { CosmicBackground } from '@/components/ui/scifi';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <CosmicBackground showStars intensity="medium" />
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </main>
  );
}
