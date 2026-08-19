"use client";

import { useState, useTransition } from "react";

import type { Package } from "@/lib/db/schema";
import { countQuestions, type LibraryBlock } from "@/lib/team/library-types";
import { PACKAGE_BLOCKS } from "@/lib/survey/packages";
import { createSurvey, type NewSurveyField } from "@/lib/team/actions";
import { DEFAULT_DUE_DAYS, dayIn, defaultDueDay } from "@/lib/team/due";
import DateField from "../date-field";
import LinkAndCode from "./link-code";
import Sheet from "./sheet";

const OPTIONS: { key: Package; label: string }[] = [
  { key: "brand", label: "Brand Strategy + Identity" },
  { key: "design", label: "Design" },
];

export default function NewSurveySheet({
  library,
  onClose,
  onCreated,
}: {
  library: LibraryBlock[];
  onClose: () => void;
  onCreated: (made: {
    clientName: string;
    packageLabel: string;
    token: string;
    link: string;
  }) => void;
}) {
  const [pkg, setPkg] = useState<Package | null>(null);
  const [client, setClient] = useState("");
  /**
   * Two weeks, and changeable before the link is made rather than only after.
   * It used to be set silently at creation and edited on the project — by which
   * point the link had usually been copied and sent, so the date the client
   * saw was the default whatever the team had actually agreed.
   *
   * Computed once, on the client, so the prefill is today in Bangkok and not
   * whenever this bundle was built.
   */
  const [due, setDue] = useState(() => defaultDueDay());
  /* Today in Bangkok, worked out in the browser for the same reason the prefill
     is: a constant baked at build time goes stale overnight. */
  const [today] = useState(() => dayIn(new Date()));
  /**
   * The one thing that went wrong, and which control it is about.
   *
   * One at a time, because the server checks in order and stops — reporting a
   * date problem the user has not reached yet would be noise about a field they
   * have not touched.
   */
  const [error, setError] = useState<{
    text: string;
    field?: NewSurveyField;
  } | null>(null);
  const [pending, start] = useTransition();

  const submit = () => {
    setError(null);
    const form = new FormData();
    form.set("client", client);
    form.set("package", pkg ?? "");
    form.set("due", due);
    start(async () => {
      const result = await createSurvey(form);
      if (!result.ok) {
        setError({ text: result.error, field: result.field });
        return;
      }
      /* The form's job ends here. What was made goes to a sheet of its own —
         see survey-made.tsx — rather than unfolding underneath three fields
         that can no longer be changed. */
      onCreated({
        clientName: client.trim(),
        packageLabel: OPTIONS.find((o) => o.key === pkg)?.label ?? "",
        token: result.token,
        link: result.link,
      });
    });
  };

  /* The message for one field, or nothing. Clearing on edit is deliberate: an
     error that survives the fix it asked for teaches people to ignore it. */
  const errFor = (field: NewSurveyField) =>
    error?.field === field ? <p className="fielderror">{error.text}</p> : null;

  return (
    <Sheet
      title={null}
      narrow
      width="onecol-w form-w"
      bare
      backLabel="Close"
      /* The fourth sheet on the paper ground, 19 August 2026. It was left on
         parchment on the argument that it holds no card — which was wrong: the
         two package options are exactly that object, `--canvas` inside a
         hairline, and they are the thing the sheet is *for*. See
         `.sheet.paper`. */
      surface="paper"
      onClose={onClose}
    >
      {/**
       * A heading and a line, which is the shape the sheet after this one has.
       *
       * "New survey" was the bar's title — a label on a form, rather than a
       * sentence to the person about to fill one in. The line under it is rule 3
       * said once: collection is open-ended, there is no list of respondents to
       * build here and there never will be. It stands in for the four-line note
       * that used to sit between the date and the button saying the same thing
       * at length.
       */}
      <div className="onecol">
        <h1>New survey</h1>
        <p className="lede">One link, for everyone who should answer.</p>

        <div className="field">
          <label className="f" htmlFor="nClient">
            Project
          </label>
          <input
            id="nClient"
            type="text"
            className="input"
            value={client}
            onChange={(e) => {
              setClient(e.target.value);
              if (error?.field === "client") setError(null);
            }}
            placeholder="ACME Coffee"
            aria-invalid={error?.field === "client" || undefined}
          />
          {errFor("client")}
        </div>

        <div className="field">
          {/* A <label> with no `for` and no control inside labels nothing — a
            screen reader heard "Brand, pressed" with no idea what was being
            chosen, on the screen that decides which questionnaire a client
            gets. It is a group with a name now. */}
          <span className="f" id="pkg-label">
            Package
          </span>
          <div className="opts" role="group" aria-labelledby="pkg-label">
            {OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                className="opt"
                aria-pressed={pkg === o.key}
                onClick={() => {
                  setPkg(o.key);
                  if (error?.field === "package") setError(null);
                }}
              >
                {o.label}
                <small>
                  {countQuestions(library, PACKAGE_BLOCKS[o.key])} questions
                </small>
              </button>
            ))}
          </div>
          {errFor("package")}
        </div>

        <div className="field">
          {/* "Asking for answers by" beside "Client" and "Package" — one label
            arguing its own case next to two nouns. "Answers by" fits the pair
            and keeps rule 1 intact, which "Deadline" would not: the app asks for
            this date and enforces nothing.

            A span, not a <label for>: what it names is a group of three boxes,
            and `for` binds only to a form control. See date-field.tsx. */}
          <span className="f" id="nDue">
            Answers by
          </span>
          <DateField
            labelledBy="nDue"
            value={due}
            /* The server refuses a date already gone — a past due date would put
             the project into Needs you the moment the link was copied — so the
             calendar refuses it first, on the same boundary. */
            min={today}
            onChange={(v) => {
              setDue(v);
              if (error?.field === "due") setError(null);
            }}
          />
          {errFor("due")}
          {/**
           * What the box is already filled with, and nothing else.
           *
           * This field carried three sentences, with a four-line note under it
           * about nobody needing to know who will answer — two paragraphs of
           * standing policy on a form with three fields, read once and scrolled
           * past ever after. Rule 1 and rule 3 have not changed; a form is simply
           * not where a product explains itself, and both are said properly on the
           * project this creates.
           *
           * Every label on this sheet is a bare noun now. The qualifiers each
           * label carried — "· this chooses the questionnaire", "· 14 days,
           * change it if you need to" — were doing two jobs from one line, and a
           * label that argues with you is a label you stop reading. What survives
           * is the one fact this control cannot show by itself: the date in the
           * box was chosen for you.
           */}
          <p className="hintline">{DEFAULT_DUE_DAYS} days by default</p>
        </div>

        {/* Anything with no field of its own — a dead database, an expired
          session. Rare, and it has nowhere better to go. */}
        {error && !error.field && <p className="formerror">{error.text}</p>}

        <button className="btn btn-primary" onClick={submit} disabled={pending}>
          {pending ? "Creating…" : "Create"}
        </button>
      </div>
    </Sheet>
  );
}
