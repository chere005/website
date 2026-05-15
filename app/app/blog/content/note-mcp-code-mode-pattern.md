---
title: 'MCP Code Mode: collapsing tool round-trips'
description: 'MCP Code Mode swaps N atomic tool calls for one execute() over a typed API. Cut tokens and round-trips, but a sandbox is now required.'
isNote: true
author: 'Mack Chi'
---

# MCP Code Mode: collapsing tool round-trips

MCP Code Mode is a pattern that replaces N atomic MCP tools with a single `execute()` tool that runs a TypeScript snippet against a typed API. It collapses multi-turn tool-calling loops into one turn, cutting both token cost and call count. The trade-off is concrete: `execute()` runs arbitrary code, so a sandbox becomes mandatory.

Agents using classical tool-calling loops routinely burn dozens of turns on tasks a few lines of code could express directly. A task like "find customers who paid last month but did not log in this month, then draft a check-in email" can balloon into forty-plus tool calls — list, filter, list, filter, cross-reference, draft, draft, draft — each one a full model round-trip. The decisions were resolved after the first few calls; the rest is spelling out one verb at a time because that is what a tool-calling loop looks like.

## What MCP Code Mode changes

MCP Code Mode flips the surface. Instead of exposing N atomic MCP tools, one tool is exposed: `execute(snippet: string)`. The snippet is TypeScript and talks to a typed object — `invoices.list()`, `users.get(id)`, `email.draft({ to, body })` — generated from the same definitions that used to be individual MCP tools. The agent writes the loop. The runtime runs the loop. One turn, one tool call, one result back to the model.

For a deeper look at why an isolated runtime is non-negotiable here, see [Three reasons to sandbox every MCP server](/blog/sandbox-your-mcp-server). The two posts are halves of the same argument.

## The round-trip tax

Every tool call is a full turn. The model writes a JSON blob, the runtime parses it, the server runs the thing, the result comes back, the model re-reads everything it has seen so far, then writes the next blob. Forty-one calls is forty-one of those turns. The tax is not just latency — it is the schema for every tool, re-presented to the model on every turn, plus the result of every prior call, plus the conversation. By call thirty the model is paying to re-read calls one through twenty-nine.

## Flattening the loop with MCP Code Mode

Under MCP Code Mode, the forty-one-call trace becomes one snippet that lists invoices, joins against users, and drafts three emails in a `for` loop. The same decisions get made — once, as code, instead of as forty-one sequential JSON blobs.

**Collapse N atomic tools into one workflow tool, and both token cost and call count drop. The price is that a sandbox is now required.**

## The sandbox requirement

`execute()` is an arbitrary-code-execution tool. The model is the input. A prompt injection in any document the agent reads can now write a `for` loop that reads `~/.ssh/id_rsa` and posts it to a webhook. This is not a new threat — it is a change in geometry. The threat is concentrated in one tool, which is good for review, and trivially powerful, which is bad for defaults. Run the snippet in a container with no host filesystem, no host network, and an egress allowlist. Pass it only the typed API and the credentials it actually needs. The [sandbox post](/blog/sandbox-your-mcp-server) covers the three reasons in detail; MCP Code Mode is the use case that makes the third reason — egress — non-negotiable.

Shipping MCP Code Mode without a sandbox builds a remote code execution endpoint with a friendly name. Shipping MCP Code Mode with one builds a faster, cheaper agent and an audit surface small enough to actually read.
