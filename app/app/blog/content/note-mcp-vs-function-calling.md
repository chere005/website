---
title: 'MCP vs function calling'
description: 'MCP vs function calling explained: function calling is the per-model tool API. MCP is the portable transport layer that wraps it across vendors.'
isNote: true
author: 'Mack Chi'
---

# MCP vs function calling

MCP vs function calling is not a choice between alternatives. Function calling is the per-model API surface for tool use. MCP is the standardized adapter that sits one level up. They do not compete. MCP wraps function calling and makes it portable across vendors, clients, and runtimes.

The actual pain point that drives the MCP vs function calling debate is portability. A platform team that already shipped function calling on top of OpenAI cannot easily let the same tools run from Claude, from Cursor, from a custom Python agent, or from whatever model gets picked next quarter. Tool schemas written once for OpenAI need a slightly different shape for Anthropic, and a third shape for Gemini. Every new client means a fresh integration, and every new model means the tool registry gets rewritten. The problem is not that LLMs cannot use tools. The problem is that tools written against one vendor's function-calling contract only work for that vendor.

If the absolute bottom-line definition of MCP is needed first, the cluster anchor for this series is here: [What is MCP, in one paragraph?](/blog/what-is-mcp-in-one-paragraph). It's a 5-minute read and the rest of this post assumes broad familiarity with MCP.

## The short comparison

| Axis               | Function calling                                                                     | MCP                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Scope              | The model's tool-use API. How a single LLM emits a "call this function" instruction. | A transport and capability protocol. How a client and a server agree on which tools exist, what they do, and how to call them. |
| Ownership          | OpenAI, Anthropic, Google each ship their own. Schemas and semantics differ.         | Open spec. Same wire format for every vendor that adopts it.                                                                   |
| Vendor portability | Low. Each provider has its own schema dialect.                                       | High. The server doesn't know or care which model is on the other end.                                                         |
| Discovery          | Static. The model gets the tool list at prompt time.                                 | Dynamic. Clients call `tools/list` and `resources/list` at runtime.                                                            |
| Auth               | Out of scope. Credentials are handled in the executor.                               | Part of the protocol. OAuth 2.1, transport security, and a defined credential boundary.                                        |
| Tool surface       | Whatever the app code exposes in that one process.                                   | Any MCP server, anywhere on the network, that the client is allowed to reach.                                                  |
| State              | Stateless per call.                                                                  | Sessions, notifications, sampling, elicitation. Bidirectional.                                                                 |
| What it's good at  | Tight integration with one model. Low ceremony.                                      | Reuse, governance, and being able to swap models.                                                                              |

Read the table once and the punchline is already there. MCP vs function calling is not a comparison of two equivalents. They are different kinds of thing.

## Function calling is a feature of the model. MCP is a protocol between programs

Function calling lives inside the LLM API. A POST to OpenAI's chat completions endpoint with a `tools` array uses function calling. The model decides "I want to call `search_invoices` with these arguments," and the API returns that decision to application code. The app then runs the function and feeds the result back into the next turn. The whole loop happens inside the app, with one model vendor, using their schema.

MCP lives one layer up. An MCP server declares, "I have these tools, here are their schemas, here is how to call them." An MCP client (Claude Desktop, Cursor, ChatGPT, a custom agent) connects to that server, fetches the tool list, and when the model decides to call a tool, the client routes that call to the right server. The model still uses its native function-calling API to emit the call. MCP does not replace that step. It standardizes everything around it.

The cleanest way to think about MCP vs function calling: **function calling is the verb. MCP is the grammar that lets any speaker use the same verbs.**

## What actually happens at runtime

A concrete walkthrough makes the abstraction land.

Without MCP, with raw function calling:

1. The app hardcodes a tool schema in OpenAI's format.
2. That schema gets passed in the `tools` field on each API call.
3. The model returns a tool call. The code parses it, runs the actual function, returns the result.
4. Adding Claude support next month means rewriting the schema in Anthropic's format, building a second executor, and maintaining two of everything.

