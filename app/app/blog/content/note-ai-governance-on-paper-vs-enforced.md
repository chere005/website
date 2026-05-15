---
title: 'Most AI governance is a doc'
description: 'AI governance enforcement lives at the tool-call, credential, and audit layers — not in the PDF. Where policy must run to actually control an agent.'
isNote: true
author: 'Mack Chi'
---

# AI governance enforcement is where the policy actually runs

Most AI governance is a PDF. Almost every enterprise has one. Almost none of them have AI governance enforcement at the layer where the agent actually does work. The gap between "we have a policy" and "the policy fires when the agent picks up a tool" is where the real risk sits, and it is wider than most security reviews admit. A governance doc that does not execute is a metrics page that thinks it is a control.

This note takes that gap seriously: where governance has to live to be real, which controls translate from doc to runtime, and the pattern for making each policy clause executable.

## The doc-versus-reality gap

Two concrete shapes show up over and over. First: a policy says "agents must not access PII without an approved use case," and the actual runtime check is that nobody put a Salesforce token into the agent's environment yet. The moment that token lands — for a legitimate reason — the entire policy collapses into "we trust the prompt." Second: a policy says "all agent actions must be auditable," and the audit log is a JSON dump of model calls with no record of which tool fired, which identity stood behind the request, or which credential resolved.

Neither failure is malice. Both are the predictable result of writing governance at the policy layer and shipping agents at the application layer with nothing in between.

## The three places governance must live

AI governance enforcement that survives contact with a running agent has to be implemented in three specific places. Not in the prompt. Not in the model.

### The tool-call gate

The tool-call layer is the only place where "what the agent is about to do" is fully resolved — the tool, the arguments, the identity behind the request, the resource it touches. A policy clause like "no production writes without human approval" only becomes a control when the gate inspects every tool call, classifies it, and blocks or escalates before the call leaves the gateway. Allowlists, not blocklists, are the correct shape here — see [/blog/why-allowlists-beat-blocklists-for-agents](/blog/why-allowlists-beat-blocklists-for-agents) for why. The default has to be deny.

### The credential layer

A policy that says "the agent operates with least privilege" means nothing if the agent runs with a shared service token that has admin scope on three systems. Enforcement at the credential layer means tokens are minted per request, scoped to the identity behind the call, and revocable independently. The agent should never hold a credential broader than the action it is currently authorized to perform.

### The audit layer

The audit log is what survives a dispute. The minimum shape: who initiated the request, which agent ran, which tools were considered, which were called, which credentials resolved, what each tool returned, and what the agent did next. A log that records `200 OK, 1,847 tokens` is not an audit log. It is a billing record. The architectural detail on each of these three layers lives in [/docs/platform-security-concepts](/docs/platform-security-concepts).

## Making the policy executable

The pattern that closes the gap: take each policy clause and ask which of the three layers can fire it. "No external email without review" is a tool-gate rule. "Engineers cannot read finance data" is a credential rule. "Every customer-data access must be traceable" is an audit rule. Clauses that map to none of the three are aspirational, not operational, and should be rewritten until they do. AI governance enforcement is the discipline of refusing to ship a policy that does not have a runtime owner.
