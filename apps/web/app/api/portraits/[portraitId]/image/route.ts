import { auth } from '@/auth';

export async function GET(
  _request: Request,
  { params }: { readonly params: { readonly portraitId: string } },
): Promise<Response> {
  const session = await auth();
  if (!session?.apiToken) return new Response('Authentication required', { status: 401 });
  const server = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:18122';
  const response = await fetch(
    `${server}/api/portraits/${encodeURIComponent(params.portraitId)}/image`,
    {
      headers: { Authorization: `Bearer ${session.apiToken}` },
      cache: 'no-store',
    },
  );
  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') ?? 'application/octet-stream',
      'Cache-Control': 'private, no-store',
    },
  });
}
