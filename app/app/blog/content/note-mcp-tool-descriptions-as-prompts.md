---
title: 'MCP Tool Description: Why It Is a Prompt, Not Documentation'
description: 'Every MCP tool description is microcopy the model reads before selecting a tool. Write it like a system prompt, not API docs.'
isNote: true
author: 'Mack Chi'
---

An MCP tool description is a prompt fragment, not documentation. The model reads it at tool-selection time, alongside the system prompt and peer tools, then decides whether to call the tool, route to a different one, or answer from memory. Hedge-heavy prose biases the model away from selection. Tight, opinionated copy wins the call. Treat every MCP tool description as load-bearing microcopy.

Agents routinely skip well-wired tools because the description hedges. The schema is fine. The wiring is fine. The MCP tool description — three sentences of "this tool can be used to retrieve information about..." — quietly tells the model to look elsewhere. Every word counts. Every hedge costs a call.

## What the Model Actually Sees

When an MCP client connects to a server and lists tools, the model receives a list of objects roughly shaped like this:

```json
{
  "name": "search_customers",
  "description": "This tool can be used to retrieve information about customers from the customer database. It supports various query parameters.",
  "inputSchema": { ... }
}
```

At tool-selection time, the model reads the **name**, the **description**, and the parameter names and descriptions in the schema. That is the complete input. No README. No wiki page explaining that `search_customers` is faster than `list_customers` for the common case. The MCP tool description is the entire pitch.

The description is closer to a system prompt than a docstring. The model treats it identically — instructions that bias behavior. Hedge-heavy prose produces hedge-heavy tool-call behavior. Tight, opinionated copy gets the model to pick the right tool and skip the wrong one.

When an MCP server lives behind a gateway, the description travels through untouched and lands in the model's context window. [Archestra's MCP platform](/docs/platform-mcp) sits in exactly that spot, and the descriptions surfaced are what every connected agent sees. Related read on the sibling problem of tool naming: [MCP tool naming conventions](/blog/mcp-tool-naming-conventions) — different field, same principle.

## What Bad MCP Tool Descriptions Have in Common

The bad ones share the same DNA. They tend to:

- **Hedge**: "can be used to", "may be useful for", "supports various"
- **Describe the API, not the job**: "wraps the `/v2/customers` endpoint"
- **Omit the trigger**: nothing tells the model **when** to call this versus a peer tool
- **Omit failure modes**: nothing tells the model when **not** to call it
- **Repeat the name**: `search_customers` description that starts with "Searches customers."
- **Stack adjectives**: "comprehensive, flexible, powerful interface for..."

Every one of those tokens costs context and earns the model nothing. Worse — hedges actively bias against selection. When two tools could plausibly answer a question, the model reaches for the one that sounds confident.

## The MCP Tool Description Rewrite Pattern

Four lines, in order:

1. **What it does** — one verb-led sentence. No hedging.
2. **When to call it** — the trigger. Concrete signal in the user's request.
3. **When not to call it** — name the peer tool or the failure mode.
4. **What comes back** — the shape, briefly.

Usually 3-5 sentences total, under 300 characters. No preamble. No marketing voice. Write it like a one-line instruction to a junior engineer who has to pick the right tool in two seconds.

## Before and After

Three real examples, lightly anonymized. Agents shift behavior on the spot after these rewrites.

### Example 1 — Customer Search

Before:

```
This tool can be used to retrieve information about customers from the
customer database. It supports various query parameters and returns
customer data in a structured format.
```

After:

```
Find customers by email, name, or company domain. Use when the user
references a specific person or company. Do NOT use for bulk exports —
use export_customers instead. Returns up to 25 matches with id, email,
company, and last_seen_at.
```

What changed: the trigger gives the model a clear signal. The negative case routes the model elsewhere when it would otherwise pick wrong. The return shape is named so the model can plan its next step.

### Example 2 — Log Query

Before:

```
Query application logs. Supports filtering by service, level, and time
range. This is a powerful tool for debugging.
```

After:

```
Search application logs from the last 14 days. Use when the user asks
about errors, crashes, latency, or "what happened at <time>". Returns
the 50 most recent matching log lines with timestamp, service, level,
and message. For older logs, say so — this tool does not reach them.
```

What changed: "powerful tool for debugging" gets cut — pure flattery, no signal. The trigger phrases match how users actually phrase it. The 14-day limit is in the description, not buried in the schema, so the model declines gracefully when asked about last quarter.

### Example 3 — Calendar Create

Before:

```
Creates a new event in the user's calendar with the given title, time,
and attendees.
```

After:

```
Schedule a new calendar event. Use only when the user has confirmed
the time AND attendees. If either is missing or ambiguous, ASK before
calling. Returns the created event's id and a join link if it's a
video meeting.
```

What changed: this one is not about choosing between tools, it is about choosing between "call the tool" and "ask a clarifying question." The original quietly encouraged the model to fire off events with hallucinated times. Write-tools especially benefit from a "confirm first" line — destructive or side-effecting actions deserve the friction.

## Two Sharp Edges

A couple of details worth flagging:

- **Descriptions count against context.** A server that exposes 40 tools with paragraph-long descriptions burns real tokens on every turn. Tight MCP tool descriptions are not only better for selection — they are cheaper. Before writing a fifth sentence, ask whether the model actually needs it.
- **Schema descriptions matter too.** The model reads `inputSchema.properties[*].description` alongside the tool description. A parameter described as "the customer's email address (must be valid RFC 5322)" gets passed cleaner values than one described as "email". Do not waste those fields.

## How To Test an MCP Tool Description

Short loop:

1. Write the description.
2. Start a fresh chat in an MCP client (Claude Desktop, Cursor, Open WebUI — whichever).
3. Phrase a request the way a real user would. Not "use the search_customers tool" — instead, "find me everyone from acme corp who logged in last week."
4. Watch which tool the model picks.
5. If it picks wrong, the description lost. Rewrite and try again.

Run this five times with five different phrasings. The sentences doing work become obvious, as do the ones the model ignores. About 20 minutes per tool, and it is the highest-leverage thing available for MCP server quality short of writing better tools.

Write MCP tool descriptions like the model is going to read them, because it is.
