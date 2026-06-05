---
title: 'A Drizzle Migration Linter for Zero-Downtime Postgres Deploys'
date: '2026-06-05'
author: 'Joey Orlando'
description: 'Why zero-downtime deploys need expand/contract migrations, what Django got right, and how we built a Drizzle migration linter for CI.'
image: '/blog/2026-06-05-drizzle-migration-linter.webp'
---

## Changing Topics from Auth for a Second

TL;DR: If you use Drizzle, need help ensuring parallel change compatible migrations, and would benefit from this as a standalone package, drop us a thumbs up on [the GitHub issue](https://github.com/archestra-ai/archestra/issues/5362).

The last few posts were all auth: MCP OAuth, JWKS, LLM proxy auth. Enough tokens for a minute.

This one is about a different kind of production problem: database migrations.

Archestra is built primarily in TypeScript, and we use [Drizzle ORM](https://github.com/drizzle-team/drizzle-orm) for our Postgres schema and migrations. Drizzle gives us clean generated SQL, but it does not have a built-in migration linter for rollout safety. It knows how to get from schema A to schema B, not whether that path is safe while old and new pods both serve traffic.

So we built a Drizzle migration linter.

Specifically, the kind of migration that looks reasonable in a pull request:

```sql
ALTER TABLE "organization" DROP COLUMN "legacy_theme";
```

and then breaks a rollout because one pod is still running the old code while another pod has already applied the new schema.

Most modern systems do not deploy by stopping the world, migrating the database, and starting one new container. Kubernetes rolls pods gradually. Load balancers keep sending traffic during the transition. Background workers may lag behind web pods.

The database schema has to be compatible with more than one version of the app at the same time. That is the hard part of "zero-downtime deploys."

## The Expand/Contract Rule

The deployment-safe pattern is usually called **expand/contract**, or [parallel change](https://martinfowler.com/bliki/ParallelChange.html). First you expand the schema without breaking old code:

- add a nullable column
- start writing both old and new shapes

Then you deploy app code that can read and write the new shape. After the old code is gone and the data has been backfilled, you contract:

- stop writing the old column
- drop the old column
- drop the old table
- tighten nullability

The mistake is doing both phases in one migration.

```sql
ALTER TABLE "users" ADD COLUMN "display_name" text;
UPDATE "users" SET "display_name" = "first_name" || ' ' || "last_name";
ALTER TABLE "users" DROP COLUMN "first_name";
ALTER TABLE "users" DROP COLUMN "last_name";
```

That might be correct as a final schema. It is not safe as a rolling deploy. The old app still expects `first_name` and `last_name`.

## Django Had This Figured Out

I used to rely on [`django-migration-linter`](https://github.com/3YOURMIND/django-migration-linter) for this. At my last team, working on [Grafana OnCall](https://github.com/grafana-cold-storage/oncall), this was one of those boring pieces of CI that paid for itself over and over.

The project was Django/Postgres, and `django-migration-linter` gave the team a shared rulebook for what could safely ship during a rolling deploy.

Without that check, every code review has to include someone mentally simulating a rolling deploy:

- is this `NOT NULL` constraint safe on existing rows?
- will this default rewrite a large table?
- is this index creation going to block writes?

Humans are bad at doing that every time. CI is better. The value is that the dangerous 80% stops being a matter of taste.

If a migration drops a column, renames a table, or adds a required column in one step, CI says no. The developer either splits the change into expand/contract phases or explicitly documents why this is a maintenance-window migration.

## What We Built for Drizzle

Drizzle has no direct equivalent today. That is not a criticism of Drizzle. ORMs usually model the desired schema. They do not know your rollout strategy or compatibility window.

So our linter keeps the interface intentionally boring:

```bash
pnpm lint-drizzle-migrations
```

In our repo, CI compares changed migration files against the base branch and lints only the new SQL migrations. The first version focuses on the operations that most often break expand/contract discipline:

- dropping columns or tables
- renaming columns or tables
- adding required columns in one step
- tightening constraints before data is ready

It is not trying to be a full SQL theorem prover. It is trying to say:

> This migration may be correct eventually, but it is not safe to apply while old and new app versions are both serving traffic.

## Why This Matters

Database compatibility and API compatibility are the same problem at different layers. If your backend response schemas are strict, a rollout can fail because old code reads a changed schema or new code returns a temporary transition shape. The symptom is a random 500, a failed query, or a response schema error.

You can have a good rolling update strategy, readiness probes, migration jobs, and app pods that wait for migrations, and still break production with one `DROP COLUMN`.

The fix is boring migration discipline: prefer additive changes, tolerate old and new schema shapes, backfill separately, and contract later.

Suppose the final goal is to replace `full_name` with `display_name`. Dropping `full_name` immediately is unsafe because old code may still read it. First expand:

```sql
ALTER TABLE "users" ADD COLUMN "display_name" text;
```

The new app writes both fields, then backfills:

```sql
UPDATE "users"
SET "display_name" = "full_name"
WHERE "display_name" IS NULL;
```

After old app versions are gone, contract:

```sql
ALTER TABLE "users" ALTER COLUMN "display_name" SET NOT NULL;
ALTER TABLE "users" DROP COLUMN "full_name";
```

The migration history now matches the deployment reality. When CI fails, the answer is usually to split the migration, add a compatibility read path, move the backfill into a job, or mark the change as requiring a maintenance window.

## Can You Use It Outside Archestra?

Not yet in the easy way. Right now `drizzle-migration-linter` lives as a workspace package inside the [Archestra repo](https://github.com/archestra-ai/archestra). Our CI consumes it cleanly, but we have not published it to npm.

If you are using Drizzle and want this as a standalone package, leave a thumbs up on this issue:

[Publish drizzle-migration-linter as an npm package](https://github.com/archestra-ai/archestra/issues/5362)

That will help us decide whether to do the packaging work: npm publishing, external install docs, versioning, and a cleaner CLI.

Until then, the important takeaway is the rule:

> If old code and new code can run at the same time, old schema and new schema have to be compatible at the same time.

Drizzle gives you migrations. CI should tell you whether those migrations are safe to roll out.
