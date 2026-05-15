---
title: "What does MCP 'sampling' actually do?"
description: 'MCP sampling lets a server request an LLM completion from the client mid-tool-call — the most underused primitive in the Model Context Protocol spec.'
isNote: true
author: 'Mack Chi'
---

# What does MCP Sampling Actually Do?

MCP sampling is the Model Context Protocol primitive that lets a server ask the client to run an LLM completion on its behalf, mid-handler, over the same JSON-RPC session. The server sends messages and model preferences; the client picks the model, executes the call against its own API key, and returns the result. That single inversion of roles is the most underused capability in the MCP spec — and the cleanest path for the protocol to grow up.

The practical framing: an MCP server that needs to "summarize this," "classify that," or "draft an email" cannot ship without forcing every user to bring their own API key. Hardcoding a model in the server and bundling an `OPENAI_API_KEY` in `.env` turns a tool into a SaaS product with a billing problem. MCP sampling solves this — the server asks the client's LLM to do the thinking, on the user's bill, with the user's chosen model.

> This note is short. The first two sections cover the definition. The flow and a small JSON-RPC snippet follow. The opinion sits at the end, plainly.

## What MCP Sampling Actually Is

Most of MCP runs in one direction: the client (Claude Desktop, Cursor, ChatGPT, a custom agent) calls tools on the server. The server is passive — it exposes tools, resources, and prompts (see the [three primitives](/blog/what-is-mcp-in-one-paragraph)) and waits to be asked.

Sampling flips that. The server, mid-handler, says to the client: "an LLM completion is needed. Here are the messages. Here are preferences about cost, speed, and intelligence. The client decides which model, makes the call, returns the text." The client owns the API key and the model choice. The server owns the task that needs an LLM in the middle of it.

In MCP terms, the method is `sampling/createMessage` — a request from the server to the client over the same JSON-RPC session everything else rides on.

## The MCP Sampling Flow, Step by Step

The handshake is unspectacular, which is the point. Same JSON-RPC connection, roles inverted for one round trip.

1. The client connects to the server and capabilities are exchanged. The client declares `sampling: {}` if it is willing to run LLM calls on behalf of the server. If not, the server falls back to working without it.
2. The user calls a tool, opens a prompt, whatever. The server starts handling it.
3. Mid-handler, the server decides it needs an LLM. It sends `sampling/createMessage` to the client with `messages`, `modelPreferences` (hints about cost, speed, intelligence priorities, and preferred model families — not a hard model name, because the server does not get to pick), `systemPrompt`, `maxTokens`, and optionally `temperature` and `stopSequences`.
4. The client routes that request to whichever LLM it has configured — Claude, GPT, a local model. The client is supposed to surface this to the user before sending. MCP sampling is one of the spec's "human in the loop by default" moments: the client controls which model is used and whether the call happens at all.
5. The model responds. The client returns a `CreateMessageResult` containing the assistant message, the model that was actually used, and a stop reason.
6. The server takes that text and continues — finishing the tool call, building a resource, populating a prompt.

A minimal request looks roughly like this:

```json
{
  "jsonrpc": "2.0",
  "id": 42,
  "method": "sampling/createMessage",
  "params": {
    "messages": [{ "role": "user", "content": { "type": "text", "text": "Summarize this PR diff in one sentence." } }],
    "modelPreferences": {
      "hints": [{ "name": "claude-3-5-sonnet" }],
      "costPriority": 0.3,
      "speedPriority": 0.4,
      "intelligencePriority": 0.8
    },
    "maxTokens": 200
  }
}
```

That is the whole shape. The server says what it wants. The client decides how to get it.

## Why MCP Sampling Matters More Than Most Realize

To put it plainly: sampling is the most underused primitive in MCP, and the ecosystem is worse for it.

Tools get all the attention because tools are what demos run on. "Look, the agent can query Postgres." Resources are fine. Prompts are a nice idea most clients still half-support. Sampling is the only primitive that lets a server ship behavior needing an LLM in its hot path without making the server a paying customer of OpenAI or Anthropic.

What that unlocks:

- A code review server where `analyze_pr` asks the client to summarize each file, classify the risk, and draft suggestions — on the user's model, on the user's bill, with no key in the server.
- A research server that fans out across ten URLs, samples the client for a per-URL summary, and returns a synthesized answer.
- A planner-worker setup where the "planner" is a server that decomposes a goal into sub-tasks and uses sampling to evaluate each one — exactly the shape of agent architectures everyone keeps reinventing in framework code.

The [dual-LLM pattern](/blog/dual-llm) at Archestra lines up with sampling as the natural way to express the quarantined-LLM hop. A tool can, server-side, use sampling to feed untrusted content to an isolated model and only return structured answers back into the main loop. The architecture and the spec match. MCP sampling exists for exactly this kind of inversion.

And yet. Open the [MCP catalog](/mcp-catalog) and search for servers that actually implement `sampling/createMessage`. Few exist. Most servers that need an LLM ship with `OPENAI_API_KEY` in the README and call it a day. The clients are partly to blame — until recently, most popular MCP clients did not support sampling, so there was no point implementing it on the server side. Chicken meets egg, both starve.

The position, stated plainly: every framework that builds MCP servers should ship sampling-first by default. If a server needs an LLM mid-tool-call, route it through the client's model, on the user's bill — not by silently calling OpenAI from inside a Docker container the user does not own. Hardcoding a model in a server is the MCP equivalent of bundling a database driver: it works for one demo and does not survive contact with a real deployment.

## Where MCP Sampling Fits in Archestra

Archestra treats sampling as a first-class part of how a [governed MCP layer](/docs/platform-mcp) should behave. When a self-hosted MCP server in the orchestrator wants to sample, the request flows back through the gateway the same way a tool call flows in — auditable, policy-checked, and routed to whatever client model the org has approved. The server never picks the model. The platform never silently spends someone else's tokens. The user sees the call.

That is the version of sampling the spec is pointing at, and the ecosystem has not yet built it. It is the cleanest primitive in MCP. It deserves more than it has.

One thing to remember: tools let the client drive the server. Sampling lets the server, briefly and with permission, drive the client. Both directions are useful. The second one is how MCP grows up.
