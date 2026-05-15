---
title: 'Model Router vs LLM Proxy'
description: 'Model router vs LLM proxy: a proxy normalizes provider APIs and handles auth, keys, logs, limits. A router picks which model gets the call.'
isNote: true
author: 'Mack Chi'
---

## Model Router vs LLM Proxy: What's the Difference?

The short answer to "model router vs LLM proxy": an LLM proxy terminates the HTTP call and handles auth, keys, normalization, logging, and rate limits. A model router sits above it and decides which model the call should go to. Most "AI gateways" bundle both into one product, and that is fine. Bundling them into one mental model is not. If the proxy and the router cannot be drawn as two boxes on a whiteboard, half of every incident gets misdiagnosed and the routing layer becomes impossible to swap.

What follows: a comparison table, a breakdown of what each layer terminates, and an opinionated take on where the seam belongs. Skip to the table if time is short.

## The Five-Year-Old Version of Model Router vs LLM Proxy

Picture three kids at home who want to print things. One kid burns through ink, so a sign-in sheet on the printer tracks who printed what and whether color is allowed today. That sign-in sheet is the **LLM proxy**. It cares about identity, permissions, and quota.

The house also has three printers — the cheap one in the hallway, the fast color one in the office, the slow archival one for photos. When a kid says "I want to print," something has to pick a printer based on the job. That picker is the **model router**.

Both jobs are useful. They are not the same job. A sign-in sheet does not pick printers, and a printer-picker does not check quota. A modern gateway ships the clipboard _and_ the picker — two different pieces of paper.

## What an LLM Proxy Actually Does

An LLM proxy terminates the HTTP call between an application and an LLM provider. The job is plumbing: take the request, authenticate the caller, normalize the request shape across providers, attach the right provider key, log the call, enforce rate limits and budgets, return the response. It is stateless per request in the way that matters — the proxy does not remember the conversation, it remembers _identity_ and _quota_.

The auth surface is the interesting part, and most of the design effort goes there. A real LLM proxy supports direct provider keys, virtual keys, OAuth client credentials, user OAuth, and JWKS validation against an enterprise IdP — the full spread shipped in the Archestra [LLM Proxy](/docs/platform-llm-proxy), with an auth story large enough to fill a [separate post](/blog/llm-proxy-auth-overview). The proxy is where the CISO's questions get answered. It is also where the boring infrastructure problems live: retries, streaming, timeouts, content-filter hooks, observability, custom headers for caller attribution.

The proxy does not pick the model. The caller already picked it — `gpt-5.4`, `claude-opus-4.7`, whatever — and the proxy routes the call to the matching provider.

## What a Model Router Actually Does

A model router sits _above_ the proxy in the request flow, and the job is the opposite: decide which model the call should go to in the first place. The caller does not name a specific model. The caller might name a class (`fast`, `cheap`, `reasoning`) or nothing at all, and the router applies a policy — cost, latency, capability, quota, fallback chain — to resolve that into a concrete provider and model.

A good router is stateful in ways the proxy is not. It tracks which providers are healthy right now, which models are over-budget for which team this month, which model gave the last failure for a given user, and how the cost-per-token math is trending. It might do speculative routing — fire two cheap models in parallel and take the first answer — or fallback routing — try the premium model and degrade to the cheap one on rate-limit. None of that belongs in the proxy. All of it belongs in the router.

In the Archestra gateway, the [OpenAI-compatible Model Router](/docs/platform-llm-proxy#openai-compatible-model-router) takes provider-qualified IDs like `openai:gpt-5.4` and resolves them through the proxy's auth and security pipeline. That is the simple case — the caller still names the model. The harder case, the one that earns the "router" name, is when the caller hands over a class and the gateway has to pick. The _routing decision_ and the _proxy plumbing_ are testable independently, and they should stay that way.

## Model Router vs LLM Proxy: The Comparison Table

| Axis                       | LLM Proxy                                                            | Model Router                                                                             |
| -------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Unit of work it terminates | One HTTP call to one provider                                        | One model-selection decision                                                             |
| Scope                      | API normalization, auth, keys, logs, limits                          | Pick the model for this call                                                             |
| Statefulness               | Per-request, identity- and quota-aware                               | Provider-health, budget, recent-failure aware                                            |
| Caller picks the model?    | Yes, by name                                                         | No, or only a class                                                                      |
| Latency profile            | Should add as little as possible                                     | Can add real latency (probes, parallel calls, fallbacks)                                 |
| Observability needs        | Call-level: who, what model, tokens, status, cost                    | Decision-level: which models were considered, why this one was picked, what fallback ran |
| Failure mode               | Auth fails, rate-limit, provider 5xx                                 | Wrong model picked, budget overrun, fallback didn't trigger                              |
| When to deploy separately  | When two teams need different routing policies over one shared proxy | When one team wants a custom routing layer in front of a vendor-provided proxy           |

## When to Deploy the Layers Separately

The "when to deploy separately" column is the failure mode worth dwelling on. If routing policy and proxy plumbing are entangled in the same config file, the first time someone says "team A should prefer the cheap model, team B should prefer the smart one, but they share the same provider keys and quota," a week disappears untangling them in production. Build the layer with the seam in mind, even when shipping it as one binary.

## The Opinion: Bundle the Product, Not the Mental Model

Bundling proxy and router into one product is fine. Archestra does it. LiteLLM does it. Every "AI gateway" on the market does it, and there is no good reason not to — the request flows through one place, the auth context is shared, the observability is unified, and nobody wants to operate two services where one will do.

Bundling them in the _head_ is the problem. The two concerns have different inputs, different state, different failure modes, and different testing strategies. Write routing logic so it could be lifted out of the proxy and replaced with a different policy without touching the auth code. Write auth and logging code so the router on top could be swapped for a smarter one without rewriting the plumbing. The seam between the model router and the LLM proxy should be a real interface, not a comment in a config file.

When a proxy like LiteLLM is already running and agent-layer concerns are getting added on top — tool routing, MCP brokering, identity-aware decisions — that is a different layering question, covered in [the LiteLLM post](/blog/litellm-with-archestra). The short version: agent gateways and LLM proxies are also two different jobs, and the same "bundle the product, don't bundle the mental model" rule applies.

Two layers. One product, usually. Two whiteboard boxes, always.
