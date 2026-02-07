'use client';

import Link from 'next/link';
import { CosmicBackground } from '@/components/ui/scifi';

const navLinks = [
  { href: '/chargen', label: 'Character Gen', description: 'Create Traveller characters', icon: '👤' },
  { href: '/graph', label: 'Campaign Graph', description: 'Visualize entities & relationships', icon: '🌐' },
  { href: '/reputation', label: 'Reputation', description: 'Track faction standings', icon: '⚖️' },
  { href: '/resources', label: 'Resources', description: 'Reference materials', icon: '📚' },
  { href: '/chat', label: 'Ask Computer', description: 'AI-powered campaign assistant', icon: '🖥️' },
];

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center text-center p-8 overflow-hidden">
      <CosmicBackground showStars intensity="medium" />
      
      <div className="relative z-10">
        <h1 
          className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4 tracking-tight font-['Orbitron']"
          style={{ 
            color: 'var(--text-primary)',
            textShadow: '0 0 30px rgba(0, 240, 255, 0.5), 0 0 60px rgba(0, 240, 255, 0.3)'
          }}
        >
          PlaneShift
        </h1>
        <p 
          className="text-lg md:text-xl mb-12 font-light tracking-wide"
          style={{ color: 'var(--text-secondary)' }}
        >
          Campaign Management for Mongoose Traveller 2e
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {navLinks.map((link) => (
            <Link 
              key={link.href}
              href={link.href} 
              className="group relative px-6 py-5 rounded-lg border transition-all duration-300 hover:scale-105 hover:-translate-y-1"
              style={{
                background: 'rgba(26, 31, 46, 0.8)',
                borderColor: 'rgba(61, 69, 85, 0.5)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div 
                className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  boxShadow: '0 0 20px rgba(0, 240, 255, 0.3), inset 0 0 20px rgba(0, 240, 255, 0.05)',
                }}
              />
              
              <div className="absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2 border-transparent group-hover:border-[var(--plasma-cyan)] transition-colors duration-300 rounded-tl" />
              <div className="absolute top-0 right-0 w-3 h-3 border-r-2 border-t-2 border-transparent group-hover:border-[var(--plasma-cyan)] transition-colors duration-300 rounded-tr" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-l-2 border-b-2 border-transparent group-hover:border-[var(--plasma-cyan)] transition-colors duration-300 rounded-bl" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 border-transparent group-hover:border-[var(--plasma-cyan)] transition-colors duration-300 rounded-br" />
              
              <div className="relative z-10 flex flex-col items-center gap-2 text-center">
                <span className="text-2xl">{link.icon}</span>
                <span 
                  className="text-lg font-semibold tracking-wide group-hover:text-[var(--plasma-cyan)] transition-colors leading-tight"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {link.label}
                </span>
                <span 
                  className="text-sm leading-snug line-clamp-2 min-h-[2.5rem]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {link.description}
                </span>
              </div>
            </Link>
          ))}
        </div>
        
        <p 
          className="mt-16 text-xs tracking-widest uppercase"
          style={{ color: 'var(--text-muted)' }}
        >
          Traveller is © Mongoose Publishing
        </p>
      </div>
    </main>
  );
}
