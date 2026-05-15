---
title: 'What an MCP gateway buys you'
description: 'An MCP gateway centralizes auth, audit, and policy across every tool call. Here are the five things only an MCP gateway can do — and when not to run one.'
isNote: true
author: 'Mack Chi'
---

## What an MCP gateway buys you

An MCP gateway is a single network endpoint that brokers JSON-RPC traffic between every agent client and every MCP server. Agents talk to one URL. The gateway speaks MCP on both sides, enforces policy, and emits one audit trail. That is the shape of it. The reason MCP gateway deployments matter is what becomes possible once every tool call funnels through one process: unified identity, protocol-layer logging, identity-aware tool filtering, just-in-time credentials, and central version control. Without an MCP gateway, a fleet of nine MCP servers spread across five laptops produces nine OAuth flows and nine log formats — and a question like "who called the production database tool yesterday at 3 p.m.?" turns into a week of grep across SSH sessions.

### The five things only an MCP gateway can do

Anything below this list is hand-rollable. Anything in it is not — not without rebuilding most of an MCP gateway.

**Unified auth.** Downstream MCP servers do not each need their own OAuth client, token store, and refresh logic. The gateway holds the identity, exchanges the token, and hands each downstream server whatever credential it expects. Agents see one auth flow.

**Central audit.** Every JSON-RPC message — call, response, error — flows through one process. **Log at the protocol layer, not at each server. Once every JSON-RPC message carries a traceable request id, every other gateway feature becomes possible.** Per-server logging fragments. Protocol-layer logging is the point.

**Namespace and tool filtering.** With twenty servers mounted, an agent sees hundreds of tools, most of them wrong for the task. A gateway hides tools per session, per identity, per project — without changing the servers underneath. The model only sees what it should see for this turn.

**Credential injection.** Server configs do not hold the secret. The gateway fetches it at call time from a vault, scopes it to the call, and drops it after. Rotation stops being a deploy. Downstream servers never learn the secret lifecycle.

**Version pinning.** Twenty agents pointed at one gateway means one place to pin a server version when a bad release ships, and one place to canary an upgrade. Without a gateway, every client config gets edited by hand.

### DIY vs OSS vs commercial MCP gateway

| Option             | What it covers                                                               | What it leaves to the operator                                         |
| ------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| DIY proxy          | An nginx in front of stdio bridges; basic audit log                          | Auth, filtering, credential injection, version pinning, identity model |
| OSS gateway        | Protocol mechanics, common OAuth cases, a usable plugin model                | Enterprise glue: OBO, identity-aware filtering, vault integration, SSO |
| Commercial gateway | Audit, OAuth/OBO, identity-aware filtering, dynamic tool routing as defaults | Procurement                                                            |

Archestra ships a commercial option as the [MCP Gateway](/docs/platform-mcp-gateway), built on the assumption that audit and identity-aware policy are not optional and that a security team will read every line of every log.

### When an MCP gateway is the wrong choice

One MCP server, one user, one machine: a gateway is a layer of indirection that buys nothing. Run the server, point the client at it, stop. The MCP gateway story applies at the moment the answer to "who called the production database tool yesterday" needs to take ten seconds, not a week.
