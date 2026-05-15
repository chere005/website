---
title: 'What is MCP, in one paragraph?'
description: 'What is MCP? A plain-English definition of the Model Context Protocol, its three primitives, and why portability (not tool use) is the real innovation.'
isNote: true
author: 'Mack Chi'
---

# What is MCP? The Model Context Protocol in One Paragraph

**What is MCP?** MCP, the Model Context Protocol, is an open JSON-RPC specification that lets any LLM application talk to any external tool or data source through a single, standard interface. Anthropic published MCP in November 2024, and it is now implemented by OpenAI, Google, every major IDE, and thousands of independent servers. An MCP "server" exposes a capability (a database, an API, a filesystem, a SaaS tool), and an MCP "client" (Claude Desktop, Cursor, ChatGPT, a custom agent) connects to it over stdio or HTTP. The protocol defines three primitives the server can offer: tools (functions the model can call), resources (read-only content the model can pull in), and prompts (parameterized templates a user can invoke). The point of MCP: write the integration once, plug it into any model.

## Where MCP came from

Anthropic open-sourced MCP in November 2024, but the problem it was built to solve is older. Every new LLM or new tool meant somebody had to rewrite the glue. OpenAI's function-calling JSON was not Anthropic's tool-use JSON was not Gemini's tool format, and none of them specified how an LLM application should discover or authenticate to the tool on the other end. MCP picks one wire format (JSON-RPC 2.0), one transport story (stdio for local, streamable HTTP for remote), and one capability model, and lets everyone above and below the line stop reinventing it.

## What MCP actually replaced (and what it didn't)

A common misreading: "MCP lets AI use tools," as if AI could not use tools before November 2024. It could. OpenAI shipped function calling in June 2023. Anthropic had tool use. Gemini had its own format. What did not exist was portability.

Before MCP, connecting an agent to a Postgres database meant writing model-specific tool schemas, a bespoke executor that ran the SQL, and a bespoke loop that fed results back into the model. Switching from GPT-4 to Claude meant rewriting the schemas. Wiring Cursor and Claude Desktop to the same database meant writing it twice.

After MCP, a single Postgres MCP server runs once. Cursor, Claude Desktop, ChatGPT desktop, and any custom Python agent all speak the same protocol to it. Switching models changes nothing on the server side.

That is the actual innovation in MCP. Not "AI can use tools." It is "write the integration once, every model can call it." This is the same shift that LSP (Language Server Protocol) caused for editors and language tooling a decade ago, and the analogy is not accidental, MCP borrows LSP's JSON-RPC framing on purpose.

## The three MCP primitives

- **Tools** are functions the model can decide to call: `search_issues`, `send_email`, `run_query`. The server describes them with a JSON Schema; the client offers them to the model.
- **Resources** are addressable read-only content the model or user can pull into context: a file, a row, a wiki page, a log. The client decides what to attach; the server just serves bytes.
- **Prompts** are server-defined templates the user can invoke explicitly (think slash commands). They are not auto-injected. They exist so a server can ship a "good prompt" for its own domain instead of hoping each user writes one.

Everything else in MCP (sampling, roots, elicitation, notifications) is built on top of those three primitives.

## Why MCP caught on so fast

Two reasons, one technical and one political.

The technical reason: the MCP spec is small enough to implement in a weekend, and the reference SDKs (Python, TypeScript, Go, Rust, C#, Java, Kotlin, Swift) handle the boring parts. A working server is often under 200 lines.

The political reason: nobody owns the standard except a public spec repo, which made it safe for OpenAI and Google to ship clients without endorsing a competitor's product. Once OpenAI added MCP support to ChatGPT and the Agents SDK in spring 2025, the network effect was over. Any tool vendor not shipping an MCP server was leaving distribution on the table.

## What MCP is still bad at

The adoption curve is also where the hard problems live. The [MCP catalog](/mcp-catalog) is full of servers shipped by a single contributor with no review process. The protocol has no real built-in story for [authentication or per-user enterprise credentials](/blog/enterprise-managed-authorization-mcp). And the "let the model call whatever tool it wants" default sits one prompt injection away from a data leak, which is [exactly the kind of problem Archestra was founded to solve](/blog/why-we-found-archestra). MCP is the USB-C of LLM tooling: a good standard, widely adopted, and entirely indifferent to whether the thing on the other end of the cable is safe to plug in.
