import { useSession } from 'next-auth/react';
import { getOrCreateUser } from '../identity';
import { LOCAL_MODE } from './commands';

export function useChargenUserId(): string {
  const { data: identity, status } = useSession();
  if (identity?.user?.id) return identity.user.id;
  // Match chargenCommand's offline boundary: never use mock ownership online
  // or while NextAuth is still loading. Existing documents remain readable.
  if (status === 'unauthenticated' && LOCAL_MODE) return getOrCreateUser().userId;
  return '';
}
