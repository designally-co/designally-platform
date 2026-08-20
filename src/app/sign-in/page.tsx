import { redirect } from 'next/navigation';

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
         * The lockup. Company in display, product beneath it.
         *
         * The two lines were held at one size to avoid a kicker; with the
         * hierarchy opened up they are a name and its subject instead — the
         * company carries the display weight and the product is set small and
         * widely tracked under it, which is a lockup rather than a label over a
         * heading.
         */}
        <h1 className="sl-lockup">
          <span className="sl-name">Designally</span>
          <span className="sl-product">Survey Platform</span>
        </h1>

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

      {/* The mark stands in the colour, not on the white — white ink on the
          orange it was drawn for, no disc needed. It anchors the lower half so
          the field reads as composed rather than as leftover space. */}
      <span className="sl-seal" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/designally-mark.png" alt="" width={290} height={256} />
      </span>

      {/* Grain, fixed and inert. A colour field this large bands on an 8-bit
          panel; a little noise breaks the steps and gives the orange a printed
          surface rather than a rendered one. */}
      <span className="sl-grain" aria-hidden="true" />
    </main>
  );
}
