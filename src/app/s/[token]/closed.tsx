import Rail from './rail';
import { Masthead } from './questions';

/**
 * A survey stops taking answers for three reasons: somebody closed collection —
 * gate 1 — somebody archived the project — gate 4 — or the date the team asked
 * for has passed. Say so plainly rather than showing a broken form.
 *
 * **It is built like the rest of the survey, from 19 August 2026.** It was the
 * last screen still wearing the questionnaire's old chrome — a `DESIGNALLY.`
 * wordmark that appears on no other screen, the client name beside it, and a
 * flat left column with no Cut and no Point anywhere on it. The survey it
 * belongs to grew a masthead, a vertical Cut and a disc at its head, and this
 * screen did not come with it. A client who follows their link a day late is
 * not shown a different product; they get the same page, holding a different
 * sentence.
 *
 * **One screen, no reasons** — 19 August 2026, asked for, and the end of a road
 * rule 1 started down. It took three passes: one heading for `due` and another
 * for the other two, then one heading for all three with three different
 * sentences under it, and now one screen. Rule 1 settles that closed means no
 * answer is accepted, and that a date arriving, a person pressing *Close now*
 * and a project being archived are the same event to whoever is holding the
 * link. Nothing the client can do differs between them, so nothing they are
 * told does either — and the three sentences had been drifting apart on
 * wording rather than on substance, which is how a surface ends up saying three
 * versions of one thing.
 *
 * `reason` went with them. It was a prop, a three-arm ternary in `page.tsx` and
 * a lookup table, all resolving to a difference the reader was never shown.
 *
 * **It says the company, not the project lead.** Whoever sent the link is a
 * person at Designally by whatever title, and a client who never had one named
 * to them cannot act on the phrase. The company is the addressee they can
 * always find.
 *
 * **The mark is on the disc, which is otherwise a welcome-only thing.** The
 * argument in `rail.tsx` is that the welcome is the first thing a client ever
 * sees of Designally and the one place a brand mark does a job rather than
 * decorating a counter. This screen has exactly that property and a harder
 * version of it: for somebody who arrives after the door shut, it is the *only*
 * thing they ever see, and the one instruction on it is to go and find
 * Designally. There is no count to hold either way.
 *
 * **The client name is in the headline, not beside the disc.** It sat in the
 * masthead where the welcome puts its duration, on the argument that somebody
 * who followed a dead link needs to know the link itself was right. That is the
 * correct thing to tell them and the wrong place to tell it: a grey line above
 * the Cut, read before the sentence that matters and separate from it. The
 * headline names the project and closes it in one statement, and the masthead
 * is left holding nothing but the Point — the same as the completion screen.
 *
 * A long client name makes a tall headline. `ZZ Fixture — Precision Components`
 * runs five lines at 37.6px on a phone. This screen has nothing else on it.
 *
 * **The name is the darkest thing in its own sentence** — 19 August 2026, asked
 * for; it was hiding inside the line. The frame steps back to `--ink-3` and the
 * name holds full ink, in both languages. Not the accent: the CI orange is
 * legal at this size on white — 3.26:1 against the 3:1 large-text floor — but
 * DESIGN.md's rule is that the accent means a person is needed here, and nobody
 * acts on a client's own name. It is needed twelve lines down, on the one
 * control this screen has.
 */
/* Designally's LINE official account, given 19 August 2026. Not an email
   address and not the website: this product's clients are Thai and answer the
   questionnaire on a phone, and LINE is where they already are — on a phone the
   link opens the app with the account loaded, and on a desktop
   `openQrModal=true` shows the QR to scan. One tap from a dead link to a person
   at Designally, which is the whole job of this screen. */
const CONTACT = 'https://page.line.me/designally?openQrModal=true';

export default function Closed({ clientName }: { clientName: string }) {
  return (
    <div className="survey-shell client-surface">
      <Rail n={0} total={0} mark />
      <Masthead counted={false} count={{ n: 0, total: 0 }} mark />
      <div className="slide" data-screen="closed" data-active="" data-dir="next">
        <div className="slidebody">
          <div className="slidemain">
            <h1>
              The questionnaire for <em>{clientName}</em> is closed.
              {/* `แบบสอบถาม {name}` rather than `แบบสอบถามสำหรับ {name}`, which
                  is the literal of the English and 405px wide against 346 of
                  line — it broke `F.W.` off `Dentogenesis` every time. Thai
                  juxtaposes the noun and the name without a preposition and
                  reads as well for it: "the F.W. Dentogenesis questionnaire is
                  closed." */}
              <span className="th">
                แบบสอบถาม <em>{clientName}</em> ปิดรับคำตอบแล้ว
              </span>
            </h1>
          </div>
          {/* The sentence this replaces read "If your perspective is missing,
              contact the Designally team" — an instruction to go and do
              something, with no way to do it, in two languages. A control does
              the same work in two words and can be pressed.

              It is the primary, and it is the only accented thing on the
              screen. DESIGN.md's rule is that the accent means a person is
              needed here; on every other closed-link page there was nothing to
              accent, which is why this screen had no orange on it but the Cut.
              Now there is exactly one act available and the accent is on it. */}
          <a className="btn btn-primary start" href={CONTACT} target="_blank" rel="noreferrer">
            Contact Designally
          </a>
        </div>
      </div>
    </div>
  );
}
