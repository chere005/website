---
title: 'State of MCP, mid-2026 snapshot'
description: 'State of MCP in mid-2026: 900+ catalog servers, converged OAuth 2.1 auth, gateway patterns, sandboxing gaps, and the watchlist for the next 18 months.'
isNote: true
author: 'Mack Chi'
---

# State of MCP, mid-2026 snapshot

The state of MCP in mid-2026 is this: the Archestra [catalog](/mcp-catalog) crossed 900 servers, auth has largely converged on OAuth 2.1 + PKCE, gateway-fronted deployments dominate production, and the open gaps are sandboxing, agent identity, and A2A consolidation. The protocol stopped being a clever idea and became connective tissue, and the state of MCP debate has moved from "will it stick" to "which gaps close first."

This snapshot covers the state of MCP for someone who knew the protocol existed in 2024, ignored it for a year, and now needs to catch up. Catalog data first, then the auth state of play, then production patterns, then the gaps that still hurt, then the near-future watchlist. Readers who want only the gaps and the watchlist can skip to the last two sections.

## What MCP is, in five-year-old terms

MCP is the cable that connects an AI assistant to tools. Without it, every assistant needs custom wiring to every tool. With it, the assistant speaks one protocol, and any tool that also speaks it can plug in. The interesting part of the state of MCP today is what the cable has grown into over eighteen months.

For the version history of how the protocol got here, see [a short history of the MCP spec](/blog/mcp-spec-version-history).

## The catalog: ~900 servers and counting

When the Archestra team [celebrated 100 servers adopting the Trust Score](/blog/celebrating-100-mcp-servers-milestone) in September 2025, the catalog itself already had close to 900 entries. Eight months later that number is still climbing, and the shape of who publishes has shifted.

A few patterns visible in the catalog data:

- **Vendor-published servers are now the norm at the top.** Eighteen months ago, most high-quality servers were hobbyist projects. Today the top of the catalog (by quality score and by stars) is dominated by official servers from Grafana, Docker, Atlassian, Notion, GitHub, and similar. The community kept building, but the bar moved.
- **The long tail is still mostly solo.** As called out in [why Archestra was founded](/blog/why-we-found-archestra), roughly every tenth MCP server is built by a single engineer with very little engineering visibility. That ratio has barely moved. Fine for experimentation, dangerous for production.
- **Quality is bimodal.** The top quartile looks like real infrastructure: tests, CI, signed releases, docs. The bottom quartile looks like a Friday night experiment nobody took down. Picking which servers to actually run is now the hard problem, not finding one.

## Auth: mostly converged, mostly painful

Eighteen months ago, MCP auth was a mess. Every server invented its own scheme. Today the picture is much cleaner, and this convergence is the single biggest reason MCP is being taken seriously by enterprise teams in 2026.

Where the dust has settled:

- **Remote servers speak OAuth 2.1 + PKCE.** Discovery through `.well-known/oauth-protected-resource` and dynamic client registration via RFC 7591 are table stakes. Claude Desktop, Cursor, Open WebUI, and the rest of the MCP-native clients all expect this to Just Work. Servers that do not expose it cannot be installed without manual configuration, and most users will not bother.
- **Enterprise servers validate IdP JWTs with JWKS.** Rather than running a second OAuth provider in front of every internal server, teams point at their existing IdP's JWKS endpoint and validate tokens statelessly. This is now the default for any server inside a corporate network.
- **Enterprise-Managed Authorization (EMA) is the new ceiling.** Built on ID-JAG, EMA lets an enterprise grant per-server access without making every user click through interactive consent in every client. It landed earlier this year, and the platforms that integrated it first are winning the larger pilots.

Still painful: production gateways have to handle all four validation paths at once (gateway-issued OAuth, externally-issued IdP JWTs, ID-JAG exchanges, and legacy static bearer tokens), because legacy clients and servers do not upgrade together. Any gateway built today should plan for that fourfold reality from day one.

## Production patterns that have settled

Beyond auth, a few patterns now show up in almost every serious MCP deployment:

1. **A gateway in front of N servers.** Nobody serious exposes raw MCP servers directly to clients in production. There is always a gateway handling auth, rate limiting, audit, and routing. The single-endpoint, many-servers-behind-it model has won.
2. **Streamable HTTP everywhere.** The old HTTP+SSE transport is effectively dead in new deployments. Streamable HTTP collapsed both directions onto one endpoint and made the streaming upgrade opt-in per response. One of the cleanest protocol fixes the spec has shipped.
3. **Per-tool policy, not per-server policy.** Teams want to allow `read_issue` but not `delete_repository` from the same GitHub server. Treating a server as a single allow/deny unit is too coarse for anything that touches write actions.
4. **Sampling is still rare in practice.** Server-initiated model calls have been in the spec since day one, but most deployed servers do not use them. The loopback ergonomics are awkward. This is expected to flip in the next year. It has not flipped yet.

## The gaps that still hurt

MCP is past its early-adopter phase. The next eighteen months are not about adoption; they are about closing the gaps that every enterprise pilot hits in the first hour.

Three gaps keep showing up:

- **Sandboxing is still optional.** The spec does not require any process isolation, and the default install path for many servers is still "run this Node or Python process on your laptop with full filesystem access." A year and a half in, this is the most embarrassing gap in the current state of MCP. Sandboxing should be a default of the runtime, not an extension. Until that is true, every "MCP supply chain" story is one bad `npm install` away from becoming a real incident.
- **Agent identity is not a real thing yet.** When an agent calls an MCP server, the server sees a user token or a service token. It does not see "this is agent X, running on behalf of user Y, with these constraints." Some implementations bolt this on through claims, but there is no standard. Without it, audit logs cannot distinguish "the user did this" from "the agent did this," and that distinction matters a lot in regulated environments.
- **A2A is still not consolidated.** Agent-to-agent communication is happening, but the protocols overlap with MCP's transport and discovery layers in messy ways. Some unification, or at least clean bridging, is overdue. Right now every agent framework is reinventing this corner.

Sandboxing is the most urgent of the three, and the one with the lowest political cost to fix. The other two need broader buy-in across vendors and will take longer.

## The next eighteen months: watchlist

Speculation, clearly labeled as such:

- **Sandboxing lands in the core spec or in a widely adopted extension.** The community has been doing isolation in different ways (Docker, gVisor, Firecracker, WASM) and none of it is portable. A common contract for "this server runs sandboxed" would change the security story overnight.
- **A formal agent identity model.** Either MCP grows one, or a sibling spec grows one and MCP defers to it. The current situation is not sustainable past a pilot.
- **A2A and MCP either bridge cleanly or merge in the transport layer.** Both are likely. Whichever happens first sets the shape of the next ecosystem.
- **Rate limiting, audit-event schemas, and policy attachments as enterprise extensions.** EMA was the first extension to land outside core. These are the obvious next ones.

MCP in November 2024 was a clever idea with a half-dozen example servers. The state of MCP in May 2026 is the connective tissue of a real ecosystem: about 900 catalog entries, a converged auth story, and a clear set of remaining gaps. The protocol earned that growth. Now it has to earn the next layer.

For the live numbers, see [State of MCP](/state-of-mcp), which is updated continuously rather than once a year.
