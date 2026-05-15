---
title: 'A 10-point enterprise readiness checklist for any MCP server'
description: 'Enterprise MCP requirements in a 10-item pass/fail checklist: OAuth 2.1, JWKS, audit logs, scopes, OBO, sandboxing, signed releases.'
isNote: true
author: 'Mack Chi'
---

# Enterprise MCP requirements: a 10-point readiness checklist for any MCP server

Enterprise MCP requirements differ sharply from what works on a developer laptop. This checklist captures the ten questions every enterprise procurement review asks about an MCP server — identity, scopes, audit logs, data residency, signed builds — and turns them into a pass/fail rubric vendors can answer before the security call. Send it to the vendor ahead of time. It cuts a one-hour review down to twenty minutes.

An MCP server inside the enterprise is a different animal than an MCP server on a laptop. On a laptop, the worst case is a leaked `~/.aws/credentials` file — bad, but bounded. In the enterprise, the worst case is the entire HR org calling a tool that exfiltrates payroll because nobody scoped the token or checked the audience claim. Higher bar, mostly boring fundamentals: identity, scopes, logs, signed builds. These ten enterprise MCP requirements cover that gap.

This checklist scales up the [7-item MCP security checklist](/blog/mcp-security-checklist) for procurement. That one is the pre-flight before installing a community server on a personal machine. This one is what a security team should require of any server — community or vendor — before an enterprise rollout.

**The opinion up front:** most MCP servers in the public catalog today fail at least 4 of these 10 items. That is not a complaint — it is the normal early-protocol curve. HTTP servers in 1996 did not ship with TLS either. The gap between "works on my laptop" and "passes a procurement review at a bank" is exactly where the next 18 months of MCP work will happen.

## 1. SSO via OAuth 2.1 + PKCE

**Why it matters:** every enterprise already has an identity provider — Okta, Entra ID, Google Workspace, Ping. An MCP server that ships its own username/password page or requires a static API key in a config file is a non-starter. There is nowhere to plug it into the company's joiner/mover/leaver process.

