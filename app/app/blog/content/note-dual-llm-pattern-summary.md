---
title: 'The dual-LLM pattern in 200 words'
description: 'The dual-LLM pattern explained short: one privileged planner with tools, one quarantined worker that reads untrusted input, a strict channel between them.'
isNote: true
author: 'Mack Chi'
---

# The dual-LLM pattern in 200 words

The dual-LLM pattern splits an AI agent into two cooperating models so prompt injection cannot reach the tools. A privileged planner LLM holds user instructions, conversation history, and tool access. A quarantined worker LLM reads all untrusted content and has no tools at all. A strict structured channel connects them. That is the dual-LLM pattern, and that is what breaks the [lethal trifecta](/blog/lethal-trifecta-definition). The [long version](/blog/dual-llm) covers the game-theoretic intuition, a real attack walkthrough, and implementation notes. This note is the one-pager for procurement reviews, security questionnaires, and architecture diagrams.

In simpler terms: two AIs. One plans the work and holds the permissions. The other reads the scary letter from a stranger and tells the first one, in a tiny structured note, what the letter said. The planner never reads the stranger's letter. The stranger cannot talk to the planner directly. That is the dual-LLM pattern.

## The pattern, in five bullets

- **Planner LLM (privileged).** Holds the user's instructions, the conversation history, and the tools. It is the only component that ever calls `send_email`, writes to a database, or opens a pull request. It never sees raw untrusted content.
- **Worker LLM (quarantined).** Reads the untrusted stuff — the email body, the GitHub issue, the PDF a vendor sent, the web page the agent fetched. It has zero tools. It cannot send, write, post, or call anything. If it were possessed by a demon it would still be inert.
- **Channel between them.** The planner asks structured questions. The worker answers in a tight schema — `{"is_bug_report": true}`, `{"category": 2}`, a short string slot the planner explicitly asked for. No free-form text passes from worker to planner. Injection cannot ride a JSON boolean.
- **Forbidden moves.** The worker cannot summarize freely into the planner's context. The planner cannot paste untrusted content into its own prompt as a shortcut. Both rules are enforced by the proxy, not by asking the model nicely.
- **What gets logged.** Every question the planner asked, every answer the worker gave, and the original untrusted blob the worker saw. When something goes sideways later, that tape gets replayed — not the planner's reconstructed reasoning.

That is the whole pattern. The reason the dual-LLM pattern works against the lethal trifecta is structural, not clever: the model with the tools never reads the attacker's text, and the model that reads the attacker's text has no tools to weaponize.

## One strong opinion

The dual-LLM pattern is not a silver bullet. It is a discipline. Plenty of vendors claim "we have dual-LLM" when what they actually mean is "a second model summarizes the dangerous content and pastes the summary into the main context." That is not dual-LLM. That is dual-LLM cosplay. The summary is free-form text written by a model that just read the attacker's instructions, and it lands directly inside the privileged loop. Congratulations, the injection now travels through a slightly longer pipe.

The discipline is the four "no"s: no free-form worker output reaching the planner, no untrusted content reaching the planner through any side door, no tool access on the worker ever, and no human-readable summary used as a control signal. If any of those four leak, the architecture is a story, not a defense.

## When to use it, when not to

Use the dual-LLM pattern when an agent has to touch all three legs of the trifecta — private data, untrusted input, external action — and none of the legs can be dropped. That is the case it was built for. Customer support triage that reads inbound tickets and also writes to a CRM. A coding agent that reads GitHub issues and also opens PRs. Anything where "just make the agent read-only" is not an acceptable answer.

Skip it when one of the legs is already missing. If the agent is genuinely read-only, or if the untrusted content is genuinely absent, the overhead is not worth it. Dual-LLM costs tokens, latency, and a question-asking loop that is more rigid than free chat. Pay that cost only when the triangle would otherwise close.

For the long version — the Guess Who analogy, the failure modes, the test against a real GitHub MCP exploit — see [the original post](/blog/dual-llm).
