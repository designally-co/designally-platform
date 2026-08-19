import { redirect } from 'next/navigation';
import Mark from '../mark';

import { auth, signIn, ALLOWED_DOMAIN, devSignInEnabled, hasGoogleCredentials } from '@/auth';

export const dynamic = 'force-dynamic';

export default async function SignIn(props: PageProps<'/sign-in'>) {
  const session = await auth();
  const { from } = await props.searchParams;
  const target = typeof from === 'string' && from.startsWith('/') ? from : '/';

  if (session?.user) redirect(target);

  return (
    <main className="signin">
      <div className="card">
        <Mark size={44} />
        <h1>Sign in</h1>
        <p>
          The team app is for {ALLOWED_DOMAIN} accounts. Client questionnaires need no sign-in —
          they open straight from their link.
        </p>

        {hasGoogleCredentials && (
          <form
            action={async () => {
              'use server';
              await signIn('google', { redirectTo: target });
            }}
          >
            <button className="btn btn-primary" type="submit">
              Continue with Google
            </button>
          </form>
        )}

        {devSignInEnabled && (
          <form
            action={async (formData: FormData) => {
              'use server';
              await signIn('dev', {
                email: String(formData.get('email') ?? ''),
                name: String(formData.get('name') ?? ''),
                redirectTo: target,
              });
            }}
          >
            <p className="warn">
              <b>Development sign-in.</b> No Google OAuth client is configured, so this stands in
              for it. It is not built into a production bundle, and it still refuses any address
              outside {ALLOWED_DOMAIN}.
            </p>
            <div className="field">
              <label className="f" htmlFor="dev-email">
                Email
              </label>
              <input
                id="dev-email"
                name="email"
                type="email"
                className="input"
                required
                defaultValue={`you@${ALLOWED_DOMAIN}`}
              />
            </div>
            <div className="field">
              <label className="f" htmlFor="dev-name">
                Name
              </label>
              <input id="dev-name" name="name" type="text" className="input" defaultValue="Khun Nan" />
            </div>
            <button className="btn btn-primary" type="submit">
              Sign in
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
