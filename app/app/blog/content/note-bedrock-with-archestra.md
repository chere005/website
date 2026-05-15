---
title: 'AWS Bedrock + Archestra: Model Access vs. Agent Platform'
description: 'AWS Bedrock Archestra comparison: Bedrock provides model access; Archestra adds MCP, identity-bound tools, and prompt-injection defense above it.'
isNote: true
author: 'Mack Chi'
---

## AWS Bedrock Archestra: Model Access vs. Agent Platform

AWS Bedrock Archestra deployments answer a recurring enterprise question: with Bedrock already in place, is an agent platform still needed? Short answer: Bedrock terminates the model call. It does not terminate the agent turn, broker MCP tool routing, bind tools to identity, or defend against prompt injection in tool output. Those are agent-platform responsibilities, and an AWS Bedrock Archestra stack is the shape that addresses both layers cleanly on AWS.

Bedrock is the AWS-managed access layer for foundation models. It is where Anthropic, Meta, Mistral, Cohere, and Amazon Nova models become callable through one AWS API, billed through one AWS account, with IAM controlling who can invoke what. Archestra is a different layer. It sits above the model call: MCP gateway, identity-bound tool routing, dual-LLM defense, decision-level audit. Bedrock-only is a model account. AWS Bedrock Archestra is an enterprise agent stack.

This note is roughly 1,300 words, anchored by the comparison table and sections covering Bedrock's strengths, its scope boundaries, where Archestra picks up, and how the two stack together. The table and topology diagram cover the essentials for a quick scan.

Up front: Bedrock is the right IaaS choice for models on AWS and should stay. But "Bedrock is in place" answers "where do model tokens come from." It does not answer "who can the agent act on behalf of, which tools is it allowed to call, and what happens when an MCP tool returns malicious text." Those are agent-platform questions, and Bedrock does not pretend to solve them.

| Axis                    | AWS Bedrock                                                                                 | Archestra                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Layer it lives at       | Managed model access (IaaS)                                                                 | Agent execution, MCP tool routing, model proxy                                                                                        |
| What it terminates      | Provider API calls to foundation models                                                     | Agent turns and tool calls                                                                                                            |
| Auth                    | AWS IAM, SigV4, Bedrock API keys                                                            | Provider keys, virtual keys, OAuth 2.1 client credentials, user OAuth, enterprise JWKS, MCP OAuth and OBO                             |
| Models                  | Anthropic, Meta, Mistral, Cohere, Amazon Nova, DeepSeek, Stability, others available in AWS | Routes to Bedrock plus OpenAI, Anthropic direct, Vertex, Azure, Gemini, Groq, Mistral, Cerebras, OpenRouter, vLLM, Ollama, and others |
| Region / data residency | Native AWS regions, cross-region inference profiles                                         | Inherits region from the upstream provider; multi-provider routing                                                                    |
| Guardrails              | Bedrock Guardrails (content filters, PII, denied topics)                                    | Prompt-injection defense (dual-LLM), tool allowlist, dynamic tool engine, MCP sandboxing                                              |
| Tools / MCP             | Out of scope                                                                                | Native MCP gateway, per-identity tool routing                                                                                         |
| Observability           | CloudWatch metrics, CloudTrail, model invocation logs                                       | Agent decision trace, tool calls, identity-bound audit, Prometheus + OpenTelemetry                                                    |
| Billing                 | Native AWS billing, per-model token pricing                                                 | Self-hosted (MIT) or commercial license; runs alongside existing model bill                                                           |
| License                 | AWS proprietary managed service                                                             | MIT                                                                                                                                   |

## What Bedrock is great at

Bedrock is strong at the things AWS is strong at. For organizations already running on AWS, the integration story is hard to beat.

IAM serves as the access control plane. Bedrock can be authorized through IAM roles, IRSA on EKS, instance profiles, or SigV4 directly. The same identity story used for S3, RDS, and Lambda also gates who can call Claude or Llama. For a security team already comfortable writing IAM policies, this removes a category of new tooling.

Region and data residency follow the AWS pattern. Bedrock exposes regional endpoints, and cross-region inference profiles route requests appropriately without application-level awareness. A compliance requirement that model traffic stays inside `us-east-1`, or inside the EU, becomes a configuration choice instead of a separate procurement.

Billing consolidates. Model spend appears in the same AWS account as the rest of the infrastructure. Finance does not onboard a new vendor, FinOps dashboards keep working, and the EDP discount applies. For a Fortune 500 that took two years to negotiate the AWS contract, this matters more than engineering teams usually expect.

Bedrock Guardrails layer on top: content filters, PII redaction, denied topics. Not a full agent guardrail layer, but for direct LLM use cases they cover the obvious ground. None of this is glamorous. All of it is the kind of plumbing that, when missing, kills enterprise adoption.

