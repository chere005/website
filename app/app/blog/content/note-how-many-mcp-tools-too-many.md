---
title: 'How many MCP tools is too many?'
description: 'Too many MCP tools in one context and tool-selection accuracy falls off a cliff — around 40 on frontier models. Design a surface, not a pile.'
isNote: true
author: 'Mack Chi'
---

# How many MCP tools is too many?

Too many MCP tools in a single agent context degrades tool-selection accuracy, and the cliff arrives earlier than most teams expect. On frontier models the knee sits around 40 tools. Past that, agents start calling `search_jira` to find Slack messages, picking tools by recognizing the first plausible name in a long list rather than by fit. The model is not broken. The manifest got too big.

A useful intuition: hand a kid a drawer with five labeled boxes — "crayons," "scissors," "tape," "stickers," "glue" — and the right one gets picked every time. Swap in a 200-drawer chest where half the labels read "writing things," "drawing things," or "art supplies (assorted)," and on a bad day the kid colors with the glue stick. LLMs do the same thing. Their hands work fine. The chest got too big. That is what too many MCP tools looks like in production.

## The short version

Past roughly 40 tools in a single context, even frontier models start picking badly — wrong tool, near-miss tool, or no tool when one would have worked. The exact number moves with model, description quality, and how much the tools overlap, but the curve always bends. The fix is not "wait for a smarter model." The fix is to stop piling on tools and start designing a surface.

The rest is mechanics and how to build around it. Skip ahead to the section on tool surfaces for the prescription. The middle explains why the cliff exists and why upgrading the model does not move it far.

## Why too many MCP tools break agents

Every MCP tool an agent can call lives in the system context. Name, description, JSON schema for arguments, sometimes a usage hint — all of it sits in the prompt before the user's first message. Five tools might cost 800 tokens in the manifest. Seventy tools can easily reach 15,000 before the conversation starts, and that is the polite end. Production setups north of 40,000 are not unusual.

Three things go wrong as that number grows, and they go wrong together.

**More candidates to pick from.** Tool selection is a classification problem. The number of plausible-looking options grows, and a lot of MCP tool descriptions in the wild are near-duplicates. `get_user`, `find_user`, `lookup_user`, `search_users`, `list_users` — five tools across four servers, all matching the same intent, none of them quite explaining when to pick which. The model guesses.

**Signal-to-noise in the context degrades.** Every tool description competes for attention with the user's actual request. Models have finite attention. The same task can succeed at 12 tools and fail at 50 with no other change. The model did not get worse. The needle got smaller.

**Tools overlap and contradict.** Two servers offer `send_message`. One means Slack, one means an internal pubsub. Descriptions are similar enough that the model picks the wrong one, the wrong one returns a polite error that does not say "you wanted the other server," and the agent gets stuck.

The [roundup of the first 100 MCP servers in the catalog](/blog/celebrating-100-mcp-servers-milestone) shows the diversity of description quality across the ecosystem. The best servers are surgical. A lot of the long tail is not. Connecting all of them at once does not yield a smart agent; it yields a noisy one.

## The number, and why "around 40"

There is no hard threshold to overclaim. What stress-tests against Archestra's dynamic tool engine and production traces consistently show is this:

Below roughly 20 tools, tool-selection accuracy is a non-issue on frontier models. Sonnet, Opus, GPT-5, Gemini 2.5 — they all pick correctly almost every time, even with mediocre descriptions.

Between 20 and 40, occasional bad picks appear, almost always on tools whose descriptions overlap. Good descriptions buy a lot of headroom. Bad descriptions cost it.

Past 40, the curve bends noticeably. By 70, tasks that would have succeeded at 20 reliably fail, and the failure mode is not "model refuses" — it is "model confidently calls the wrong thing." Those are the worst kind, because the agent keeps going.

The number moves with model and description quality, but the shape is the same on every model tested. There is always a knee, and it is closer to 40 than to 400.

## Designing a surface, not a pile

The wrong question is "how many tools can the agent handle?" The right question is "how few tools does the agent need to see right now?"

A pile is what comes from connecting every MCP server in reach and exposing all of it to one agent. A surface is what comes from deciding, for each agent and each moment, which tools are even in the room.

Three things work, in roughly increasing order of effort.

**Role-scoped agents.** Stop building "the everything agent." A support-triage agent does not need a finance database. A finance agent does not need GitHub issue tools. Splitting a 70-tool monolith into three 15-tool agents recovers accuracy overnight, with no model change.

**Identity-scoped tools.** Different users see different tools. A lawyer using an assistant does not need `kubectl_exec`. An SRE does not need `draft_engagement_letter`. Filtering by who the user is, before the model sees the manifest, is the cheapest accuracy win available. It is also a security win.

**Search-and-run instead of list-everything.** This is the architectural answer, and it is built into Archestra's [dynamic tool engine](/docs/platform-agents#search-and-run-tool-mode). Instead of dumping every tool into the system context, the agent gets exactly two: `search_tools` and `run_tool`. When it needs to act, it searches by intent ("post a message to a Slack channel"), reads descriptions for the handful of matches, and runs the one it picked. The full toolset can be 500 deep and the model only sees a handful at a time.

That pattern inverts the problem. With list-everything, the cost of adding a tool is paid on every request, by every agent, forever. With search-and-run, the cost is paid only when the tool is actually relevant. The catalog grows without the context growing.

The pattern is not new. It became Archestra's default once the alternative was watching teams slowly degrade their own agents by connecting more things. The [writeup on the dual-LLM pattern](/blog/dual-llm) follows the same spirit: do not ask the model to be smarter than the situation. Change the situation.

## What to do tomorrow

If an agent has gotten dumber recently and MCP servers have quietly piled up, count the tools. Not the servers — the tools. Past 40 is almost certainly the bug. Pick three things, in order:

Cut the agent in half by role. Most "everything agents" are two agents in a trench coat. Split them and most of the accuracy returns without changing anything else.

Audit the descriptions. The five tools used 90% of the time deserve crisp, distinctive descriptions. The other 30 can be terser, or gone. Descriptions are prompts. Treat them like prompts.

Move to search-and-run for the long tail. Keep the hot tools in the manifest. Push the rest behind a search. The model needs the others less often than expected, and it gets sharper when it isn't drowning in them.

The ceiling will move. Models will get better at picking from larger lists. None of that changes the shape of the curve. There is always a number past which the model picks badly, and the cheapest answer is to never get near it.

Design a surface. Not a pile.
