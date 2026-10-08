---
title: The container health check does not touch the database
app: survey
decided: "2026-10-08"
author: ai
sources:
  - Buk, 2026-10-08 (the survey database is on Neon's free plan)
  - src/app/api/health/route.ts
  - Dockerfile
  - deploy/compose.production.yml
  - https://neon.com/docs/introduction/plans
---

## Context

On the NAS, Docker called /api/health every 30 seconds. Each call ran select 1 and the migration check on Neon. Neon's free plan suspends compute only after 5 minutes without queries and gives a limited number of compute hours per project each month, so a query every 30 seconds kept the database awake all month.

## Decision

The Dockerfile HEALTHCHECK and the compose healthcheck call /api/health?live. It answers that the server is up and which commit it runs, and touches neither the database nor Anthropic. The full /api/health is unchanged and is still what people and CI use to check the database, the migrations and the configuration.

## Why

With the database awake all month, the free compute hours run out around the middle of the month, and Neon then stops the database until the next month. Every survey link would fail, and a client with a dead link does not report it. The container health check restarts nothing, so it loses little by not asking the database.
