---
title: 'Vercel AI Gateway + Archestra'
description: 'Vercel AI Gateway Archestra comparison: where the Vercel model proxy stops, where Archestra picks up for MCP routing, prompt injection, and enterprise audit.'
isNote: true
author: 'Mack Chi'
---

## Vercel AI Gateway Archestra: Where Each Layer Fits

Vercel AI Gateway Archestra is not an either-or stack. Vercel AI Gateway is the right front-end for a Next.js AI app that needs streaming, edge routing, and provider fan-out across Anthropic, OpenAI, Google, Groq, Bedrock, and Mistral. Archestra is the agent-layer security and governance plane that sits underneath: MCP tool routing, prompt-injection defense, identity-aware execution, and a per-user audit trail. The two solve different problems on the same call path. Teams that close their first enterprise deal on a Vercel-hosted [AI SDK](https://ai-sdk.dev) app and then face an SSO, audit, and MCP checklist typically end up running both.

Archestra is an open-source security and governance layer between the AI app and the tools and models behind it. MCP brokering, prompt-injection defense, identity-aware tool routing, and an audit trail a security review can read. MIT-licensed, self-hostable. The full architecture is in the [Vercel AI example](/docs/platform-vercel-ai-example).

The Vercel AI Gateway Archestra split, up front: [Vercel AI Gateway](https://vercel.com/ai-gateway) is the right front-end for a Next.js AI app. Streaming, edge routing, model fan-out, billing across providers. Archestra is what gets bolted on the day the app gains MCP tools, enterprise customers, and a security review. Different concerns, same stack.

| Axis               | Vercel AI Gateway                                         | Archestra                                                                                                 |
| ------------------ | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Layer it lives at  | Model routing for Vercel-hosted apps                      | Agent execution, MCP tool routing, model proxy                                                            |
| What it terminates | Provider API calls from Next.js / AI SDK                  | Agent turns and tool calls                                                                                |
| Auth it handles    | Vercel project keys, BYOK per provider                    | Provider keys, virtual keys, OAuth 2.1 client credentials, user OAuth, enterprise JWKS, MCP OAuth and OBO |
| Guardrails         | Rate limits, basic spend caps                             | Prompt-injection defense (dual-LLM), tool allowlist, dynamic tool engine, MCP sandboxing                  |
| Observability      | Token spend, latency per provider, basic logs             | Agent decision trace, tool calls, identity-bound audit, Prometheus and OpenTelemetry                      |
| Tools / MCP        | Out of scope                                              | Native MCP gateway, per-identity tool routing                                                             |
| Provider fan-out   | Anthropic, OpenAI, Google, Groq, Bedrock, Mistral, others | OpenAI-compatible Model Router across configured providers                                                |
| Deployment         | Hosted on Vercel                                          | Self-hosted Docker, runs anywhere                                                                         |
| License            | Proprietary (Vercel SaaS)                                 | MIT                                                                                                       |

## What Vercel AI Gateway Is Great At

Vercel AI Gateway solves a real problem cleanly. For a Next.js app on Vercel where the bottleneck is "swap GPT-4 for Claude without rewriting the route handler," the gateway is the right answer. Changing a model identifier in `streamText` swaps providers, billed through the Vercel account, with one set of credentials and one set of logs.

The fan-out story is strong. Anthropic, OpenAI, Google, Groq, Bedrock, Mistral, and a long tail of smaller providers behind the same `ai` package interface. Streaming works at the edge. Latency is measured per provider. A dashboard ships out of the box. No infrastructure to run. For a single-product team shipping consumer AI features on Vercel, that is the correct level of abstraction, and self-hosting the equivalent is not worth the cost.

Many Next.js AI apps start this way. The first version ships fast because Vercel hides the boring parts. That is a feature.

## Where Vercel AI Gateway Stops

The gateway treats the LLM call as the unit of work. A request arrives from a Next.js route, a request goes out to Anthropic or OpenAI, the response streams back, the bill gets tracked. That model is correct for a model proxy. It is also why the gateway does not, and reasonably should not, handle the work that appears the moment the app stops being a chat UI and starts being an agent talking to real tools on behalf of a real user.

Concrete examples. The gateway does not know which MCP server an agent is about to call, because MCP servers are application concerns and a different network endpoint entirely. It does not validate that the human behind the call has access to the tools the agent wants to invoke, because there is no concept of "this user can read Jira but cannot post in Slack" inside a model proxy. It does not sandbox the code an MCP server runs. It does not defend against prompt injection in tool results, because by the time a tool result hits the gateway it is already text inside the next `messages` array. And it does not produce a per-user audit trail mapping employee to agent decision to tool call. The audit Vercel ships is per-project, not per-identity.

None of this is a knock on Vercel. These problems live at the agent layer. A model gateway is the wrong place to solve them. The mistake is assuming that because the product is called a "gateway," it covers the agent surface. It does not, and teams that learn this on the first procurement call with a regulated customer pay for the discovery.

## Where Archestra Picks Up

Archestra terminates the agent turn, not just the model call. Same shift described in [the LiteLLM post](/blog/litellm-with-archestra). The unit of work changes, and so does what the gateway can do.

Wiring it into a Vercel AI SDK app is small. One URL changes. In `createOpenAI` (or the equivalent for the chosen provider) `baseURL` points at Archestra instead of the Vercel gateway, and the rest of the `streamText` code keeps working. The full walkthrough, with code, is in the [Vercel AI example](/docs/platform-vercel-ai-example). One line of config buys the layer underneath.

What that one line delivers. Archestra's MCP Gateway exposes one endpoint for every MCP tool the agent might use, with sandboxing and per-identity routing. The dual-LLM sub-agent quarantines untrusted tool output so a malicious GitHub issue or a poisoned document cannot rewrite agent instructions. The dynamic tool engine hides sensitive tools from the agent's view when the context is untrusted. JWKS validation against the customer's Okta or Entra ID produces an audit trail that names the employee at the customer who ran the tool, instead of "your Vercel project key was used 1,847 times today." The LLM proxy underneath handles provider fan-out across OpenAI, Anthropic, Bedrock, Vertex, Azure, Gemini, Groq, Mistral, Cerebras, OpenRouter, vLLM, Ollama and others, with an OpenAI-compatible front, so AI SDK code on the Next.js side does not change.

For "did the model respond, did it stream, did the bill land correctly," the Vercel gateway is enough. For "did the agent do the right thing on behalf of the right person with the right tools, and can it be proven to a customer's security team," that is the job Archestra was built for. The [Why We Founded Archestra](/blog/why-we-found-archestra) post is the longer version of why the agent layer is a separate problem rather than a feature bolted onto a model proxy.

## How They Stack

The Vercel AI Gateway Archestra topology that ships for enterprise-grade Next.js apps:

```
Next.js app on Vercel  -->  Archestra (agent + MCP + guardrails + identity)  -->  Vercel AI Gateway (provider fan-out + streaming)  -->  OpenAI / Anthropic / Google / ...
                                          |
                                          +-->  MCP servers (sandboxed, identity-routed)
```

Archestra fronts the agent. When the agent needs a model call, Archestra's model router points at Vercel AI Gateway as the upstream provider, because the gateway speaks the OpenAI API on the front and Archestra's proxy speaks it on the back. Vercel keeps doing what it is good at: provider routing, streaming at the edge, billing across providers. Archestra does the agent-layer work above it: MCP brokering, dual-LLM, tool allowlists, identity-aware routing, decision-level audit against the customer's IdP.

For some teams the Vercel gateway becomes redundant once Archestra is in place, because Archestra's own LLM proxy covers the providers in scope. For other teams the Vercel gateway stays because the spend reporting and edge streaming are good enough and migration cost is not worth paying. Both choices are reasonable. The decision is operational, not architectural.

## Picking

- Use **Vercel AI Gateway alone** when the app is a Next.js app on Vercel, users are individual signed-in accounts on the product, and there are no MCP tools, enterprise customers, or security reviews on the calendar. The gateway is the right answer and adding Archestra is overkill.
- Use **Archestra alone** when deploying outside Vercel, or starting fresh and wanting the agent layer, the MCP gateway, and the LLM proxy in one stack with one auth story and one audit trail. The Archestra LLM proxy covers most of what teams need; see [supported providers](/docs/platform-supported-llm-providers).
- Use **both** when already on Vercel and an enterprise customer has just sent a checklist. Archestra goes in front for the agent and MCP layer, Archestra's model router points at Vercel AI Gateway as an upstream provider, and Vercel keeps handling streaming and cross-provider billing. Four weeks is enough time to ship this path.

Two gateways, two different jobs. The Vercel AI Gateway Archestra pairing matches the layer of the actual problem, and stacks when the problem spans both. For Next.js AI apps with enterprise customers, it usually does.