**Check:** does the server implement [MCP's OAuth 2.1 authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization) with PKCE and Authorization Code grant? Are the [five well-known endpoints](/blog/mcp-oauth-21-quickref) present? If the answer is "we use an API key in the header," fail.

## 2. JWKS validation against the IdP

**Why it matters:** once SSO works, the resource server has to actually validate the signature on every incoming JWT against the identity provider's public keys. If it does not, it is trusting whatever bearer string the client hands it — a verification bypass, not authentication.

**Check:** does the server fetch and cache `jwks_uri` from the IdP, validate JWT signatures, check `iss`, check `exp`, and — most importantly — check `aud`? The [Building Enterprise-Ready MCP Servers with JWKS](/blog/enterprise-mcp-servers-jwks) post has the validation pattern. If the vendor cannot describe what they do with the `aud` claim in one sentence, fail.

## 3. Audit log of every tool call

**Why it matters:** when something goes wrong — a data leak, a wrong action, a confused-deputy incident — the first question a security team will ask is "show me every call this server received for the last 90 days, with user, timestamp, tool name, and arguments." If that log does not exist, the incident review cannot start.

**Check:** structured logs (JSON or OTel) for every `tools/call`, including the authenticated subject, the tool name, a redacted or hashed argument payload, and the response status. Exportable to a SIEM. Retention configurable. If logs are stdout-only with no structure, fail.

## 4. Data residency declared

**Why it matters:** GDPR, SOC 2 Type II, every financial-services contract, and the entire EU AI Act apparatus all care about where data physically lives and crosses borders. An MCP server that proxies calls to "wherever our cloud provider routes us today" is not deployable in regulated environments.

**Check:** does the vendor declare which regions the server runs in, where it stores logs, where it sends telemetry, and whether the deployment can be pinned to a specific region (us-east, eu-central, etc.)? For self-hosted servers, this is a documentation question. For vendor-hosted, it is a contract question. "We run on AWS and AWS is global" is not an answer.

## 5. Per-call rate limits

**Why it matters:** an LLM with tool access in a loop can call a single tool 4,000 times in two minutes. Without rate limits, that is either a self-inflicted DoS on the downstream system, a runaway cloud bill, or both. It is also a highly effective accidental exfiltration vector — "list all customer records, one row at a time."

**Check:** are there configurable per-token and per-tool rate limits? A sane default (e.g. 60 req/min per token)? A way to override per-team? Graceful 429 responses with `Retry-After`? If the only answer is "Kubernetes will autoscale," fail.

## 6. Scope-level authorization

**Why it matters:** OAuth scopes exist for exactly this reason. An MCP server that exposes `read_files` and `delete_files` as a single bundle, requiring both to do either, forces every client to ask for the destructive permission even when it only needs the read. That is how every prompt-injection-to-data-loss story starts.

**Check:** does the server publish granular scopes (`mcp:tools:read`, `mcp:tools:write:files`, `mcp:resources:read`, etc.) and actually enforce them at the resource server? Does the discovery document at `/.well-known/oauth-protected-resource` list `scopes_supported`? Can a client request a subset and have writes correctly rejected? If scopes are a single `mcp` string covering everything, fail.

## 7. OBO (on-behalf-of) support

**Why it matters:** real enterprise tool calls almost never act as "the MCP server's service account." They act as the user who made the request, against a downstream system (Jira, GitHub, Salesforce) where that user has their own permissions. An MCP server that pools everything through one service account flattens the permission model and makes audit useless.

**Check:** does the server support on-behalf-of token exchange — either via [enterprise-managed authorization with ID-JAGs](/blog/enterprise-managed-authorization-mcp) (RFC 8693 + RFC 7523), or via brokered downstream credentials at the gateway layer? When the LLM calls `create_issue`, does that call hit Jira as the actual user, with their actual Jira permissions? If it always hits as a single shared bot account, fail (or at least flag).

## 8. Sandboxed runtime

**Why it matters:** even with all of the above, the server is still code running somewhere. If it runs as root in a shared cluster with a mounted host filesystem, items 1–7 do not help when there is a CVE in a dependency.

**Check:** container with non-root user, no host mounts, explicit egress allowlist, dropped capabilities. Better: each tenant gets its own pod. The Archestra approach — [running each MCP server as an isolated pod](/docs/platform-overview) via the orchestrator — is one example, but any equivalent isolation story is fine. "We run a single shared Node process for all tenants" is not.

## 9. Observability hooks

**Why it matters:** "is this server up?" "why is p99 latency 12 seconds?" "which user is causing the spike?" the platform team needs to answer these without SSH'ing into the box at 3am.

**Check:** Prometheus metrics endpoint, OpenTelemetry tracing for incoming and outbound calls, structured logs (see item 3), health and readiness probes. If the only signal is "it returned 200," fail.

## 10. Signed releases

**Why it matters:** unsigned `npm`/`pypi` packages, Docker images with a floating `latest` tag, GitHub releases with no provenance attestation — all the same problem: there is no way to prove the bits being run are the bits the vendor shipped. See [the MCP supply chain risk](/blog/mcp-supply-chain-risk) post.

**Check:** are container images signed (Cosign / Sigstore)? Are packages published with provenance attestations? Is there a documented way to verify a release before deploying? This is the boring item that catches the loud incidents. If there is no signing story at all, fail.

---

## Scoring it

Run the ten enterprise MCP requirements above, mark each pass or fail, count the passes. An honest rubric:

- **9–10 pass:** ready for general enterprise rollout. These are rare today.
- **6–8 pass:** ready for a pilot with a defined blast radius and a security review per release.
- **3–5 pass:** community-grade. Fine on a developer laptop, not fine touching production data.
- **0–2 pass:** don't.

Most of what is in the public MCP catalog right now lands in the 3–5 range, and that is fine for what those servers are — early, open, useful, made by one person on a weekend. The gap between "useful tool" and "enterprise-deployable software" has always existed; MCP just exposes it more cleanly because the protocol surface is small enough that the gaps stand out.

For vendors: items 1, 2, 6, and 10 are the cheapest to fix and the highest leverage on procurement cycles. Item 7 is the one that will block the largest deals next year.

For security teams: copy the list, paste it into the standard MCP onboarding doc, send it to vendors _before_ the call. Straight answers, twenty minutes instead of an hour.
