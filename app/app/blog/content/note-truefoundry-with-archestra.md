---
title: 'TrueFoundry Archestra: Serving the Model vs. Governing the Agent'
description: 'TrueFoundry Archestra comparison: TrueFoundry serves the model, Archestra governs the agent turn around it. Two products, two layers, both useful in the same enterprise stack.'
isNote: true
author: 'Mack Chi'
---

## TrueFoundry Archestra: Serving the Model vs. Governing the Agent

TrueFoundry Archestra is not a competition — it is a stack. TrueFoundry handles the model-serving layer: deployment, fine-tuning, autoscaling, GPU economics, and an OpenAI-compatible front door for self-hosted models. Archestra handles the agent execution layer: what the agent calling that model is allowed to do, which tools it can touch, whose identity it acts under, and what happens when a tool result tries to rewrite the agent's instructions. Enterprise teams that move from "we host a model" to "agents use that model" run BOTH. The TrueFoundry Archestra pattern shows up most often when a fine-tuned in-house model meets the first agent that consumes it.

The same pattern is documented for a different upstream in [LiteLLM + Archestra: the layer each one owns](/blog/litellm-with-archestra). The auth-side story that ties both posts together lives in [the LLM proxy auth overview](/blog/llm-proxy-auth-overview).

| Axis               | TrueFoundry                                                            | Archestra                                                                                |
| ------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Layer it lives at  | Model deployment, fine-tuning, serving, LLM gateway                    | Agent execution, MCP tool routing, model proxy                                           |
| What it terminates | Model inference requests                                               | Agent turns and tool calls                                                               |
| Core capabilities  | Train, deploy, autoscale, fine-tune, host open models on your own GPUs | Run the agent, broker MCP tools, route by identity, defend against prompt injection      |
| Auth               | Workspace SSO, API keys, per-team quotas                               | Provider keys, virtual keys, OAuth 2.1, user OAuth, enterprise JWKS, MCP OAuth and OBO   |
| Guardrails         | Content-filter hooks, rate limits, PII guardrails                      | Prompt-injection defense (dual-LLM), tool allowlist, dynamic tool engine, MCP sandboxing |
| Observability      | Inference latency, GPU utilization, training runs, gateway logs        | Agent decision trace, tool calls, identity-bound audit, Prometheus + OpenTelemetry       |
| Tools / MCP        | Out of scope                                                           | Native MCP gateway, per-identity tool routing                                            |
| Where it shines    | Hosting your own fine-tuned model with good GPU economics              | Making the agent calling that model safe and auditable                                   |

## What TrueFoundry Is Great At

TrueFoundry solved a genuinely hard problem: making model serving operationally boring. Standing up vLLM on a multi-node H100 cluster, tuning autoscaling so cold-start does not nuke tail latency, and attaching a stable OpenAI-compatible endpoint that survives node failover is roughly three months of unglamorous platform work disguised as one bullet on a slide. TrueFoundry collapses that into a deploy button and a YAML file.

The product covers the full lifecycle on the model side. Fine-tuning pipelines with experiment tracking. Deployment to a customer's own cloud account, VPC, and GPUs, with autoscaling and traffic shifting. An LLM gateway that speaks the OpenAI API and can fan out to external providers when the in-house model is not the right tool. PII redaction hooks. Per-workspace cost reporting. For teams under a mandate to keep proprietary data inside their own perimeter, TrueFoundry is often the right answer.

A non-trivial share of enterprise teams already run TrueFoundry for exactly these reasons. Data science organizations were fine-tuning models before "agent" was even a word in the deck. Archestra was not built to replace any of it.

## Where TrueFoundry Stops

TrueFoundry treats the inference request as the unit of work. A prompt comes in, tokens go out, GPU utilization shows up on a dashboard, the gateway logs the call. That model is correct for a model-serving and LLM-gateway product. It is also why TrueFoundry does not — and reasonably should not — handle the things that appear the moment an application stops being "send a prompt, get a completion" and starts being "an agent loops over tools."

Concrete examples. A TrueFoundry gateway does not know which MCP server the agent is about to call after the model emits a tool-use response, because MCP is an application-layer protocol that lives above the inference endpoint. It does not validate the identity of the human against the tools the agent wants to invoke — there is no concept of "a support operator can read customer accounts but cannot issue refunds" inside an LLM gateway. It does not sandbox the MCP server that does the refund. It does not quarantine a poisoned tool result before it lands back in the next `messages` array.

