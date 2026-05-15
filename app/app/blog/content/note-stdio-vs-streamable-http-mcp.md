---
title: 'MCP stdio vs HTTP: When to Use Each Transport'
description: 'MCP stdio vs HTTP transport guide. stdio fits local, single-user tools. Streamable HTTP fits shared, multi-tenant, or remote deployments. Pick the right one on day one.'
isNote: true
author: 'Mack Chi'
---

# MCP stdio vs HTTP Transport

MCP stdio vs HTTP is not a choice between equivalents. stdio is for local, single-user tools — a CLI, a desktop assistant, a developer laptop. Streamable HTTP is for anything shared, multi-tenant, or remote. Picking the wrong MCP transport is one of the most common MCP architecture mistakes, and "we'll switch later" almost never happens.

The MCP stdio vs HTTP confusion shows up the same way every time. A stdio MCP server works perfectly on a single developer's laptop — fast, reliable, every demo flawless — then gets deployed to a shared environment and falls over the moment a second user connects. Sessions interleave. Tools answer with the wrong user's data. The container's memory chart looks like a sawtooth. The code is not broken. A stdio MCP server was shipped to a place where a stdio MCP server cannot survive.

The problem in five-year-old terms: stdio is two people in the same room passing notes by hand. Streamable HTTP is the post office. Two people in the same room do not need a post office. A thousand recipients across a network cannot be reached by hand-passed notes. MCP has both transports for a reason. The wrong choice between MCP stdio vs HTTP is the single most common MCP architecture mistake in production today.

> This note is a comparison. It is short because the answer is short. Below: what each transport actually is, the process model and the auth story behind each, a table worth screenshotting, and the one rule worth writing on the wall in any team building MCP servers in 2026.

## What MCP stdio Actually Is

stdio is the MCP transport where the client launches the server as a subprocess and they talk over standard input and standard output. JSON-RPC frames in, JSON-RPC frames out, one process per client session. That is the entire mental model. There is no network. There is no port. There is no listener. The client owns the lifecycle of the server — when the client quits, the server dies, and when the client starts, a fresh server is spawned with a fresh state.

This is ideal for local, single-user tools. Claude Desktop launches a filesystem MCP server when it boots, the server reads files on the local machine, and the whole thing disappears when the client quits. No port to fight with. No auth to configure — the operating system already authenticated the user at login. No multi-tenant concerns, because there is only ever one tenant.

The moment that server is shared with anyone else, every property that made stdio nice on the laptop becomes a problem. There is no listener for a second user to connect to. There is no shared process to coordinate state. There is no auth, because the model is "trust whoever launched the process," and across a network nobody is launching anything.

## What Streamable HTTP Actually Is

Streamable HTTP is the MCP transport where the server is a long-running HTTP service that any compliant client can reach over the network. It is a single endpoint that handles both directions of the JSON-RPC traffic, upgrading the response to an event stream when the server needs to push something. It replaced the older HTTP+SSE transport in early 2025 — see [the MCP spec version history](/blog/mcp-spec-version-history) for the full transition. Short version: it is the best protocol upgrade MCP has shipped, and it is what every remote MCP server should run today.

The shape of Streamable HTTP is the shape of every other modern web service. There is a hostname. There is TLS. There is auth — usually OAuth 2.1 with PKCE for MCP-native clients, sometimes a static bearer token for service integrations. A load balancer sits in front. Observability comes for free because it speaks HTTP, which means every existing tool — logs, APM, WAF, audit log pipelines — works without translation. Multiple replicas are supported. Deployment happens without clients touching anything.

This is what shared MCP servers want to be.

## MCP stdio vs HTTP: The Comparison

| Property                 | stdio                                                    | Streamable HTTP                                              |
| ------------------------ | -------------------------------------------------------- | ------------------------------------------------------------ |
| Process model            | One subprocess per client session, spawned by the client | One long-running service, many concurrent client sessions    |
| Who can reach it         | Only the user who launched it, on the same machine       | Anyone who can resolve the hostname and pass auth            |
| Auth model               | OS-level — whoever started the process is "the user"     | OAuth 2.1 with PKCE, ID-JAG, JWKS, or bearer tokens          |
| Observability            | Whatever the client logs, plus the subprocess's stderr   | Standard HTTP logging, tracing, metrics, audit trails        |
| Deployment surface       | Whatever the client decided to install                   | A real service deployed, versioned, and rolled back          |
| State across sessions    | None. Each launch is a fresh process                     | The server holds shared state if it wants to                 |
| Session identity         | Implicit — there is only one                             | Explicit — every request is authenticated                    |
| Failure mode when shared | Crashes, races, leaks, cross-user data bleed             | Normal web-service failure modes that already have playbooks |
| Right place to use it    | A user's own laptop                                      | Anywhere more than one person reaches it                     |

If the right column describes anything an MCP server has to do, a stdio server is not viable. The MCP stdio vs HTTP transports are not interchangeable. They were designed for different worlds.

## The Rule Worth Defending

stdio belongs in local-only use. The moment a second human reaches the MCP server — a teammate, a coworker, anyone — ship Streamable HTTP from day one.

Teams routinely say "start with stdio, it's faster to write, switch to HTTP later." The switch does not happen. "Later" means the demo is on Friday, and the demo runs on a developer's laptop, and the laptop is somehow still in production three months after the demo. Production MCP integrations whose actual runtime is one engineer's MacBook running tmux are not rare. That is not infrastructure.

The migration from stdio to Streamable HTTP is not free. It is more than swapping a transport flag. The auth story has to be built from scratch. State that the server held across calls only worked because there was one process. The upstream API rate-limits per-token and now needs a token strategy. Tests assumed sequential single-threaded access. None of these are hard problems on their own — they are problems that stdio hid, and that Streamable HTTP forces into the open.

Solve them on day one. The team that ships Streamable HTTP from the start spends one extra afternoon writing an OAuth handler and gets to keep their evenings forever.

## Where Archestra Fits

A Streamable HTTP MCP server sitting in front of an actual team needs a place to live, a way for users to authenticate, a way to inherit each caller's credentials to upstream APIs, and an audit log. [The Archestra MCP Gateway](/docs/platform-mcp-gateway) exists so teams stop hand-rolling that layer. The gateway is the stable endpoint clients connect to — Cursor, Claude Desktop, Open WebUI, custom agents — and it handles the OAuth 2.1 flow, the per-caller credential resolution, the visibility rules, and the audit pipeline. Point an MCP client at one URL and the rest of the multi-tenant story becomes somebody else's problem.

For readers earlier in the MCP learning curve, [the one-paragraph MCP explainer](/blog/what-is-mcp-in-one-paragraph) covers what MCP is, and [the spec version history](/blog/mcp-spec-version-history) covers how the transports got to where they are.

## The MCP stdio vs HTTP Rule

Two people, two transports. If exactly one person reaches the MCP server, stdio is fine. If more than one person reaches the MCP server, Streamable HTTP, from day one, no exceptions. Do not write "we'll migrate later" in a Notion doc. That migration does not happen.

Pick the right MCP transport before a customer is counting on the wrong one.
