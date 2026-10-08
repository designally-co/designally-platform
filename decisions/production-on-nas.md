---
title: Production runs on the Designally NAS
app: survey
decided:
author: ai
sources:
  - https://github.com/designally-co/survey/blob/8138b0ea4240133a123fac53b6deff802c013d61/docs/deploy-nas.md?plain=1#L1-L36
  - Buk, 2026-10-08 (the survey app is on the NAS)
---

## Context

The app ran on Vercel at s.designally.co.

## Decision

Production is the container survey on the Designally NAS (Portainer, behind Caddy), built as ghcr.io/designally-co/survey. The public name is survey.designally.co, and old s.designally.co links keep working. The database stays on Neon. The daily lapsed-survey job moves from Vercel cron to the Cloudflare Worker lapsed-poker.

## Why
