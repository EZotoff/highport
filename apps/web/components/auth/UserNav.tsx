'use client';

import { useSession, signOut } from 'next-auth/react';

export function UserNav() {
  const { data: session } = useSession();

  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs tracking-wide font-mono" style={{ color: 'var(--text-secondary)' }}>
        {session.user.email}
      </span>
      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider border transition-all duration-200 hover:brightness-125"
        style={{
          color: 'var(--text-secondary)',
          borderColor: 'var(--asteroid-dust-50)',
          background: 'transparent',
        }}
      >
        Logout
      </button>
    </div>
  );
}
