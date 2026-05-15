---
title: 'Why multi-agent demos die in production'
description: 'Multi-agent production failures cluster around four predictable patterns. Two architectures actually ship: branching agents and a strict planner/worker boundary.'
isNote: true
author: 'Mack Chi'
---

## Why multi-agent demos die in production

Multi-agent production failures cluster around the same four shapes, regardless of framework. A twelve-agent swarm that solved the demo task at 9 a.m. is leaking context, looping, or eating budget by week two. The honest answer to "why" is that the demo measured one happy path and production measures the long tail. Two architectures consistently survive contact with that tail — branching agents and a strict planner/worker boundary — and almost everything else is a variation on those two.

The pull-quote version: multi-agent looks like JARVIS in a demo. In production it's a five-way phone call where everyone forgets what the call was about.

### The four production failure modes

**Telephone-game context loss.** Each hand-off between agents compresses context. By the third agent in a chain, the original user intent has been summarized, re-summarized, and quietly mutated. The last agent in the chain is solving a problem the first agent would not recognize. This is the dominant multi-agent production failure in week-two telemetry.

**Planner-executor recursion.** A planner agent decomposes a task into sub-tasks, an executor agent decides the sub-task is too vague and asks the planner to re-plan, the planner re-decomposes, and the loop runs until the budget cap fires. No single agent did anything wrong. The boundary between "plan" and "execute" was never made one-way.

**Error-recovery dead zones.** Agent A calls Agent B. Agent B fails. Agent A has no contract for what "B failed" means — is the task done, retryable, fatal, partial? The agent guesses. Half the time it retries the failure into a worse failure; the other half it reports success on a task that did not complete.

**Cost spiral.** Multi-agent topologies are token amplifiers on top of token amplifiers. One user request becomes fifty inter-agent messages, each carrying the accumulated context of the conversation so far. The bill is not "N agents times average cost" — it is closer to N-squared.

### Two patterns that actually ship

**Branching agents.** Instead of N agents passing context down a chain, the orchestrator forks the context per sub-task. Each branch gets a clean, scoped prompt with only the information that sub-task needs. The branches do not talk to each other; they return structured results to the orchestrator, which composes the final answer. The telephone game cannot start because no chain exists. This is the pattern that survives the longest tail.

**Strict planner/worker boundary.** Exactly one planner. The planner emits a complete plan before any worker runs. Workers are stateless tool-callers that execute one step and return. The planner is the only component allowed to decide what happens next. Recursion is impossible because workers do not have the authority to ask for a re-plan; they return a result and the planner decides whether to continue, branch, or stop.

Both patterns share the same insight: most multi-agent production failures come from agents having opinions about control flow. Take that authority away from everything except one designated planner — or remove the chain entirely — and the failure modes stop firing.

### The observability floor

None of the above is observable from a model-call log alone. The minimum stack for catching these failures lives at the agent decision layer, not the token layer. The [agent observability minimum](/blog/agent-observability-minimum) covers what to capture: per-agent decision traces, hand-off payloads, and budget-by-branch counters. For the security surface that opens up the moment agents start passing tool output to other agents, [the dual-LLM pattern](/blog/dual-llm) is the relevant defense.

Multi-agent is not a bad idea. It is an architecture that demands a discipline most demos skip, and the discipline is mostly about denying agents the authority to improvise the topology at runtime.
