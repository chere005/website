---
title: 'Cloudflare AI Gateway + Archestra'
description: 'Cloudflare AI Gateway Archestra: edge caching, rate limits, and provider failover stop where identity, MCP tools, and agent-decision audit begin.'
isNote: true
author: 'Mack Chi'
---

## Cloudflare AI Gateway Archestra: Where the Edge Stops and the Agent Layer Starts

Cloudflare AI Gateway Archestra is the right framing for any platform team running an LLM edge gateway and now adding agents. Cloudflare AI Gateway covers the edge: caching, rate limits, provider failover, token-spend logs. It does not know who the calling user is, which tools the agent can invoke, which MCP server is on the other side, or whether a tool result is trying to hijack the next turn. Those are agent-layer concerns at a different layer of the stack, and both products can coexist cleanly without overlap.

The short version: Cloudflare AI Gateway is genuinely useful for what it does. "There is a gateway in front of the LLM calls" is not the same as "the agent surface is secured." An edge gateway sees `POST /v1/chat/completions` and a body of text. It does not see the human, does not see the tool the agent is about to call, does not see the MCP server, and does not audit the agent's decision. Those are different problems at a different layer of the stack.

This is a comparison post in the same shape as [the LiteLLM one](/blog/litellm-with-archestra) - table near the top, then the line between the two layers, then how they stack. About 1,500 words. For a one-minute read, jump to the table and the stacking diagram.

| axis                     | cloudflare ai gateway                                   | archestra                                                                            |
| ------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| where it lives           | edge / cdn, in front of provider apis                   | agent runtime, in front of the model call and the mcp call                           |
| unit of work             | a single llm http request                               | an agent turn (model + tools + decision)                                             |
| auth model               | api key on the gateway, provider keys behind it         | provider keys, virtual keys, oauth 2.1, user oauth, enterprise jwks, mcp oauth + obo |
| identity awareness       | none - the gateway does not know who the user is        | end-to-end - the signed-in user resolves keys and tool access                        |
| caching                  | semantic + exact response caching at the edge           | not the primary job                                                                  |
| rate limits + failover   | per-key, per-provider, fallback to a secondary provider | per-identity, per-tool, per-team                                                     |
| logging                  | request/response logs, token spend, latency             | agent decision trace, tools touched, identity behind the call                        |
| tools / mcp              | out of scope                                            | native mcp gateway, per-identity tool routing                                        |
| prompt-injection defense | not in scope                                            | dual-llm sub-agent + dynamic tool engine                                             |
| pricing                  | cloudflare account, generous free tier                  | self-hosted (mit) or managed                                                         |

## What Cloudflare AI Gateway Is Actually Good At

Cloudflare AI Gateway solves a real and annoying problem: an app calls OpenAI (or Anthropic, or Workers AI, or anything similar) and needs the basic infrastructure layer that should already exist - caching for repeated prompts, rate limits so a runaway loop does not drain a budget, automatic failover when one provider hiccups, request/response logs, and one place to track token spend across providers. Cloudflare wrapped all of that into a config and put it on its edge, which means basically no added latency. That is a real piece of infrastructure.

Semantic caching alone is worth the install for a lot of workloads - support bots and internal Q&A tools tend to ask the same things over and over. Failover means when OpenAI has a bad ten minutes, traffic flips to Anthropic without users noticing. None of this is glamorous, all of it is the kind of thing that gets reimplemented badly in-house when it is missing.

So for an app shaped like "user asks question, LLM responds, cache and bill" - the gateway is fine on its own. Archestra is not needed. The rest of this post is mostly skippable.

## Where the Cloudflare AI Gateway Stops

Cloudflare AI Gateway treats one LLM HTTP request as the unit of work. That model is correct for an edge gateway. It is also why the gateway does not - and reasonably should not - know about the things that show up the moment an app stops being "chat" and starts being "agent."

A few concrete things the gateway does not (and will not) know:

- **Who the calling user is**, in the identity-provider sense. The gateway authenticates _the app_ via a Cloudflare API key. It has no idea whether the request came from a user in legal or a user in engineering.
- **Which MCP servers the agent is about to call** after it reads the tool-use response. Tools are an application concern, MCP servers are different network endpoints, and the gateway sees none of that.
- **Whether the user is authorized to call the tool** the agent picked. There is no "this role can read Jira but cannot post Slack messages" inside an edge gateway - it has no user model.
- **Whether the tool result is trying to inject instructions** into the next turn. By the time tool text comes back, the gateway either never saw it or sees it as opaque text in the next `messages` array. Either way, no defense.
- **What the agent decided and why**. The logs say `200 ok, 1,847 tokens`. They do not say "the agent chose to call `delete_repository` on behalf of user X after reading an issue body that contained 'ignore previous instructions'."

