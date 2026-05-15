---
title: 'When to run a private MCP registry'
description: 'Three triggers that signal an organization needs a private MCP registry, what it replaces, and why most teams still get by with version pinning alone.'
isNote: true
author: 'Mack Chi'
---

# When to run a private MCP registry

A private MCP registry is an internally hosted catalog of approved MCP servers, scoped to one organization, controlling which servers exist, which credential models they use, and who can install them. Most organizations do not need one yet. The ones that do already know. This note covers the three triggers that move teams from "we'll figure it out" to "we need a private MCP registry now," what the registry actually replaces, and what it explicitly does not.

The shorter heuristic: if internal MCP servers contain non-public schema, manifests cannot be published to the public registry without triggering a compliance event. At that point the question stops being "should we run a private MCP registry?" and becomes "how do we run one?"

## What a private MCP registry is, in plain terms

A public MCP registry is a phone book. Anyone can look up any server, fetch its manifest, install it. A private MCP registry is the same phone book, except the company runs it, only its people can see it, and it decides which entries go in.

One or two MCP servers and a small team do not require a phone book. Version pinning plus a shared config is sufficient. No registry needed.

Ten servers, three teams installing them differently, two vendors trusted enough to ship MCPs but not enough to publish those configs publicly, and a compliance owner who needs to know what is installed where — that is when a private MCP registry stops being optional.

## The three triggers for a private MCP registry

### Trigger 1: more than ~10 internal MCP servers

The boring trigger, and almost always the real one. Once an org crosses roughly ten internal servers, version drift starts to bite. Team A is on `internal-jira-mcp@1.2.3`, team B is on `1.4.0`, someone shipped a breaking change in `1.3.0`, and no system of record tracks who runs what. A private MCP registry replaces the spreadsheet (or the DM thread) with a single approved catalog where every install points at a known entry.

### Trigger 2: regulated industry

Finance, healthcare, government, defense, anywhere with auditors. The auditor question is "who can connect to what, and how is that proven?" A shared Confluence page is not the answer. A private MCP registry produces an explicit list of approved servers, who installed each one, with which credential model, scoped to which team. That output is auditable. A free-for-all of `npx`-installed MCPs is not.

### Trigger 3: vendor MCPs that cannot be published

This trigger surprises teams. As MCP adoption grows, vendors begin shipping private builds of their MCP servers — pre-release features, enterprise-only tools, integrations against a specific tenant. Those manifests are not owned by the customer and cannot be dropped into the public registry. They need somewhere to live other than a tarball in Slack. That "somewhere" is a private MCP registry.

If none of the three triggers apply, a registry is premature. Pin versions, document configs in a README, and revisit when the org grows.

## What a private MCP registry replaces

Archestra ships a [private MCP registry](/docs/platform-private-registry) as part of the platform, so the framing is opinionated, but the pattern is consistent across implementations:

- A curated list of **registry entries** (templates: server URL or container image, transport, credential model, install-time fields).
- Per-user or per-team **installations** built from those entries — same template, different credential, different scope.
- **Labels** for organizing the catalog and auto-wiring tools to gateways.
- An explicit **credential model** per entry (no auth, static API key, OAuth 2.1, OAuth client credentials, enterprise IdP token exchange, JWT passthrough).

Practical effect: an admin maintains a small approved catalog, users install with their own credentials, and the gateway resolves "which installation should this caller use" at call time. No more hand-edited JSON. No more service-account tokens shared in 1Password notes. An internal trading-data MCP lives in the registry, scoped to one desk, with credentials resolved per user from the enterprise IdP. That is the shape.

## What a private MCP registry does not replace

A private MCP registry is not a security boundary on its own. It is an inventory layer. The following still need separate enforcement:

- **Version pinning.** The registry can point at `v1.4.0` of an internal server. It does not stop someone from yolo-installing `latest` outside the registry. Pinning belongs in gateway config as well.
- **Sandboxing.** An approved server is not automatically a safe server. Self-hosted MCPs should still run with constrained permissions, scoped credentials, and per-request audit logs. The [MCP gateway](/docs/platform-mcp-gateway) is where most of that enforcement lives, not the registry.
- **An allowlist at the gateway.** Registry presence does not equal gateway permission. A server can be in the catalog but only enabled for one team. Those are two separate controls; keep them separate.
- **Auth.** The registry stores the _credential model_. Credential resolution itself happens at the gateway, with the OAuth 2.1 / PKCE / JWKS plumbing covered in [A Developer's Guide to MCP Authentication](/blog/mcp-authentication-guide) and the [MCP OAuth 2.1 Quick Reference](/blog/mcp-oauth-21-quickref).

The mental model: the private MCP registry says **what can exist**, the gateway says **who can use it**, the auth layer says **as whom**.

## The opinionated take

A three-engineer startup with two MCP servers should not build a private MCP registry. Pin versions. Write a README. Move on.

A 200-person company with a security team, an auditor on the calendar, and a handful of MCP servers across teams needed a private MCP registry six months ago. The longer the wait, the messier the migration from "everyone npm-installs whatever" to "everything goes through the catalog."

For finance, healthcare, or government building internal MCPs at all — there is no "when." The answer is now, before someone publishes a manifest with column names that were never supposed to leave the building.