With MCP, on top of function calling:

1. An MCP server exposes the tool once, in the MCP schema.
2. The app (the MCP client) connects to the server and calls `tools/list`.
3. The client takes that list and translates it into whichever function-calling format the current model expects. OpenAI, Anthropic, Gemini - that translation is mechanical and lives in the SDK.
4. The model emits a function call. The client receives it, routes it to the MCP server, and returns the result.
5. Swapping models changes one line in the client config. Nothing on the server changes. Nothing in the tool itself changes.

Function calling is still happening inside the model. MCP is just what makes the rest of the pipeline portable.

## The opinion, stated plainly

MCP is not a replacement for function calling, and anyone framing it that way is selling something or has not built with both.

Function calling is the right primitive at the model layer. The LLM has to have some way of saying "call this function with these arguments," and that is exactly what function calling does. It is not going anywhere.

MCP is the standardized adapter that makes function calling portable across vendors, clients, and runtimes. It is the layer where discovery, auth, governance, and observability happen. It is where an enterprise can declare "these are the tools any agent in this company is allowed to call, and here is who is allowed to call them," without rewriting that policy for every model in the building.

Staying in pure function calling couples the tool layer to one model vendor's contract. That is fine for a prototype. It is a slow disaster at company scale. The day a CISO asks "which agents called the payroll database last week, and which user authorized them," the answer should not live in three different model-specific executors.

## "But the agent works fine without MCP"

It probably does. The honest answer: with one team, one model, one set of tools, and no plans to change any of that, raw function calling is the lighter choice. MCP is not worth adopting for its own sake.

MCP becomes the right call the moment any of the following becomes true:

- The same tool needs to be callable from more than one client. (A chat app, an IDE, a backend agent, all hitting the same Postgres tool.)
- Models need to be swappable without rewriting the tool layer.
- Someone in the org cares which user called which tool. That is usually security, sometimes compliance, sometimes finance.
- Third-party tools need to be installed without forking them. The MCP ecosystem already has thousands of servers, none of them written for "OpenAI function calling" or "Anthropic tool use."

That last point is where most of the catalog momentum comes from. The Archestra catalog just [crossed 100 trusted MCP servers](/blog/celebrating-100-mcp-servers-milestone). None of those are written for one vendor. They are written once, against MCP, and they work everywhere.

## Where Archestra fits

The Archestra platform makes a deliberate choice: do not reinvent the model's tool API. Sit at the MCP layer. Let function calling be function calling. The job is the layer above - the gateway that clients connect to, the registry of which servers exist, the auth model that decides which user can call which tool, the orchestrator that runs self-hosted MCP servers inside a customer's Kubernetes. The shape of that platform is documented in [Archestra's MCP overview](/docs/platform-mcp).

This matters for the MCP vs function calling question because an enterprise platform team almost never gets to dictate which model the rest of the company uses. The data team likes Claude. The engineering team likes GPT. Marketing is on whatever Google ships this quarter. A tool layer glued to one vendor's function-calling format turns the platform team into the bottleneck for every model migration. A tool layer built on MCP lets the platform team ship the tools once and get out of the way.

That is the whole reason MCP caught on the way it did. Not because function calling was broken. Because function calling was great at being a per-model feature, and the industry needed a layer that was not per-model.

## So is MCP actually needed?

For a team running one model, one client, and a working tool set today: not yet. But the moment a second client, a second model, or any kind of per-user audit on tool calls enters the picture, the rewrite cost is larger than just adopting MCP up front. Most teams hit that point faster than they expect.

For the cluster anchor on what MCP actually is, see [What is MCP, in one paragraph?](/blog/what-is-mcp-in-one-paragraph). For the founding story behind this layer specifically, see [Why we found Archestra](/blog/why-we-found-archestra). For the platform shape built around it, the [docs](/docs/platform-mcp) are the place to start.
