---
title: 'Why agents feel solid at first, then quietly get worse'
description: 'AI agent drift is almost never the model. It is prompt sensitivity and self-reinforced memory of earlier mistakes. Two fixes that actually work.'
isNote: true
author: 'Mack Chi'
---

## Why AI agent drift sneaks up on production

AI agent drift is almost never the model. The weights did not change overnight. What changed is the shape of the inputs, and the agent's own running memory of what it did last time. An agent that scored 92% on the launch eval and 71% three weeks later is rarely suffering from a model regression — it is suffering from inputs that have crept outside the distribution the prompts were tuned against, and a context window that keeps replaying its own earlier mistakes back into the next decision. AI agent drift is what that combination feels like from the outside: a system that was solid at launch and is now quietly worse.

The drift pattern is consistent. Week one, everything works. Week three, one class of input — a slightly different invoice format, a customer who phrases the request with extra context, a tool result that returns an empty array instead of a null — starts producing wrong outputs. Week six, those wrong outputs are in the agent's own history, and the agent is now using them as examples of how to behave. The eval set still passes. Real traffic does not.

## It is the inputs, not the model

> Agent drift is almost never the model. It is your inputs getting weirder than your test cases ever covered.

Prompt sensitivity is the first half. Prompts are tuned against a test set that captures what the team imagined real traffic looked like at launch. Real traffic always gets messier — new edge cases, new phrasings, new upstream systems that send slightly different payloads. The prompt that handled the launch distribution cleanly starts producing softer outputs on the long tail, and the long tail is now most of the traffic.

Weighted memory of earlier mistakes is the second half. Agents that carry context across steps — or worse, across sessions — end up treating their own past output as evidence. One overcorrection in step three becomes the implicit example for step four. By step ten the agent is anchored on a path it would not have chosen from a clean start. This is not a model bug. It is what happens when a stateful system has no forgetting mechanism.

## Fix one: a forgetting mechanism

The cheapest fix is the one most teams skip: do not put the entire run history back into the next prompt. A rolling window of the last N relevant log entries, scoped to the current task, beats a full transcript almost every time. The window has to be intentional — not "last 4,000 tokens" but "the tool results and decisions that bear on the current step." Everything else gets summarized or dropped.

This is unglamorous infra work. It also tends to recover most of the launch-week behavior on its own, because it stops the agent from training itself on its own bad days.

## Fix two: scheduled offline eval against frozen inputs

The second fix is a periodic offline eval against a frozen test set, run on a schedule the agent does not see. The point is not to replace the live monitoring — see the [minimum agent observability stack](/blog/agent-observability-minimum) for that side — but to detect when the production agent has drifted away from a baseline that has not changed. Frozen inputs, frozen expected outputs, a pass/fail diff every night. When the score drops, the cause is almost always one of the two above, and now there is a signal to act on instead of a vague sense that "it used to be better."

Drift is not a model problem. It is an inputs problem and a memory problem, and both have boring, durable fixes.
