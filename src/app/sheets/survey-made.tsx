'use client';

import Sheet from './sheet';
import LinkAndCode from './link-code';

/**
 * The link, on a sheet of its own.
 *
 * The New survey sheet used to grow this: three fields, and then the link and
 * the code appeared underneath them with the fields disabled above. That is a
 * form pretending to still be a form. Nothing on it could be changed any more —
 * the survey existed, the token was minted, the package was fixed by rule 5 —
 * and the only thing left to do had nothing to do with filling anything in.
 *
 * A screen is one job. This one is *send it*, and it opens with the answer
 * already on it.
 *
 * **It is not reachable twice, and does not need to be.** Close it and the link
 * is on the project, behind Share, in the same control this sheet uses. Nothing
 * here is the only copy of anything.
 */
export default function SurveyMadeSheet({
  clientName,
  packageLabel,
  token,
  url,
  onClose,
}: {
  clientName: string;
  packageLabel: string;
  token: string;
  url: string;
  onClose: () => void;
}) {
  return (
    <Sheet
      /* The client's name, not "Survey created" — the sheet's own body says
         what happened, and by the time somebody is copying a link the useful
         thing in the bar is whose link it is. */
      title={
        <>
          <b>{clientName}</b>
          <i>{packageLabel}</i>
        </>
      }
      narrow
      backLabel="Done"
      onClose={onClose}
    >
      <div className="made">
        <h1>The link is ready.</h1>
        <p className="lede">Send it to the client&apos;s main contact. They can forward it on.</p>

        <LinkAndCode token={token} url={url} />

        <p className="hintline">
          Opens without a login, and anyone who has it can answer. You close collection when
          there are enough answers — the date on it closes nothing.
        </p>
      </div>
    </Sheet>
  );
}
