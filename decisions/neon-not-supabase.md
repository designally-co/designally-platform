---
title: The database is Neon Postgres, not Supabase
app: survey
decided: "2026-08-10"
author: ai
sources:
  - https://github.com/designally-co/survey/blob/8138b0ea4240133a123fac53b6deff802c013d61/CLAUDE.md?plain=1#L40-L56
---

## Context

The app needs only a Postgres connection string. Sign-in is Google OAuth inside the Next.js app, and the app uses no auth, storage or client library from the database vendor.

## Decision

Use Neon Postgres. The app talks to it through postgres-js against DATABASE_URL, so the host is a one-line change.

## Why

A free Supabase project pauses after 7 quiet days and must be restored by hand. Clients often open their questionnaire a week or two after it is sent, so a paused database means a dead link, and a client does not report it; they simply never answer. Neon suspends too but resumes on the next connection in a fraction of a second. Also, Supabase's free plan allows two projects per account, and both were already in use. The first build brief also called Neon the cleanest fit with Vercel and Drizzle.
