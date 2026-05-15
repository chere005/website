---
title: 'What a real MCP audit trail for tool calls looks like'
description: 'An MCP audit trail needs more than tool name plus timestamp. Here is the minimum replayable schema and what to redact before storing it.'
isNote: true
author: 'Mack Chi'
---

# What a Real MCP Audit Trail for Tool Calls Looks Like

An MCP audit trail that only stores tool name, timestamp, and user id is not evidence — it is a metrics line that thinks it's evidence. When an incident happens and the question becomes "which tool call leaked the customer record," tool name plus timestamp cannot answer it. Inputs, outputs, and the agent transcript that led to the call are already gone, garbage-collected by the client. Reconstruction is impossible. A real MCP audit trail captures caller identity, full input and output, agent context, and a replay key — enough to re-run the exact call against staging.

## Why "We Log Every Tool Call" Is Not Enough

The bar most teams ship at sounds reasonable until the day it actually matters. "We log every tool call" feels like compliance. Then a model picks the wrong tool, an agent runs with stale credentials, or a customer record goes somewhere it shouldn't — and three questions need answers: who initiated the call, what exactly went in and out, and what made the agent decide to call it. A metrics line answers none of those. This is the same shape of problem as [the observability minimum](/blog/agent-observability-minimum) — the floor for "is the agent healthy" and the floor for "can we prove what happened" are two different floors, and most teams ship neither.

## The Minimum MCP Audit Trail Schema

Five fields make a record replayable:

1. **Caller identity** — the human (or agent-on-behalf-of-human) the call ran under. Not just user id — also session id, the client (Cursor, Claude Desktop, an internal app), and the access token's `aud` and `sub` claims. If the log cannot distinguish a call from Cursor versus a CLI, it cannot answer half the questions a security review will ask.
2. **Tool coordinates** — server name, tool name, schema version. `slack__post_message@v3` beats `post_message`. When the schema changes and behavior changes with it, the live version at call time must be recoverable.
3. **Full input and output** — parameters in, response out, with secrets redacted on the way to storage (not on the way out, see below). If only one is kept, keep the input — outputs can sometimes be re-derived, inputs basically never.
4. **Agent context** — the last N turns of the conversation that led to this call, plus the prompt that selected the tool. Without this, "why did the agent do this" is unanswerable. It is the difference between an audit log and a `tail -f`.
5. **Replay key** — a deterministic id that allows the exact tool call to be re-run against a staging env. Usually a hash of `(tool, input, schema version)`. This is the field that turns the log from "evidence" into "test case."

A request id that propagates from chat turn → LLM call → tool call ties the whole thing together. If W3C `traceparent` is already wired for observability, the work is already done — same trace id, second consumer.

### Example MCP Audit Trail Record

```json
{
  "request_id": "01HF3K9X2QZJ8M7VYR4N6P5T8B",
  "traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
  "caller": {
    "user_id": "u_8821",
    "session_id": "s_2026_05_14_a91",
    "client": "claude-desktop/0.7.3",
    "token": { "aud": "mcp-gateway", "sub": "u_8821" }
  },
  "tool": {
    "server": "slack",
    "name": "post_message",
    "schema_version": "v3"
  },
  "input": {
    "channel": "C0123",
    "text": "deploy complete",
    "api_key": "[REDACTED:32chars]"
  },
  "output": { "ok": true, "ts": "1715683200.000100" },
  "agent_context": {
    "selecting_prompt": "User asked to notify #deploys after CI passed.",
    "turns": [{ "role": "user", "content": "..." }]
  },
  "replay_key": "sha256:9f2c…"
}
```

## What to Redact, What to Keep in an MCP Audit Trail

The trap most teams fall into is logging everything raw, panicking after a privacy review, then logging nothing. The middle path:

- Redact secrets at the gateway, **before** the record hits durable storage. API keys, refresh tokens, password fields in tool inputs. One regex pass, fail-closed.
- Keep the shape of redacted data. `{"api_key": "[REDACTED:32chars]"}` is debuggable. `{"api_key": "[REDACTED]"}` is not.
- Treat tool outputs the same as inputs. It is very easy to ship a `get_user` tool that returns an SSN field nobody thought about.
- Retention: 90 days hot, a year cold for most teams. PII jurisdictions dictate the actual numbers — but pick something. "Indefinite" is not a policy.

## Log at the Protocol Layer

Log at the protocol layer, not at each server. If every MCP server writes its own audit log in its own format, the result is not an audit trail — it is 14 log shapes to grep. The [gateway is the right place](/docs/platform-mcp-gateway) for this: one schema, one redaction pass, one retention rule, every call. An MCP audit trail belongs in one pipeline, not scattered across servers.

Evidence, not metrics.
