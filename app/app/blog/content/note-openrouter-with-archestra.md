---
title: 'OpenRouter Archestra: One Model API Meets Agent Security'
description: 'OpenRouter Archestra pairing explained: OpenRouter unifies 300+ models behind one API, Archestra adds MCP, identity-aware tool routing, and prompt-injection defense.'
isNote: true
author: 'Mack Chi'
---

## OpenRouter Archestra: One Model API Meets Agent Security

OpenRouter Archestra deployments answer a recurring question in enterprise rollouts: do both layers belong in the same stack? The short answer is yes — OpenRouter handles model fan-out and billing, Archestra handles the agent turn. The OpenRouter Archestra combination splits the work cleanly: OpenRouter unifies 300+ models behind an OpenAI-compatible API, and Archestra adds MCP brokering, identity-aware tool routing, and prompt-injection defense on top.

The problem in plain terms: a team picks OpenRouter so it can try Claude, GPT, Gemini, Llama, and whatever new model shipped last Thursday without rewriting the app. One key, one OpenAI-compatible schema, one bill. Then agents enter the picture — and an agent does more than call a model. It calls tools. It reads untrusted text from a Jira ticket or a GitHub issue and feeds that back into the next prompt. Suddenly "which model" is the smallest of the questions, and "which user is this, which tools can it touch, what happens when a tool result contains an instruction" becomes the entire job.

This note covers the answer in detail. Comparison table, where OpenRouter stops, where Archestra picks up, a stacking diagram, and a decision section. Skip to the table for the one-minute version.

Most enterprise stacks that adopt agents end up running both, not either. OpenRouter owns model fan-out, pay-as-you-go billing, and BYOK passthrough. Archestra owns the agent turn — MCP brokering, identity-aware tool routing, prompt-injection defense, and decision-level audit. Different layers, they do not collapse into each other.

| Axis               | OpenRouter                                            | Archestra                                                                                                 |
| ------------------ | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Layer it lives at  | Model API aggregation (hosted)                        | Agent execution, MCP tool routing, model proxy                                                            |
| What it terminates | Provider API calls                                    | Agent turns and tool calls                                                                                |
| Auth it handles    | One OpenRouter key per app, optional BYOK passthrough | Provider keys, virtual keys, OAuth 2.1 client credentials, user OAuth, enterprise JWKS, MCP OAuth and OBO |
| Guardrails         | Provider-side moderation, prompt-level transforms     | Prompt-injection defense (dual-LLM), tool allowlist, dynamic tool engine, MCP sandboxing                  |
| Observability      | Per-key spend, request logs in OpenRouter dashboard   | Agent decision trace, tool calls, identity-bound audit, Prometheus + OpenTelemetry                        |
| Tools / MCP        | Out of scope                                          | Native MCP gateway, per-identity tool routing                                                             |
| Provider fan-out   | 300+ models, OpenAI-compatible front, hosted          | OpenAI-compatible Model Router across configured providers, self-hosted                                   |
| Hosting model      | SaaS only                                             | Self-hosted (Kubernetes, Docker)                                                                          |
| License            | Proprietary SaaS                                      | MIT                                                                                                       |

## What OpenRouter Is Great At

OpenRouter solved a real problem and solved it elegantly. Trying a new model the day it ships without filling in a vendor onboarding form is exactly what OpenRouter enables. One API key, one billing relationship, and access to Claude, GPT, Gemini, Mistral, Llama, Qwen, DeepSeek, and a long tail of fine-tunes lives behind one OpenAI-compatible endpoint. Pay-as-you-go is unreasonably convenient — finance teams do not have to wire a contract with every model provider on Earth because someone on the platform team wanted to A/B test a new reasoner.

The BYOK passthrough is the second underrated feature. Existing Anthropic and OpenAI contracts plug into OpenRouter, which routes through them at zero markup while keeping its routing and analytics layer in front. The `openrouter/auto` model and per-request fallbacks are also genuinely useful — when a provider is rate-limited or down, the router picks the next viable one. For a customer-facing chat app where uptime matters more than which exact model answered, that is real engineering.

A meaningful fraction of enterprise teams already have OpenRouter wired up for these reasons. That is why Archestra's [supported providers list](/docs/platform-supported-llm-providers) includes OpenRouter as a first-class upstream — the OpenRouter relationship stays in place while Archestra fronts the agent layer. The OpenRouter Archestra pairing was designed to complement, not replace.

## Where OpenRouter Stops

OpenRouter treats the LLM call as the unit of work. A request comes in, a request goes out — possibly via a fallback chain — the response comes back, the bill gets tracked. That is correct for a model aggregator. It is also why OpenRouter does not — and should not — handle the things that show up the moment an app stops being "chat" and starts being "agent."

A few concrete examples. OpenRouter does not know which MCP server an agent is about to call after reading the model's tool-use response, because tools are an application concern and an MCP server is a different network endpoint entirely. It does not validate the identity of the human behind the call against the tools the agent wants — there is no concept of "Sara from finance can read Snowflake but cannot post to Slack" inside a model aggregator. It does not sandbox the code an MCP server runs. And it does not defend against prompt injection in tool results, because by the time a tool result reaches OpenRouter it is just text inside the next `messages` array — indistinguishable from anything else the agent has said.