None of this is a knock on the gateway. These are agent-layer problems and an edge gateway is the wrong place to solve them. The mistake is assuming that because the box is labeled "AI gateway," it covers the agent surface. It does not.

## Where Archestra Picks Up in the Cloudflare AI Gateway Archestra Stack

Archestra terminates the agent turn, not just the model call. That changes what the gateway can do.

The [Archestra LLM proxy](/docs/platform-llm-proxy) handles provider fan-out across OpenAI, Anthropic, Bedrock, Vertex, Azure, Gemini, Groq, Mistral, Cerebras, OpenRouter, vLLM, Ollama, and others, with an OpenAI-compatible router on top. What is different from an edge gateway is the auth story: provider keys, virtual keys, OAuth 2.1 client credentials, user OAuth with consent screens, and JWKS validation against an enterprise IdP (Okta, Entra ID, Auth0, Keycloak) so the proxy resolves the right provider key based on the signed-in user. When an authenticated user's agent makes a model call, Archestra knows the identity, and the audit log records it.

Above that sits the agent layer, which is where Archestra is doing work an edge gateway cannot. The MCP gateway exposes one endpoint for every MCP tool an agent might use, with sandboxing, per-identity tool routing, and an OAuth/OBO story that lines up with the LLM side. The dual-LLM sub-agent quarantines untrusted tool output so a malicious GitHub issue cannot rewrite the agent's instructions. The dynamic tool engine hides sensitive tools from the agent's view when the request comes from an untrusted source. The audit trail records the decision, the tools touched, the identity behind the call, and the resolved provider key - not just the HTTP status.

If the concern is "did the model respond and was the response cheap and fast," Cloudflare is enough. If the concern is "did the agent do the right thing on behalf of the right person with the right tools," that is the job Archestra was built for.

## How Cloudflare AI Gateway and Archestra Stack

The typical topology, when both are present, looks like this:

```
user -> app -> archestra (agent + mcp + guardrails) -> cloudflare ai gateway (cache/limits/failover) -> openai/anthropic/...
                            |
                            +-> mcp servers (sandboxed, identity-routed)
```

Archestra fronts the agent. When the agent needs a model call, Archestra's router can point at Cloudflare's OpenAI-compatible endpoint as the upstream. Cloudflare keeps doing what it is good at - cache hits, rate limits, failover when a provider goes sideways, edge logs. Archestra does the agent-layer work above it: which user, which tool, which MCP server, which decision, which audit entry.

This stack is cleaner than it sounds. Archestra does not need to re-implement edge caching, and Cloudflare does not need to learn what an MCP tool is. Each layer terminates a different unit of work and they do not fight over the same job. Compare to the [LiteLLM setup](/blog/litellm-with-archestra) - same shape, different middle layer. For the auth-side story for the agent layer in detail, [the MCP authentication guide](/blog/mcp-authentication-guide) is the right next read.

## Picking Between Cloudflare AI Gateway, Archestra, or Both

- **Use Cloudflare AI Gateway alone** when the concern is provider routing, caching, rate limits, and edge-level logging for direct LLM access. No agents, no tools, no MCP. Cloudflare is the right answer and adding Archestra would be overkill.
- **Use Archestra alone** when starting fresh and wanting the agent layer, the MCP gateway, and the LLM proxy in one stack with one auth story and one audit trail. The Archestra LLM proxy covers the providers most teams need, and Cloudflare can be added later when caching becomes the bottleneck.
- **Use both** when Cloudflare AI Gateway is already in production for cost and reliability reasons and agents are now being added. Put Archestra in front for the agent and MCP layer, point Archestra's router at the Cloudflare endpoint, and let Cloudflare keep doing the edge job. That is the answer for any platform team that does not need to replace Cloudflare, but does need a layer above it.

Two products, two different jobs, two layers of the stack. Cloudflare AI Gateway is doing the edge work and doing it well. Archestra is doing the agent work that the edge cannot see. Pick the one that matches the problem at hand, and stack them when the problem spans both.
