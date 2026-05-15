---
title: 'MCP vs LangChain tools'
description: 'MCP vs LangChain tools compared: LangChain tools live inside one Python runtime, MCP is the wire protocol exposing tools to any agent or language.'
isNote: true
author: 'Mack Chi'
---

# MCP vs LangChain tools

MCP vs LangChain tools is not a head-to-head between competing categories. A LangChain tool is an in-process abstraction inside LangChain's agent runtime. MCP is a transport-level protocol for exposing tools to any runtime over the wire. Both let an AI "call a function," but they sit at different layers, and conflating them costs a rewrite. This post lays out the MCP vs LangChain tools comparison, when to pick each, and what changes when one is swapped for the other.

The problem most teams hit: an engineer wrote a tool once for the agent framework already in use, and now another team wants to call that tool from a different agent, a different language, or a different model. The tool itself is fine. The way it's exposed is not. LangChain tools and MCP look similar - both let an AI "call a function" - but they live at different layers, and confusing them costs a rewrite.

> The short version: a LangChain tool is an in-process abstraction inside LangChain's agent runtime. MCP is a transport-level protocol for exposing tools to any runtime over the wire. They solve adjacent problems and are not interchangeable. An MCP server can be wrapped as a LangChain tool, and a LangChain tool can be exposed via an MCP server. The sections below cover the comparison table, a concrete opinion on which to pick when, and what changes when swapping one for the other.

For the bottom-line definition of MCP first, the cluster anchor is here: [What is MCP, in one paragraph?](/blog/what-is-mcp-in-one-paragraph). For readers who've already seen [MCP vs function calling](/blog/mcp-vs-function-calling), this post is the same shape of argument one layer up - LangChain tools sit above function calling, not at the same level as MCP.

## The short MCP vs LangChain tools comparison

| Axis                 | LangChain tools                                                                                         | MCP                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| What it is           | A Python or JS class/decorator that LangChain's agent loop knows how to call.                           | A wire protocol with a defined schema, transport, and lifecycle.                        |
| Where it runs        | In the same process as the agent. A function import away.                                               | In a separate process, often on a separate machine. Reached over stdio or HTTP.         |
| Language             | Python or TypeScript only, and only inside LangChain.                                                   | Any language that can speak the protocol. Servers exist in Python, TS, Go, Rust, Java.  |
| Coupling             | Tightly coupled to LangChain's agent runtime, prompt templates, and callback system.                    | Decoupled. The server doesn't know what model, framework, or language the client uses.  |
| Discovery            | Static. A list of tool objects is passed into the agent constructor.                                    | Dynamic. The client calls `tools/list` over the wire at runtime.                        |
| Auth                 | Out of scope. Credentials are handled in the Python function body.                                      | Part of the protocol. OAuth 2.1, transport security, defined credential boundary.       |
| Reuse across clients | None. Other agents have to reimplement the tool.                                                        | Native. Cursor, Claude Desktop, ChatGPT, and custom agents can all hit the same server. |
| What it's good at    | Fast iteration inside one Python codebase. Tight integration with LangChain agents, memory, and chains. | Reuse, governance, language portability, swapping runtimes.                             |

Read the table once and the punchline is already there. A LangChain tool is a library construct. An MCP server is a network service. They are not competing categories.

## LangChain tools are an abstraction. MCP is a protocol.

This is the cleanest one-line framing of MCP vs LangChain tools.

A LangChain tool is a Python or TypeScript object. Decorate a function with `@tool def search_invoices(query: str) -> str:`, hand the resulting object to an `AgentExecutor`, and LangChain's agent loop introspects its docstring, builds a schema, passes it to the LLM, parses the tool call, and runs the function. The whole loop happens inside one process. Calling `search_invoices` from outside that process requires importing the Python module - same environment, same dependencies, same in-memory state.

An MCP server is a separate program. It speaks a defined protocol over stdio or HTTP. It exposes `tools/list`, `tools/call`, `resources/list`, and a few other methods. It doesn't know what's on the other end. Could be Claude Desktop. Could be Cursor. Could be a custom Go agent. Could be a LangChain agent that wrapped the MCP server as a LangChain tool. The server doesn't care.

