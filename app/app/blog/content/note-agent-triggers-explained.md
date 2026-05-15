---
title: 'Triggers, schedules, webhooks: how an agent decides to run'
description: 'Agent triggers decide when an AI agent runs. Compare schedule, webhook, and inbox triggers, their failure modes, and how to pick the right one.'
isNote: true
author: 'Mack Chi'
---

# Agent triggers: how an AI agent decides to run

An AI agent trigger determines when an agent wakes up and executes. The three agent triggers worth taking seriously are schedule (cron), webhook (including A2A), and inbox (email, Slack, MS Teams). Picking the wrong agent trigger is the single most common reason a production agent looks healthy in logs while quietly failing the user — every run succeeds, but the agent reacts too late or to the wrong signal.

A triage agent that runs every fifteen minutes on a cron schedule can complete every run cleanly while new tickets sit untouched at 2am for hours. The cron itself is fine. The choice to use a schedule at all is the bug. That class of trigger bug does not show up in code review. It only shows up when somebody asks why the agent feels broken even though every run is green.

An agent is code that does nothing until something pokes it. Which poke gets chosen decides what the operational headaches look like for the next year. This guide covers the three agent triggers, the failure modes each one quietly hands off, and how to choose between them.

## Schedule triggers (cron-style)

A schedule trigger fires on a recurring cadence. Examples: `0 8 * * 1-5` to run at 08:00 every weekday, or `*/15 * * * *` for every fifteen minutes. The agent receives a configured prompt, runs under the permissions of whoever created the task, and stores the run for review. In Archestra these are [Scheduled Tasks](/docs/platform-agent-triggers-schedule).

### When to pick a schedule

Pick a schedule when the work is predictable, idempotent, and tolerates a few minutes of slop. Daily standup prep that pulls open tickets and summarizes progress is a schedule. Overnight reconciliation between two systems is a schedule. Anything where the right answer to "when should this run?" is "just check periodically" is a schedule.

That last one is where teams get into trouble. "Just check periodically" is the lazy default — and it is wrong more often than admitted. If the real answer is "when a new ticket lands" or "when a customer emails support," a schedule is the wrong agent trigger. The right answer is an event. Cron looks safer because it is familiar, but it trades real-time behavior for a polling interval, and that interval is exactly the window where the agent looks broken to the user even though every run was successful.

### Schedule failure modes

The failure modes are the classic ones:

- Missed runs when the platform was down at the firing moment.
- Overlapping runs when the previous invocation has not finished and the next one starts anyway.
- Clock drift between the scheduler and the systems the agent talks to, which matters more than expected for "fetch records updated in the last 24h" queries.
- Time-zone bugs around DST.
- A schedule that quietly stops firing because a credential it depends on expired and nobody noticed.

Good monitoring for scheduled agents: a freshness check on the last successful run, an alert when a run exceeds its expected duration, and an idempotency key on whatever the agent writes downstream so a duplicate run does not double-post a Slack message or refile a ticket. If a missed run cannot be replayed safely, the agent is doing the wrong kind of work for a schedule.

## Webhook triggers (including A2A)

A webhook trigger fires when another system POSTs to a per-agent URL. The payload becomes the agent's first message. The latency budget is whatever the caller is willing to wait for; the cadence is "whenever the world demands it." Archestra's [Webhook (A2A)](/docs/platform-agent-triggers-webhook-a2a) endpoint accepts either an A2A JSON-RPC envelope or a pass-through JSON body, so the same URL works for an A2A-native caller and for a generic Zapier or GitHub Actions step.

### When to pick a webhook

Pick a webhook when the agent trigger is an event in another system and low-latency reaction matters. A GitHub issue opened. A Stripe dispute filed. A deploy finished. A monitor flipped to firing. The agent runs once per event, sees the payload, decides what to do. This is the agent trigger most teams should reach for first.

### A2A as a structured webhook

