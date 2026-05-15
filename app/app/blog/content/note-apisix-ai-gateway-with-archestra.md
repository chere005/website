---
title: 'Apache APISIX AI Gateway + Archestra: Open Source on Top of Open Source'
description: 'APISIX AI Gateway Archestra pairing: what each open-source layer owns, why both stay MIT/Apache, and how they stack for agents and MCP.'
isNote: true
author: 'Mack Chi'
---

# APISIX AI Gateway Archestra: Two Open-Source Layers, One Stack

Enterprise platform teams running Apache APISIX as their AI gateway often ask whether a fully open-source agent layer exists to sit on top. The answer is the APISIX AI Gateway Archestra pairing: APISIX (Apache 2.0) terminates the LLM request, Archestra (MIT) terminates the agent turn. Both stay open source, neither tries to do the other's job, and the layers compose cleanly.

This note targets teams that already chose APISIX because it is an Apache project, the plugin model is real, and a per-LLM-call SaaS bill from a vendor whose pricing page changes every quarter is not an option. Adding agents to that stack does not require crossing back over the open-source line. The APISIX AI Gateway Archestra topology keeps the entire path Apache- or MIT-licensed.

About 1,500 words. Skip to the table for the short version. If [the LiteLLM post](/blog/litellm-with-archestra) is already familiar, this is the same shape of argument with APISIX in the LLM-proxy slot, with sharper open-source-first framing because that is the reason most APISIX shops picked APISIX in the first place.

## The Opinion, Up Front

Most enterprise stacks that adopt agents end up running BOTH an AI gateway and an agent platform, not EITHER. APISIX keeps doing what gateways do — plugins, routes, OIDC at the edge, rate limits, traffic shaping, observability. Archestra owns the agent turn, the MCP gateway, identity-aware tool routing, dual-LLM defense, and the decision-level audit trail. The layers do not collapse into each other. In the open-source-first world that APISIX users live in, the answer to "what about the agent layer" should not be "buy a closed SaaS." It should be another open-source project that does the part APISIX was never built to do.

| Axis               | APISIX (AI Gateway mode)                                                | Archestra                                                                                                 |
| ------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Layer it lives at  | API and LLM request gateway                                             | Agent execution, MCP tool routing, model proxy                                                            |
| What it terminates | HTTP / LLM provider requests                                            | Agent turns and tool calls                                                                                |
| Auth it handles    | OIDC, JWT, key-auth, basic-auth, OAuth at the edge                      | Provider keys, virtual keys, OAuth 2.1 client credentials, user OAuth, enterprise JWKS, MCP OAuth and OBO |
| Guardrails         | Rate limits, traffic shaping, ai-prompt-guard, ai-rate-limiting plugins | Prompt-injection defense (dual-LLM), tool allowlist, dynamic tool engine, MCP sandboxing                  |
| Observability      | Access logs, latency, Prometheus, OpenTelemetry                         | Agent decision trace, tool calls, identity-bound audit, Prometheus + OpenTelemetry                        |
| Tools / MCP        | Out of scope                                                            | Native MCP gateway, per-identity tool routing                                                             |
| Provider fan-out   | ai-proxy plugin to OpenAI, Anthropic, Azure, Bedrock, DeepSeek, others  | OpenAI-compatible Model Router across configured providers                                                |
| License            | Apache 2.0                                                              | MIT                                                                                                       |

## What APISIX Is Great At

APISIX is one of the better pieces of open-source infrastructure to ship in the last decade. The core is small. The plugin model is real — Lua, Go, or Wasm, hot-loaded without restarting the gateway. Routes are config, which means Git, which means reviewable. OIDC at the edge means a JWT gets validated and decomposed into headers before the request touches the application. The Prometheus and OpenTelemetry plugins are first-class.

When APISIX added AI-specific plugins — `ai-proxy` for provider fan-out, `ai-rate-limiting` for token-aware quotas, `ai-prompt-guard` for basic content filtering, `ai-prompt-decorator` for prepending system prompts — it became a credible AI gateway without anyone having to rebuild the API gateway layer underneath. Teams that already operate APISIX do not want a separate AI-only gateway sitting next to it with its own ops story. One gateway, not two, and Apache-licensed.

## Where APISIX Stops

APISIX treats the request as the unit of work. A request comes in, plugins fire, the request goes upstream, the response comes back, plugins fire again, metrics get emitted. That model is correct for a gateway. It is also why APISIX does not — and reasonably should not — try to handle the things that show up the moment the application stops being "API call" and starts being "agent turn."

