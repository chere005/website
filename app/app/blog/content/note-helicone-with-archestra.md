---
title: 'Helicone + Archestra: LLM observability vs agent observability'
description: 'Helicone Archestra comparison: LLM observability ends at the model call, agent observability covers tool calls, identity, and dual-LLM decisions.'
isNote: true
author: 'Mack Chi'
---

## Helicone Archestra: LLM observability vs agent observability

Helicone Archestra side-by-side: Helicone is an LLM observability layer (request, response, cost, latency, prompt version). Archestra is an agent observability layer above it (tool calls, identity, dual-LLM decisions, MCP server state, blocked tools). Both ship as "observability," but they terminate different units of work. The right stack runs them together when an agent sits on top of LLM calls.

A common failure pattern makes the gap obvious. An agent with a clean Helicone trace sends a polite, well-formatted email to the wrong recipient. The Helicone trace shows the LLM call that produced the tool argument — tokens, latency, the prompt the model was handed. It does not show the step _before_ the LLM call: which user's session this was, which tool the planner had been allowed to surface, what the dual-LLM check decided about the inbound message, why the recipient field came out the way it did. The dashboard ends at the LLM call. The decision was upstream.

This is the second in a short series of "X + Archestra" comparisons. The first — [LiteLLM + Archestra](/blog/litellm-with-archestra) — argued that LLM proxies and agent gateways look like they overlap but terminate different units of work. Same argument here, one layer up. Helicone observes the LLM call. Archestra observes the agent turn that surrounds it — which tools were called, which user authorized which call, what the dual-LLM planner decided to ignore, which MCP server the side-effect landed on. They sound the same because both say "observability." They are not.

The crisp opinion, up front: most teams ship LLM observability, declare victory, and stop. That is half the story. The agent layer sits above the LLM call, makes most of the interesting decisions, and produces the failures that matter operationally — wrong recipient, wrong tool, wrong user. Agent observability is a separate, complementary discipline.

## Helicone vs Archestra at a glance

| Axis                       | Helicone                                                   | Archestra                                                                                             |
| -------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Layer it observes          | The LLM call                                               | The agent turn                                                                                        |
| Unit of work               | One request/response to a provider                         | One agent decision, including the tool calls it triggered                                             |
| What gets traced           | Prompts, completions, tokens, latency, cost, model version | LLM calls plus MCP tool calls, dual-LLM decisions, identity, session, blocked tools, deployment state |
| Identity in the trace      | User key on the request (configured)                       | Resolved enterprise identity (`archestra.user.email`, `archestra.user.id`) bound through OAuth/JWKS   |
| Tool calls                 | Visible only as text in the LLM response                   | First-class spans (`execute_tool {tool_name}`, `mcp.server.name`, `mcp.blocked`)                      |
| Sandbox / deployment state | Out of scope                                               | `mcp_server_deployment_status` per server                                                             |
| Cost attribution           | Per LLM call, per user key                                 | Per LLM call, per agent, per user, per agent type (`agent`, `llm_proxy`, `mcp_gateway`, `profile`)    |
| Export format              | Helicone-native + OTLP/Prometheus exporters                | Native Prometheus `/metrics`, OTLP traces, OTEL GenAI semconv                                         |
| Where it fits              | A proxy or async logger in front of LLM providers          | The agent gateway and MCP gateway itself                                                              |

## What Helicone is great at

The honest part first. Helicone solves a real problem and ships a clean product around it. Put it in front of any major LLM provider and the result is token spend per user, cost per feature, latency percentiles, prompt diffs across deployments, and a search UI over prompts and completions. The proxy and async logging modes are about as low-friction as this category gets. For teams that just want to know "how much is GPT costing us and who is causing the latency spikes," Helicone is a fast yes.

It is also a fair pick when the application _is_ the LLM call — a chat UI, a copywriting tool, a structured-extraction backend, anything where the unit of work really is one prompt going out and one completion coming back. The dashboards line up with the work. There is no missing layer.

A non-trivial number of production stacks already have Helicone wired in. Pulling it out is rarely the right move.

## Where Helicone stops

The trouble starts the moment the application stops being "chat" and starts being "agent." An agent plans. It reads tool descriptions. It decides to call `search_jira` before it decides to call `send_email`. It receives untrusted output from a tool, runs it through a dual-LLM check (or it should — see [the dual-LLM post](/blog/dual-llm) for why), and feeds the sanitized version back into the next planning step. By the time one user message has produced a finished agent turn, there have been three or four LLM calls, two or three tool calls, an identity check, and a policy decision. Helicone sees the LLM calls.

Consider a typical question: "the agent picked the wrong recipient — was it suggested in the inbound email, in a tool result, or hallucinated?" Helicone can show the completions in order, but it cannot tell whether the third completion was the planner reading a `customers.list` tool output and the fourth was the planner reading a sanitized version of the inbound email. The `gen_ai.tool.name`, `mcp.server.name`, and `archestra.trigger.source` fields that make that question answerable live at the agent-and-MCP layer. Another common request — filter traces where a tool was _blocked_ by policy — has no LLM call to filter on; the blocked event is `mcp.blocked=true` on an MCP span the LLM proxy never saw, because the gateway shut it down before it left.

