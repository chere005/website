---
title: 'Kong AI Gateway + Archestra: Same Building, Different Floors'
description: 'Kong AI Gateway Archestra: Kong owns the API floor, Archestra owns the agent and MCP floor, with a clean handoff between them.'
isNote: true
author: 'Mack Chi'
---

## Kong AI Gateway Archestra: Same Building, Different Floors

Kong AI Gateway and Archestra are both called "gateways," but they solve problems on different floors of the stack. Kong AI Gateway sits on the API platform floor and treats LLM traffic as one more HTTP API. Archestra sits on the agent platform floor and terminates agent turns, MCP tool calls, and identity-bound tool routing. The Kong AI Gateway Archestra handoff is at the agent layer, and once that line is drawn, the two stop overlapping.

The word "gateway" is doing too much work in most internal debates between API platform teams and security teams. Kong AI Gateway is a gateway. Archestra is a gateway. They are not the same thing and they do not compete. Both have a place when agents enter production, because each owns problems the other cannot solve from its layer.

This note is the whiteboard version of Kong AI Gateway Archestra: a comparison table, a section on what each one terminates, a stacking diagram for when both are present, and a short decision section at the end. For a one-minute read, skip to the table.

The opinion up front for Kong AI Gateway Archestra deployments: Kong AI Gateway is the right answer for the API platform team that wants plugin-based control over LLM traffic and a single front door for every internal API, AI included. Archestra is the right answer for the security and IAM team that wants identity-bound tool routing, prompt-injection defense, and an MCP gateway. Most enterprises running agents seriously end up with both, because the problems live on different floors.

| Axis               | Kong AI Gateway                                                                                                     | Archestra                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Floor it lives on  | API platform — LLM traffic as one more API                                                                          | Agent platform — agent turns, MCP, identity                                              |
| What it terminates | HTTP API calls, including LLM provider calls                                                                        | Agent turns, tool calls, MCP sessions                                                    |
| Primary primitives | Plugins, routes, services, consumers                                                                                | MCP gateway, dual-LLM, tool routing, model router                                        |
| Auth it owns       | API keys, JWT, OAuth, mTLS, OIDC on the proxy                                                                       | Provider keys, virtual keys, OAuth 2.1, user OAuth, enterprise JWKS, MCP OAuth and OBO   |
| Guardrails         | Rate limiting, request transformation, prompt templates, prompt-decorator and prompt-guard plugins, content filters | Prompt-injection defense (dual-LLM), tool allowlist, dynamic tool engine, MCP sandboxing |
| Observability      | Request logs, plugin metrics, Kong analytics                                                                        | Agent decision trace, tool calls, identity-bound audit, Prometheus + OpenTelemetry       |
| MCP                | Not in scope as a primitive                                                                                         | Native MCP gateway, per-identity tool routing                                            |
| Provider fan-out   | LLM provider routing via the AI Proxy plugin                                                                        | OpenAI-compatible Model Router across configured providers                               |
| License            | Kong Gateway is open-source (Apache 2.0); enterprise plugins are commercial                                         | MIT                                                                                      |

## What Kong AI Gateway is great at

Kong has been the default API gateway for a generation of platform teams, and the AI Gateway product is a clean extension of that posture. Shops already running Kong for internal APIs get the AI plugins on the same control plane. The same engineers who wrote the rate-limit policy for a billing API can write one for OpenAI traffic, in the same admin UI, with the same RBAC, against the same consumers. One place to look when something breaks, one place to rotate keys, one place to chart spend by team.

The plugin model is also useful for LLM traffic specifically. The AI Proxy plugin swaps providers without touching application code. The prompt-decorator plugin injects system prompts at the edge. The prompt-guard plugin runs regex and classifier-based checks on input. The rate-limiting plugin can be configured against token counts, not just request counts. For shops where LLM traffic is mostly direct API calls — chat completions, embeddings, classification — Kong AI Gateway covers the surface area and integrates cleanly with the rest of the API estate.

## Where Kong AI Gateway stops

Kong's unit of work is the HTTP request. A request comes in, plugins run in order, the request goes upstream, the response comes back, plugins run again, the response goes downstream. That model is exactly right for an API gateway, and it is also why Kong AI Gateway stops being the right tool the moment an application is no longer just calling an LLM and is instead running an agent.