This is not an argument against Bedrock. The Archestra [supported providers list](/docs/platform-supported-llm-providers) treats Bedrock as a first-class upstream for exactly this reason. In AWS-native deployments using AWS Bedrock Archestra together, Bedrock stays.

## Where Bedrock stops

Bedrock treats the model call as the unit of work. Request in, response out, tokens billed, CloudTrail records the invocation. That is the right shape for managed model access, and it is also why Bedrock does not, and reasonably should not, try to handle the concerns that appear the moment an application stops being a chatbot and becomes an agent.

Concrete examples: Bedrock does not know which MCP server an agent is about to call after reading the model's tool-use response, because MCP servers are an application concern and a separate network endpoint. It does not enforce "this user can read Jira but cannot post to Slack" at the tool level, because tool identity is not part of the Bedrock contract. It does not sandbox the code an MCP server runs, because MCP servers are not in scope. And it does not defend against prompt injection in tool results, because by the time a tool result reaches the model it is just text inside the next `messages` array.

These problems live one layer up. An IaaS model access service is the wrong place to solve them. The mistake some teams make is assuming that because Bedrock has IAM, regions, and Guardrails, it covers the agent surface. It does not. The motivation for building a dedicated agent platform is covered in [Why We Founded Archestra](/blog/why-we-found-archestra), and the agent-side risk is the part Bedrock does not try to own.

## Where Archestra picks up

Archestra terminates the agent turn, not just the model call. That changes what the layer can do.

The Archestra [LLM Proxy](/docs/platform-llm-proxy) routes to Bedrock as one of its upstream providers. Either Bedrock API keys or AWS IAM authentication (IRSA on EKS, instance profiles, the standard AWS credential chain) can be used, so the auth story does not change. The complete list of providers Archestra supports, including Bedrock, lives at [supported providers](/docs/platform-supported-llm-providers). For most AWS-native AWS Bedrock Archestra deployments, Bedrock remains the primary upstream, and Archestra adds the agent layer on top.

Above the model proxy sits the work Bedrock does not do. The [MCP Gateway](/docs/platform-mcp-gateway) exposes one endpoint for every MCP tool an agent might use, with per-server isolation and identity-aware routing. Identity comes from the IdP (Okta, Entra ID, Auth0, Keycloak) through JWKS validation, so the same Entra ID identity that lets a user sign in to Claude Desktop also decides which MCP tools the agent can reach. The Dual LLM Sub-agent quarantines untrusted tool output so a malicious GitHub issue or Jira ticket cannot rewrite the agent's instructions. The Dynamic Tool Engine hides sensitive tools from the agent's view when the request originates from a low-trust source. The audit trail captures the decision, the tools touched, the identity behind the call, and the resolved provider, not just `200 OK, 1,847 tokens`.

For "did the model respond," Bedrock is sufficient. For "did the agent do the right thing on behalf of the right person with the right tools, and can it be proven in an audit," that is the layer Archestra was built for. The same line shows up in the [LiteLLM comparison](/blog/litellm-with-archestra): model gateway and agent platform are different jobs.

## How they stack

With both in place, the topology looks like this:

```
App  -->  Archestra (agent + MCP brokering + guardrails)  -->  Bedrock (managed model access)  -->  Anthropic / Meta / Mistral / Amazon / ...
                                |
                                +-->  MCP servers (sandboxed, identity-routed)
```

Archestra fronts the agent. When the agent needs a model call, Archestra's model router points at Bedrock as the upstream provider, using IAM through IRSA so no API key has to leave AWS. Bedrock keeps doing what it is good at: model access, regional routing, IAM-based access control, billing into the AWS account, Guardrails on raw model traffic. Archestra adds the agent-layer work above it: MCP brokering, dual-LLM, tool allowlists, identity-bound audit, prompt-injection defense.

For an AWS-native enterprise, this is the right shape. The procurement story stays the same (Bedrock is still on the AWS bill). The IAM story stays the same (IRSA still authorizes the model calls). What changes is that the agent now has a real platform around it instead of a Python loop calling `bedrock-runtime` directly.

## Picking

- Use **Bedrock alone** for direct LLM calls from an application with no MCP, no tools, and no agent loop. Bedrock plus Guardrails is the right answer; adding an agent platform would be overkill.
- Use **Archestra alone** off AWS or when a single platform should broker tools, MCP, and models with one identity story and one audit trail. The Archestra LLM proxy covers most providers directly.
- Use **both** on AWS with agents in play. Keep Bedrock for managed model access, IAM, regions, and billing. Put Archestra in front for the agent and MCP layer, point Archestra's model router at Bedrock as the upstream, and let each layer do its job. This is the standard AWS-native AWS Bedrock Archestra path.

Bedrock is a model account. Archestra is an agent platform. Different problems, different layers, and on AWS they stack cleanly. Pick the layer that matches the actual problem, and stack them when the problem spans both, which on AWS-native agent deployments it typically does.
