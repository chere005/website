---
title: 'Mastra Archestra: which layer does what'
description: 'Mastra Archestra explained: Mastra is a TypeScript agent framework, Archestra is the runtime, gateway, identity, and audit layer. Comparison table and decision guide.'
isNote: true
author: 'Mack Chi'
---

## Mastra Archestra: which layer does what

Mastra Archestra is not a versus question. Mastra is a TypeScript framework for writing agents. Archestra is the runtime, gateway, and identity layer underneath them. The Mastra Archestra stack composes cleanly: Mastra owns the agent code, Archestra owns the operational surface around it. This note explains which question to ask which one, with a comparison table, a stacking diagram, and a decision section for picking one, the other, or both.

A typical enterprise security review against a Mastra agent in production returns a familiar list: SSO-bound tool access, an audit trail of every MCP call with the user identity attached, prompt-injection defense beyond polite prompting, and provider-key rotation without redeploying every agent. None of those items require ripping out Mastra. They require a runtime under it — which is exactly the Mastra Archestra split.

Mastra and Archestra do not compete. They sit at different levels of the stack. Mastra is where the agent loop is written — the tools, the workflows, the memory, the TypeScript code that decides what the agent does. Archestra is what sits under that code at runtime — the LLM proxy, the MCP gateway, the identity-aware tool router, the sandbox, the audit log. Mastra can run on its own. Archestra can run on its own with a different framework. The interesting case, and the one most enterprise teams land on, is running both.

Framing the choice as "Mastra vs Archestra" is a category mistake. Mastra makes the agent loop pleasant to write. Archestra makes the agent loop safe to deploy. The either/or reading is what happens when two homepages pattern-match on the word "agent." The two compose cleanly, and most production stacks that take agents seriously end up running both.

## Mastra vs Archestra comparison table

| Axis               | Mastra                                                        | Archestra                                                                                |
| ------------------ | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Layer it lives at  | Agent code framework                                          | Runtime: LLM proxy, MCP gateway, identity, audit                                         |
| What it terminates | Agent code and workflows                                      | Agent turns, tool calls, model calls                                                     |
| Language target    | TypeScript                                                    | Language-agnostic — agents talk to it over HTTP / OpenAI-compatible API                  |
| Auth it handles    | Whatever is written in code                                   | Provider keys, virtual keys, OAuth 2.1, user OAuth, enterprise JWKS, MCP OAuth and OBO   |
| Guardrails         | Whatever is written in code                                   | Prompt-injection defense (dual-LLM), tool allowlist, dynamic tool engine, MCP sandboxing |
| Observability      | App-level logs, external tracing                              | Identity-bound audit trail, decision-level trace, Prometheus + OpenTelemetry             |
| MCP support        | Client-side: connect to MCP servers from agent code           | Server-side: MCP gateway with per-identity routing and sandbox                           |
| Deployment story   | Node service on self-managed infra or Mastra Cloud            | Self-hosted platform (Docker), MIT-licensed                                              |
| When one is enough | Small team, no enterprise IdP, no tool-side audit requirement | Existing agents in another framework, or no agent code yet — Archestra fronts everything |
| License            | Elastic License 2.0                                           | MIT                                                                                      |

## What Mastra is great at

Mastra solved a real problem. Hand-rolled tool-use loops — a switch statement on `tool_calls`, a retry on a 429, a memory layer written in an afternoon and regretted by the next sprint — are repetitive code. Mastra abstracts the agent loop into a TypeScript API that is genuinely nice to write against. Define an agent, define its tools, define a workflow, hit run. The DX is good. The types are tight. The docs are real.

The framework is opinionated about the things that should be opinionated: agents have memory, workflows have steps, tools have input schemas, evaluations have a runner. For TypeScript teams that prefer not to assemble the agent loop out of three half-maintained npm packages, Mastra is the right place to start. The [Secure Agent with Mastra.ai](/docs/platform-mastra-example) example uses Mastra for exactly this reason — the agent is not rewritten, Archestra is placed underneath it.

## Where Mastra stops

Mastra is a framework, not a runtime. That is the line.

A framework provides the code shape to build the thing. A runtime provides the operational surface around the thing once it is running. Mastra owns the agent loop inside a TypeScript service. It does not own anything outside that service — and a few concrete things are not its job.

Mastra does not validate the identity of the human behind the call against the tools the agent is allowed to use. It can call any tool wired up in code, because that is what frameworks do. There is no built-in concept of "this signed-in Okta user can read Jira but cannot post to Slack" — identity is an organizational concern, not a framework concern.

