---
title: "'MCP server' and 'MCP client' are confusing names"
description: 'Why the MCP client server naming is backwards from how engineers use the words everywhere else, and what MCP client and MCP server actually mean.'
isNote: true
author: 'Mack Chi'
---

# MCP Client Server Naming Is Backwards: What MCP Client and MCP Server Actually Mean

The MCP client server terminology is backwards from standard web conventions. In MCP, the client holds the LLM and the agent loop, while the server exposes tools. That inverts the HTTP intuition that "server" means the heavy production system and "client" means the small caller. Engineers adopting MCP routinely swap the two words for weeks before the mapping locks in. The names are bad. Stating it plainly is the first step to working around it.

## What the MCP Client and MCP Server Actually Point To

In the MCP client server model, the **MCP client** is the thing with the LLM and the agent loop. Claude Desktop. Cursor. An IDE. A custom Python script that calls the model and decides what to do next. The big, smart, expensive piece.

The **MCP server** is the thing that exposes tools. A Postgres connector. A GitHub wrapper. A 200-line script that knows how to read a calendar. Often tiny. Often dumber than the client. It just sits there and waits to be asked.

Anyone with time around HTTP, REST, or basically anything web-shaped has the opposite intuition. The "server" is the heavy production system. The "client" is the small thing on someone's laptop that calls into it. Browsers are clients. APIs are servers. That mapping has been load-bearing for thirty years.

MCP flips it. The MCP server is often also on the same laptop, started by the client, talking over stdio. The smart agent is the client. The dumb tool exposer is the server. It's backwards from the heuristic everyone shows up with.

## Why the Spec Picked These Words

To be fair to the MCP authors: the naming follows JSON-RPC conventions. In JSON-RPC, the "client" is whoever sends the request and the "server" is whoever answers. The MCP client sends `tools/call`, the MCP server returns a result. By the protocol's own definitions, the words are technically correct.

LSP, the Language Server Protocol that MCP openly borrows from, does the same thing. The editor is the "client." The language analyzer is the "server." Same JSON-RPC framing, same name swap. This is why VS Code is the "LSP client" even though it's the thing engineers actually use.

The spec authors had a precedent and they followed it. That's the defense, and it's a real one.

## The MCP Client Server Names Are Still Wrong

The defense is technically right and practically wrong. Here is why it matters:

Most people who write MCP integrations are not protocol nerds. They're application engineers who have spent their careers learning that "server" means "the big thing in the cloud" and "client" means "the small thing on the laptop." That mental model is correct in 99% of their work. MCP is the 1% that breaks it, and it breaks it loudly, in the two most common nouns in the docs.

Every time someone reads "configure your MCP client," they have to stop and translate: _the client is Cursor, the client is Claude Desktop, the client is the agent._ Every time someone reads "the MCP server holds the credentials," they have to translate again: _the server is the small local thing just installed, not a thing in the cloud._ Some MCP servers ARE in the cloud. Some MCP servers are 80 lines of Python on a laptop. The word does no work.

A week of onboarding confusion, multiplied across every team adopting MCP, is a real tax. The spec authors paid it to keep JSON-RPC alignment. Worth it for them. Less obviously worth it for everyone else.

A cleaner choice would have been "host" for what the spec calls "client" and "tool provider" for what the spec calls "server." But the names are baked into a hundred IDEs and a thousand SDKs. The most anyone can do now is name the trap so the next reader of the docs gets through onboarding faster, and so whoever designs the next protocol does not repeat it.

## MCP Client Server Field Guide

If there is only one mapping worth remembering:

- **MCP client = the thing with the LLM.** Claude Desktop, Cursor, a custom agent. It calls tools.
- **MCP server = the thing that exposes tools.** Postgres connector, GitHub wrapper, filesystem reader. It answers calls.

A few common phrases translated:

- "Configure your MCP client" means edit the Cursor or Claude Desktop config file.
- "Install an MCP server" means add a small program (often a `uvx` or [`npx` invocation](/blog/npx-mcp-is-not-installation), which is its own problem) that the client will launch.
- "The MCP server holds credentials" means the small tool-exposing program needs an API key. Yes, even the one on a laptop.
- "Remote MCP server" means an MCP server reached over HTTP instead of stdio. Closer to what intuition wants "server" to mean in the first place.

For the longer plain-English version of what any of this actually does, see [what is MCP, in one paragraph](/blog/what-is-mcp-in-one-paragraph).

## Why MCP Client Server Naming Matters for Security

Beyond onboarding confusion, the MCP client server naming swap matters when designing the security boundary. Archestra sits between the client and the server. The [platform's MCP layer](/docs/platform-mcp) is the gateway every MCP client talks to, and it's the thing that decides which upstream MCP server actually runs the call, with which credentials, on whose behalf. Getting the words right in your head is the first step to drawing that boundary on a whiteboard without erasing it three times.

The names are bad, the spec authors had a reason, and they are not changing. Knowing the trap is the workaround.
