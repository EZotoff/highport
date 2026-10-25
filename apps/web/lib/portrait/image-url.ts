export function normalizeImageUrl(imageUrl?: string): string | undefined {
  if (!imageUrl) return undefined;
  const server = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:18122';
  const url = new URL(imageUrl, server);
  if (
    url.origin === new URL(server).origin &&
    /^\/api\/portraits\/[^/]+\/image$/.test(url.pathname)
  )
    return url.pathname;
  return url.href;
}
