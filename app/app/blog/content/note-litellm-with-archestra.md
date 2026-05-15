---
title: 'LiteLLM Archestra: Do You Need Both? The Layer Each One Owns'
description: 'LiteLLM Archestra comparison: where the LLM proxy ends, where the agent gateway begins, a stacking diagram, and a decision matrix for picking one or both.'
isNote: true
author: 'Mack Chi'
---

## LiteLLM Archestra: Do You Need Both? The Layer Each One Owns

LiteLLM and Archestra are both MIT-licensed gateways, but they terminate different units of work. LiteLLM is an LLM proxy that normalizes provider APIs, tracks per-team spend, and enforces budgets. Archestra is an agent gateway that terminates the agent turn, brokers MCP tool calls, enforces identity-aware tool routing, and defends against prompt injection. The LiteLLM Archestra question — "do both belong in the same stack?" — usually resolves to yes: LiteLLM owns the model-call layer, Archestra owns the agent layer, and the two compose cleanly. This note lays out the LiteLLM Archestra split with a comparison table, the boundary where one stops and the other begins, a stacking diagram, and a decision section.

Teams that have standardized on LiteLLM often hit the same uncertainty when agents enter the stack: does the agent layer replace LiteLLM, sit in front of it, or sit behind it? Both projects describe themselves as a "gateway." Both expose an OpenAI-compatible front. From the homepages alone, they look like they overlap. They don't — they terminate different units of work — but the architectural line takes a careful read before it becomes obvious.

Stated up front: most enterprise stacks that adopt agents end up running both, not either. LiteLLM keeps doing provider fan-out and per-team spend. Archestra owns the agent turn, the MCP gateway, identity-aware tool routing, and the prompt-injection defense. The layers do not collapse into each other.

| Axis               | LiteLLM                                                              | Archestra                                                                                                 |
| ------------------ | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Layer it lives at  | Model API normalization (LLM proxy)                                  | Agent execution, MCP tool routing, model proxy                                                            |
| What it terminates | Provider API calls                                                   | Agent turns and tool calls                                                                                |
| Auth it handles    | Provider keys, virtual keys per team, basic OIDC/SSO on the proxy UI | Provider keys, virtual keys, OAuth 2.1 client credentials, user OAuth, enterprise JWKS, MCP OAuth and OBO |
| Guardrails         | Rate limits, budgets, content-filter hooks                           | Prompt-injection defense (dual-LLM), tool allowlist, dynamic tool engine, MCP sandboxing                  |
| Observability      | LLM call logs, spend, token metrics                                  | Agent decision trace, tool calls, identity-bound audit, Prometheus + OpenTelemetry                        |
| Tools / MCP        | Out of scope                                                         | Native MCP gateway, per-identity tool routing                                                             |
| Provider fan-out   | 100+ providers, OpenAI-compatible front                              | OpenAI-compatible Model Router across configured providers                                                |
| License            | MIT                                                                  | MIT                                                                                                       |

## What LiteLLM is great at

LiteLLM solved a real problem early. When an application speaks the OpenAI SDK and needs to switch to Anthropic, Bedrock, Vertex, Azure, Groq, Mistral, or something self-hosted, LiteLLM lets the integration change a `base_url` instead of being rewritten. The proxy mode adds a small YAML config, a few HTTP endpoints, and exposes one front door for everything downstream. That alone is real infrastructure, and it is the reason LiteLLM shows up in so many enterprise stacks.

The proxy layers on the operational features that matter once more than one team is calling LLMs through a shared system: virtual keys so individual users and apps get a scoped bearer token instead of the raw provider key, per-team budgets and rate limits, request and response logging, hooks for content filtering, and dashboards for spend. None of this is glamorous. All of it is the kind of thing that, when missing, triggers a 2am page after someone ships a loop that burns through the quarterly OpenAI budget.

A large share of enterprise stacks already have LiteLLM in production for exactly these reasons. The Archestra [platform overview](/docs/platform-overview) explicitly lists LiteLLM as a composable component that often already lives in the stack. Archestra was not built to replace it.

## Where LiteLLM stops

LiteLLM treats the LLM call as the unit of work. A request comes in, a request goes out, the response comes back, the bill gets tracked. That model is correct for an LLM proxy. It is also why LiteLLM does not — and reasonably should not — try to handle the surface that appears the moment the application stops being "chat" and starts being "agent."

A few concrete examples. LiteLLM does not know which MCP server an agent is about to call after the model emits a tool-use response, because tools are an application concern and an MCP server is a different network endpoint entirely. It does not validate the identity of the human behind the call against the tools the agent wants to use — there is no concept of "this user can read Jira but cannot post Slack messages" inside an LLM proxy. It does not sandbox the code that an MCP server runs, because MCP servers are not in scope. And it does not ship a defense against prompt injection in tool results, because by the time a tool result reaches LiteLLM it is already text inside the next `messages` array.

