---
title: The team signs in with Google, designally.co accounts only
app: survey
decided:
author: ai
sources:
  - https://github.com/designally-co/survey/blob/8138b0ea4240133a123fac53b6deff802c013d61/CLAUDE.md?plain=1#L40-L43
  - https://github.com/designally-co/survey/blob/8138b0ea4240133a123fac53b6deff802c013d61/PRODUCT.md?plain=1#L75
---

## Decision

Team access is Google OAuth restricted to the designally.co Workspace, handled in the Next.js app. There is no other sign-in method. The public survey needs no login.

## Why

One identity source, and access dies with the Workspace account.
