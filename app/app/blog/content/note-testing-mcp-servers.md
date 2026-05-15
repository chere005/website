---
title: 'How to test MCP servers: three layers that actually work'
description: 'Testing MCP servers requires three layers: protocol conformance, tool unit tests, and recorded agent transcripts. Each catches what the others miss.'
isNote: true
author: 'Mack Chi'
---

# How to test MCP servers properly

Testing MCP servers requires three layers, not one: protocol conformance, tool unit tests, and end-to-end runs with a recorded agent transcript. Each layer catches a class of failures the other two cannot see. Most MCP servers in production ship with zero tests, or a single `it("starts")` that checks the process boots. That is not testing MCP servers — that is wishful thinking.

The median MCP server has no test file. The next-most-common configuration is a smoke test that confirms the binary launches. Servers that actually exercise a tool call end-to-end are rare across public catalogs, internal repos, and customer code alike.

Part of the reason testing MCP servers stays underspecified is that nobody has written down what the phrase means. The thing under test is a protocol server with a non-deterministic client on the other end. "Unit test the tools" misses the protocol. "Run it against Claude and eyeball it" misses everything else. The result is shipped servers that nobody can reason about under change.

The working model: **three layers. Protocol conformance, tool unit tests, and end-to-end with a recorded agent transcript. Each one catches what the other two miss.**

## Layer 1: protocol conformance

This is the layer most teams skip, on the assumption that the SDK "handles it." The SDK handles the happy path. It does not handle a server that returns a tool result with the wrong content shape, advertises a tool whose schema does not parse, or hangs on `initialize` because a startup hook is doing network I/O. Run an inspector — MCPJam, the official MCP inspector, or a Postman-style harness — in CI against a freshly-started server. List tools, list resources, call each tool with its declared input schema, and assert the response validates against the declared output schema. This catches the boring, embarrassing failures before a real agent ever sees them.

## Layer 2: tool unit tests

The handlers behind each tool are normal functions. Test them as normal functions. Mock the upstream API the tool talks to, pass in the parameters the tool declares, and assert the return value. The class of bug this layer catches is parameter handling the protocol layer cannot see: optional fields treated as required, empty arrays serialized as `null`, dates that round-trip wrong. If only one layer fits the budget, this is the one — it pays for itself the first time a tool's signature changes.

## Layer 3: recorded agent transcript

The hardest failures are the ones where the protocol is fine, the unit tests pass, and the agent still picks the wrong tool or fills a parameter with garbage. The fix is to run the server against a real model once, save the full transcript — prompts in, tool calls out, tool results back — and replay it as a fixture. When a tool description changes, the transcript changes; the diff is the review. This is the same instinct as the [agent observability minimum](/blog/agent-observability-minimum): a tool call without a recorded trace is a tool call that cannot be reasoned about after the fact.

All three layers are not required on day one. Knowing which layer is being skipped, and why, is required. A unit-test file plus a replay fixture plus an inspector run in CI is an afternoon of work. The reason teams skip testing MCP servers is rarely difficulty — it is that nobody has drawn the three layers on a whiteboard and said, out loud, "pick one to start."

Pick one to start.
