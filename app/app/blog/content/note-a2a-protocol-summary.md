---
title: 'The A2A protocol in 5 bullet points'
description: 'The A2A protocol is structured webhooks for agent-to-agent calls. Five things to know about the A2A protocol before shipping any integration.'
isNote: true
author: 'Mack Chi'
---

# The A2A protocol in 5 bullet points

The [A2A protocol](https://a2a-protocol.org/) (Agent-to-Agent) is the emerging standard for one agent invoking another over HTTP. Proposed by Google in 2024 and adopted by enough vendors to take seriously, the A2A protocol defines a JSON-RPC envelope, a discovery manifest, and an auth model on top of plain HTTP. The short answer: it is webhooks with structure, not a new transport.

Anyone building with agents will run into the question of how one agent should hand work to another. Should the first agent call the second over MCP? Over a webhook? Over something new? The ecosystem is converging on the A2A protocol for this case. This note is the natural follow-up to the earlier [post on triggers](/blog/agent-triggers-explained) — A2A is what happens when "who is invoking the agent" answers itself with "another agent."

The opinion up front: **the A2A protocol is webhooks with structure, not a new protocol.** Treat it that way and the result is less code, fewer abstractions, and faster shipping. Treat it as a new paradigm and the result is a parallel stack nobody needs. The five points below all roll up to that claim.

## 1. Identity — who is calling, and as whom

The first thing the A2A protocol pins down is identity. A call carries a bearer token in the `Authorization` header, exactly like any other authenticated HTTP request. There is no A2A-flavored auth scheme — the protocol explicitly leans on existing standards. Platform-issued OAuth tokens work. Platform-specific tokens work. Archestra's A2A endpoint accepts the same tokens as the [MCP gateway](/docs/platform-mcp-gateway) — there is no separate token type. That is the right call. Inventing new credential formats per protocol is how integrations end up with five secrets each.

The subtle part: the token identifies the _caller_ (the other agent, or its platform), but the permissions that matter are what the _target_ agent is allowed to do once it runs. Do not conflate the two.

## 2. Transport — HTTP POST, JSON-RPC envelope

The A2A protocol wire format is HTTP POST with a JSON-RPC 2.0 envelope. The main method is `message/send`. The payload is a `message` with one or more `parts`, where a part is text, a file reference, or structured data. The response comes back as either a JSON-RPC `result` or an `error`. That is it. There is no streaming-specific protocol, no custom socket type, no binary framing. Anyone who has ever called a Stripe webhook can call an A2A endpoint.

This is the part that vindicates the "webhooks with structure" framing. The transport is not new. What A2A adds is a _shape_ for the body that other agents can recognize, so a caller does not have to learn a custom payload schema before talking to the target.

## 3. Task envelope — the message, the role, the parts

Every A2A protocol call carries a task envelope: a message with a role (`user`, `agent`), one or more typed parts, and an optional task ID for long-running work. The message-and-parts structure is borrowed pretty directly from the chat completions APIs every LLM provider already uses. Agents that already speak "messages with parts" internally — and most do — pay almost no friction cost for the envelope.

The piece that is actually useful here is the task ID. A2A supports two modes:

| Mode         | Behavior                                        | Use case                                |
| ------------ | ----------------------------------------------- | --------------------------------------- |
| Synchronous  | POST, wait, get a result                        | Short tool calls, fast lookups          |
| Asynchronous | POST, get a task ID, poll or get notified later | Multi-minute research, long tool chains |

For agents doing real work, the async path matters. This is one of the few places the A2A protocol genuinely adds something plain webhooks do not give for free.

## 4. Capability discovery — AgentCard at a well-known URL

Before calling an agent, a client can ask it what it does. Every A2A-compliant agent exposes an `AgentCard` at `/.well-known/agent.json`. It advertises:

- The agent's name and description
- A list of skills
- The endpoints and auth requirements for invoking those skills

A caller fetches this first, picks the skill it needs, and then sends a message.

This is the most interesting part of the spec, and also the easiest to over-engineer. AgentCard is service discovery — a manifest at a known URL. Anyone who has published an OpenAPI spec, a `.well-known/openid-configuration`, or a `robots.txt` already understands the pattern. The value is that any A2A client can introspect an agent without a custom SDK. The risk is spending more time on the AgentCard than on the agent it describes. Don't.

## 5. Threat surface — exactly the webhook one, plus one twist

This is where the "treat it like a webhook" rule earns its keep. The A2A protocol threat model is the webhook threat model:

- Replay attacks
- Spoofed payloads
- Signature verification
- Retries causing duplicate work
- Schema drift between caller and callee

Everything written in [the triggers post](/blog/agent-triggers-explained) about webhook hardening applies here unchanged. Verify the bearer token. Bind the token to a specific caller. Reject anything unsigned. Use a session header so traces stay coherent — Archestra uses `X-Archestra-Session-Id` for that.

The one twist: because the caller is another agent, the payload is by definition LLM-generated text. That makes it a prompt-injection vector on top of being a generic untrusted input. The mitigations are the ones described in the [Dual LLM post](/blog/dual-llm) — treat the body as data, not as instructions, regardless of how friendly it looks. An A2A call from another agent inside the same org is _still_ untrusted input. That other agent could have been reading a malicious GitHub issue thirty seconds ago.

---

The full technical breakdown — endpoints, request shapes, session grouping, exact auth wiring — lives in [the Webhook (A2A) docs](/docs/platform-agent-triggers-webhook-a2a). The short version: the same URL accepts an A2A envelope or a pass-through JSON body, uses the same token system as the rest of the platform, and carries the same security posture as any other webhook. Which is the point. Agents calling agents should not need a whole new stack. The A2A protocol needs a well-shaped envelope, a known URL for discovery, and the discipline to treat every inbound call as something an attacker might have ghostwritten.
