'use client';

import Sheet from './sheet';

/**
 * Settings — the address this browser is signed in as, and the way out.
 *
 * **Two things, from 20 August 2026, asked for.** It had a "Signed in" heading
 * over the display name and the address, then an "Access" section explaining
 * that sign-in is Google, restricted to the Workspace, and that no accounts are
 * kept here. All of it true, none of it actionable: a person opening a gear
 * wants to know which account they are on and how to leave, and the paragraph
 * described a policy they cannot change from this screen.
 *
 * The display name went with it. Two identities stacked is one more than the
 * question "which account is this?" needs, and the address is the half that
 * answers it — it is the part that differs between the two accounts anybody
 * here is likely to be confused between.
 *
 * **Nothing in this product is configurable and this sheet does not pretend
 * otherwise.** The questionnaire is fixed at version 6, the survey's fourteen
 * days live in `DEFAULT_DUE_DAYS`, and who may sign in is the Workspace. What
 * it holds is the one thing a person opens a gear expecting to find and could
 * not: Sign out was in the toolbar's More menu, and that menu went when Past
 * projects moved onto the projects sheet.
 */
export default function SettingsSheet({
  email,
  onClose,
  signOut,
}: {
  email: string | null;
  onClose: () => void;
  signOut: () => Promise<void>;
}) {
  return (
    <Sheet title="Settings" narrow surface="paper" onClose={onClose}>
      {/* A Google account always carries an address, so this is never the empty
          case in practice — but a session can outlive the row it was minted
          from, and a blank line under a heading would say nothing at all. */}
      <p className="setmail">{email ?? 'No address on this session.'}</p>
      {/* A form, because signing out is a server action and this has to work
          without JavaScript for the same reason the sign-in page does. */}
      <form action={signOut} className="setout">
        <button className="btn btn-outline" type="submit">
          Sign out
        </button>
      </form>
    </Sheet>
  );
}
