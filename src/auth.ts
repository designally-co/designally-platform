import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';

/**
 * Google OAuth, restricted to the designally.co Workspace. One identity source,
 * nobody manages another password, and access dies with the Workspace account.
 *
 * The domain check is enforced three times over, because each one alone can be
 * worked around: `hd` on the authorisation request narrows the account picker,
 * the `hd` claim on the returned profile is checked server-side, and the email
 * itself must end in the domain and be verified. The account picker hint is a
 * convenience; the other two are the gate.
 */
export const ALLOWED_DOMAIN = 'designally.co';

declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user'];
  }
}

const hasGoogleCredentials = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

/**
 * Development sign-in, for working on the team app before an OAuth client
 * exists. It is only constructed when the build is not a production build AND
 * no Google credentials are configured, so it cannot be reached on Vercel.
 */
const devSignInEnabled = process.env.NODE_ENV !== 'production' && !hasGoogleCredentials;

/**
 * Without Google credentials a production build has no providers at all — it
 * fails safe, but it fails silently, and a deploy nobody can sign into is worth
 * catching at build time rather than on Monday morning.
 */
if (process.env.NODE_ENV === 'production' && !hasGoogleCredentials) {
  throw new Error(
    'AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET must be set in production — the team app has no ' +
      'other way in, and the development sign-in is not built into a production bundle. ' +
      'To build locally without an OAuth client, pass placeholders: ' +
      'AUTH_GOOGLE_ID=x AUTH_GOOGLE_SECRET=y npm run build',
  );
}

function emailIsAllowed(email: string | null | undefined) {
  return typeof email === 'string' && email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}

/** The team member behind a *_by column. Created on first sign-in. */
async function upsertUser(email: string, name: string) {
  const db = await getDb();
  const address = email.toLowerCase();

  const [existing] = await db.select().from(users).where(eq(users.email, address)).limit(1);
  if (existing) {
    if (name && name !== existing.name) {
      await db.update(users).set({ name }).where(eq(users.id, existing.id));
    }
    return existing.id;
  }

  const [created] = await db
    .insert(users)
    .values({ email: address, name: name || address })
    .returning();
  return created.id;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    ...(hasGoogleCredentials
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            authorization: {
              params: { hd: ALLOWED_DOMAIN, prompt: 'select_account' },
            },
          }),
        ]
      : []),
    ...(devSignInEnabled
      ? [
          Credentials({
            id: 'dev',
            name: 'Development sign-in',
            credentials: { email: {}, name: {} },
            authorize: async (raw) => {
              const email = String(raw?.email ?? '').toLowerCase();
              if (!emailIsAllowed(email)) return null;
              return { email, name: String(raw?.name ?? '') || email };
            },
          }),
        ]
      : []),
  ],

  pages: { signIn: '/sign-in' },

  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider === 'google') {
        // profile.hd is set by Google for Workspace accounts only
        const hd = (profile as { hd?: string } | undefined)?.hd;
        const verified = (profile as { email_verified?: boolean } | undefined)?.email_verified;
        if (hd !== ALLOWED_DOMAIN) return false;
        if (verified === false) return false;
      }
      return emailIsAllowed(user?.email ?? profile?.email);
    },

    async jwt({ token, user }) {
      // only on the sign-in pass, when `user` is present
      if (user?.email && emailIsAllowed(user.email)) {
        token.uid = await upsertUser(user.email, user.name ?? '');
      }
      return token;
    },

    async session({ session, token }) {
      if (token.uid) session.user.id = token.uid as string;
      return session;
    },
  },
});

export { devSignInEnabled, hasGoogleCredentials };
