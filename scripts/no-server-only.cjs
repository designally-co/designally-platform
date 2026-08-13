/**
 * Development only, and only for `npm run dev:analyse`.
 *
 * `src/lib/analysis/run.ts` imports `server-only`, which throws the moment it
 * is loaded outside a Next server context. That guard is worth keeping — it is
 * what stops the Anthropic key being pulled into a client bundle — so the dry
 * run stubs the marker rather than removing it.
 *
 * Nothing in the app loads this file. It is passed with --require by one script.
 */
/* eslint-disable @typescript-eslint/no-require-imports -- a CommonJS preload
   is the only thing that can intercept a require() before it happens */
const Module = require('module');
const load = Module._load;

Module._load = function (request, ...rest) {
  if (request === 'server-only') return {};
  return load.call(this, request, ...rest);
};
