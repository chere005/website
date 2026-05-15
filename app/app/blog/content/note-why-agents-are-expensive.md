---
title: 'Why agentic AI costs what it costs'
description: 'AI agent cost broken down: token amplification math, why $100/mo seats barely cover knowledge-worker hours, and the three levers that move the bill.'
isNote: true
author: 'Mack Chi'
---

# The real AI agent cost is hidden behind the token amplifier

AI agent cost is not the per-token sticker price. AI agent cost is what happens when a single user instruction fans out into fifty to two hundred model calls before the user sees anything come back. That multiplier — not the model — is what makes the bill look the way it does. Anyone benchmarking an agent against a chat product is comparing the wrong unit of work, and arriving at the wrong conclusion about AI agent cost.

> Agentic workflows are token amplifiers. One "do this" turns into 50–200 model calls before the user sees an answer.

That fan-out is the story in one sentence.

## The token-amplifier math

Take a representative agent loop. Average tokens per step lands somewhere around 3,000–8,000 once a non-trivial system prompt, a tool schema, and a few turns of conversation are in the context window. Steps per task — a real task, not a demo — sit in the 10–40 range as the agent plans, calls tools, reads results, re-plans, and finally produces output. Tasks per user-hour in active use trend toward 4–8 for a knowledge worker who is actually leaning on the thing.

Multiply through and the per-user-hour token budget is in the hundreds of thousands, easily into the low millions for heavier flows. At frontier-model rates that is several dollars an hour, every hour the seat is in active use. A team of fifty in steady use is moving real money.

## Why $100/mo seats barely break even

The pricing that the market has settled on — roughly $100 per seat per month for agent products — is not calibrated against consumer subscriptions. It is calibrated against the cost of an hour of a knowledge worker. The unit being sold is "we save you enough hours to justify the seat." That math works only if the per-active-hour spend stays well under what an hour of the human's time costs the employer.

That margin is thin. A heavy user can burn through the seat's API allowance in a week. This is why every agent vendor is quietly obsessed with efficiency: it is the difference between a viable product and a subsidy. Better models do not fix this — they often make it worse, because a stronger model invites longer chains.

## Three levers that actually move the bill

Three things change the slope of the AI agent cost curve.

**Tool-call collapsing.** Most agent loops call the same endpoint repeatedly with slightly different arguments. Caching, batching, and merging tool calls at the gateway layer cuts steps without losing capability. A turn that used to take eight model invocations and six tool calls compresses to three of each.

**Context engineering.** The biggest line item is the context window getting re-shipped to the model on every step. Summarizing prior steps, scoping the next prompt to what the next decision actually needs, and pruning irrelevant tool output cuts per-step tokens by a multiple, not a percentage.

**Model tiering.** Not every step needs the frontier model. Routing planning to a strong model, routine tool selection to a mid-tier one, and parsing to a cheap one is a standard pattern that nobody adopts until the bill forces the conversation.

Efficient agents are the moat, not better models. The teams that figure out the levers above before they need to are the ones whose unit economics survive contact with real users. For a concrete starting point on capping spend, see [agent cost controls](/blog/agent-cost-controls).
