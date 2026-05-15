---
title: 'The actual case for MCP, for skeptics'
description: "The value of MCP isn't integration — it's client-side discovery. Why the protocol matters when the user, not the app, picks the tools."
isNote: true
author: 'Mack Chi'
---

## The actual case for MCP, for skeptics

The recurring objection to MCP is fair: every tool it exposes could be exposed by a direct API call, so the value of MCP looks redundant. That framing is the source of the skepticism — and it's almost right. The actual value of MCP is not that it's a better way to wire an LLM to an API. It's that it moves the decision about _which tools exist_ from the app author to the user at runtime. That single shift is the whole case. Everything else — the schemas, the transport, the SDK — is plumbing.

### The steel-manned skeptic

The strong version of the skepticism goes like this. A function-calling agent already takes a JSON schema and a callable. Anything an MCP server can describe, a hand-rolled tool definition can describe in less code. The MCP spec adds a transport, a handshake, a session model, and a discovery step that the app author already knows the answer to — because the app author wrote the integration. Adding MCP, in this framing, is paying protocol tax for capabilities that the app already has. For a single-team product shipping one fixed agent against three known APIs, this critique holds. The protocol is not free, and a team that controls both ends of the wire is paying for flexibility it never uses.

### The framing flip: client-side discovery, not integration

The value of MCP shows up when the app author is not the same person as the tool author. An integration protocol assumes a static set of tools chosen at build time. A _client-side discovery_ protocol assumes the opposite: the client — the agent host, the IDE, the desktop app — asks the user which servers to connect to, and the agent's tool surface is composed at runtime from whatever the user authorized.

> MCP isn't for the app author. It's for the user — the one deciding at runtime which tools the agent has access to. If you control both ends, you never needed it.

This is why MCP looks redundant inside a vertical product and indispensable everywhere else. The agent host doesn't know in advance whether the user has GitHub, Linear, a private database, or a homegrown ticketing system. The user knows. MCP is the protocol that lets the user answer.

### The specific shape of problem it solves

Three properties of that shape are doing the real work. First, a uniform contract — once an agent host speaks MCP, every new server is reachable without code changes on the host. Second, capability negotiation — tools, resources, prompts, and sampling are advertised by the server, not assumed by the client, so a server can ship new tools without a host release. Third, an identity and consent boundary that lives between the agent and the tool, not inside the agent's prompt. The host can enforce which servers a given user is allowed to reach, gate writes behind confirmation, and audit calls per identity. None of those properties exist in a hand-rolled function-calling integration without re-implementing them per app. For the architectural picture of how a gateway terminates those calls under one auth and audit story, see [the platform MCP overview](/docs/platform-mcp). The one-paragraph definition lives at [what is MCP](/blog/what-is-mcp-in-one-paragraph).

### When MCP is overkill

The honest list of cases where MCP adds nothing: a single-tenant product with a fixed set of internal APIs, a research script that calls one model and one tool, a closed agent where the team controls the host, the tools, and the user's choice of both. In all three, direct function calling is shorter, faster, and easier to debug. The value of MCP is in heterogeneity — many users, many tool authors, many hosts. Homogeneous stacks should skip it.