A few concrete examples. APISIX does not know which MCP server an agent is about to call after it reads the model's tool-use response, because tools are an application concern and an MCP server is a different network endpoint entirely. It does not validate the identity of the human behind the call against the tools the agent wants to use — the OIDC plugin reports who is on the other end of the request, but there is no concept of "this user can read Jira but cannot post Slack messages" at the gateway layer. It does not sandbox the code that an MCP server runs. And it does not ship with a real defense against prompt injection in tool results — `ai-prompt-guard` is a regex-and-keyword check, not a quarantine. That class of failure is real and is what [the dual-LLM post](/blog/dual-llm) was written to explain.

None of this is a knock on APISIX. These problems live at the agent layer, and an AI gateway is the wrong place to solve them. The mistake is assuming that because APISIX is called an "AI gateway," it covers the agent surface. It does not.

## Where Archestra Picks Up

Archestra terminates the agent turn, not just the model call. That changes what the gateway can do.

The [LLM Proxy](/docs/platform-llm-proxy) inside Archestra handles the same kind of provider fan-out expected at this layer — OpenAI, Anthropic, Bedrock, Vertex, Azure, Gemini, Groq, Mistral, Cerebras, OpenRouter, vLLM, Ollama, and others — with an OpenAI-compatible model router on top. What is different is the auth story: provider keys, virtual keys, OAuth 2.1 client credentials, user OAuth with consent screens, and JWKS validation against an enterprise IdP (Okta, Entra ID, Auth0, Keycloak) so the proxy resolves the right provider key from the signed-in user. The detail is laid out in [the LLM auth post](/blog/llm-proxy-auth-overview).

Above that sits the agent layer, which is where Archestra is doing the work APISIX cannot. The MCP Gateway provides one endpoint for every MCP tool an agent might use, with isolation, per-identity tool routing, and an OAuth/OBO story that matches the LLM side. The Dual LLM sub-agent quarantines untrusted tool output so a malicious GitHub issue cannot rewrite an agent's instructions. The Dynamic Tool Engine hides sensitive tools from the agent's view when the request originates from an untrusted source. And the audit trail records the decision, the tools touched, the identity behind the call, and the resolved provider key — not just `200 OK, 2,114 tokens`.

If the concern is "did the LLM request succeed," APISIX is enough. If the concern is "did the agent do the right thing on behalf of the right person with the right tools," that is the job the APISIX AI Gateway Archestra pairing was built for.

## How They Stack

The typical topology, when both are present, looks like this:

```
App  -->  APISIX (north-south edge, OIDC, rate limits, traffic shaping)
              |
              v
          Archestra (agent + MCP brokering + guardrails)
              |
              +-->  MCP servers (sandboxed, identity-routed)
              |
              v
          APISIX again (ai-proxy plugin for provider fan-out, optional)
              |
              v
          OpenAI / Anthropic / Bedrock / ...
```

Two reasonable shapes. Either APISIX is at the north-south edge with OIDC and rate limits, Archestra runs behind it, and Archestra's model router goes direct to providers. Or APISIX shows up twice — once at the edge, once on the south side as the provider-fan-out layer using `ai-proxy` — and Archestra's model router points at the south-side APISIX instead of going direct. Both work. The second shape is what most APISIX shops end up with, because the dashboards, the cost attribution, and the per-team token limits on top of `ai-proxy` are already built and migrating any of it is not the goal. The decision is operational, not architectural.

## Picking

- Use **APISIX alone** when the concern is the AI gateway tier — OIDC at the edge, rate limits, traffic shaping, request and response transformation, basic prompt filtering, provider fan-out via `ai-proxy`. No agents, no MCP. APISIX is the right answer and adding Archestra would be overkill.
- Use **Archestra alone** when starting fresh and a single stack covers the agent layer, the MCP gateway, and the LLM proxy with one auth story and one audit trail. The Archestra LLM proxy covers the providers most teams need.
- Use **both** when APISIX is already in production and agents are being added. Put APISIX at the edge, run Archestra behind it for the agent and MCP layer, and either let Archestra talk to providers directly or point its model router at a south-side APISIX `ai-proxy` to keep the cost attribution finance teams already built. APISIX does not need to be replaced. A layer above it does.

Two open-source gateways, two different jobs, two compatible licenses. Pick the one that matches the layer of the problem at hand, and stack them when the problem spans both — which, across APISIX shops adopting agents, it usually does.
