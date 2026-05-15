---
title: 'When MCP makes sense the second time around'
description: 'MCP after a year: why teams that dismissed the protocol on the first integration come back to it on the third, and what changes when they do.'
isNote: true
author: 'Mack Chi'
---

# MCP after a year: when the protocol earns its keep

MCP after a year tends to look different than MCP on day one. The first integration almost always loses to a direct API call — fewer moving parts, no extra server to host, no schema to maintain. The reassessment shows up around the third or fourth integration, when the per-service hand-coding cost stops being amortized against one win and starts compounding against every new agent surface. This note is about that inflection — the MCP after a year reread that turns up in retros across agent-building teams.

## The skepticism most engineers start with

The first encounter with MCP usually reads as overhead. A team wires a single service into an agent — GitHub, Slack, an internal CRM — and the direct SDK call works. Auth fits in an env var. The tool definition is one function. Spinning up an MCP server alongside that, with its own process, transport, and schema, looks like protocol theater for a problem that didn't need it.

That read is correct for the first integration. It stays correct for the second. The skeptics' steel-manned position — that MCP solves a discovery problem most apps don't have — holds for as long as the team controls both ends of the wire. See [the case for MCP](/blog/the-case-for-mcp) for the longer version of that argument.

## Where direct integration starts to hurt

The pattern breaks around integration three or four. Each new service ships its own auth dance, its own pagination quirks, its own retry semantics. Each one needs a hand-written tool definition the model can use without hallucinating parameters. Each one is a place where a schema change upstream silently degrades agent behavior until somebody notices the regression in production.

The cost wasn't visible at integration one because there was nothing to amortize against. By integration four, the team is maintaining four bespoke adapters, four sets of tool descriptions, and four mental models of "what this agent can actually do right now." A second agent that needs the same services starts the whole loop over — there is no shared surface to reuse, just code that happens to call the same APIs. The boundary between [function calling and a tool protocol](/blog/mcp-vs-function-calling) becomes load-bearing exactly here.

## What rebuilding with MCP actually changes

The rebuild is rarely dramatic. The adapters become servers. The tool descriptions move from scattered prompt strings into MCP schemas. The auth dances move behind a uniform OAuth/OBO story. What changes is the slope of the next integration: adding a fifth service stops being "wire up another bespoke adapter" and becomes "point the agent at an existing server."

The other shift is cross-service composition. An agent that can self-navigate GitHub to DNS to hosting without each hop being hand-coded is a different product than one with four siloed integrations. The protocol carries the discovery: the agent sees the tool surface at runtime, not at the application author's compile time. That is the inflection the pull-quote captures — direct API integration scales linearly with the number of services, while MCP scales with the number of agents that can use the same service.

## The residual concern worth keeping

The honest tradeoff: MCP shifts cognitive load from the app author to the end user. The user now decides which servers the agent has access to. That is the right default for power users and a real onboarding cost for everyone else. Teams shipping consumer-facing agents pay that tax explicitly; teams shipping internal tooling absorb it through allowlists and curated server sets.

That residual cost is real and not the reason most teams reverse course. They reverse course because the second-, third-, and fourth-integration math stopped working in favor of the hand-rolled path.
