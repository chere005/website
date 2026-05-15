---
title: 'Human-in-the-loop for every write tool'
description: 'AI agent human in the loop on every write tool prevents costly mistakes. Reads run automatically. Writes require human approval.'
isNote: true
author: 'Mack Chi'
---

# AI agent human in the loop for every write tool

AI agent human in the loop on every write tool is the cheapest guardrail that actually works. Reads can run on their own. Writes need a human to press a button. That single rule prevents most agent incidents, from mass-email blasts to mistaken Jira transitions to wrong-channel Slack posts. The work of designing that confirmation is part of building the agent, not a feature to bolt on later. "Add it later" is how an agent ends up firing hundreds of messages to the wrong list before anyone notices.

An AI agent is software that, when nobody is watching, will sometimes do the wrong thing very quickly. Reading the wrong thing is cheap — scroll past it. Writing the wrong thing is expensive — apologize for it. The cheapest AI agent human in the loop pattern that scales is to make a human press a button before the agent writes.

## The line between read and write

A read tool answers a question. A write tool changes the world. The test is whether the action can be undone by closing a browser tab. If yes, it's a read. If not, it's a write.

Concretely:

- `list_calendar_events` is a read. The agent looks at a calendar. If it looks at the wrong week, no one is harmed.
- `send_calendar_invite` is a write. The agent puts a meeting on someone else's calendar. They get a notification. It cannot be un-sent.
- `search_jira` is a read.
- `create_jira_ticket` and `transition_jira_ticket` are writes.
- `get_slack_channel_history` is a read.
- `post_slack_message` is a write — and worse, a write into a channel other humans are watching in real time.
- `read_email`, `list_threads`, `query_inbox` — reads.
- `send_email`, `reply_to_thread`, `forward_email` — writes, and the writes that hurt the most when they go wrong.

The line isn't always perfectly clean — a search query can have side effects, a "read" can rate-limit into an outage — but the rule of thumb is good enough: if the verb is `get`, `list`, `search`, `read`, or `fetch`, it's probably a read. If it's `send`, `post`, `create`, `update`, `delete`, `transition`, or `apply`, it's a write and it needs a human.

## The "trusted agent" trap

The most common pushback against AI agent human in the loop on writes sounds like: "But this agent is trusted. It's been running for weeks. Users shouldn't have to confirm every send."

That sentence is a smell. The trusted agent that doesn't need confirmation is almost always the agent that can't be trusted, because trust in this context isn't a property of the agent — it's a property of the input. An agent that has been sending invoices correctly for a month is one prompt injection away from sending an invoice to an attacker's address. Trust the code if useful; the inputs are still wild.

This is the same assumption that drives [the Dual LLM pattern](/blog/dual-llm) — that tool output coming back into the model is untrusted content, not trusted instructions. Human-in-the-loop on writes is the operational mirror of that idea. Dual LLM keeps malicious content out of the agent's decision-making. A confirm modal on writes makes sure that even when bad content does get through, it doesn't ship as a real-world action without a human seeing it first.

The cost of one extra click is far less than one Slack post-mortem. A thousand confirms across a year of agent work is cheap insurance against a single high-impact incident.

## Making the AI agent human in the loop experience non-painful

The reason "add it later" never gets added is that the first version of human-in-the-loop is annoying. The agent stops. A modal appears. Then it happens again two seconds later. By the fifth modal in a minute the user is clicking through them without reading, which is worse than no modal at all — same outcome with the illusion of safety. Approval fatigue is a real failure mode, covered in [the Dual LLM post](/blog/dual-llm).

The design work is in making the confirm fast, informative, and batched.

**Fast** means a single keystroke. The confirm should be a focused dialog with `Enter` to approve and `Esc` to reject, no mouse required. If approval requires dragging a pointer across three monitors to click "Send," the agent stops getting used.

**Informative** means the dialog shows the exact tool call. Not "the agent wants to send an email." The actual `to`, `subject`, the first line of the body, the attachment names. A confirm without the payload is a yes/no question about a stranger.

**Batched** is the one most teams miss. If an agent is going to send 217 emails, do not show 217 modals. Show one modal that says "Send 217 emails to this list — sample of 3 below, full preview here." Confirm the batch. Batched confirms are where mass-send mistakes get caught: the recipient list is right there, and a wrong list is obvious before a single message goes out.

The deterministic version of all this lives in [the AI tool guardrails](/docs/platform-ai-tool-guardrails) — tool call policies that mark specific writes as "Require approval" while letting safe internal reads run automatically. The policy is per-tool, per-argument, and per-context, so `send_email` to `@mycompany.com` can run silently while `send_email` to an outside domain triggers the confirm. That's the granularity to aim for. A blanket "approve every tool" makes users click yes on coffee orders. A blanket "approve nothing" is the mass-blast morning.

## Why AI agent human in the loop never gets added later

It doesn't get added later because by the time it's needed, the agent already has a habit. Users are used to fire-and-forget. The runbook says "just kick off the agent and walk away." Adding a confirm step then is a regression — slowing down something that used to be instant.

The only reliable answer is to put the confirm in before the agent goes to production. Default every write to require approval. Then, tool by tool, decide which ones earn an exception. `add_calendar_event` to an owned calendar, maybe. `post_to_slack` in a private channel, maybe. `send_email`? Never. Not even for the agent that's been good for six months.

The other thing that builds up by delaying: an audit trail. If every write goes through a confirm, there's a clean log of who approved what and what payload they saw. That log is the difference between a five-minute incident review and a three-day investigation.

Reads can auto-run. Writes need a human. One sentence, one rule, and the cheapest AI agent human in the loop guardrail that ships.
