'use client';

import { createContext, useContext } from 'react';

/**
 * Which language leads, and what that does and does not cover.
 *
 * Measured at 390px, the five steps carried ~2,900 Thai characters and ~3,800
 * Latin ones — near-identical volumes. Every respondent was reading a language
 * they needed and a language they did not, at the same typographic weight. That
 * was not 21 questions on screen, it was 42 strings, and it was the largest
 * single source of the survey feeling overwhelming.
 *
 * **The preference covers prose only** — question text, help text, step
 * descriptions, the welcome and the thank-you. Choice labels stay bilingual
 * whatever this says: they run two or three words each, so they cost almost no
 * vertical space, and they are the vocabulary the client and the designer have
 * to end up sharing. "Friendly · เป็นกันเอง" is the point, not the noise.
 *
 * Nothing is deleted. Every string still exists in both languages and the other
 * one is a tap away on any question — PRODUCT.md principle 6 holds.
 */
export type Lang = 'th' | 'en';

export const LangContext = createContext<Lang>('en');

export function useLang() {
  return useContext(LangContext);
}

/** The leading string for the current language. */
export function useText() {
  const lang = useLang();
  return (en: string | null | undefined, th: string | null | undefined) =>
    (lang === 'th' ? th || en : en || th) ?? '';
}

/** The other one, when a respondent asks for it. */
export function useOtherText() {
  const lang = useLang();
  return (en: string | null | undefined, th: string | null | undefined) =>
    (lang === 'th' ? en : th) ?? '';
}

/** What the reveal control offers — always named in the language it shows. */
export const OTHER_LABEL: Record<Lang, string> = { th: 'English', en: 'ไทย' };
