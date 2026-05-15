---
title: 'Email is the most underrated agent trigger'
description: 'The email agent trigger pattern: forward to an alias, the agent does the work, replies with the result. No new app, no new UI, no IT install.'
isNote: true
author: 'Mack Chi'
---

# Email is the most underrated agent trigger

The email agent trigger is the lowest-friction way to invoke an AI agent inside an enterprise. The pattern is simple: a user forwards a message to an alias, the agent reads the body and attachments, performs the work against backend systems under that user's permissions, and replies to the same thread with the result. No portal, no SSO redirect, no extension to install, no new tab in the browser.

Most enterprise agent rollouts over the next couple of years will be email-triggered, not chat-triggered. The inbox is the universal UI. It already has identity, threading, attachments, and search. Every employee already lives in it for eight hours a day. An email agent trigger inherits all of that infrastructure for free, which is why adoption tends to be immediate where new-app rollouts stall.

This note makes the case for the email agent trigger, describes the canonical pattern, and lists the failure modes to plan for. For the broader landscape, see [the trigger overview](/blog/agent-triggers-explained) — the email agent trigger is not one of three equal options. It is the one that wins for human-invoked workflows.

## The five-year-old version

A regular employee — a lawyer, a recruiter, an accountant — cannot be asked to learn a new tool every time the company buys an AI product. Every new app is a new password and a new "where did that button go" support ticket.

Everyone has email. Instead of building an app, give the agent an email address. The person forwards a thing to it. The agent reads it, does work, emails them back. That is the whole pattern.

## The email agent trigger pattern

The shape of an email agent trigger is always roughly the same:

1. A shared mailbox the platform watches — for example `agents@company.com`.
2. Each agent gets a sub-address alias like `agents+agent-<id>@company.com`. The `+` part tells the platform which agent to invoke; mail servers treat everything after it as routing metadata.
3. A user forwards or composes an email to that alias. The body becomes the agent's first message. Attachments come along.
4. The agent runs with the sender's identity bound to that person's platform permissions.
5. The agent replies to the same thread, with the conversation history attached.

No portal, no SSO redirect, no "click here to install the extension." Archestra's implementation watches a Microsoft 365 mailbox over Microsoft Graph and follows exactly this shape — full setup and security modes are in [the incoming email docs](/docs/platform-agent-triggers-email).

## The From header is load-bearing

The thing teams get wrong most often with an email agent trigger is that the From header is doing real security work. When `alice@company.com` emails the expense agent, the agent calls the ERP under Alice's permissions. If someone can forge that header, they get to act as Alice. Trust in the inbound mail pipeline stops being a deliverability question and becomes an authorization question.

In practice: SPF, DKIM, and DMARC must be configured upstream, and the platform must actually check the results, not just log them. The default security mode should not be "anyone on the internet who knows the alias" — Archestra exposes Private (sender must be a known platform user with team access), Internal (domain allow-list), and Public, and Public is almost never right. The binding from email address to platform identity must be the same identity the IdP already trusts: if a user is offboarded in Okta, the email trigger should stop working on the next message, not on the next quarterly access review.

Same identity-binding argument as [the Dual LLM post](/blog/dual-llm), different surface. The agent is acting on someone's behalf. The platform has to know whose.

## Failure modes of an email agent trigger

The first production deployment of an email agent trigger will hit at least three of these.

**HTML emails.** A lot of corporate email is HTML, and most of it is ugly — nested tables, tracking pixels, six layers of `<div>` for a one-line message. If the agent reads raw HTML, half its context window is markup. Strip to text on ingress.

**Forwarded chains and signatures.** Forwards bring the original _plus_ every signature, every legal disclaimer, every "Sent from my iPhone," and every prior reply with its own quoted history. A single forward can balloon to 40 KB of mostly-noise. The agent reads all of it, burns tokens, and anchors on the wrong part of the thread. Strip signatures aggressively, and decide explicitly whether the agent sees the prior thread or only the most recent message. Default to "only the most recent."

**Out-of-office loops.** The agent replies to Alice. Alice is on vacation. Her out-of-office bot replies. The agent reads it, thinks it is a new request, replies again. The failure surfaces when a mailbox quota fills up at 3am. Detect auto-reply headers (`Auto-Submitted`, `X-Auto-Response-Suppress`, `Precedence: auto_reply`) and never reply to one.

**Distribution lists masquerading as people.** `procurement@company.com` emails the agent. The From header looks like a person; the address resolves to ten people. Identity binding gets weird. Decide up front whether the agent accepts mail from groups, and if so, who counts as the acting user.

**Attachments bigger than they look.** A 10 MB PDF is not 10 MB of context — it might be three pages of OCR'd text and 9.8 MB of scanned image. Enforce hard limits at the trigger layer. Archestra's defaults are 20 attachments per email, 10 MB per file, 25 MB total. Over-limit files get skipped, not partially processed.

## When the email agent trigger is wrong

Email is not always the right trigger. If the latency budget is seconds, use a webhook. If the invoker is a clock, use a schedule. If the workflow is a five-turn conversation in two minutes, use chat. Email's sweet spot is "a human wants the agent to do one thing with one piece of context, and is fine waiting a minute for the reply." That is a huge fraction of enterprise work, but not all of it.

What the email agent trigger is, though, is the trigger with the lowest activation energy. In an enterprise, activation energy is usually what kills a rollout long before agent accuracy does. Pick the trigger that matches how users actually live. For a lot of teams, that means an alias and a reply, and not much else.