None of this is a knock on TrueFoundry. These problems live at the agent layer, and a model-serving platform is the wrong place to solve them. The common mistake is assuming that because TrueFoundry sits near the LLM in the diagram, the safety story for the agent calling that LLM is somehow already handled. It is not. The [dual-LLM post](/blog/dual-llm) shows what that class of failure actually looks like in production.

## Where Archestra Picks Up

Archestra terminates the agent turn, not the model call. That changes what the gateway can do.

The [Archestra LLM Proxy](/docs/platform-llm-proxy) handles provider fan-out — OpenAI, Anthropic, Bedrock, Vertex, Azure, Gemini, Groq, Mistral, Cerebras, OpenRouter, vLLM, Ollama, and OpenAI-compatible endpoints generally, which is the slot TrueFoundry fits into. What differs from a model-serving gateway is the auth story: provider keys, virtual keys, OAuth 2.1 client credentials, user OAuth with consent screens, and JWKS validation against an enterprise IdP like Okta, Entra ID, Auth0, or Keycloak. The proxy resolves which model the signed-in user is actually allowed to call before the request ever leaves Archestra.

Above that sits the agent layer, which is the work TrueFoundry was never trying to do. The MCP Gateway gives the agent one endpoint for every tool it can touch, with isolation, per-identity routing, and OAuth/OBO that matches the LLM side. The Dual LLM sub-agent quarantines untrusted tool output so a hostile Zendesk ticket cannot rewrite the agent's instructions. The Dynamic Tool Engine hides sensitive tools from the agent's view when the request originates from an untrusted source. The audit trail records the decision, the tools touched, the identity behind the call, and the model that answered — not just `200 OK, 1,847 tokens`.

If the concern is "did the model respond," TrueFoundry is enough. If the concern is "did the agent do the right thing on behalf of the right person with the right tools," that is the layer Archestra owns.

## How TrueFoundry and Archestra Stack

The TrueFoundry Archestra topology, when both products are present:

```
App  -->  Archestra (agent + MCP brokering + guardrails)  -->  TrueFoundry gateway  -->  Fine-tuned Llama on customer GPUs
                                |                                                     \
                                |                                                      +--> external providers (when TF gateway fans out)
                                +-->  MCP servers (sandboxed, identity-routed)
```

Archestra fronts the agent. When the agent needs the in-house fine-tuned model — because the prompt happens to be a case the team specifically tuned for — Archestra's model router points at the TrueFoundry gateway as one of its upstream providers. TrueFoundry keeps doing what it is best at: serving that model on the team's own GPUs, autoscaling under load, surfacing the latency and utilization metrics the platform team already built dashboards around. Archestra does the agent-layer work above it: MCP brokering, dual-LLM, tool allowlists, identity-aware routing, decision-level audit.

Nothing on the TrueFoundry side has to change. The gateway is OpenAI-compatible, so Archestra speaks to it the same way it speaks to OpenAI or Anthropic. The fine-tuned model is just another entry in the model router's config, with its own per-identity access rules where required.

## Picking Between TrueFoundry and Archestra

- Use **TrueFoundry alone** when hosting in-house models, fine-tuning is on the roadmap, and the application is "send a prompt, get a completion." No agents, no MCP. TrueFoundry is the right answer and adding Archestra would be overkill.
- Use **Archestra alone** when self-hosting a model is not a requirement — hosted providers like OpenAI, Anthropic, or Bedrock are acceptable — and the goal is the agent layer, MCP gateway, and LLM proxy in one stack with one auth story and one audit trail. This is the path most new agent deployments take.
- Use **both** when TrueFoundry is already serving an in-house fine-tuned model and agents are being added on top. Place Archestra in front for the agent and MCP layer, point Archestra's model router at the TrueFoundry gateway as an upstream provider, and let TrueFoundry keep handling the model-serving and GPU economics it was built for. The answer to "a TrueFoundry-hosted model now needs a safe agent calling it" is not a different model platform — it is a layer above it.

Two products, two layers. The TrueFoundry Archestra pairing matches the problem when fine-tuned models meet agents — which, in enterprise stacks, they usually do.
