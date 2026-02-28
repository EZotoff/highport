'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3012';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: name || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      // Auto-login after successful registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: '/',
      });

      if (result?.url) {
        window.location.href = result.url;
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-xl border p-8"
      style={{
        background: 'var(--star-metal-90)',
        borderColor: 'var(--asteroid-dust-50)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="text-center mb-8">
        <h1
          className="text-3xl font-bold tracking-tight font-['Orbitron'] mb-2"
          style={{
            color: 'var(--text-heading)',
            textShadow: '0 0 20px rgba(0, 240, 255, 0.4)',
          }}
        >
          Highport
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Create your account
        </p>
      </div>

      {error && (
        <div
          className="mb-6 px-4 py-3 rounded-lg border text-sm"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label
            htmlFor="name"
            className="text-xs font-bold uppercase tracking-wider ml-1"
            style={{ color: 'var(--text-label)' }}
          >
            Name{' '}
            <span className="font-normal normal-case" style={{ color: 'var(--text-muted)' }}>
              (optional)
            </span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="Commander Jameson"
            className="w-full px-4 py-3 rounded-lg border text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-200"
            style={{
              background: 'var(--star-metal)',
              borderColor: 'var(--asteroid-dust-50)',
            }}
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="text-xs font-bold uppercase tracking-wider ml-1"
            style={{ color: 'var(--text-label)' }}
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="pilot@highport.space"
            className="w-full px-4 py-3 rounded-lg border text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-200"
            style={{
              background: 'var(--star-metal)',
              borderColor: 'var(--asteroid-dust-50)',
            }}
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="text-xs font-bold uppercase tracking-wider ml-1"
            style={{ color: 'var(--text-label)' }}
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Min. 8 characters"
            className="w-full px-4 py-3 rounded-lg border text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all duration-200"
            style={{
              background: 'var(--star-metal)',
              borderColor: 'var(--asteroid-dust-50)',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg font-semibold tracking-wide font-['Orbitron'] text-sm transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'var(--plasma-cyan)',
            color: 'var(--deep-void)',
          }}
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium hover:underline"
          style={{ color: 'var(--plasma-cyan)' }}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
