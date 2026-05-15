---
title: 'Why Official MCP Servers Are Thin: The Auth Problem Behind Half-Baked SaaS Wrappers'
description: 'Official MCP servers from major SaaS vendors expose only a fraction of their APIs. The cause is not laziness; it is an unresolved auth question.'
isNote: true
author: 'Mack Chi'
---

## Why Official MCP Servers Wrap So Little of the API

Official MCP servers from large SaaS vendors expose only the safest, most read-only slice of their public APIs. The reason is not laziness or rushed engineering. The reason is auth. Until vendors have a credible answer for "an agent acting as a user inside an enterprise workspace," official MCP servers will keep shipping with thin coverage and conservative defaults.

### The Slack Pattern

The official Slack MCP server is a useful case study for official MCP servers in general. It lists channels and posts messages. That is roughly the extent of it. No reactions. No thread metadata in any useful shape. No scheduled messages. No reminders. Slack's REST API surfaces hundreds of endpoints. The official MCP wrapper exposes roughly ten percent, and the ten percent it selects is the safest, most read-leaning subset available.

The same pattern repeats across the catalog. The official GitHub server skips the parts of the API that change state in interesting ways. The official Notion server reads pages cleanly but flinches at most of the write surface. The official Linear, Jira, and Asana servers each pick a small island of "obviously safe" endpoints and stop there.

### The Real Constraint Behind Official MCP Servers

This is the point where commentators call the vendors lazy. The vendors are not lazy. They are stuck.

If Slack ships an MCP server that reacts with emoji, sends DMs, and edits messages, it hands every agent in the world a tool that acts _as the user_, inside the user's workspace, with the user's name on every action. That is a different liability than a REST API key sitting in a developer's terminal. A REST key gets used by a human who clicked a consent screen and understands what they are about to do. An agent acting as a user is a person-shaped action with no person attached to the click.

Endpoint coverage is only half the story. The other half is that nobody has a clean answer for "agent acting as a user" inside enterprise SaaS, and official MCP servers inherit that gap.

## The "Agent Acting As Me" Auth Problem

Standard OAuth was designed for a human at a browser. It hands the agent the same scope the human has, then walks away. There is no signal Slack can read to tell whether the message that just went out came from the user thinking for ten seconds or an agent in a server-side loop. The audit log records the user as the subject either way. Legal teams read that and ship the read-only version. Every official MCP server in the wild reflects the same defensive posture.

## The Fix: Delegated Tokens with Audience Binding

The fix is not new. It is delegated tokens with audience binding, plus a clear record of which agent, acting for which user, called which tool. The auth pattern that unblocks this is laid out in [enterprise-managed authorization for MCP](/blog/enterprise-managed-authorization-mcp). The short version: the identity provider issues a grant that names the agent, names the user, and names the resource. The SaaS vendor stops guessing. The audit log finally has the right subject on it.

The other half of the answer sits on the client side. If every tool call routes through a proxy that knows which user is driving, which agent is acting, and which policy applies, the vendor does not have to solve the problem alone. That is what the [LLM proxy](/docs/platform-llm-proxy) is built for. The vendor exposes the full API surface, the proxy enforces who can call what, and the audit trail names both the human and the machine.

## Why This Matters for the MCP Catalog

Until that loop closes, official MCP servers will stay thin. This is not a content problem or a documentation problem. It is the single auth question nobody on the SaaS side wants to be first to answer. Whoever answers it will absorb the long tail of the MCP catalog inside six months.

In the meantime, teams that need the other ninety percent of the Slack API end up writing their own server. That is fine. That is what most of the ecosystem is already doing.
