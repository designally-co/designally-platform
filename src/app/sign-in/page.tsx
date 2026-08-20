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
        {/**
         * The Cut, with the Point on it.
         *
         * The page had a mark floating over centred type and read as a form
         * with a logo above it. This is the brand's own graphic instead of
         * decoration: the same rule and the same disc the questionnaire is
         * built on, laid horizontally and running the full width of the
         * window. The door and the survey now rhyme, which is the one thing a
         * sign-in screen for *this* product should do.
         *
         * The line is the same orange as the disc, so it reads as coming out of
         * it rather than passing behind it.
         */}
        <div className="sl-cut">
          <Mark size={60} />
        </div>

        {/**
         * The lockup. Company in display, product beneath it.
         *
         * The two lines were held at one size to avoid a kicker; with the
         * hierarchy opened up they are a name and its subject instead — the
         * company carries the display weight and the product is set small and
         * widely tracked under it, which is a lockup rather than a label over a
         * heading.
         */}
        <h1 className="sl-lockup">
          {/* `Designally&rsquo;s Survey Platform` is the product's name, so the
              possessive belongs in it — the lockup reads as one name across the
              two lines rather than a company with a product filed under it. A
              true apostrophe, not the typewriter one. */}
          <span className="sl-name">Designally&rsquo;s</span>
          <span className="sl-product">Survey Platform</span>
        </h1>

        {/**
         * What the platform is for, in the one place the team sees it.
         *
         * Not "instant insights from a lot of responses", which was the first
         * wording and is untrue twice over: PRODUCT.md records that one
         * respondent is the normal case rather than the degenerate one, and two
         * passes of Opus take about three minutes — see `maxDuration` on the
         * team page. The reading this saves is twenty-one long answers, not
         * twenty-one people.
         *
         * It also stops short of claiming to replace the reading, because
         * CLAUDE.md's milestone 3 is explicit that the engine "does not read the
         * answers for them" and the team still sees every answer. A summary read
         * *before* them is the promise the product actually keeps.
         */}
        <p className="sl-line">The summary you read before the answers.</p>

        {hasGoogleCredentials && (
          <form
            action={async () => {
              'use server';
              await signIn('google', { redirectTo: target });
            }}
          >
            <button className="sl-cta" type="submit">
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
