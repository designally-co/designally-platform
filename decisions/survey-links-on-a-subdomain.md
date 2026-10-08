---
title: Survey links live on their own subdomain, not as a path on the main site
app: survey
decided: "2026-08-10"
author: ai
sources:
  - https://github.com/designally-co/survey/blob/8138b0ea4240133a123fac53b6deff802c013d61/CLAUDE.md?plain=1#L18-L38
  - https://github.com/designally-co/survey/blob/8138b0ea4240133a123fac53b6deff802c013d61/docs/deploy-nas.md?plain=1#L17-L36
---

## Context

The original plan was designally.co/s/<token>, routed from the main site, which turned out to run on WordPress.

## Decision

Survey links use a subdomain (first s.designally.co, a CNAME to Vercel). The host is never hardcoded: SURVEY_ORIGIN sets it, so changing the domain is an environment variable and stored tokens keep working. The NAS move plan changes the public name to survey.designally.co and keeps old s.designally.co links working.

## Why

A path on the WordPress site needs two prefixes proxied (the survey saves drafts to /api/s/<token>/draft), mod_proxy is disabled or blocked on most WordPress hosts, it puts a PHP stack in the path of a long questionnaire answered on a phone on a poor connection, and a plugin update or host move can change rewrite behaviour with nobody watching.
