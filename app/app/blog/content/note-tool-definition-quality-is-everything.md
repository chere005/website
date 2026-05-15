---
title: 'Most production failures are tool-definition failures'
description: 'MCP tool definition quality drives agent reliability more than model choice. Four properties that turn ambiguous tools into ones the model uses correctly.'
isNote: true
author: 'Mack Chi'
---

# MCP tool definition quality is the variable that decides whether agents work

MCP tool definition quality is the dominant lever for agent reliability in production. Engineering teams spend weeks evaluating Claude versus GPT-5 versus an open-weights candidate, then ship an agent that fails on the same class of error regardless of which model is wired in. The model is rarely the bottleneck. Ambiguous descriptions, missing parameter constraints, and return shapes the agent cannot parse cause the failure — and no amount of model swapping fixes a tool definition that does not tell the model what it needs.

## The selection bias around model choice

Model choice feels load-bearing because it is the most visible decision. There is a benchmark for it, a leaderboard for it, and a procurement conversation that requires picking one. So engineering attention concentrates there. MCP tool definition quality, by contrast, lives inside a JSON schema nobody is paid to review. It looks like documentation. It is treated like documentation. In production it behaves like a prompt — because that is what it is.

The result is the recurring pattern: the agent works on the demo dataset, falters on real inputs, the team blames the model, swaps in a stronger one, and watches the same failures recur with slightly different surface text. The variance was never in the model. It was in the tool surface the model was reasoning over.

> In production, model choice is the third-most-important variable. MCP tool definition quality is the first two.

## Four properties of a tool definition the model will use correctly

**Unambiguous purpose.** The description answers "when should this tool be called instead of any other tool the agent has?" Not what the tool does — when to reach for it. A description that reads "fetches user data" loses to one that reads "fetches a user's billing profile by user ID; do not use for authentication checks or for fetching team membership." The model is choosing between options. The description has to win that comparison.

**Constrained parameters.** Every parameter has a type, an enum where applicable, a format string for dates and identifiers, and a description that explains the failure mode if the value is wrong. Free-form strings are where agents hallucinate. A `status` parameter typed as `string` will get `"active"`, `"Active"`, `"ACTIVE"`, and `"open"` from the same model in the same week. The same parameter typed as `enum: ["active", "inactive", "pending"]` does not.

**Predictable return shape.** The return schema is declared, stable, and shallow enough that the model can reason about it without re-fetching. Returns that nest five levels deep, mix arrays and objects at the same key, or change shape based on a flag in the request are returns the model will mis-parse downstream. The fix is structural, not prompt-level.

**Failure modes spelled out.** What the tool returns when the input is invalid, when the resource is missing, when the upstream is down. If the tool returns `null` for "not found" and `null` for "service unavailable," the agent will treat both the same way. Distinct error shapes — `{ "error": "not_found" }` versus `{ "error": "upstream_timeout" }` — let the agent recover correctly instead of giving up or retrying into a quota wall.

## Before and after

A common before: `search_orders(query: string)` with the description "Searches orders." The agent guesses at query syntax, the return is an unpaginated array of nested order objects, and "no results" is indistinguishable from "search rejected."

The after: `search_orders(customer_id: string, status: enum["open","fulfilled","cancelled"], date_from: date, date_to: date, limit: int<=50)` with a description that names the three retrieval patterns the agent should use it for and the three it should not. The return is `{ results: Order[], next_cursor: string|null, total_estimate: int }`. Errors are typed. The same model, given the same task, picks the right tool the first time and parses the result without a follow-up call.

The work is in the schema. The lift in reliability is disproportionate. For the prompt-level companion to this — why tool descriptions function as in-context instructions — see [MCP tool descriptions as prompts](/blog/mcp-tool-descriptions-as-prompts).
