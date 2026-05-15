---
title: "What's Next After MCP? The Honest Answer"
description: "What's next after MCP? The protocol is two years old, half its surface is unsolved, and boring tooling is the real story."
isNote: true
author: 'Mack Chi'
---

# What's Next After MCP? The Honest Answer

What's next after MCP is the wrong question to ask in 2026. The protocol is two years old, half of its spec surface is still being argued about in GitHub issues, and most teams have not yet figured out how to run it in production. The honest answer to "what's next after MCP" is that nothing comes after a protocol the industry has not finished adopting. The interesting work for the next two years is finishing the job MCP started, not replacing it.

The first public MCP release landed in November 2024. The ecosystem just finished a transport migration. The auth story took eighteen months to converge. For the long version of how unfinished this thing actually is, see the [short history of the MCP spec](/blog/mcp-spec-version-history), which walks through every revision and what each one broke.

That said, the question keeps surfacing, so here is a direct answer: three real directions are worth watching, plus one prediction about what's next after MCP that most teams should actually act on.

## Three Real Directions After MCP

### MCP Apps

Visual surfaces inside the agent conversation. Instead of the model describing a result in prose, the server returns a structured component the client renders directly. Forms, tables, charts, approval buttons. The spec work is early but the demos are convincing. This will matter most for non-developer workflows — the boring CRM and calendar surface area that nobody writes blog posts about.

### Dynamic Tool Loading

Most clients today load every tool from every connected server at session start. That works until twenty servers are mounted and the context window is half schema before the user types a word. The pattern teams are converging on is a router tool that decides which capabilities to surface for the current task. Progressive disclosure at the tool layer, not the prompt layer.

### Agent-to-Agent Protocols

A2A overlaps with MCP's transport and discovery layers in ways that are not fully reconciled. Bridging is more likely than unification. Two specs talking through a shim is the realistic outcome — not one spec swallowing the other.

## The Boring Prediction: Tooling Beats New Specs

None of the three directions above is what most teams should focus on. The fastest-shipping innovation in the MCP ecosystem right now is not a new protocol. **Boring tooling beats novel specs.** Gateways, audit trails, credential rotation, sandboxing, namespace filters, replay harnesses. The unsexy operational layer around the spec that already exists.

Engineering teams keep chasing the next protocol announcement when the actual problem is that credentials cannot be rotated without redeploying five servers. Or that nobody can tell which agent called which tool last Tuesday at 3 PM. Or that installing a server requires editing a JSON file by hand. None of those problems need a new spec. They need the operational layer that should have shipped alongside the spec in the first place.

That operational layer is exactly what Archestra builds, and it is what almost every serious enterprise MCP pilot ends up reimplementing internally when it cannot be found off the shelf.

So the answer to "what's next after MCP" is not a successor protocol. There isn't one, and there does not need to be. What's next after MCP is the boring infrastructure that turns MCP from a spec into something operable in production.