OpenRouter is also SaaS. For some teams that is exactly right. For regulated customers it is the immediate dealbreaker, because prompts flowing through the router include user data the compliance team would rather not see leave the VPC.

None of this is a knock on OpenRouter. These problems live at the agent layer, and a model aggregator is the wrong place to solve them. The mistake is assuming that because OpenRouter is sometimes called a "gateway," it covers the agent surface. It does not — see [the dual-LLM post](/blog/dual-llm) for what that class of failure looks like.

## Where Archestra Picks Up

Archestra terminates the agent turn, not just the model call. That changes what the gateway can do, and it is the half of OpenRouter Archestra topology that the model aggregator cannot replicate.

The [LLM Proxy](/docs/platform-llm-proxy) inside Archestra handles provider fan-out itself — OpenAI, Anthropic, Bedrock, Vertex, Azure, Gemini, Groq, Mistral, Cerebras, OpenRouter, vLLM, Ollama, and others — with an OpenAI-compatible Model Router on top. The auth story is what differs: provider keys, virtual keys, OAuth 2.1 client credentials, user OAuth, and JWKS validation against an enterprise IdP (Okta, Entra ID, Auth0, Keycloak) so the proxy resolves provider keys from the signed-in user's accessible keys. OpenRouter has virtual keys too, but they live in OpenRouter's account model, not in an enterprise IdP — which matters when an employee changes teams and access needs to revoke automatically.

Above the LLM proxy sits the agent layer, which is where Archestra does the work OpenRouter cannot. The MCP gateway gives one endpoint for every MCP tool an agent might use, with isolation, per-identity tool routing, and an OAuth/OBO story that matches the LLM side. The dual-LLM sub-agent quarantines untrusted tool output so a malicious GitHub issue cannot rewrite the agent's instructions. The Dynamic Tool Engine hides sensitive tools from the agent's view when the request originates from an untrusted source. And the audit trail records the decision, the tools touched, the identity behind the call, and the resolved provider key — not just `200 OK, 1,847 tokens`.

If the concern is "did the model respond," OpenRouter is enough. If the concern is "did the agent do the right thing on behalf of the right person with the right tools," that is the job Archestra was built for.

## How OpenRouter Archestra Stack Together

The typical topology, when both are present, looks like this:

```
App  -->  Archestra (agent + MCP brokering + guardrails)  -->  OpenRouter  -->  OpenAI / Anthropic / Gemini / ...
                                |
                                +-->  MCP servers (sandboxed, identity-routed)
```

Archestra fronts the agent. When the agent needs a model call, Archestra's [LLM Proxy](/docs/platform-llm-proxy) has a first-class OpenRouter provider — point it at the OpenRouter account, hand it the OpenRouter key (or a virtual key resolved per signed-in user), and the proxy speaks OpenAI-compatible to OpenRouter on the back side. OpenRouter keeps doing what it is good at — model fan-out, fallback chains, pay-as-you-go billing. Archestra does the agent-layer work above it: MCP brokering, dual-LLM, tool allowlists, identity-aware routing, decision-level audit. Different units of work, complementary.

Worth noting: Archestra also ships direct-provider integrations, so for teams that already have contracts with OpenAI and Anthropic, OpenRouter is optional. Other teams keep OpenRouter specifically because that one billing relationship is the point — paying router overhead beats filing procurement tickets in five vendor portals. Both choices are reasonable. The decision is operational, not architectural.

This is the same pattern described in [the LiteLLM post](/blog/litellm-with-archestra) — different gateway, same shape. OpenRouter is the hosted equivalent of "model fan-out as a service," and the layering above it is identical.

## Picking

- Use **OpenRouter alone** when the concern is access to a wide model catalog, pay-as-you-go billing, and a single OpenAI-compatible front for a chat app or simple LLM workload. No agents, no MCP tools, no identity-aware authorization. OpenRouter is the right answer; adding Archestra would be overkill.
- Use **Archestra alone** when starting fresh, when the agent layer + MCP gateway + LLM proxy should live in one stack with one auth story and one audit trail, and when direct contracts already exist with the providers in scope. The Archestra LLM proxy covers the providers most teams need — see [supported providers](/docs/platform-supported-llm-providers).
- Use **both** when OpenRouter is already in production and agents are being added, or when OpenRouter's pay-as-you-go billing and model breadth specifically matter. Put Archestra in front for the agent and MCP layer, point its model router at OpenRouter as an upstream, and let OpenRouter keep handling model fan-out and billing. This is the answer to "OpenRouter is in place and a secure agent layer is needed" — OpenRouter does not need to be ripped out, a layer above it is what is missing. For the auth story that comes with that layer, [the MCP authentication guide](/blog/mcp-authentication-guide) is the right next read.

One hosted model aggregator, one self-hosted agent platform, two different jobs. Pick the one that matches the layer of the problem at hand, and stack them when the problem spans both — which, in practice, it usually does.
