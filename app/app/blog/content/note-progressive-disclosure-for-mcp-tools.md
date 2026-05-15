---
title: 'Progressive disclosure MCP: modeled vs measured savings'
description: 'Progressive disclosure MCP collapses token budgets on paper (~77%). Production benches measure ~13%. The gap is the lesson.'
isNote: true
author: 'Mack Chi'
---

# Progressive disclosure MCP: where the savings actually land

Progressive disclosure MCP is a router-tool pattern that defers loading full tool schemas until an agent expresses intent. Modeled savings look enormous — around 77% on a clean manifest swap. Production benches replayed against real transcripts land closer to 13%. The gap is the entire point: schema prefix is not where token budget goes once a conversation gets going. Conversation is where the budget goes.

The Skills crowd popularized progressive disclosure for instruction packs. Applying it to MCP tools is the obvious next step. It helps. It does not help anywhere near as much as the paper math claims.

## The router-tool pattern

One router tool sits in the manifest. The agent calls it with a verb-shaped intent — "post to Slack," "open a ticket," "query the warehouse" — and the router returns the small handful of real tools and their schemas. Only then does the agent invoke the real call. The bet: the system prompt shrinks because bulky schemas are no longer paid for on every turn.

This is the same argument as [how many MCP tools is too many](/blog/how-many-mcp-tools-too-many), from a different angle. That note argued for cutting the pile. Progressive disclosure MCP is about loading what remains lazily.

## Modeled vs measured

The 77% figure comes from a clean model: a manifest of 70 tools at ~400 schema tokens each, swapped for a 600-token router and a per-call payload of ~1,200 tokens. On paper most of the manifest disappears. The arithmetic is honest. The flaw is everything else in the context.

Replay the same swap against real agent transcripts and the savings collapse to roughly 13%. Schema prefix is not where the budget goes in production. Conversation is. Tool results, intermediate reasoning, retrieved documents, and user messages dwarf the manifest after the third turn. Shrinking a 12,000-token prefix to 3,000 looks great until the average session ends at 80,000 tokens, almost none of it schema.

Modeled savings are seductive. Bench numbers are the truth. The conversation, not the schema, is where the token budget actually goes.

### The router-hop tax

A second effect is harder to quantify: a router adds a hop. Every "post to Slack" now costs one extra round trip and one extra model decision. On simple tasks that is fine. On a 20-step agent run, that overhead eats the savings.

## When progressive disclosure MCP pays off

Three cases, in order of confidence.

### Big static manifests, short conversations

Yes. A one-shot agent that opens, calls one tool, and closes. The prefix dominates. Progressive disclosure MCP pays back cleanly.

### Multi-tenant catalogs

Yes, but for a different reason. When each tenant sees a different subset, the router doubles as the authorization point. Filtering was already on the roadmap.

### Long-running agents with deep transcripts

Probably not worth the complexity. The schema is a rounding error against the conversation. Spend the engineering elsewhere — better tool descriptions, search-and-run for the long tail, role-scoped agents.

Use progressive disclosure MCP where models predict it will help. Measure where it actually does. Those are not the same place, and pretending they are is how a clever architecture ships that saves nothing.