Mastra does not sandbox the MCP servers it talks to. If a tool the agent calls is implemented by an MCP server that runs `npx some-package`, Mastra trusts the process. That is acceptable on a developer machine. It is not acceptable in a production deployment where the MCP server pulls untrusted code on startup.

Mastra does not ship with a prompt-injection defense for tool output. When a tool returns text — a GitHub issue body, a Notion page, a Slack message — that text goes back into the agent's context as-is. If the text contains a hidden instruction, the agent sees it. That class of failure is covered in [the dual-LLM post](/blog/dual-llm), and it is the failure mode in [the Mastra example](/docs/platform-mastra-example) before Archestra is added.

Mastra does not provide a unified audit trail across multiple agents and multiple providers. The logs live in each Mastra service. The compliance question "what did this user's agents do today, against which tools, on which model" lives above the framework layer.

None of this is a knock on Mastra. These are runtime concerns, and a TypeScript framework is the wrong place to solve them. The mistake is assuming that because Mastra ships an "agent," it covers the surface end-to-end. It covers the code surface. The runtime surface is a different problem.

## Where Archestra picks up

Archestra is the runtime under the agent code. That changes what is possible in the Mastra Archestra stack.

The LLM proxy gives the agent one OpenAI-compatible endpoint and resolves it to whichever provider is configured — OpenAI, Anthropic, Bedrock, Vertex, Azure, Gemini, Groq, Mistral, OpenRouter, vLLM, Ollama. Provider keys live in the platform, not in the agent's env vars. Rotation is a config change, not a redeploy. For Mastra specifically, this is one environment variable: `OPENAI_PROXY_URL` pointed at Archestra, and the agent keeps using the OpenAI SDK it already imports.

The MCP gateway sits on the tool side. Instead of each agent connecting to each MCP server directly, agents connect to Archestra and Archestra brokers the calls — with sandboxing, with per-identity routing, and with OAuth/OBO so the tool call inherits the user's permissions on the downstream system instead of running as a service account that can read everything.

The Dual LLM sub-agent quarantines untrusted tool output before it reaches the main model, so a malicious GitHub issue cannot rewrite the agent's instructions. The Dynamic Tool Engine hides sensitive tools when the request originates from an untrusted source. The audit trail records the agent decision, the tools touched, the identity behind the call, and the resolved provider key — not "200 OK, 1,847 tokens."

The [Mastra example](/docs/platform-mastra-example) walks the whole sequence: a Mastra agent vulnerable to a GitHub prompt-injection attack, the same agent with Archestra in front, the attack blocked, the blocked call visible in the platform logs. The Mastra code does not change. Only the proxy URL does.

## How Mastra Archestra stack together

The typical topology, when both are present, looks like this:

```
Mastra agent  -->  Archestra (LLM proxy + MCP gateway + guardrails + audit)  -->  OpenAI / Anthropic / Bedrock / ...
                                |
                                +-->  MCP servers (sandboxed, identity-routed)
```

Mastra owns the agent code. Archestra owns the runtime under it. The agent's OpenAI client points at Archestra. The agent's MCP clients point at Archestra. Everything that crosses the process boundary goes through one identity-aware, audited, sandboxed gateway. TypeScript code stays the same. The operational surface gets the things it was missing.

## Picking between Mastra, Archestra, or both

- Use **Mastra alone** for small teams prototyping, with trusted tools, no enterprise IdP requirement, and a security review that ends at "is the OpenAI key in a secret manager?" Mastra is the right answer and adding Archestra is overkill at that scale.
- Use **Archestra alone** when no agent code is written yet, or the agents are in Python, or a different framework is already in place. Archestra is language-agnostic — agents talk to it over an OpenAI-compatible API and an MCP gateway, regardless of how the agent itself is written. For weighing this against another stack, [the LiteLLM comparison](/blog/litellm-with-archestra) covers the LLM-proxy side of the same question.
- Use **both** when shipping with Mastra and the security review came back with the list above. Keep the Mastra code. Put Archestra under it. Point the agent's OpenAI client and MCP clients at the platform. The result: identity-aware tool routing, prompt-injection defense, sandboxing, and a real audit trail without touching the agent logic. The [Mastra example](/docs/platform-mastra-example) is the literal runbook for that path.

One framework, one runtime, two different jobs. Mastra makes the agent loop pleasant to write. Archestra makes it safe to deploy. The Mastra Archestra pairing covers both layers — and most production agent stacks need both.
