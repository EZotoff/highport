/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Trojan Reach Deep Space Theme
        'deep-void': '#0a0d14',
        'star-metal': '#1a1f2e',
        'nebula-mist': '#242b3d',
        'asteroid-dust': '#3d4555',
        // Neon Accents
        'plasma-cyan': '#00f0ff',
        'impulse-violet': '#8b5cf6',
        'reactor-amber': '#f59e0b',
        'warp-emerald': '#10b981',
        'hull-breach-red': '#ef4444',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'system-ui', 'sans-serif'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        dash: 'dash 2s linear infinite',
        sheen: 'sheen 3s ease-in-out infinite',
        float: 'float 4s ease-in-out infinite',
        'spin-slow': 'spin 20s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px var(--glow-color, rgba(0, 240, 255, 0.3))' },
          '50%': {
            boxShadow:
              '0 0 40px var(--glow-color, rgba(0, 240, 255, 0.5)), 0 0 60px var(--glow-color, rgba(0, 240, 255, 0.3))',
          },
        },
        dash: {
          from: { strokeDashoffset: '20' },
          to: { strokeDashoffset: '0' },
        },
        sheen: {
          '0%': { transform: 'translateX(-100%) skewX(-20deg)' },
          '100%': { transform: 'translateX(200%) skewX(-20deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 240, 255, 0.4)',
        'glow-violet': '0 0 20px rgba(139, 92, 246, 0.4)',
        'glow-amber': '0 0 20px rgba(245, 158, 11, 0.4)',
        'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.4)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.4)',
      },
    },
  },
  plugins: [],
};