None of this is a knock on Helicone — these are not LLM-observability questions. The mistake is the same one called out in the LiteLLM comparison: assuming the word "observability" covers the layer above the one the product actually owns.

## Where Archestra picks up

Archestra terminates the agent turn, so its observability story is shaped around the agent turn rather than the LLM call. The full breakdown is in [the platform observability docs](/docs/platform-observability), but the parts that matter here are short.

Every LLM call still gets a span — same shape as anything that follows OTEL GenAI semconv, with `gen_ai.provider.name`, `gen_ai.request.model`, `gen_ai.usage.input_tokens`, `archestra.cost`, and `gen_ai.response.finish_reasons`. Helicone-style data lives natively. What changes is what surrounds it. Every MCP tool call gets a dedicated `execute_tool {tool_name}` span with `mcp.server.name`, `gen_ai.tool.call.id`, `archestra.user.email`, `archestra.user.id`, and `mcp.blocked` if a policy rejected it. Every agent turn — from chat, A2A, MS Teams, or email — produces a parent span (`chat`, `a2a`, `chatops`, or `email` depending on trigger source) that the LLM and tool spans are children of. The minimum agent observability surface every deployment should expose is in [the agent observability minimum post](/blog/agent-observability-minimum) as a checklist.

Identity is in the trace, not next to it. `archestra.user.id`, `archestra.user.email`, and `archestra.user.name` are span attributes on both LLM and tool spans, populated from the resolved enterprise identity that came in through OAuth or a JWKS-validated JWT — not from a free-form key the client set. That is the field that answers "which user authorized the agent to call this tool" without joining six tables. Sessions are first-class too: `gen_ai.conversation.id` groups every span in an agent turn under one ID.

The Prometheus side mirrors this. `llm_cost_total` and friends are labeled with `agent_id`, `agent_name`, `agent_type`, and `source`, so a cost dashboard can split spend by agent and trigger source, not just by user. `mcp_tool_calls_total` and `mcp_tool_call_duration_seconds` give the tool-call view Helicone structurally cannot, and `llm_blocked_tools_total` plus `mcp_server_deployment_status` give the policy-and-deployment view nothing at the LLM-call layer is supposed to have.

If the concern is "how expensive was that completion and how long did it take," Helicone is enough. If the concern is "which user, on which trigger, asked which agent to do which thing, and which tools it touched were sandboxed, blocked, or run," that is the surface Archestra is built around.

## How Helicone and Archestra stack together

The typical topology, when both are in play:

```
App  -->  Archestra (agent gateway, MCP gateway, dual-LLM, audit)  -->  Helicone (LLM logger)  -->  OpenAI / Anthropic / Bedrock / ...
              |
              +-->  MCP servers (sandboxed, identity-routed)
              |
              +-->  OTLP / Prometheus / Grafana (agent + MCP spans, metrics)
```

Archestra fronts the agent. When the agent needs a model call, the request goes through Helicone on the way out — same way a stack would point at LiteLLM — and Helicone keeps doing the LLM-side accounting, prompt diffing, and cost dashboards the platform team already built. Archestra owns the layer above: tool spans, dual-LLM decisions, identity-bound audit, deployment state, blocked-tool counts. Two telemetry pipelines, two layers, no overlap in what each is authoritative for. Trace exemplars (covered in [the observability docs](/docs/platform-observability)) jump from a Prometheus data point on an Archestra metric straight into a Tempo trace.

Some teams drop Helicone once Archestra is in place, because the LLM-call surface comes along for free in the GenAI Observability dashboard. Others keep it because it is already wired into finance reporting. Both are reasonable. The decision is operational, not architectural — same as it was with LiteLLM.

## Picking between Helicone, Archestra, or both

- Use **Helicone alone** when the application is the LLM call and there is no agent layer. A chat UI, a writing tool, a structured-extraction service. Cost and latency dashboards over provider calls are exactly the right scope.
- Use **Archestra alone** when starting fresh on an agent stack and the goal is one telemetry pipeline covering LLM calls, MCP tool calls, identity, sessions, and deployment state. Archestra's spans follow OTEL GenAI semconv, so any OTLP backend — Tempo, Jaeger, Honeycomb, Grafana Cloud — accepts them.
- Use **both** when Helicone is already in production and agents are being added on top. Put Archestra in front for the agent and MCP layer, point its model router at the provider through Helicone, and let Helicone keep doing the LLM-call dashboards the finance team is already reading. Pipe Archestra's OTLP and Prometheus output to a separate backend for the agent-layer view.

Two products with "observability" in the pitch, two different units of work. Pick the one that matches the question actually being asked. When the question is "what did this completion cost," Helicone. When the question is "why did this agent decide to call `send_email`," that lives upstream — and that is the layer Archestra was built to record.
