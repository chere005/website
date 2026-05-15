---
title: 'MCP production issues: what actually breaks in real deployments'
description: 'Five MCP production issues that recur in real deployments — transport, schema, OAuth, and silent hangs — and the fix for each.'
isNote: true
author: 'Mack Chi'
---

# MCP production issues: what actually breaks in real deployments

MCP production issues fall into five repeatable failure modes: transport flakiness under load, tool description drift, schema mismatches across SDK versions, OAuth refresh storms, and silent JSON-RPC hangs. Each one passes health checks, each one looks fine in dev, and each one quietly stops an agent from doing its job in production. The fixes below are the boring kind: protocol-layer heartbeats, CI checks against schemas, version pinning, jittered token refresh, and per-call timeouts. None are defaults in any current SDK.

Every honest MCP production issues post has the same shape: an assumption that felt safe in dev until prod proved it wasn't. Here are the five that break most often, with the fix for each.

## Transport flakiness under load

Streamable HTTP looks like HTTP and lies about it. The connection is long-lived, the server keeps per-session state, and the load balancer will terminate it at 60 seconds because that is what load balancers do. The symptom is "the third tool call in a long conversation hangs forever." The fix is boring: configure the LB for long-lived streams, add a heartbeat at the protocol layer, and treat a stale session on the client as a reconnect, not a retry.

## Tool descriptions that drift from the implementation

Someone adds a parameter to a tool and forgets to update the description. The agent keeps calling it with the old signature and the new parameter goes unfilled — or worse, gets filled with garbage from the rest of the prompt. The fix is generating the description from the schema, or a CI check that diffs the two. Anything that turns drift into a build failure instead of a midnight page.

## Schema mismatches across SDK versions

A server pinned to `@modelcontextprotocol/sdk` 1.4 talks to a client on 1.7, and one of them changed how `content` blocks are serialized. Everything works for a week, then a single tool that happens to return an image breaks for one specific client. Pin SDK versions across server and client in lockstep, and run a protocol-conformance test against the exact client version shipped to production.

## OAuth refresh storms

A hundred agent sessions all hit token expiry inside the same minute, all try to refresh against the same IdP endpoint, and the IdP rate-limits the whole tenant. The fix is jittered refresh ahead of expiry — refresh at 80% of token lifetime with up to 10% random offset — and a single-flight lock so concurrent calls for the same identity share one refresh. Both are five lines of code, and neither is the default in any current SDK.

## The silent JSON-RPC hang

This is the failure mode that hides best. A tool call gets sent, the server crashes mid-handler, and the JSON-RPC `id` never gets a response. The client sits forever because there is no protocol-level timeout — only whatever wall-clock the caller decided to enforce. The fix is a per-call timeout on every JSON-RPC request id, a circuit breaker per tool, and a child-process supervisor that kills and restarts a stdio server when its handler exceeds the timeout. Do not trust the protocol to fail loudly.

## The observability minimum

The thread running through all five MCP production issues is observability. Each of these gets caught in minutes instead of hours when trace IDs, tool-name labels, per-call latency, and outcome are shipped on every call — the [agent observability minimum](/blog/agent-observability-minimum) is the precondition for debugging any of this. Pick the floor. Ship the floor. The next page gets shorter.
