---
title: 'Agent liability, the question nobody answers'
description: 'AI agent liability has three competing models — vendor, deployer, user — and only one piece of evidence survives a dispute in any direction.'
isNote: true
author: 'Mack Chi'
---

# AI agent liability, the question nobody answers

An agent wires money to the wrong vendor. An agent deletes the wrong row from a production database. An agent sends a contract to a competitor's mailing list. Who pays? The honest answer to the AI agent liability question, in 2026, is that nobody has a complete legal one yet — but the audit trail is the only artifact that survives the dispute in any direction. Agents are spreading across enterprise systems ahead of the governance to control them. The only thing that survives a dispute in either direction is a complete audit trail.

Procurement teams in regulated industries are already adding AI agent liability clauses to vendor contracts, and incident response playbooks are being rewritten around the question of which party — the model vendor, the deployer, or the end user — has to fund the cleanup.

## The "an agent did it" incident

The shape of these incidents has stabilized. An agent receives a request, plans a sequence of tool calls, executes them across two or three systems, and produces an outcome that costs somebody money. The post-incident review reaches the question that nobody in the room can answer: was this the model behaving correctly on bad input, the deployer misconfiguring guardrails, or the user phrasing a request that any reasonable system would have refused?

Without a recorded chain of decisions and identities, there is no factual basis to assign blame. The argument collapses into vibes.

## The three liability models

Three frameworks are circulating, and contracts in 2026 are already taking sides between them.

### Vendor liability

The model or platform vendor bears the cost when a foundation model produces an unsafe action. This works for narrow cases — clear policy violations, model outputs that breach the vendor's own usage terms — and falls apart the moment the deployer has configured custom tools, system prompts, or autonomy levels the vendor did not approve. Vendor contracts in the wild cap liability aggressively for exactly this reason.

### Deployer liability

The organization that integrated the agent owns the outcome. This is where most enterprise contracts are landing, because the deployer chose the tools, wrote the policies, granted the credentials, and decided which actions to auto-approve. The required evidence is heavy: every tool call, every policy decision, every identity binding, retained long enough to defend a dispute that may arrive a year later.

### User liability

The human who issued the request bears responsibility. This works in consumer contexts and falls apart in enterprise ones, where "the user" is often an employee acting on behalf of a corporation that already accepted the deployer's terms. It still matters in one specific case: when a user circumvents a working guardrail, the audit trail has to show that the guardrail existed and was bypassed deliberately.

## The audit-trail floor

Across all three AI agent liability models, the same evidence baseline shows up:

- The exact prompt and context the agent received
- The model's decision and the tool calls it proposed
- Which policy fired, which one did not, and why
- The identity behind the request, resolved to a real person or service account
- The credential each tool call used and the system it touched
- The outcome — success, failure, or partial — with a timestamp

Anything less than this is not an audit trail; it is a metrics page that thinks it is a control. The point is covered in more depth in [governance on paper vs. enforced](/blog/ai-governance-on-paper-vs-enforced), and the observability side is laid out in [the agent observability minimum](/blog/agent-observability-minimum).

## Where this is headed

Regulators in the EU, UK, and several US states are drafting language that defaults to deployer responsibility with a vendor carve-out. Insurance carriers are pricing agent-deployment policies on the quality of the audit trail. The teams that will weather the first major incident are the ones whose logs can answer "who decided this, on whose behalf, with which tool, against which policy" without a forensic reconstruction.

The legal answer is still forming. The engineering answer is already clear: build the audit trail before the dispute, not after.
