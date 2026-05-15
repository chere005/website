---
title: 'Where Do MCP Server Secrets Actually Live?'
description: 'MCP server secrets belong in a secret manager, not env vars or config files. Compare the three placement options and the leak surface of each.'
isNote: true
author: 'Mack Chi'
---

## Where MCP Server Secrets Should Live

MCP server secrets — API keys, OAuth client secrets, database credentials, tokens for upstream SaaS — should live in a secret manager, not in environment variables or config files on disk. Environment variables are the default in most MCP server READMEs and they remain the single largest source of credential leaks in production MCP deployments. Config files improve one narrow dimension and regress on most others. A secret manager is the only placement option for MCP server secrets that survives rotation, audit, and incident response at scale.

If two minutes is all that's available, skip to the [comparison table](#the-three-options-side-by-side) and address the worst offender first.

Related reading: [MCP authentication](/blog/mcp-authentication-guide) covers how clients prove identity, and [enterprise-managed authorization](/blog/enterprise-managed-authorization-mcp) covers how org policy enters the loop. This note covers the other side — where the MCP server keeps the credentials it uses to call upstream APIs.

## Option 1: Environment Variables (the Default, and It's Wrong)

Almost every MCP server README recommends this pattern:

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
export SLACK_BOT_TOKEN=xoxb-...
node ./mcp-server.js
```

It feels safe. The secret is not in code, not in git, and rotation is a restart away. It is not safe. Environment variables leak through paths that rarely show up in threat models until after an incident:

- **Logs.** A `logger.debug({ env: process.env })` statement shipped to production puts every MCP server secret into Splunk, Datadog, or CloudWatch on every request. This is the most common root cause of MCP credential leaks observed in the wild.
- **Child processes.** Environment variables inherit. The moment an MCP server shells out to `git`, a Python helper, or a sidecar, the child process receives every variable. One verbose child writes the key to a disk the server does not control.
- **`ps` and `/proc`.** On most Linux configurations, any local user can read another process's environment via `/proc/<pid>/environ`.
- **Crash dumps.** When a Node or Python process dumps core, the heap goes with it, environment table included. Those dumps frequently auto-upload to bug trackers, putting MCP server secrets into Jira.
- **Error reporting.** Sentry, Rollbar, and Honeybadger capture context by default. Audits routinely uncover error reporters that have been forwarding environment variables upstream for years.

Local development with an uncommitted `.env` is fine. Throwaway scripts are fine. As the production answer for an MCP server calling third-party APIs on behalf of real users, environment variables are the wrong default. They feel safe because they are "not in the code." The code is not the threat. Everything around it is.

## Option 2: A Config File on Disk

The next step many teams take is to move MCP server secrets into a YAML or JSON file:

```yaml
# /etc/mcp-server/secrets.yaml
github_token: ghp_xxxxxxxxxxxx
slack_bot_token: xoxb-...
```

This improves one narrow dimension — the secret is no longer sprayed across every child process and log dump automatically. A `chmod 600` buys a minute of comfort. It regresses on most of the dimensions that matter at scale:

- **Rotation is painful.** Shipping a new file to every host, restarting every process, and hoping no process holds a stale cached value turns into a change-management ticket nobody wants to file.
- **Auditability is shallow.** "Who read this secret in the last 30 days?" answers as "anyone with shell access, and there is no record." Filesystem access logs are not a real audit trail.
- **Still plaintext on disk.** A stolen backup, a misconfigured rsync, or a snapshot dropped into the wrong S3 bucket produces the same outcome as committing the secret to git.
- **Sprawl.** Every server ships its own file, format, and path. There is no single answer to "what secrets does this application have access to?"

Config files are auditable in the weak sense that `cat` works. They are not auditable in the sense any security team means when it says "auditable."

## Option 3: An Actual Secret Manager

The correct placement for MCP server secrets is the boring one: a secret manager, with the MCP server fetching credentials at runtime. HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager, Azure Key Vault — whichever the platform team already runs.

What changes:

- Secrets never sit on disk on the MCP server host.
- Rotation is "update the value, the next fetch picks it up" — no redeploy.
- A real audit log records who read which secret and when.
- Access is scoped by identity (IAM role, Kubernetes service account, Vault token), not "whoever has SSH."
- Versioning rolls back a bad rotation in one API call.

The cost is real — wiring up authentication to the manager, handling manager outages, picking a caching policy that does not undo the audit log. Each is a problem solved once, not every time a new MCP server ships.

## The Three Options, Side by Side

| dimension                    | env vars                             | config file on disk      | secret manager                 |
| ---------------------------- | ------------------------------------ | ------------------------ | ------------------------------ |
| **rotation**                 | restart every process                | ship a file, restart     | update in place, no restart    |
| **auditability**             | none                                 | "who has shell?"         | per-read audit log             |
| **leak surface**             | logs, child procs, `ps`, crash dumps | disk, backups, snapshots | api boundary only              |
| **ease of setup**            | trivial                              | trivial                  | real work — auth, iam, caching |
| **ease of secure operation** | hard (every dev can leak it)         | medium                   | the easy one once it's wired   |

The pattern: env vars and config files are cheap to start and expensive to operate safely. A secret manager is the opposite — non-trivial to wire up, then easy to live with.

## How Archestra Handles MCP Server Secrets

Archestra is an MCP gateway — the layer between MCP clients (Claude Desktop, Cursor, internal chat apps) and the upstream MCP servers and SaaS APIs they call. Every upstream call requires a credential. Multiplied across hundreds of users and dozens of servers, MCP server secrets stop being a theoretical concern.

By default, Archestra encrypts MCP server secrets at rest in its own database with AES-256-GCM — already a step beyond environment variables on a host, with rotation reduced to an API call. For teams that want an existing vault to remain the source of truth, Archestra reads secrets directly from HashiCorp Vault at runtime, including a readonly mode where Archestra never writes. MCP servers pull credentials from the same Vault folder the platform team already audits.

Full setup — database versus Vault, Kubernetes and AWS IAM auth, per-team folders — is documented in [platform secrets management](/docs/platform-secrets-management). For MCP rollouts at scale, that page is a better starting point than any individual MCP server's quickstart.

## What to Do This Week

Three concrete moves for any team running MCP servers in production:

1. **Grep logs for active API keys.** Take the first 8 characters of every token and search the last week of logs. Any hit confirms the environment-variable setup is leaking.
2. **Kill `console.log(process.env)` style debug code.** Add a lint rule. It is the largest source of accidental MCP server secret leaks.
3. **Pick a manager and migrate one secret.** Avoid a full migration. Move the most painful-to-rotate key to Vault and measure how much smoother rotation becomes. That usually motivates the rest.

Environment variables feel safe because they are not in the code. The code is not the threat model — everything around it is. A secret manager is the only placement option for MCP server secrets that treats it that way.
