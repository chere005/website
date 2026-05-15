---
title: "So you're the 'MCP person' at your company now"
description: 'A four-week playbook for rolling out MCP at work — inventory, gateway, auth, audit, then ship.'
isNote: true
author: 'Mack Chi'
---

# Rolling out MCP at your company: a four-week playbook

Getting tagged as the "MCP person" usually means one thing: leadership decided the company is "doing MCP this quarter" and someone has to figure out what that means on Monday. This is the playbook for rolling out MCP without lighting production on fire — what to do in weeks one through four, who needs to approve what, and where the rollout usually stalls.

Here is the part nobody says out loud. **It was never about MCP. It was always about giving people — staff or customers — access to internal data inside an AI session.** The protocol is the easy part. The hard part is the same it has always been: which APIs, which users, which scopes, which logs, who signs off. MCP is the new wrapper. The questions are old.

Reframe the assignment before week 1. The job is not "shipping an MCP server." The job is exposing internal APIs under new conditions — a non-deterministic client (the model), a human in the loop who cannot read JSON, and a security team that wants the same answers they always want. Rolling out MCP successfully means treating it as an API governance problem with a new transport layer, not a greenfield protocol project.

## Week 1 — inventory, not code

Skip the server. Open a doc. List every internal API where someone on a sales, support, or engineering call has said the words "I wish AI could just do this." For each one, write down: who owns it, what auth it uses today, what the destructive endpoints are, and whether a wrong call costs money or just causes embarrassment. The top three become candidate servers. Everything else waits. Resist the urge to expose everything — one good server beats five half-broken ones.

## Week 2 — one server, behind a gateway

Pick the lowest-blast-radius API from the list. Read-only is fine — boring is the goal. Wrap it in one MCP server, **but do not expose it directly to clients.** Put a gateway in front from day one, even with just one server behind it. The investment pays off in week 4 when the second and third servers arrive and there is already one place for auth, logs, and tool filtering instead of three.

For gateway selection, the five things that actually matter are unified auth, structured audit logs, namespace filtering, credential injection, and version pinning. Anything that does those is fine. Anything that does not is not a gateway — it is a proxy.

## Week 3 — auth and audit

This is the week most rollouts stall, so budget for it. Two things have to work: SSO into the gateway via the existing IdP (Okta, Entra, Ping, whatever is already in place), and a structured log of every `tools/call` with user, tool name, arguments (redacted), and result. That is it for week 3. Do not try to solve on-behalf-of yet. Do not try to solve per-tool scopes yet. SSO plus audit is the minimum that lets security stop holding the door shut.

When delegated auth eventually shows up — and it will, probably week 5 or 6 — the cleanest pattern available is [enterprise-managed authorization with ID-JAGs](/blog/enterprise-managed-authorization-mcp). It is the one MCP auth extension that actually fits how enterprises already think about identity. Read it before the conversation with the IdP team, not after.

## Week 4 — internal pilot before anyone external

Ten internal users. One server. One week. Measure two things: how often the model picks the wrong tool (tool-description problem, fix the descriptions) and how often a call fails for auth reasons (token, scope, or audience — fix one at a time). Do not let anyone external touch this until internal looks boring.

## The three approvals

While weeks 1–4 are running, three people need to say yes, in this order: **security** (audit log plus sandboxing story), **legal** (data residency plus retention plus what the model is allowed to see), **IT** (SSO integration plus how this fits the joiner/mover/leaver process). Schedule those conversations in week 2, not week 4. Each of them will ask roughly the same five questions every time — answer them once, in a doc, and send the doc ahead of the call.

That is the playbook for rolling out MCP. The protocol is the small part. The rollout is the work.
