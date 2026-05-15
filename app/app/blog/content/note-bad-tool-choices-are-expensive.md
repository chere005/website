---
title: 'When the LLM is not the expensive part'
description: 'AI agent infrastructure cost analyses fixate on tokens and miss the third-party SaaS vendors quietly destroying margin behind every tool call.'
isNote: true
author: 'Mack Chi'
---

# When the LLM is not the expensive part: the AI agent infrastructure cost nobody charts

The dominant AI agent infrastructure cost is rarely the model. The model bill is the visible one — dashboards, per-token meters, alerts when a loop runs hot — so it is the one every team watches. The quieter line item is the managed SaaS the agent calls a hundred times a day on the user's behalf. Voice infrastructure, web search APIs, scraping services, hosted vector stores: each looks affordable on the pricing page and compounds into the largest variable in the AI agent infrastructure cost stack once a workflow goes from "demo" to "every customer, all day."

The pattern: token spend stays flat after the first round of context engineering, then margin keeps eroding anyway. The cause is downstream. A single agent turn that emits one model response can fan out to a search call, two scraping calls, a transcription pass, and three vector lookups. Each vendor priced its API for occasional human use. None of them priced it for an agent that calls in a tight loop, hits cache-miss rates a human would never produce, and never stops between business hours.

> The LLM bill is the part everyone watches. The vendor your agent calls a hundred times a day is the part that quietly destroys the margin.

## The managed-service trap

The trap is structural. A startup ships an agent that needs web search, picks a hosted search API at $5 per thousand queries, and the unit economics look fine at ten queries per task. Six months later the agent is doing thirty queries per task, has 4,000 active users, and the search line item dwarfs the model line item. The model vendor is competing on price every quarter. The search vendor is not. AI agent infrastructure cost analyses that stop at OpenAI invoices miss the second curve entirely.

## Four categories where the markup compounds

**Voice infrastructure.** Hosted speech-to-text and text-to-speech are priced per minute. Agents that listen continuously or speak in long-form responses burn minutes the pricing page did not model. Self-hosting Whisper or a lighter STT for the bulk path and reserving the premium vendor for hard segments cuts the line by an order of magnitude.

**Web search APIs.** Most hosted search vendors charge per query and rate-limit aggressively. Agents that retry, refine, and decompose a single user question into a dozen queries are the worst-case workload. A scoped local index for known sources plus a cache in front of the hosted vendor absorbs most of it.

**Scraping and browser automation.** Managed scraping services charge per page, per proxy rotation, or per successful render. Agents iterate. They retry, they paginate, they verify. A small self-hosted Playwright fleet against the residential-proxy fallback shifts the cost curve immediately.

**Hosted knowledge bases and vector stores.** Per-query and per-vector pricing scale with agent reasoning, not with user count. The same document gets re-queried fifty times in a session. A context layer that caches normalized retrieval results does more for margin than swapping the embedding model.

## Questions to ask before signing a vendor

- What does this look like at 100x the current call volume, with no human in the loop slowing it down?
- Is the pricing curve linear, or does a per-call markup sit on top of a thin underlying service?
- How does the vendor behave under retry storms — is the failure mode "deny" or "charge for every attempt"?
- Is there a self-hosted version of the same capability that covers 80% of calls, leaving the vendor for the hard 20%?
- Does the contract assume human-scale usage in its rate limits and overage terms?

Efficient agents are the moat, not better models — and the efficiency conversation has to extend past the token meter. For the math on why token amplification matters in the first place, see [why agents are expensive](/blog/why-agents-are-expensive). Margin lives or dies one tool call at a time.
