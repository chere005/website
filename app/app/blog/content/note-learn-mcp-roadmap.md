---
title: 'How to actually learn MCP in a week'
description: 'How to learn MCP in a week: a day-by-day plan. Skip the spec, ship a tool, watch the model pick wrong, then fix it.'
isNote: true
author: 'Mack Chi'
---

# How to learn MCP in a week

How to learn MCP fast: skip the spec, run an existing server, ship one tool, and iterate on its description until a model calls it reliably. Most developers stall because they read the spec front to back, watch hours of video, and bookmark dozens of repos before ever getting a model to call a tool they wrote. The steps are in the wrong order. Three days of focused work is enough to learn MCP end to end.

The thing nobody states up front: MCP itself is easy. The protocol is small. The SDKs are good. A working server fits in 200 lines. **MCP itself is easy. Tool design, what to expose, how to describe it, what to return, is where weeks go.** Plan accordingly.

## What not to do when learning MCP

Do not read the full spec. Do not start by comparing transports. Do not pick a "real" project to build before a model has called a tool even once. Starting with the spec produces strong opinions about JSON-RPC framing and zero intuition about why a tool returns garbage.

## The week-long plan to learn MCP

**Day 1: Read the intro, then stop.** Skim the [MCP overview on the docs](/docs/platform-mcp) and the official intro. Read enough to know what a tool, a resource, and a prompt are. Close the tab at the phrase "capability negotiation." That is week-two material.

**Day 2: Run an existing server locally.** Pick a boring one. The filesystem server is fine. Wire it into Claude Desktop or an IDE. Ask the model something concrete, like "list the files in this folder and tell me which ones changed today." Watch a real tool call happen end to end. Notice how the model picks the tool. That is the whole magic.

**Day 3: Write one tool.** One. Use the Python or TypeScript SDK. Make it dumb, like `get_weather(city)` that returns a hardcoded string. The point is not the tool. The point is the loop from "function written" to "model called it." Ship it over stdio. Forget HTTP for now.

**Day 4: Stress-test the description.** Take yesterday's tool and rewrite its description three different ways. Vague, specific, and weirdly specific. Ask the model the same question each time. Watch the tool get picked or ignored. This is the day the lesson lands: the description is the prompt the model sees, not a comment for humans.

**Day 5: Add a second tool, watch it break.** Add `get_forecast(city, days)` next to `get_weather(city)`. Ask ambiguous questions. The model will pick the wrong one. Fix the descriptions until it stops. That is the actual job of learning MCP.

## Where to spend week 2 after learning MCP basics

Tool design and evaluation. Read [the note on naming conventions](/blog/mcp-tool-naming-conventions). Start an eval harness, even a crappy one, that runs ten prompts against the server and logs which tool got called. That harness is the difference between shipping MCP servers and guessing. Everything else, transports, auth, gateways, resources, sampling, is downstream of getting tool design right.
