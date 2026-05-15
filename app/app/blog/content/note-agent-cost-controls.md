---
title: 'How to put a budget on an agent'
description: 'Agent cost controls require three layered budget caps — per-run, per-day-per-user, per-team-per-month — to prevent runaway LLM spend.'
isNote: true
author: 'Mack Chi'
---

# How to put a budget on an agent

Agent cost controls require three layered budget caps, not one. A single budget cap on an AI agent is a false sense of security — it only protects against one failure mode. Effective agent cost controls layer three caps at different scales: **per-run**, **per-day-per-user**, and **per-team-per-month**, each sized for a different kind of failure.

Consider a realistic failure scenario: an agent burns $400 in eight minutes, stuck in a tool-call loop — call a tool, get a bad result, call it again with a slightly different argument, repeat. Claude Opus is the model. Opus is not cheap. A per-run cap catches it at $400 instead of $4,000. Without it, the bill keeps climbing until something else breaks.

An agent cannot be trusted to stop on its own. And a single budget cap cannot be trusted either. Three caps, at three different scales, are the baseline for responsible agent budgeting.

## The intuition behind layered agent budgets

The analogy is a debit card given to a child. Three controls apply. A small per-purchase limit prevents an accidental $900 Lego set. A daily limit prevents draining the account on candy in one afternoon. A monthly family limit ensures rent still gets paid even when everyone goes a little wild.

Agents work the same way. **Per-run**, **per-day-per-user**, **per-team-per-month**. Three caps. Each one stops a different kind of bad day.

## The three agent cost caps and what each one catches

### Per-run cap

The per-run cap is the one that catches runaway tool loops. A single agent invocation has a hard ceiling on token cost. If the agent hits it mid-task, the run stops. That means the agent might be halfway through writing a report, halfway through a refactor, halfway through a multi-step research task.

The graceful failure mode: return a clear error, keep the partial output, let the user retry or escalate. Cutting mid-stream and dropping everything is the worst possible outcome. The agent should come back and say "the budget was spent, here's what was produced, continue?"

**Sizing rule of thumb:** roughly 3-5x the cost of a typical successful run. If a normal task costs $0.40 in tokens, set the per-run cap at $1.50-$2.00. Anything more is probably a loop. Anything less and legitimate long-context work gets cut off.

### Per-day-per-user cap

The per-day-per-user cap catches the user, not the run. Someone in finance uses the agent fifty times a day instead of five. Maybe it's stress-testing. Maybe a script is firing the same request in a loop from a laptop. The per-run cap will not catch this — each individual run is fine. The problem is volume.

When this cap trips, the user is locked out for the rest of the day. Heavier failure mode. They cannot do their job until midnight (or whenever the reset window kicks in). Size it generously — "the most a legitimate user could conceivably need," not the average. Roughly 5-10x typical daily usage. A notification should fire _before_ it hits, not after. Nobody wants to discover at 4pm that they are done for the day.

### Per-team-per-month cap

The per-team-per-month cap is the org-level circuit breaker. Engineering has a $5k/month budget. Marketing has $1.5k. When a team blows past it, the whole team is frozen until next month or until someone with the keys raises the cap.

This is the heaviest failure mode — an entire team cannot use agents — which is exactly the point. It forces a conversation. "Why did marketing burn $1.5k in two weeks? Is the campaign agent looping? Were fifty new people onboarded? Is the new model 4x more expensive?" The cap does not answer those questions, but it ensures someone asks them.

## Why one cap is never enough for agent cost controls

"A budget cap is set, the org is fine" is a common refrain. One cap is better than zero. But one cap only catches one shape of failure.

- **Only a per-run cap?** A misconfigured cron job can fire an agent 1,000 times a day at $1 each. Every run is "within budget." The org still wakes up to a $1k bill that did not exist yesterday.
- **Only a per-user cap?** One user can still trigger a single runaway loop that eats the whole daily budget in one run.
- **Only a per-team cap?** Someone burns the team's monthly $5k in three days because nothing was stopping them earlier in the chain.

Each cap leaves a gap the other two cover. That is the point. They are not redundant. They are complementary.

| Cap                | Catches                                               | Failure mode severity                | Sizing guideline                   |
| ------------------ | ----------------------------------------------------- | ------------------------------------ | ---------------------------------- |
| Per-run            | Tool loops, runaway single invocations                | Light — one task interrupted         | 3-5x typical run cost              |
| Per-day-per-user   | Volume abuse, misconfigured scripts                   | Medium — user locked out for the day | 5-10x typical daily usage          |
| Per-team-per-month | Org-wide drift, model price changes, headcount spikes | Heavy — whole team frozen            | Set by finance, reviewed quarterly |

## What graceful failure looks like for an agent budget cap

How a cap fails determines whether users trust the system.

**Bad:** the token stream stops mid-sentence. The agent disappears. The user has no idea what happened. They hit retry and burn the budget again.

**Good:** the request returns a clear error with an error code, the partial output (if any), the current budget state, and a hint about what to do next. Something like:

```json
{
  "error": "budget_cap_exceeded",
  "scope": "per_run",
  "limit_usd": 2.0,
  "used_usd": 2.04,
  "partial_output_id": "out_8h3kf...",
  "message": "this run exceeded the per-run cost cap. partial output saved. retry with a smaller scope or contact your admin."
}
```

Three things to notice. One — it tells the user which cap fired. That is the difference between "the agent is broken" and "the task needs to be chunked smaller." Two — it saves the partial output. Losing work on a budget cap is worse than the cap itself. Three — it gives the user a next step. Not "talk to support." A concrete action.

For the per-team-per-month cap, the error should also tell the user who can raise it. Otherwise a Slack pile-on lands in the team lead's DMs.

## How Archestra implements agent cost controls

Archestra's [LLM proxy](/docs/platform-costs-and-limits) supports token-cost limits scoped to the organization or a team, targeting specific models, with periodic limit cleanup so counters stay accurate. That covers two of the three layers cleanly. For the per-run cap, the recommended pattern is a hard token budget on the agent's session — set it in the agent config, enforce it before the request hits the model, and surface it in the same observability stack as the team and org limits so all three caps show up on one dashboard.

For deeper observability — which metrics to alert on, how to spot a loop in progress before it burns the cap — the [observability docs](/docs/platform-observability) cover `llm_cost_total` and the GenAI dashboard. For teams earlier in their MCP rollout that have not tackled the auth side yet, [A Developer's Guide to MCP Authentication](/blog/mcp-authentication-guide) is the prerequisite — there is no point putting budgets on agents that anyone can call.

## The rule of three for agent budgets

Set three caps. Size them differently. Make sure they fail loudly with a partial output and a next step. The cap that saves the org is rarely the one anticipated — it is whichever one the worst day happens to trip first. That is the whole point of having three.
