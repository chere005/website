---
title: 'How to Rotate MCP Server Credentials Without a Manual Nightmare'
description: 'Three placements to rotate MCP server credentials across a fleet — env vars, gateway-injected, and vault-at-call-time — and which one survives a 2am page.'
isNote: true
author: 'Mack Chi'
---

## How to Rotate MCP Server Credentials Across a Fleet

To rotate MCP server credentials without downtime, store secrets in a gateway or vault — not as environment variables baked into each server config. Env-var rotation scales linearly with pain: eleven MCP servers means eleven coordinated restarts, often two deploys, and a real chance of cached values lingering in memory. Gateway-injected and vault-fetched placements collapse the rotation surface to one update, with zero restarts and zero deploys downstream.

Credential rotation is the moment a secrets strategy gets graded. A separate note covers [where MCP secrets live](/blog/note-mcp-secrets-where-do-they-go) — that one is about leakage. This note is about what happens when the key changes and how to rotate MCP server credentials safely.

## Three Placements For An MCP Server Credential

Three placements show up in real MCP deployments:

1. **Env var, baked into the server config.** Rotation means stop every process, edit every config, start every process, and hope nothing was cached. Eleven servers means eleven coordinated restarts.
2. **Injected by the gateway at request time.** The MCP server never sees the credential. The gateway attaches the right header before forwarding the upstream call. Rotation means update one value in one place.
3. **Fetched from a vault at call time.** The gateway (or the server, when going direct) pulls from Vault, AWS Secrets Manager, or GCP Secret Manager on each call, with short-lived caching. Rotation means update the value in vault; the next call picks it up. Zero deploys, zero restarts, zero pages.

Option 1 scales linearly with pain. Option 3 does not scale with pain at all.

## What Actually Changes When An MCP Server Credential Rotates

Walk through the same rotation event under each placement:

- **Option 1 (env vars).** Security pushes a new token at 14:00. Every server holding the old token starts 401-ing. SSH into the boxes. Edit `.env` files. Run `systemctl restart`. Somewhere a sidecar still holds the old value cached in memory because someone wrote `const TOKEN = process.env.GITHUB_TOKEN` at module load. An hour later the rotation looks done — except the CI runner failed silently at 14:42.
- **Option 2 (gateway-injected).** The new token goes into one config in the gateway. The gateway is the only component that knows the credential; the eleven downstream MCP servers were never told. The next request through the gateway uses the new value. Nothing to restart, nothing to redeploy, nothing for the eleven servers to even notice.
- **Option 3 (vault-at-call-time).** The new token goes into vault. The gateway's cache TTL expires (typically 60 seconds). The next call after that pulls the new value. A real audit log records who read which secret when. Rollback is one API call.

**Important.** If a credential rotation requires a deploy, the strategy has already lost. Inject at the gateway. Fetch at call time.

## The Honest Tradeoff

Option 3 is not free. It requires a vault that stays up, IAM wired correctly, and a cache policy that does not undo the audit log. Each of those is a problem solved once across the fleet — not eleven times per rotation. That is the whole game when rotating MCP server credentials.

Option 2 is the middle ground when vault is too much lift right now. Centralize the secret in the gateway, drop rotation to one update, and plan a vault migration later.

## What To Do This Week

Three concrete moves to rotate MCP server credentials with less pain:

1. Count the credentials every MCP server holds. If the answer is "more than five and nobody knows exactly," the fleet is already in option-1 hell.
2. Pick one credential and move it behind the gateway. Migrating everything at once is not the move.
3. Read [private registry](/docs/platform-private-registry) — that document covers how Archestra stores, scopes, and injects MCP server credentials per call, with vault or the built-in encrypted store as the backing.

Env vars feel cheap because the rotation tax stays invisible until the Tuesday it does not. Inject at the gateway. The next rotation will not page anyone.
