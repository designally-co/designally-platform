'use client';

import Sheet from './sheet';

/**
 * Settings — 20 August 2026.
 *
 * **Nothing in this product is configurable, and this sheet says so rather than
 * inventing something to hold.** There are no preferences: the questionnaire is
 * fixed at version 6 and the branding team owns its wording, the survey's
 * default of fourteen days lives in `DEFAULT_DUE_DAYS`, and who may sign in is
 * the designally.co Workspace rather than a list anybody here maintains.
 *
 * What it holds is the one thing a person opens a gear expecting to find and
 * could not: the way out. Sign out was in the toolbar's More menu, and that
 * menu went when Past projects moved onto the projects sheet — leaving one item
 * behind an ellipsis, which is where nobody looks for it.
 *
 * The identity above it is not decoration. Team access is Google OAuth
 * restricted to one Workspace and it dies with the account, so *which* account
 * this browser is signed in as is the whole of the access model, and it is
 * worth being able to read it before pressing the button that ends it.
 *
 * The address is shown in full rather than elided. It is the team's own work
 * address, on the team's own screen, and the reason to read it is to check the
 * part after the @.
 */
export default function SettingsSheet({
  name,
  email,
  onClose,
  signOut,
}: {
  name: string | null;
  email: string | null;
  onClose: () => void;
  signOut: () => Promise<void>;
}) {
  return (
    <Sheet title="Settings" narrow surface="paper" onClose={onClose}>
      <div className="pd-sec">
        <h3 className="pd-h">Signed in</h3>
        {/* A name the app has never had is not an error state — a Google
            account can carry an address and no display name. The address is
            the identity that matters and it is always there. */}
        {name && <p className="setname">{name}</p>}
        <p className="setmail">{email ?? 'No address on this session.'}</p>
      </div>

      <div className="pd-sec">
        <h3 className="pd-h">Access</h3>
        <p className="hintline">
          Sign-in is Google, restricted to the designally.co Workspace. There is no other way in,
          and no accounts are kept here — removing somebody from the Workspace removes them from
          this.
        </p>
        {/* A form, because signing out is a server action and this has to work
            without JavaScript for the same reason the sign-in page does. */}
        <form action={signOut} className="setout">
          <button className="btn btn-outline" type="submit">
            Sign out
          </button>
        </form>
      </div>
    </Sheet>
  );
}