A few concrete examples. Kong does not know that the model's response contains a tool call about to hit an MCP server, because tool calls are a payload concept, not a routing concept. Kong does not validate the identity of the human behind a multi-step agent run against the specific tools that run was allowed to use — consumers in Kong are API consumers, not end-user identities propagated through an agent's tool-use chain. Kong does not sandbox the code an MCP server executes. And Kong's prompt-guard runs regex and classifiers on the input — it is not a defense against prompt injection coming back through a tool result later in the same run. By the time the tool result returns, it is already inside the application's `messages` array, and Kong has done its job and moved on.

None of this is a flaw in Kong. These problems live at the agent layer, and an API gateway is the wrong place to solve them. The common mistake is assuming that because Kong has "AI Gateway" in the name, it covers the agent surface. It does not, and the way teams find out is usually after the first prompt-injection incident. That class of failure is covered in [the dual-LLM post](/blog/dual-llm).

## Where Archestra picks up

Archestra terminates the agent turn, not the HTTP request. That is the line.

The [LLM Proxy](/docs/platform-llm-proxy) inside Archestra handles the provider fan-out — OpenAI, Anthropic, Bedrock, Vertex, Azure, Gemini, and the rest — with an OpenAI-compatible Model Router on top. That overlaps with Kong AI Gateway. The difference shows up in the auth story and in everything that happens above it. Provider keys, virtual keys, OAuth 2.1 client credentials, user OAuth with consent screens, and JWKS validation against an enterprise IdP (Okta, Entra ID, Auth0, Keycloak) so the proxy resolves provider keys from the signed-in user, not from a shared service account.

Above the proxy sits the MCP gateway and the agent-layer guardrails. One endpoint for every MCP tool, with isolation, per-identity tool routing, and an OAuth/OBO story that matches the LLM side. The Dual LLM Sub-agent quarantines untrusted tool output so a malicious GitHub issue cannot rewrite an agent's instructions mid-run. The Dynamic Tool Engine hides sensitive tools from the agent's view when the request comes from a less-trusted source. The audit trail records the decision, the tools touched, the identity behind the call, and the resolved provider key — not just `200 OK, 1,847 tokens`.

If the concern is "did the API call succeed and stay within budget," Kong AI Gateway is enough. If the concern is "did the agent do the right thing on behalf of the right person with the right tools," that is the job Archestra was built for. The same line from the LiteLLM side is covered in [the LiteLLM post](/blog/litellm-with-archestra) — the floors and the handoff are the same; only the tenant on the API floor changes.

## How Kong AI Gateway and Archestra stack

A typical Kong AI Gateway Archestra topology looks like this:

```
App  -->  Archestra (agent + MCP + guardrails)  -->  Kong AI Gateway (plugins, rate limits, provider routing)  -->  OpenAI / Anthropic / Bedrock / ...
                |
                +-->  MCP servers (sandboxed, identity-routed)
```

The application talks to Archestra. Archestra runs the agent, brokers MCP tool calls, runs the dual-LLM defense, and emits the decision-level audit. When the agent needs a model call, Archestra's model router points at Kong AI Gateway as an upstream OpenAI-compatible provider. Kong keeps doing what it is good at — plugin-based control, rate limits, token budgets, provider fan-out, and the dashboards the platform team already built. The two teams keep their floors and no existing investment is thrown away.

Archestra ships its own LLM proxy and model router, so for some teams Kong AI Gateway becomes optional once Archestra is in. For others, Kong stays because it is already in production for every API at the company and there is no reason to special-case the LLM traffic. Both are reasonable. The decision is operational, not architectural.

## Picking between Kong AI Gateway and Archestra

- Use **Kong AI Gateway alone** when the concern is plugin-based control over LLM API traffic — provider routing, token rate limits, prompt-decorator, prompt-guard — and no agents are calling MCP servers. Kong is the right tool and Archestra would be overkill.
- Use **Archestra alone** for a fresh build that needs the agent layer, the MCP gateway, and the LLM proxy in one stack with one auth story and one audit trail. The Archestra LLM proxy covers the providers most teams need.
- Use **both** when the API platform team already runs Kong AI Gateway and the security team is bringing in agents. Put Archestra in front of the agent and MCP layer, point Archestra's model router at Kong as an upstream provider, and let Kong keep handling plugin-based control and provider fan-out. The two teams stay on their own floors and the handoff is clean.

Two gateways, two floors, one building. Pick the floor that matches the actual problem, and stack them when the problem spans both — which, for shops running agents in production, is most of the time.
