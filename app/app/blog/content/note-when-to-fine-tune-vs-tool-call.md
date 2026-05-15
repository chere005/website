---
title: 'Fine-tune vs Tool Call: When to Use Each for LLM Agents'
description: 'Fine-tune vs tool call decision guide for LLM agents. Two questions decide it, with concrete examples across catalog, legal, and CRM workloads.'
isNote: true
author: 'Mack Chi'
---

# Fine-tune vs Tool Call: When to Use Each

The fine-tune vs tool decision comes down to two questions: does the model need new behavior or new information, and does the underlying data change. If the answer is "new information" or "data changes," use a tool. Fine-tuning is reserved for stable behavior patterns. Most teams default to fine-tuning when a tool call would be roughly ten times cheaper, faster to ship, and easier to keep correct.

Picture a team that spends six weeks fine-tuning a model so it can "know" a live product catalog. The model learns to answer "what's the price of SKU 44812." Then the price changes. The model is now confidently wrong, and the only fix is another fine-tuning run on a snapshot that will also be stale by the time training finishes. A tool call would have solved the same problem in an afternoon and stayed fresh indefinitely.

## The Two-Question Decision Tree for Fine-tune vs Tool

Two questions resolve the fine-tune vs tool choice roughly 90% of the time.

### Question 1: New Behavior or New Information?

If the model needs **new information** (facts, records, prices, customer names, ticket IDs), use a tool. Always. Information lives in a database somewhere, and the model should fetch it on demand.

If the model needs **new behavior** (a specific tone of voice, a particular output format, a refusal pattern, a structured response style), fine-tuning is on the table.

### Question 2: How Often Does the Data Change?

If the data changes often (anything more than once a year), use a tool. The model should query a system of record, not carry a stale photograph of it in its weights.

If the data is genuinely stable (a legal clause structure a firm has used for fifteen years, a brand voice guide that took a year to write), fine-tuning becomes a real candidate.

That is the full framework for fine-tune vs tool: information vs behavior, stable vs changing.

## Three Concrete Fine-tune vs Tool Examples

**Product catalog. Tool.** A catalog lookup is not a knowledge problem; it is a live-system access problem. A model with a `lookup_product(sku)` tool always returns the current price, current stock, and current description. Fine-tuning here pays engineers for weeks to build a worse version of a SELECT statement.

**Legal contract style. Fine-tune.** A law firm wants every clause the model produces to match a structure its partners settled on years ago: specific phrasing, specific ordering, specific hedge words. This is genuinely new behavior and it does not change. No external system can answer "what should this clause sound like." The accumulated taste of the firm is encoded with fine-tuning or with very careful prompting.

**CRM lookups. Tool.** "What deals does Sarah have open this quarter?" Information. Constantly changing. Tool. A model fine-tuned on yesterday's CRM dump is guaranteed to be wrong tomorrow morning, and the bill runs into thousands of dollars for the privilege.

## Why Teams Get Fine-tune vs Tool Wrong

Fine-tuning feels powerful. There is a training run, a loss curve, a Slack message that says "the model is fine-tuning, ETA Thursday." It looks like serious engineering.

Tools feel mundane. A function gets written, described in JSON, and wired up. It takes an afternoon. It feels less like AI work and more like a 2015 backend integration.

The boring afternoon job is almost always the right answer. Tools are:

- Cheaper by roughly an order of magnitude
- Updatable in real time (edit the database, not the model)
- Auditable (every call can be logged)
- Reversible (delete the tool, the system is back where it started)

Fine-tuning offers none of these. A fine-tuned model is a frozen artifact. Once it is wrong, it stays wrong until money and time are spent to redo it.

The real unlock for AI agents is giving them high-quality, live context — the argument laid out in [an earlier post on why Archestra exists](/blog/why-we-found-archestra). Tools deliver that context. Fine-tuning takes the opposite trade: compress yesterday's context into model weights and hope it is still relevant.

## Where Tools Fit in an Agent Setup

Agent plumbing in production environments is mostly this work: connecting a model to the live systems it needs through tools, typically [MCP](/blog/celebrating-100-mcp-servers-milestone) servers. When an agent spec lands for review, the first pass identifies which "knowledge" claims are actually "live lookup" problems hiding in plain sight. Almost always, most of them are.

For a concrete walkthrough of how an agent gets wired to its tools, knowledge sources, and triggers, the [Archestra Agents docs](/docs/platform-agents) cover it. The short version: an agent is a system prompt plus a list of tools plus optional knowledge sources, and the model decides when to call which. No fine-tuning required to know a product catalog.

## When Fine-tuning Actually Earns Its Place

Fine-tuning is not always wrong. Good reasons to reach for it include:

- A specific output format the model cannot reliably hit with prompting
- A tone of voice that must stay consistent across thousands of generations
- Lower latency or lower cost per call from a smaller fine-tuned model
- A refusal or safety pattern that is not negotiable

None of these are "the model needs to know X." They are all about how the model behaves, not what it knows.

The rule is short: if the goal can be phrased as "the model should know about Y," reach for a tool. If it can be phrased as "the model should behave like Z," fine-tuning is on the table — but try a strong system prompt first.

Six weeks of compute is a steep price for a worse version of an API call.
