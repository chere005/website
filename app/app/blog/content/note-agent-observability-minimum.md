---
title: 'The minimum agent observability stack'
description: 'Agent observability requires five fields per run: trace ID, tool name, latency, token count, outcome. Without them, production agents cannot be debugged.'
isNote: true
author: 'Mack Chi'
---

# The minimum agent observability stack

Agent observability requires exactly five fields on every agent run: trace ID, tool name, latency, token count, and outcome. Without these, production agents cannot be debugged when they fail silently. HTTP-level metrics, request counters, and process-wide token totals are not enough. This note specifies the agent observability floor, maps each field to Prometheus and OpenTelemetry, and lists what can safely be deferred.

The pattern is familiar: an agent that worked yesterday returns empty answers today. The on-call dashboard reports the agent as healthy — HTTP 200s, p95 under a second, no 5xx spike. The chat UI says the agent has nothing useful to say. Triage stalls because there is no trace ID to follow from the chat turn into a tool call, no per-tool latency, and a token counter scoped to the whole process rather than the request. The fix is often a one-line config change in an upstream MCP server. The forty minutes spent finding it is an agent observability problem.

## Why HTTP observability is not enough for agents

Most teams ship their first production agent with the observability tooling they already have for HTTP APIs. RED metrics on the request handler. A trace per inbound HTTP call. Maybe a counter for "number of agent invocations." Then debugging agents feels harder than debugging the boring CRUD service next door.

An agent is not a function call. It is a small tree: one inbound request fans out into N LLM calls and M tool calls, and the tool calls fan out into their own network calls. The interesting failure modes — the model hallucinated a tool name, the tool returned an error the model swallowed, the tool took 28 seconds and the user gave up — live at the leaves, not the root. HTTP-level metrics report that the root span finished with status 200. They cannot identify which leaf is on fire.

This is the same shape of problem as the [trigger-bug pattern](/blog/agent-triggers-explained) — a system that looks healthy at the boundary while doing the wrong work inside. Tool calls need their own observability primitives.

## The five fields every agent run needs

For every agent run, five things are required. They are not optional. If any one is missing, an incident will eventually arrive that the other four cannot explain.

**1. Trace ID.** A single identifier that ties the inbound request, every LLM call it triggered, every tool call those triggered, and any downstream HTTP calls into one tree. Without it, there is only a pile of log lines and no way to know which ones belong together. In OpenTelemetry, this is the trace ID on the parent span — Archestra emits a `chat {agentName}` parent span with `SpanKind.SERVER` per chat turn and propagates the trace via W3C `traceparent` so LLM and MCP spans nest as children. In Prometheus, the hook is exemplars: every histogram bucket can carry a sample trace ID, so a latency spike on a chart becomes a click-through to the exact trace.

**2. Tool name.** Which tool the agent called, by its real name (`github__list_repos`, not "the GitHub one"). This is the single most useful filter ever applied to agent telemetry, because most production agent bugs are tool-specific. In Prometheus, the `tool_name` label on `mcp_tool_calls_total` and `mcp_tool_call_duration_seconds`. In OTel, the `gen_ai.tool.name` attribute on the `execute_tool {tool_name}` span. Labeling only by server (`github`) and not by tool discards the dimension that actually gets filtered on.

**3. Latency.** How long the call took, separately for the LLM call and the tool call. LLM latency is dominated by output length, tool latency by whatever upstream system the tool talks to. Bucketing them together hides both. In Prometheus, `llm_request_duration_seconds` and `mcp_tool_call_duration_seconds`, both histograms so percentiles can be computed. In OTel, the span duration on each. Capture time-to-first-token (`llm_time_to_first_token_seconds`) too if agents stream; the difference between a slow agent and a slow-feeling agent is almost always TTFT.

**4. Token count.** Input and output tokens, separately, per LLM call. This is the bill, the context-window early-warning system, and the "did the model actually return something or just say 'I don't know'" signal in one number. In Prometheus, `llm_tokens_total` with a `type` label of `input` or `output`. In OTel, `gen_ai.usage.input_tokens` and `gen_ai.usage.output_tokens`. The empty-answer incident pattern is a five-minute triage with this field: 12 output tokens after 4,000 input tokens is a different story than 800.

**5. Outcome.** An enumerated label saying what actually happened — `success`, `error`, `blocked`, `timeout`. Not the HTTP status code. The agent-level outcome. A blocked tool call is not an HTTP 4xx; it is a policy decision the platform made, and it should be counted separately. In Prometheus, the `status` label on `mcp_tool_calls_total`, plus `llm_blocked_tools_total` for blocked calls. In OTel, the span status (`OK`/`ERROR`) plus `mcp.blocked=true`, `mcp.blocked_reason`, and `mcp.is_error_result` for tools that returned an error payload without throwing.

That is the floor. Trace ID, tool name, latency, token count, outcome. Five fields, two backends, every agent run.

## What agent observability does not need on day one

The corollary to a tight minimum is a generous "not yet" list. Cost dashboards are useful but downstream — token counts come before a dollar figure, and the same token counts feed straight into [per-run and per-team budget caps](/blog/agent-cost-controls). Tool argument and result capture is great for postmortems but expensive at volume; ship the five fields first, turn on content capture when needed. Per-user labels are nice for usage dashboards but not load-bearing for incident response.

The point of having a minimum is to stop arguing about the maximum. A team two weeks into an "observability strategy" that has not yet shipped a single tool name into a metric has skipped the part that mattered.

## Wiring up the agent observability stack

Rolling a custom stack: instrument the LLM client to emit a span and a histogram per call with the labels above, instrument the tool dispatcher to do the same with `tool_name` and `mcp.server.name`, propagate `traceparent` so spans nest, point Prometheus at the scrape endpoint and OTLP at a collector. None of that is hard, but all of it is fiddly — the kind of work that gets pushed to "next sprint" until an incident makes it urgent.

Archestra ships the five fields by default — Prometheus metrics on `:9050/metrics`, OTLP traces to whatever collector is configured, Grafana dashboards that already filter by `tool_name`, `agent_name`, and `status`. The [observability docs](/docs/platform-observability) have the full attribute list and the dashboard install script. The design exists because the forty-minute incident pattern repeats often enough to be worth eliminating.

Pick the floor. Ship the floor. Then argue about the ceiling.