None of this is a knock on LiteLLM. These problems live at the agent layer, and an LLM proxy is the wrong place to solve them. The mistake is assuming that because LiteLLM is called a "gateway," it covers the agent surface. It does not, and the teams that get burned find out the hard way after the first prompt-injection incident — see [the dual-LLM post](/blog/dual-llm) for what that class of failure actually looks like.

## Where Archestra picks up

Archestra terminates the agent turn, not just the model call. That changes what the gateway can do.

The [LLM Proxy](/docs/platform-llm-proxy) inside Archestra handles the same kind of provider fan-out — OpenAI, Anthropic, Bedrock, Vertex, Azure, Gemini, Groq, Mistral, Cerebras, OpenRouter, vLLM, Ollama, and others — with an [OpenAI-compatible Model Router](/docs/platform-llm-proxy#openai-compatible-model-router) on top. What is different is the auth story: provider keys, virtual keys, OAuth 2.1 client credentials, user OAuth with consent screens, and JWKS validation against an enterprise IdP (Okta, Entra ID, Auth0, Keycloak) so the LLM proxy resolves provider keys from the signed-in user's accessible keys. The full breakdown is in [the LLM auth post](/blog/llm-proxy-auth-overview).

Above that sits the agent layer, where Archestra does the work LiteLLM cannot. The [MCP Gateway](/docs/platform-mcp-gateway) exposes one endpoint for every MCP tool an agent might use, with isolation, per-identity tool routing, and an OAuth/OBO story that matches the LLM side. The [Dual LLM Sub-agent](/blog/dual-llm) quarantines untrusted tool output so a malicious GitHub issue cannot rewrite the agent's instructions. The Dynamic Tool Engine hides sensitive tools from the agent's view when the request originates from an untrusted source. The audit trail records the decision, the tools touched, the identity behind the call, and the resolved provider key — not just `200 OK, 1,847 tokens`.

If the concern is "did the model respond," LiteLLM is enough. If the concern is "did the agent do the right thing on behalf of the right person with the right tools," that is the layer Archestra was built for.

## How they stack

The typical topology, when both are present, looks like this:

```
App  -->  Archestra (agent + MCP brokering + guardrails)  -->  LiteLLM (provider fan-out)  -->  OpenAI / Anthropic / Bedrock / ...
                                |
                                +-->  MCP servers (sandboxed, identity-routed)
```

Archestra fronts the agent. When the agent needs a model call, Archestra's model router can point at LiteLLM as the upstream provider, because LiteLLM presents an OpenAI-compatible API and Archestra's proxy speaks that on the back side. LiteLLM keeps doing what it is good at — provider routing, virtual keys per team, budgets, spend dashboards. Archestra does the agent-layer work above it: MCP brokering, dual-LLM, tool allowlists, identity-aware routing, decision-level audit.

Archestra also ships its own LLM proxy and model router (covered in [the LLM proxy docs](/docs/platform-llm-proxy) and the [supported providers list](/docs/platform-supported-llm-providers)), so for some teams LiteLLM becomes redundant once Archestra is in place. For other teams LiteLLM stays because it is already in production, already has team budgets configured, and already has six months of spend history nobody wants to migrate. Both choices are reasonable. The decision is operational, not architectural.

## Picking

- Use **LiteLLM alone** when the concern is provider routing, rate limits, virtual keys, and per-team spend for direct LLM access. No agents, no tools, no MCP. LiteLLM is the right answer and adding Archestra would be overkill.
- Use **Archestra alone** for new deployments that want the agent layer, the MCP gateway, and the LLM proxy in one stack with one auth story and one audit trail. This is the path most new deployments take. The Archestra LLM proxy covers the providers most teams need; see [supported providers](/docs/platform-supported-llm-providers).
- Use **both** when LiteLLM is already in production and agents are being added. Put Archestra in front for the agent and MCP layer, point Archestra's model router at LiteLLM as an upstream provider, and let LiteLLM keep handling provider fan-out and the spend reporting finance teams already built dashboards for. This is the answer to "we have LiteLLM and we need a LiteLLM alternative for the agent side" — no alternative is required, a layer above is. For the auth-side story that comes with that layer, [the MCP authentication guide](/blog/mcp-authentication-guide) is the right next read.

Two MIT-licensed gateways, two different jobs. The right LiteLLM Archestra choice depends on the layer of the problem at hand, and the two stack when the problem spans both — which, in most enterprise agent deployments, it does.
