---
title: 'Capacity is now the dominant agent failure mode'
description: 'LLM rate limit production data shows ~60% of agent call errors are capacity-class. Three design choices that absorb the failure.'
isNote: true
author: 'Mack Chi'
---

# Why LLM rate limit production failures now dominate agent incidents

Hallucinations get the discourse. The LLM rate limit production data tells a different story: industry telemetry from major observability vendors puts capacity-class errors — 429s, throttles, region-level provider exhaustion — at roughly 60% of all LLM call failures in agent workloads. That is the headline number. Hallucinations are the long-tail correctness problem. Rate limits are the structural availability problem, and they are what wakes oncall.

The shift is recent enough that most agent stacks are still designed as if the model call is the reliable part. It is not. Once an agent fans a single user request out into 50–200 model calls, the per-call probability of an LLM rate limit failure compounds, and the LLM rate limit becomes the dominant production failure mode rather than a transient nuisance.

## What the LLM rate limit numbers actually say

The ~60% figure shows up consistently across observability vendor reports covering agent traffic in production. It maps to three patterns: per-key TPM/RPM limits at the provider, model-specific quotas during peak hours, and region- or account-level throttles that drop in mid-incident with no warning. Token-heavy agent turns hit all three at once.

The framing matters. A 1% per-call error rate inside a chat product is a minor annoyance. The same 1% inside an agent that emits 100 sequential model calls per task is a ~63% task failure rate. Capacity errors do not have to be common to dominate the incident graph; they only have to be common enough.

## Why this is structural, not transient

Three forces keep this from getting better on its own.

Provider supply is rationed. Frontier-model capacity is a constrained resource sold in tiers, and the rate limit is the rationing mechanism. Buying a higher tier helps until the next product hits the same tier.

Agent demand is bursty and amplified. One human action triggers a fan-out of tool-use loops, planner-executor recursions, and retries. The traffic shape is nothing like the chat traffic the limits were originally sized for.

Failure recovery itself spends quota. The naive retry doubles the load exactly when the provider is shedding it. Most "outages" in agent stacks are self-inflicted retry storms wearing a 429 costume.

> Hallucinations get the headlines. Rate limits are what actually wake your oncall.

## Three design choices that absorb LLM rate limit failures

**A router with provider failover.** The single most load-bearing change. Route the agent's model calls through a layer that holds keys for two or more providers — and ideally two or more accounts per provider — and fails over on 429 or 5xx within the same turn. This is the difference between a router and a passive proxy; see [model router vs LLM proxy](/blog/model-router-vs-llm-proxy) for the boundary. The router collapses the LLM rate limit from a hard failure into a latency bump.

**Request batching and call collapsing.** Most agent turns emit multiple cheap model calls that could be one. Batching tool-result summarization, collapsing redundant planner calls, and reusing cached classifications cut the raw call count — which cuts the rate-limit exposure linearly. The cheapest LLM rate limit fix is to not make the call.

**Exponential backoff with circuit breakers.** Retries are necessary; retry storms are not. Per-provider circuit breakers that open after a threshold of 429s, jittered exponential backoff, and a budget on retries-per-turn prevent the agent from converting a provider's soft-throttle into a self-inflicted outage. The circuit breaker is the piece most teams skip and then rediscover the week after their first capacity incident.

None of these are exotic. All three exist in mature web stacks for the same reason: capacity failures are the failure mode of any system that depends on a rationed upstream. Agents inherit that property by default.

The work, in short, is to stop treating the LLM rate limit as a transient and start treating it as the steady-state condition the architecture has to absorb.
