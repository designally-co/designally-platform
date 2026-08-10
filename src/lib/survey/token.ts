import { randomBytes } from 'node:crypto';

/**
 * The token is the whole of a client's access to a survey — designally.co/s/<token>.
 * It has to be short enough to read out over the phone and unguessable.
 *
 * Crockford's alphabet without I, L, O and U: no character a client can
 * mistype from a printed link, and nothing that spells a word by accident.
 * 12 characters of a 32-symbol alphabet is 60 bits.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const LENGTH = 12;

export function makeToken(): string {
  const bytes = randomBytes(LENGTH);
  let out = '';
  for (let i = 0; i < LENGTH; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** Clients retype links. Accept lower case and the four look-alike characters. */
export function normaliseToken(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/I|L/g, '1')
    .replace(/O/g, '0')
    .replace(/U/g, 'V');
}
