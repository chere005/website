---
title: 'MCP tools, resources, prompts: the three primitives explained'
description: 'MCP tools, resources, and prompts are the three primitives of the Model Context Protocol. Definitions, examples, and why most servers ship only one.'
isNote: true
author: 'Mack Chi'
---

# MCP tools, resources, prompts: the three primitives explained

The Model Context Protocol defines three primitives: MCP tools, resources, and prompts. Tools are functions the model can decide to call. Resources are read-only content the client attaches to context. Prompts are server-defined templates the user invokes explicitly. Most catalog servers ship only tools, leaving two thirds of the protocol unused.

The reason is structural. Every SDK getting-started guide demonstrates tool registration first. Once a handful of MCP tools work in Claude Desktop, server authors assume the integration is complete. It is not. A server with only MCP tools ships one third of the surface area available under MCP tools, resources, and prompts.

For broader background, see [What is MCP, in one paragraph?](/blog/what-is-mcp-in-one-paragraph). This note zooms in on the primitives.

## The three primitives, one sentence each

- **Tools** are functions the model can decide to call on its own.
- **Resources** are read-only content the user or client can attach to context.
- **Prompts** are server-defined templates the user invokes explicitly, usually as a slash command.

Everything else in MCP (sampling, roots, elicitation, notifications) is plumbing built on top of those three.

The distinction worth memorizing is who decides. Tools are model-driven: the LLM picks. Resources are client-driven: the user or the IDE picks. Prompts are user-driven: a human types `/something` and the server fills in the blanks. Three different control surfaces for three different problems.

## A tool: `send_email`

A tool is a function with a JSON Schema. The server lists it via `tools/list`, the client offers it to the model, and when the model decides to call it the client routes the call back. Tools are how an MCP server takes action. They are also the most dangerous part of MCP, because the model is deciding, and the model can be tricked. That is [why Archestra was founded](/blog/why-we-found-archestra) in the first place.

A concrete example. A Gmail MCP server exposes a tool called `send_email` with a schema that requires `to`, `subject`, and `body`. The model decides when to call it based on the conversation. If the user says "reply to Alice and say I'll be there at 4," the model fills in the fields and calls the tool. The server hits the Gmail API and returns a status.

That is the part everyone gets right.

## A resource: `postgres://main-db/orders/{id}`

A resource is an addressable piece of read-only content. The server exposes it under a URI. The client decides what to pull in and attaches it to the context window. The model never decides to read a resource on its own. Resources exist because not every piece of context should be a tool call.

A concrete example. A Postgres MCP server exposes resources at `postgres://main-db/orders/{id}`. In Claude Desktop, the user types `@orders/1234` and the contents of that row are attached to the next message. No tool call, no model decision, no risk of the LLM running a wild `SELECT * FROM orders` to find what it wants. The user pointed at the row, the client fetched it, the model just sees the bytes.

This is what most MCP servers should be doing for read-only data, and almost none of them are. If a server has a `get_thing_by_id` tool whose only job is to return JSON, that is a resource pretending to be a tool. Convert it. The user gets cleaner UX (autocomplete, previews, explicit attachment), and the model stops burning a tool call on something it should not have to decide about in the first place.

## A prompt: `summarize_quarterly_review`

A prompt is a server-defined template the user invokes on purpose. It takes arguments, fills in a structured message, and hands it to the client to send to the model. Prompts are how a server ships an opinion about how its own data should be used.

A concrete example. A Jira MCP server exposes a prompt called `summarize_quarterly_review` that takes a `team` and `quarter` argument. When the user types `/summarize_quarterly_review team=growth quarter=Q1`, the prompt expands into a multi-step message: pull these specific resources, group tickets this way, summarize them in that voice, flag anything that slipped two sprints in a row. The server author baked in the right prompt for their own domain. The user did not have to write it.

This is the most underused primitive by far. Most catalog servers could ship three or four of these and instantly become more useful, because the people who built the server know what good usage looks like better than any user ever will.

## Two thirds of the protocol is on the table

Server maintainers should default to resources for anything read-only and ship at least one or two prompts for the workflows their users actually run. MCP tools should be reserved for the things the model genuinely needs the freedom to choose: write actions, search, expensive computation. Read-only `get_x_by_id` does not belong in `tools/list`. It belongs in `resources/list`.

The usage patterns through the Archestra [MCP gateway](/docs/platform-mcp) make this clear. Tool-only servers get used like rough search engines, with the model burning calls to find data it should have been handed. Servers that ship resources feel completely different. They feel like good data sources. The ones that ship prompts feel like products.

Three things to check before shipping an MCP server:

1. For every read-only `get_*` tool, ask if it should be a resource instead. Usually yes.
2. For every workflow worth demoing, ask if there should be a prompt for it. Usually yes.
3. For tools that take destructive action, write the schema like a contract. The model will read it that way.

MCP is small. The whole spec fits in an afternoon. There is no extra credit for using all three primitives, but the result is a server that does not feel like one third of a server. Most of the [catalog](/mcp-catalog) is one third of a server right now. That is a low bar to clear.