A2A — agent-to-agent — is a structured subset of webhook triggers. Instead of an arbitrary JSON body, the caller speaks the [A2A protocol](https://a2a-protocol.org/), discovers the agent through an AgentCard at `/.well-known/agent.json`, and sends typed messages. The transport is still HTTP POST and the failure modes are still webhook failure modes, but the contract is tighter, which makes A2A the right pick when the caller is another agent platform rather than a generic integration tool.

### Webhook failure modes

The failure modes differ from a schedule:

- **Replay attacks** — a captured payload POSTed twice.
- **Spoofed payloads** that look real but did not come from the expected system. Signature verification is required: `X-Hub-Signature-256` for GitHub-style HMAC, `Stripe-Signature` for Stripe, mTLS for the serious ones. A shared bearer token alone is the bare minimum.
- **Schema drift** when the upstream system ships a new event version and the agent suddenly sees fields it cannot read.
- **Caller retries** when the agent took 40 seconds and the caller timed out at 30, leaving duplicate work running.
- **Trace fragmentation** — group related calls with a session header so the trace stays coherent in observability. Archestra uses `X-Archestra-Session-Id`.

Treat any unsigned webhook as untrusted input regardless of source IP. The same prompt-injection assumptions covered in [the Dual LLM post](/blog/dual-llm) apply here: the payload is content from somewhere not fully controlled, and the agent must not treat it as instructions from a trusted user.

## Inbox triggers

An inbox trigger fires when a human (or, occasionally, another system pretending to be one) sends a message into a channel the agent watches. Email is the canonical case. Chat — Slack, MS Teams — is the close cousin. Archestra supports all three: [Incoming Email](/docs/platform-agent-triggers-email), [Slack](/docs/platform-slack), and [MS Teams](/docs/platform-ms-teams).

### When to pick an inbox

Pick an inbox agent trigger when the people invoking the agent are humans and the goal is to start workflows from where they already work. The pattern is usually an alias like `agents+agent-abc123@company.com` for email, or `@agent-name` in a Slack channel. A user forwards an invoice, the agent processes it. A user pastes a customer complaint into a thread, the agent drafts a response. These are the use cases that produce most enterprise wins, because the friction to invoke the agent is approximately zero. A user does not have to open a new tool — they forward an email.

### Inbox failure modes

The failure modes are nastier than they look:

- **Sender impersonation**, because email addresses spoof easily without SPF, DKIM, and DMARC configured properly upstream.
- **Attachment parsing**, where the agent silently drops files that exceed a size limit or chokes on an oddly encoded PDF.
- **Threading**, where a reply to an earlier agent message needs the full conversation history attached so the agent is not answering one message in a vacuum.
- **Distribution lists**, where one inbound email looks like it came from a person but was actually fan-out from a mailing list.
- **Auto-reply loops** from out-of-office bots creating infinite back-and-forth with the agent.

Pick a security mode that matches reality. Archestra's email trigger offers Private (must match a known user with team access), Internal (domain allow-list), and Public. The right answer is almost never Public.

## Picking the right agent trigger

Two questions get most of the way there.

| Question                   | Answer                        | Trigger                                        |
| -------------------------- | ----------------------------- | ---------------------------------------------- |
| Who is invoking the agent? | A clock                       | Schedule                                       |
| Who is invoking the agent? | A system                      | Webhook (A2A if the system is itself an agent) |
| Who is invoking the agent? | A human                       | Inbox                                          |
| Latency budget?            | Minutes to hours              | Schedule                                       |
| Latency budget?            | Seconds, synchronous response | Webhook                                        |
| Latency budget?            | A minute or two               | Inbox                                          |

Most teams default to cron because cron is the agent trigger already familiar from a decade of backend work. The result: a schedule ships, then a quarter is spent explaining why the agent "feels slow" or "missed that one ticket." If the real trigger is "a new thing showed up in another system," the right answer is a webhook from that system, not a schedule that polls for it. If the real trigger is "a human asked," the right answer is an inbox, not a schedule that scans the inbox every fifteen minutes. The default should flip. Cron is the fallback when nothing else fits, not the starting point.

If the honest answer to "who" is "all three depending on the day," that is fine. The same agent can be exposed through multiple agent triggers; chat, A2A, schedule, and email can all invoke the same underlying [Agent](/docs/platform-agents) with the same tools and prompt. The workflow is not rebuilt once per trigger.

## Where security lives in each agent trigger

- **Schedule** — auth lives at the platform level. The task runs as the user who created it, so revoking that user revokes the task.
- **Webhook** — signature verification on the payload plus a non-trivial bearer token on the request. Treat any unsigned webhook as untrusted input regardless of source IP.
- **Inbox** — identity binding from the sender address (or chat user) to a real platform identity, plus a security mode that rejects anything outside the allowed set.

The full breakdown of how Archestra binds invocation identity to agent permissions — and why that identity has to be the same one the enterprise IdP already trusts — lives in [the Agents docs](/docs/platform-agents) and in the post on [enterprise-managed authorization for MCP](/blog/enterprise-managed-authorization-mcp).

Pick the agent trigger that matches the invoker, then design the failure mode that is acceptable to live with.
