import NextAuth from 'next-auth';
import type { DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

declare module 'next-auth' {
  interface Session {
    user?: DefaultSession['user'] & {
      id?: string;
    };
    hocuspocusToken?: string;
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18122';
const HOCUSPOCUS_JWT_PURPOSE = 'hocuspocus' as const;
const HOCUSPOCUS_JWT_TTL_SECONDS = 5 * 60;

type HocuspocusJwtPayload = {
  readonly sub: string;
  readonly email?: string;
  readonly name?: string;
  readonly purpose: typeof HOCUSPOCUS_JWT_PURPOSE;
  readonly iat: number;
  readonly exp: number;
};

function getHocuspocusJwtSecret(): string {
  const secret = process.env.HOCUSPOCUS_JWT_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('Missing AUTH_SECRET for Hocuspocus token signing');
  }
  return secret;
}

function base64UrlEncode(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

async function signHocuspocusJwt(payload: HocuspocusJwtPayload): Promise<string> {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getHocuspocusJwtSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function createHocuspocusToken(session: DefaultSession, userId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return signHocuspocusJwt({
    sub: userId,
    email: session.user?.email ?? undefined,
    name: session.user?.name ?? undefined,
    purpose: HOCUSPOCUS_JWT_PURPOSE,
    iat: now,
    exp: now + HOCUSPOCUS_JWT_TTL_SECONDS,
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const res = await fetch(`${API_URL}/api/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!res.ok) {
            return null;
          }

          const user = await res.json();

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.id === 'string') {
        session.user.id = token.id;
        session.hocuspocusToken = await createHocuspocusToken(session, token.id);
      }
      return session;
    },
  },
  trustHost: true,
});
