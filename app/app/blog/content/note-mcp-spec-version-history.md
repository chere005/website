---
title: 'A short history of the MCP spec versions'
description: 'MCP spec versions reference: what each revision shipped, what it broke for implementers, what stayed stable, plus speculation on where the protocol heads next.'
isNote: true
author: 'Mack Chi'
---

# A short history of the MCP spec versions

MCP spec versions have shifted enough that an MCP server built six months ago often no longer works against current clients. This reference lists every major MCP spec version in chronological order, documents what each revision shipped, what it broke, and what stayed stable. Transports were swapped. Auth converged, diverged, and converged again. Enterprise extensions started landing on top of core. Implementers tracking MCP spec versions need a lookup table that maps each release to the migrations it forced.

This note is that lookup table. It covers what shipped in each MCP spec version, when (where verifiable), what implementers had to change, and labeled speculation about future MCP spec versions at the end.

## The MCP spec versions timeline

**November 2024. Initial public release.** Anthropic [introduced MCP](https://www.anthropic.com/news/model-context-protocol) as an open standard for connecting AI assistants to tools and data. The first published MCP spec version defined the three primitives that have stayed stable ever since (**tools**, **resources**, and **prompts**) along with **sampling** for server-initiated model calls. JSON-RPC 2.0 was the framing format. Two transports shipped: **stdio** for local processes and **HTTP+SSE** for remote servers. Reference SDKs (TypeScript, Python) and a handful of example servers (filesystem, GitHub, Postgres) landed alongside the spec.

**Early 2025. Streamable HTTP transport.** The first major breaking change across MCP spec versions. The HTTP+SSE transport, which used a long-lived `text/event-stream` response for server-to-client messages and a separate `POST` for client-to-server, was deprecated in favor of **Streamable HTTP**: a single endpoint that handles both directions, with the response upgraded to an event stream only when the server needs to push. This stands as one of the cleanest protocol upgrades in the MCP spec versions history. HTTP+SSE was the weakest part of the original spec, and Streamable HTTP replaced it without disturbing the data model.

**Mid 2025. Auth converges on OAuth 2.1.** The remote-server authorization story consolidated around OAuth 2.1 with PKCE, plus [RFC 7591](https://datatracker.ietf.org/doc/html/rfc7591) dynamic client registration and the `.well-known/oauth-protected-resource` ([RFC 9728](https://datatracker.ietf.org/doc/html/rfc9728)) / `.well-known/oauth-authorization-server` ([RFC 8414](https://datatracker.ietf.org/doc/html/rfc8414)) discovery endpoints. This is the moment MCP auth started looking like a real standard. The [MCP authentication guide](/blog/mcp-authentication-guide) walks through the practical client-builder view, and it is Part 1 of the three-part auth series.

**Late 2025. JWKS patterns for enterprise servers.** As MCP started showing up in regulated environments, server authors needed a way to validate enterprise-issued JWTs without running their own OAuth provider. The community pattern (validate the caller's IdP JWT against the IdP's JWKS endpoint, statelessly) became common enough to warrant [Part 2 of the auth series on building MCP servers with JWKS](/blog/enterprise-mcp-servers-jwks). This is a pattern more than a spec change, but it shaped the next revision of the MCP spec versions.

**Early 2026. Enterprise-Managed Authorization extension.** The MCP spec gained an [enterprise-managed authorization](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization) extension built on the Identity Assertion JWT Authorization Grant (ID-JAG, [draft-ietf-oauth-identity-assertion-authz-grant](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-identity-assertion-authz-grant)). When EMA landed, enterprises gained a clean way to grant per-server access without driving an interactive consent flow inside every MCP client. Part 3 of the auth series, [why this matters for remote MCP in the enterprise](/blog/enterprise-managed-authorization-mcp), covers the full flow.

For a broader view of where the ecosystem is right now, see [State of MCP](/state-of-mcp).

## What broke each time across MCP spec versions

The biggest field migration so far was **HTTP+SSE to Streamable HTTP**. The old transport held two HTTP requests open in opposite directions more or less indefinitely, which was painful behind load balancers, ingress controllers, and CDNs that wanted to buffer or close idle connections. It also assumed clients could keep a stream open across reconnects without losing message ordering, a fragile assumption on flaky networks. Streamable HTTP collapsed both directions onto a single endpoint, made the streaming upgrade opt-in per response, and let clients reconnect cleanly. Servers that hard-coded the old SSE path had to either ship both transports for a transition window or break older clients. Most published servers did the former for several months. The ones that did not are the reason "why did this MCP server stop working?" is still a recurring question.

The **auth convergence** broke a different set of implementations. Early MCP servers shipped bespoke auth: bearer tokens hard-coded in client config, ad-hoc API keys, sometimes nothing at all. Once the spec called out OAuth 2.1 + PKCE + DCR as the expected pattern for remote servers, clients like Claude Desktop, Cursor, and Open WebUI started expecting `.well-known` discovery and dynamic registration to Just Work. Servers that did not expose those endpoints lost the ability to be installed by MCP-native clients without manual configuration. Authentication friction remains one of the biggest brakes on enterprise MCP adoption, and the convergence on OAuth 2.1 was the first real step out of that mess.

The **JWKS and ID-JAG additions** were less disruptive. They extended the auth surface rather than replacing it. But they did force gateway implementations to handle several validation modes in parallel: gateway-issued OAuth tokens, externally-issued IdP JWTs, ID-JAG exchanges, and static bearer tokens. See [Archestra's MCP authentication docs](/docs/mcp-authentication) for one production take on holding all four in the same gateway.

## What has not changed across MCP spec versions

The core data model has been remarkably stable across MCP spec versions. The three primitives (**tools**, **resources**, **prompts**) and the **sampling** capability for server-initiated model calls have all kept their shapes since the November 2024 release. JSON-RPC 2.0 framing has not moved. The idea that a server advertises capabilities during initialization and the client decides what to use is still the basic interaction model.

That stability is what made the transport and auth churn survivable. The wire format changed; the semantics did not. A server's `tools/list` response in May 2026 looks structurally identical to one from late 2024, even if the connection it travels over and the token authorizing it look completely different. The maintainers of the core spec have been disciplined about not breaking the shape of the data, even while everything around it moved.

## What is next for MCP spec versions

A few directions to watch. All speculation, clearly labeled as such:

- **Server-initiated sampling adoption (speculation).** Sampling has been in the spec since day one but is still rare in deployed servers. This is likely to pick up as agent frameworks figure out the loopback ergonomics.
- **A2A convergence (speculation).** Agent-to-agent communication protocols are starting to overlap with MCP's transport and discovery layers. Some unification, or at least bridging, looks likely.
- **Formal MCP-over-WebSocket transport (speculation).** Streamable HTTP is fine for request/response with occasional push, but a true WebSocket transport keeps coming up for bidirectional, low-latency agent loops.
- **More enterprise extensions (speculation).** Enterprise-Managed Authorization is the first extension to land outside core. Rate limiting, audit-event schemas, and policy attachments are likely to follow a similar path. These are exactly the gaps enterprise pilots flag in the first hour.

Eighteen months in, the protocol has changed enough that "MCP" in November 2024 and "MCP" in May 2026 are recognizably the same idea but materially different specifications. At the current pace, the next eighteen months of MCP spec versions will probably move at least as far.
