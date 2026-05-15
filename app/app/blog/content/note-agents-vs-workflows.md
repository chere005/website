---
title: 'Most "agents" are workflows with a trigger'
description: 'Agents vs workflows: most "agents" are workflows with an LLM call and a trigger. The honest definition, the 90% case, and when the loop wins.'
isNote: true
author: 'Mack Chi'
---

## Agents vs workflows: the line that actually matters

The agents vs workflows debate keeps surfacing because the vendor pitch deck and the production codebase rarely agree. Direct answer: roughly 90% of systems sold as "agents" are workflows with an LLM call wedged in the middle, and a trigger on the front. A true agent — one that plans, calls a tool, observes the result, and re-plans — is a much rarer animal, and usually overkill for the task at hand. The agents vs workflows distinction is not about branding; it is about whether the control flow is decided up front or decided at runtime by a model that may be wrong.

The cleaner definition: a **workflow** is a deterministic graph where the steps are known in advance, and any LLM call inside it is a function call with a fixed input and a fixed-shape output. An **agent** is an adaptive loop where the next step is chosen by a model based on what just happened, and the loop terminates when the model decides it is done. Everything else — "AI-powered," "intelligent," "autonomous-ish" — is marketing on top of one of those two shapes.

> If you can write down the plan in advance, it's a workflow. An agent is what you ship when you _can't_.

## The 90% case: workflow with one LLM call wins

Most production "agents" look like this: a webhook fires (see [agent triggers explained](/blog/agent-triggers-explained) for the trigger taxonomy), a small DAG runs, somewhere in the middle an LLM extracts a field or drafts a paragraph or classifies an intent, and the rest of the steps are plain code calling plain APIs. For this system the answer resolves trivially: it is a workflow. The LLM is a smart `map()` over one step.

This is not a criticism. Workflows are easier to reason about, cheaper to run, easier to retry, and easier to audit. The state machine is explicit. The cost is bounded. The failure modes are the failure modes of normal software, not the failure modes of an unbounded reasoning loop that just decided to call `delete_repo` for the fourth time. When the task can be described as a sequence of steps a junior engineer could write down, an agent is the wrong tool.

## When the loop is actually worth it

The four cases where the agents vs workflows answer flips toward the loop:

1. **Open-ended research.** The number of steps is not known in advance. Each result changes which question to ask next. A loop is the natural shape; a workflow would be a switch statement with no fixed number of cases.
2. **Multi-system recovery.** The agent has to recover from partial failures across systems where the recovery path depends on what failed and how. The decision tree is too sparse to encode.
3. **Negotiated execution.** Tool selection itself is the hard part — the user said "ship the release," and the right next call depends on the state of CI, the branch, the changelog, and what the human approves at each step.
4. **Tool surface too large to enumerate.** Hundreds of MCP tools across a [managed MCP gateway](/docs/platform-mcp-gateway), and the right ones are picked at runtime per identity. The split tips toward the agent because the graph cannot be drawn in advance.

Outside those four, a workflow with one well-defined LLM call and a clean trigger is the cheaper, more reliable shape. Ship the workflow. Reach for the loop when the workflow runs out of branches.
