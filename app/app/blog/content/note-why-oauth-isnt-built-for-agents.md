---
title: "OAuth for AI Agents: Why the Spec Wasn't Built for Them"
description: 'OAuth for AI agents breaks three core assumptions of the spec. Here are the failures and the four patches the community is converging on.'
isNote: true
author: 'Mack Chi'
---

# OAuth for AI Agents: Why the Spec Wasn't Built for Them

OAuth for AI agents is a forced fit. The protocol was designed for a human at a browser approving one app to access one account on one other app. Agents are long-running server processes acting on behalf of many users across many tools, often with no human present when a token expires. Every rough edge in OAuth for AI agents traces back to that mismatch — three assumptions in the spec collapse the moment the client stops being a person clicking "approve."

OAuth for AI agents is not broken. OAuth was never **built** for agents, and that distinction matters. For the full auth picture — discovery, PKCE, registration, all of it — start with [a developer's guide to MCP authentication](/blog/mcp-authentication-guide). This note covers the three assumptions that fail when OAuth for AI agents enters production.

## The Five-Year-Old Version

OAuth was designed for one shape of request: **a person, sitting at a browser, asking one app to use one of their accounts on one other app.** That is the entire mental model. Consent screen, redirect, token, done.

An agent is not that shape. An agent is a long-running process, on a server somewhere, that wants to act on behalf of many people, across many tools, often without a human in the room when the token expires.

Every awkward moment in OAuth for AI agents comes from squishing the second shape into the first one.

## The Three Assumptions That Break

### Assumption 1: There's a Human at a Browser

The entire authorization code flow is choreographed around a redirect to a consent screen. An agent running in CI, in a container, behind a queue worker — it has no browser. Device flow ([RFC 8628](https://datatracker.ietf.org/doc/html/rfc8628)) is the closest workaround, but it still requires a human stepping in to enter a code.

### Assumption 2: The Client Is the Resource Owner

OAuth assumes the app asking for the token is acting for the user clicking through the screen, right now. Agents routinely act for users who logged in a week ago, or for multiple users in a single process, or for a service identity that is nobody at all. "Who is this token for" stops being a one-word answer.

### Assumption 3: One Token, One Resource

Classic OAuth tokens were bearer credentials with whatever scope someone happened to ask for. Agents call many tools, so the same token tends to drift past the resource it was minted for. If the resource server doesn't check `aud`, the token works on any door — see [audience-bound tokens for MCP](/blog/audience-bound-tokens-mcp).

## The Patches

The community is converging on four. Each one fixes exactly one of the holes above, and together they form the working toolkit for OAuth for AI agents:

- **Audience binding** ([RFC 8707](https://datatracker.ietf.org/doc/html/rfc8707)) — pins a token to one resource server. Fixes assumption 3.
- **ID-JAG** — lets an identity provider issue a token an agent can exchange for the actual access token at the upstream tool. Fixes "who is this for" for enterprise SSO.
- **On-behalf-of** ([RFC 8693](https://datatracker.ietf.org/doc/html/rfc8693) token exchange) — formalizes "this is an agent, calling for Alice right now." Fixes assumption 2.
- **Dynamic and metadata-document client registration** (DCR, CIMD) — gives agents an identity at all, without a human pre-registering them. Fixes the "there's no browser" gap on the registration side of assumption 1.

None of these are exotic. They all live in RFCs. They are simply not what most teams reach for when they write the words "we'll just use OAuth."

Archestra ships this combination by default: audience-bound tokens via RFC 8707, RFC 8693 token exchange for on-behalf-of calls, ID-JAG for enterprise SSO handoff, and dynamic client registration so agents acquire identity without a human in the loop.

## The Opinion

OAuth assumes a human at a browser, acting for themselves, on one resource. An agent is none of those things at any given moment — and pretending otherwise is what makes every MCP auth post-mortem read like the same incident. Ship audience binding on day one, decide which user the agent is acting for explicitly, and stop calling it a bug when the protocol does exactly what it was designed to do.
