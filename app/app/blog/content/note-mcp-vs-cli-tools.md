---
title: 'MCP vs CLI tools'
description: 'MCP vs CLI tools: when a one-line CLI beats a typed MCP server, and why response shape matters as much as what the tool does.'
isNote: true
author: 'Mack Chi'
---

## MCP vs CLI tools: pick the smallest response shape

In the MCP vs CLI tools debate, the right choice is whichever surface returns the smallest representation that still completes the task. Microsoft's Playwright team — the same group shipping the Playwright MCP — now recommends agent builders call the Playwright **CLI** for most tasks, not the MCP. That guidance isn't a contradiction. It's the cleanest tool-design lesson of the year: the protocol on the wire matters less than the shape of what comes back.

## The Playwright recommendation, in one paragraph

Playwright MCP exposes a fully-typed browser surface. Click this, type that, read the accessibility tree. That fits UI automation — exactly what the protocol was built for. But agents do plenty of work that isn't UI automation. "Fetch this page and report the price." "Run the test suite and report the failure." For tasks like those, the Playwright CLI returns a URL, an exit code, a single string. The MCP returns a 114k-token accessibility tree. Same vendor, same browser, wildly different answer cost. That single contrast is the whole MCP vs CLI tools argument compressed into one example.

## Response shape is the real variable

The transferable principle: protocol matters less than response shape. A tool that returns one line is nearly free for the agent — a few tokens in context, a clean handoff to the next step. A tool that returns a structured tree is expensive on every turn, and the cost compounds because the model keeps re-reading it as the conversation grows.

**The response shape of a tool matters as much as what the tool does. A CLI returning one line beats a 114k-token accessibility tree every time the task is "fetch and parse."**

Pick the smallest representation that completes the task. If the agent needs to introspect a live page and decide what to click next, give it the tree. If the agent needs the price of a SKU, give it the price. The reflex to "expose the whole capability through MCP because MCP is the modern thing" is how agents burn their context window before the user finishes the sentence.

That logic rhymes with the [MCP tool naming conventions](/blog/mcp-tool-naming-conventions) argument. Names, descriptions, and return shapes are all microcopy the model reads at decision time. Each one quietly nudges the agent toward calling a tool — or away from it.

## When to ship both in the MCP vs CLI tools tradeoff

For most teams the honest answer is: ship a CLI _and_ a thin MCP that calls the CLI internally for the narrow cases where typed structure beats string output. The CLI carries the deterministic, cheap path. The MCP carries the interactive, exploratory path. Most agents reach for the CLI 80 percent of the time, and the MCP still earns its keep for the other 20.

One sharp edge: shipping only the MCP also imposes a discoverability tax. The agent has to load the schema before it knows the tool exists. A CLI on the agent's PATH is just there. For an agent already capable of running `bash`, that's the cheaper handshake. Each surface should do what it's good at.

The indirect lesson from the Playwright team: MCP vs CLI tools was never the real question. The real question is which response shape lets the agent finish the task in the fewest tokens.
