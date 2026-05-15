---
title: 'Remote MCP server vs local MCP'
description: 'Remote MCP server vs local MCP: five concrete differences across auth, transport, latency, blast radius, and install UX for enterprise rollouts.'
isNote: true
author: 'Mack Chi'
---

# Remote MCP server vs local MCP

A remote MCP server is the right default for any team rolling MCP out beyond a single laptop. Local MCP fits solo power users. Remote MCP fits organizations with SSO, audit, and a compliance review on the calendar. The rest of this note compares a remote MCP server to a local one across five places where the two architectures actually diverge: auth model, transport, latency, blast radius, and install UX.

"Local-only MCP" sounds safer than it is. Local feels secure because the code runs on a developer's own laptop, the data never leaves the machine, and there is no extra service to break. The cost shows up later: install scripts on every laptop, version drift, audit logs that cannot be stitched together, and credentials pasted into config files that end up in screen recordings. Local-only is a slogan, not a security model. A remote MCP server flips the trade.

This question keeps coming up from security and platform teams, so the long answer follows. Local MCP is not bad. It is a different fit. For a solo power user hacking on a personal laptop, local wins. For a real org, the remote MCP server is almost always the answer.

## A 5-year-old version of the problem

An AI assistant needs to do useful things: send a Slack message, check a Jira ticket, query a database. That assistant needs tools. MCP is the protocol for those tools. The question is where the tool lives.

A local MCP server is a small program the assistant launches on a laptop. The laptop talks to it over a pipe. A remote MCP server is a small program running on a server somewhere. The assistant talks to it over the network. That is the whole shape of it. Everything else - auth, audit, sandboxing - is a consequence of that one choice.

## 1. Auth model

Local MCP authenticates per user, per laptop, with whatever secret happened to get pasted in. The MCP server reads `~/.aws`, env vars, a token in a JSON file. It is "auth" in the same sense that a sticky note under a keyboard is auth. It works for one person.

A remote MCP server authenticates the client to the gateway, and the gateway authenticates to upstream tools. Standard MCP clients use OAuth 2.1 with PKCE. Enterprise clients use ID-JAG or JWKS validation against the company IdP. Direct integrations use scoped bearer tokens. Crucially, the human credential and the upstream credential are different things, resolved at call time. The user never sees the GitHub token; the gateway does. When the user leaves the company, one account flips off in the IdP and the access is gone everywhere.

With an SSO provider and a compliance team in the picture, this is not a nice-to-have. It is the only model that survives an audit.

## 2. Transport

Local MCP usually talks over stdio. The client spawns the server as a subprocess and pipes JSON-RPC over stdin and stdout. It is elegant. It is also a dead end for anything multi-user, because stdio assumes one process per client.

A remote MCP server talks over Streamable HTTP. It is a regular HTTP endpoint that supports server-sent events for streamed responses. One gateway, many concurrent clients, standard load balancers, standard observability. Boring infrastructure, which is exactly what every employee should rely on.

## 3. Latency

This is the one honest win for local. Stdio between two processes on the same machine is microseconds. A remote call to a gateway in another region is a network round trip, tens to a few hundred milliseconds depending on geography.

For most tool calls, this does not matter. The LLM itself takes seconds to respond. Adding 50 ms to a Jira lookup is invisible inside a 4-second model turn. For interactive code editors that fire many tiny tool calls per keystroke, it can matter, and local has the edge. Pick local when latency is the actual bottleneck, not the imagined one.

## 4. Blast radius

This is where the conversation usually ends.

A local MCP server runs as the user, on the laptop, with the user's credentials and the user's file system. If it goes rogue - accidentally, or because malicious code slipped into a dependency - the blast radius is the entire working environment. A separate post covers why [`npx mcp-something` is not "installing" anything](/blog/npx-mcp-is-not-installation) and how the standard `npx -y` pattern is closer to `curl | sh` than to package installation. The blast radius problem is the reason that post exists.

A remote MCP server runs in a gateway sandbox, with credentials the gateway resolves for that specific call, behind policies written once. If it goes rogue, the blast radius is what that gateway is allowed to reach. That is a controllable thing. A laptop is not.

This is also why ["local-only MCP" is a feeling, not a security posture](/blog/why-we-found-archestra) - the surface area on every developer's machine is far larger than the surface area of a single hardened gateway.

## 5. Install UX

Local MCP install means: paste a JSON snippet into a client config, restart, hope it works. If it breaks, debugging happens on the user's laptop. If a new version ships, that means a doc and a request to update. Multiply by headcount.

Remote MCP server install means: an admin adds the server once, picks a version, configures credentials, and assigns it to a gateway. Every client that talks to the gateway gets the new tool the next time it connects. Upgrades happen in one place. Audits read from one log. The local install UX is great for one developer, terrible for a hundred.

## The five differences in one table

| Dimension    | Local MCP                              | Remote MCP server                                    |
| ------------ | -------------------------------------- | ---------------------------------------------------- |
| Auth model   | Per-user keys, pasted into JSON config | SSO, OAuth 2.1, ID-JAG, JWKS - resolved at call time |
| Transport    | stdio, one subprocess per client       | Streamable HTTP, many clients per gateway            |
| Latency      | Microseconds (same machine)            | Network RTT, typically tens of ms                    |
| Blast radius | Whole laptop, user credentials         | Gateway sandbox, scoped policies                     |
| Install UX   | npx + paste config, per-laptop drift   | Admin adds once, every client picks it up            |

## So who should pick what

For a developer hacking on a personal machine, building a personal agent, or experimenting with the protocol, install locally. It is the fastest way to learn what MCP is and what it can do. Most of the catalog still ships as local-first, which is fine for that audience.

For MCP running across a team, a department, or a company, the answer is a remote MCP server. Not because local is broken, but because the things that make local convenient - one user, one laptop, one config file - are exactly the things that do not scale to fifty people and a compliance review. Remote is not prettier. The math is different.

To see what the remote model looks like in production, [the catalog](/mcp-catalog) tracks how each MCP server behaves when placed behind a gateway, including which ones support remote transports natively and which still assume they own the laptop. Start there. Pick the dimension that actually matters, then pick the runtime that fits.
