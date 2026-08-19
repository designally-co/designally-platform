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
  token,
  url,
  onClose,
}: {
  token: string;
  url: string;
  onClose: () => void;
}) {
  return (
    <Sheet
      /**
       * Nothing in the bar but the way out.
       *
       * It held the client's name over the package, which is the project
       * sheet's title doing a job this sheet does not have: there is one thing
       * on this screen and the body names it in two lines, at a size somebody
       * reads. The bar was repeating the answer above the answer, and the name
       * is on the toast that just went past and on the project underneath.
       *
       * The bar cannot carry those two lines either — its height is a fixed sum
       * (see `.sheet-top`), which holds because the title is one clipped line
       * over one short string. "Send it to the client's main contact. They can
       * forward it on." is neither.
       */
      title={null}
      narrow
      width="onecol-w link-w"
      bare
      /* The last sheet onto the paper ground, 19 August 2026 — the whole team
         app is one surface now. Its QR frame keeps its white and its hairline
         on purpose; see `.qrframe`. */
      surface="paper"
      backLabel="Done"
      onClose={onClose}
    >
      <div className="onecol">
        <h1>The link is ready.</h1>
        {/* One line, measured — 19 August 2026, asked for. The sentence was
            "Send it to the client's main contact. They can forward it on.",
            which is 437px at 15px against a 332px column and broke in two. This
            is 312, and it keeps both facts: one person receives it, and it is
            theirs to pass on. "client's" went because the sheet is already
            about their project and the word was carrying nothing the reader did
            not have. */}
        <p className="lede">Send it to the main contact to forward on.</p>

        <LinkAndCode token={token} url={url} />

        {/* "Opens without a login. Anyone who has it can answer." was here and
            went on 19 August 2026, asked for. It was the last of three lines of
            standing policy on this sheet — the other two, that collection is
            closed by a person rather than by the date, went earlier for the same
            reason. Every one of them is true, and none is news to the person who
            just pressed Create: they are reading this screen to get the link
            out, and the sheet is a sentence, a link and a code. The share panel
            on the project says the state where it can change. */}
      </div>
    </Sheet>
  );
}
