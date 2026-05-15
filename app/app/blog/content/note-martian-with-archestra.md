---
title: 'Martian router Archestra: cost-aware model routing, identity-aware tool policy'
description: 'Martian router Archestra stacking: route to the cheapest capable model, then enforce per-identity tool policy on the agent turn. Where each layer stops.'
isNote: true
author: 'Mack Chi'
---

## Martian router Archestra: two layers, one stack

Martian router Archestra deployments answer two disjoint questions. Martian picks the cheapest capable model for a prompt. Archestra terminates the agent turn — who the caller is, which tools they can invoke, what their context is allowed to see. Bundling them sounds tidy and ends badly. The Martian router Archestra split is layering, not competition: cost lives in front of the model call, policy lives in front of the agent turn. Martian router Archestra together produce a cost-aware stack that does not pay for inference savings with an unguarded tool surface.

A model router that prefers cheaper models when the prompt does not need a frontier reasoner typically trims 20–50% off inference spend depending on the prompt mix. That is real money, and routers like Martian execute it well. The follow-on question — how each user gets bounded to the tools they are authorized for — does not live in the same conversation as cost. It is a different layer, with different state, different failure modes, and a different on-call rotation when it goes wrong.

Martian routes to the cheapest capable model. That is what it is for. It is not a policy engine for who-can-call-what, it is not an MCP gateway, it is not a prompt-injection defense, and treating it as one produces an audit log that records cost savings on a request that exfiltrated data. The Martian router Archestra pairing exists because each piece scopes itself correctly.

If the [LiteLLM comparison](/blog/litellm-with-archestra) is familiar, this is the same layering argument applied to a router instead of a proxy. If the proxy-versus-router distinction is still fuzzy, [model router vs LLM proxy](/blog/model-router-vs-llm-proxy) is the prerequisite.

## The 5-year-old version

Imagine a school cafeteria with three lunch counters. One is cheap, one is expensive and fast, one is in the middle. A kid walks up and says "I want lunch." Somebody at the door has to decide which counter to send the kid to, based on what they want and how much money is left on their card. That somebody is Martian.

That same kid also has a school ID that says what they are allowed to eat. Some have allergies, some cannot have dessert before vegetables, some are not on the meal plan today at all. The door-picker is not checking any of that. A different person at the counter has to look at the ID, check the allowed list, and only hand over the food the kid is actually permitted to take. That is Archestra. Two jobs, two people. One optimizes the lunch line. The other keeps the wrong food off the wrong tray.

## What Martian is great at

Martian is a model router. It is pointed at a set of providers and models, given a policy that cares about cost and capability, and for each prompt it picks the cheapest model that can plausibly answer it. The good version of that idea — which Martian executes — includes classification of prompt difficulty, learned preferences, fallback chains when a provider is rate-limiting, and honest accounting of cost-per-token versus answer quality. Using a frontier model to summarize a two-sentence email is lighting money on fire, and a router that catches those cases is doing useful work.

The cost delta in production deployments — Martian, OpenRouter's auto mode, in-house policies on LiteLLM — typically lands in the 20% to 50% range depending on prompt mix.

## Where Martian stops

A model router terminates one decision: which model should this call go to. Everything before that decision — who is the user, what are they entitled to do, what tools is the agent about to invoke, what is in the tool's response, whether the model can be allowed to see that response — happens at a different layer. Martian does not pretend otherwise. The problem is that if the only gateway in front of the agent is a model router, there is an unguarded surface area between the application and the tools the agent is about to touch.

Several concrete things a router does not do, by design. It does not know which MCP server the agent is about to call after it reads the model's tool-use response, because tools are an application concern. It does not check whether the human behind the call is allowed to use that tool — there is no concept of "this user can read Jira but cannot post Slack messages" inside a router. It does not sandbox the code an MCP server runs. It does not detect when a tool result contains adversarial content trying to rewrite the agent's instructions. And the audit log sits at the level of "which model got the call and what did it cost" — the right log for a router and the wrong log for a security review.

