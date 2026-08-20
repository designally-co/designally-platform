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
    /* `deck paper` — the door stands on the same ground as the room. Without it
       this page kept the old grammar, a white card on a grey page, while the app
       behind it and every sheet in it had inverted. See `.deck.paper`. */
    <main className="signin deck paper">
      <div className="card">
        <Mark size={44} />
        {/**
         * The product, not the act — 20 August 2026, asked for.
         *
         * It read `Sign in` over a paragraph, which is the button's own word
         * used as a heading: the only control on the card already says
         * *Continue with Google*, so the largest type on the page was spending
         * itself on something nobody could mistake. What a door should say is
         * which building it opens, and it never did.
         *
         * One heading rather than a small `Designally` above a larger `Survey
         * Platform`. That arrangement is a kicker, and DESIGN.md's floor bans
         * it outright — the heading carries its own weight. The two lines are
         * one object here: the company sets the line, the product answers it,
         * and neither is a label on the other.
         */}
        <h1>
          Designally
          <span>Survey Platform</span>
        </h1>
        {/* The half of the old paragraph that still does something. Which
            accounts may pass is a fact somebody needs *before* they press a
            Google button and get refused; that clients need no sign-in was
            true and told to the one audience that never reads this screen. */}
        <p>For {ALLOWED_DOMAIN} accounts.</p>

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
