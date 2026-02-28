import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { generateId } from '@highport/shared/utils/id';

interface RegisterBody {
  email: string;
  password: string;
  name?: string;
}

interface VerifyBody {
  email: string;
  password: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const SALT_ROUNDS = 12;

export async function registerAuthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: RegisterBody }>('/api/auth/register', async (request, reply) => {
    const { email, password, name } = request.body;

    if (!email || !EMAIL_REGEX.test(email)) {
      reply.code(400);
      return { error: 'Invalid email address' };
    }

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      reply.code(400);
      return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
    }

    const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase()));

    if (existing.length > 0) {
      reply.code(409);
      return { error: 'A user with this email already exists' };
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const id = generateId('user');

    await db.insert(users).values({
      id,
      email: email.toLowerCase(),
      passwordHash,
      name: name || null,
    });

    return { id, email: email.toLowerCase() };
  });

  fastify.post<{ Body: VerifyBody }>('/api/auth/verify', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      reply.code(400);
      return { error: 'Email and password are required' };
    }

    const result = await db.select().from(users).where(eq(users.email, email.toLowerCase()));

    if (result.length === 0) {
      reply.code(401);
      return { error: 'Invalid email or password' };
    }

    const user = result[0];
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      reply.code(401);
      return { error: 'Invalid email or password' };
    }

    return { id: user.id, email: user.email, name: user.name };
  });
}