This is not a flaw. It is correct scoping for the layer it lives at. The mistake is assuming that because the router sits in front of the model calls, it also sits in front of the agent's behavior. It does not.

## Where Archestra picks up

Archestra terminates the agent turn, not the model call. The unit of work is "the agent is about to do something on behalf of a specific human" — and everything the gateway does is in service of making that turn safe, attributable, and bounded. The full picture is in the [LLM proxy docs](/docs/platform-llm-proxy); the relevant pieces for the Martian router Archestra comparison are:

- **Identity-aware tool routing.** The agent does not get a static list of tools. It gets the list of tools the calling user is allowed to invoke, resolved per-turn from the user's OAuth identity or enterprise IdP claims. A user who cannot post Slack messages does not see a Slack-posting tool on this turn.
- **MCP gateway with sandboxed servers.** Tools are not direct network egress. They go through a gateway that isolates the server, enforces the per-identity allowlist, and produces an audit record at the decision level.
- **Prompt-injection defense.** Tool results from untrusted sources are routed through a quarantined sub-agent before they ever reach the main agent's context, so a malicious GitHub issue cannot rewrite the next instruction.
- **Decision-level audit.** Who called the agent, what tools were considered, what was allowed, what was invoked, which provider key resolved the model call, and what came back. Not just `200 OK, 1,847 tokens`.

This is the layer Martian does not — and should not — touch.

## The comparison

| Axis                       | Martian                                                     | Archestra                                                                         |
| -------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Unit of work it terminates | One model-selection decision                                | One agent turn                                                                    |
| Scope                      | Pick the cheapest capable model for this prompt             | Route the turn, enforce per-identity tool policy, broker MCP, defend the context  |
| Statefulness               | Provider-health, learned cost/quality, budget               | Per-user identity, tool entitlements, MCP state, decision trace                   |
| Tool / MCP awareness       | None                                                        | Native MCP gateway, per-identity routing, sandboxed servers                       |
| Prompt-injection defense   | Out of scope                                                | Dual-LLM quarantine for untrusted tool output                                     |
| Auth model                 | Per-app or per-key for cost attribution                     | OAuth 2.1, user OAuth, enterprise JWKS, MCP OAuth and OBO                         |
| Observability              | Cost per call, model chosen, fallback fired                 | Identity, tools considered, tools allowed, tools invoked, model, cost             |
| Failure mode               | Wrong model picked, fallback didn't trigger, budget overrun | Wrong tool authorized, untrusted content reached the agent, identity not enforced |

## How they stack

```
App  -->  Archestra (agent turn, MCP brokering, identity, guardrails)  -->  Martian (model routing)  -->  OpenAI / Anthropic / Bedrock / ...
                                |
                                +-->  MCP servers (sandboxed, identity-routed)
```

Archestra fronts the agent. When the agent needs a model call, Archestra's internal proxy can point at Martian as the upstream provider, because Martian presents an OpenAI-compatible front and Archestra's proxy speaks that on the back side. Martian keeps doing what it is good at — cheapest capable model, provider fallbacks, budget. Archestra does the agent-layer work in front of it: identity-aware tool routing, MCP brokering, prompt-injection defense, decision-level audit. Same pattern as the [LiteLLM stacking story](/blog/litellm-with-archestra), different upstream.

In a Martian router Archestra deployment, the router stays where it is, Archestra fronts it for the agent turn, and the inference savings are preserved without paying for them with an unguarded tool surface.

## Opinion

Model routing is a cost lever. Agent security is a policy lever. They are not the same lever and they should not share a config file. The pull to bundle them is real — both pieces sit "in front of the agent," both look like a gateway, both have an OpenAI-compatible front — but the inputs, state, and failure modes are disjoint. A router that tries to enforce per-user tool policy will do it badly, because that is not the shape of the problem it was designed for. A security layer that makes routing decisions based on cost will make them badly, for the same reason in reverse.

Pick the cheapest capable model. Then, separately, bound what the agent it powers can see, do, and touch to what its caller is allowed to. Two layers, two products, one stack.