The cleanest framing: **LangChain tools are how one framework calls functions in its own process. MCP is how any program calls tools in any other program.**

## Each one can wrap the other

This is the part the MCP vs LangChain tools framing usually misses, and it's why the "vs" in the title is slightly misleading.

An MCP server can be wrapped as a LangChain tool. LangChain ships an adapter that calls `tools/list` on an MCP server and produces LangChain `Tool` objects on the fly. The LangChain agent then sees them as normal tools and the agent loop works unchanged.

A LangChain tool can also be exposed through an MCP server. A small MCP server in Python calls existing `@tool` functions in response to `tools/call`. A Cursor user, a Claude Desktop user, and a TypeScript agent on a different team can all then reach the same tool over the wire.

This is why "MCP vs LangChain tools" is the wrong question. The real question is **where the tool boundary should live - inside one Python process, or on the wire?**

## When to use LangChain tools, when to use MCP

If a tool only needs to run inside one Python codebase, with one team, one model, and no plans to share it - use LangChain tools. They're lighter. The agent runtime already knows about them. There's no separate server, separate auth, or separate process to stand up. Don't add MCP for the sake of it.

The moment any of the following becomes true, switch to MCP:

- The same tool needs to be called from a non-LangChain agent. Another framework, another language, a desktop client like Cursor or Claude Desktop, a no-code agent builder, whatever.
- The agent framework needs to be swappable without rewriting the tool layer. LangChain is fine today. LangGraph is the same vendor's next thing. There will be a different framework next year. Tools written against MCP don't care.
- Third-party tools need to be reused without a rewrite. The MCP ecosystem already has thousands of servers. None of them are written for LangChain specifically.
- Someone in the org cares which user called which tool. That's usually security, sometimes compliance, sometimes finance. LangChain doesn't have a credential boundary. MCP does.

The most common mistake is picking based on team familiarity. The team knows LangChain, so every tool becomes a LangChain tool, even the ones that should obviously be MCP servers because three other teams need them. Six months later, a pile of Python functions exists that nobody else can use.

The inverse is also a mistake. A two-person team building one prototype agent does not need to stand up MCP servers for every tool. That's ceremony for no payoff.

The short opinion: **LangChain for one codebase, MCP for cross-runtime.**

## "But LangChain already has an MCP adapter"

It does. And it's the right move. For a LangChain shop today that wants to start using MCP servers, nothing has to be rewritten - wrap the MCP server with LangChain's adapter and the agent treats it as a normal tool. That's the migration path most teams take.

What's worth pushing back on is treating the adapter as a substitute for choosing the right boundary. If a tool will be called from multiple agents, languages, or clients, write it as an MCP server first and wrap it for LangChain on the way in. Don't write it as a LangChain tool and expose it through MCP later - that's the same rewrite that keeps showing up in real codebases.

## Where Archestra fits in MCP vs LangChain tools

The Archestra platform makes a deliberate choice: sit at the MCP layer, not at any one agent framework. LangChain is one of many clients that can connect to an Archestra gateway. So is Cursor, so is Claude Desktop, so is a custom Go service. The platform's job is the layer above the framework - the gateway clients connect to, the registry of servers, the auth model that decides which user can call which tool, and the orchestrator that runs self-hosted MCP servers inside a customer's Kubernetes. The shape of that platform is documented in [Archestra's MCP overview](/docs/platform-mcp).

A platform team almost never gets to dictate which framework the rest of the company uses. The data team likes LangChain. The application team is on LlamaIndex. Some other group is on a hand-rolled agent in TypeScript. When the tool layer is glued to one framework's abstraction, the platform team becomes the bottleneck for every migration. When the tool layer is MCP, the framework choice belongs to somebody else.

## So, LangChain tools or MCP?

Leave existing LangChain tools where they are if they work and the team knows them. The next time a second consumer shows up - another team, a Slack bot, a customer-facing copilot - don't write the new tool as a LangChain tool. Write it as an MCP server and wrap it for LangChain on the way in.

The pattern that holds across teams: move the most-shared tools to MCP servers first and leave the long tail in LangChain. Not because LangChain is failing. Because nobody wants to be the person rewriting the tool layer the next time the company picks a new framework.
