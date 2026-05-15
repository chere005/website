---
title: 'What is WebMCP'
description: 'WebMCP explained: a typed tool surface inside the browser tab that ends the screenshot-and-guess loop computer-use agents fall into.'
isNote: true
author: 'Mack Chi'
---

# What is WebMCP

WebMCP is an MCP transport that runs inside the browser tab itself. A web page registers typed tools at load time and exposes them to whatever AI agent is driving the tab, replacing the screenshot-and-guess loop used by computer-use agents with a structured tool list. WebMCP is currently the most consequential MCP transport to land, because it directly attacks the dominant cost in agent-driven web automation: pixel interpretation.

For context, MCP is the protocol that lets an AI agent call typed tools. The local versus hosted distinction is covered in [Remote MCP vs local MCP](/blog/mcp-remote-vs-local). WebMCP is a third option that sits in neither place — it lives inside the browser tab.

## The 60-second WebMCP definition

A web app loads its JavaScript. Some of that JavaScript registers tools — `addExpense`, `filterByVendor`, `submitForReview` — and exposes them through a standard MCP interface that the browser hands to whatever agent is driving the tab. The agent does not see pixels. It sees a tool list, with names, parameters, and return types, the same shape it already knows how to handle.

That is WebMCP in one paragraph: MCP, but the server runs in the page itself.

## Why WebMCP matters

The cheap way to drive a web app with an agent today is "computer use" — screenshots in, mouse coordinates out. It works. It is also a tax. The model has to interpret pixels every turn, and the screenshot is the single fattest thing in the context window. Production traces show the pixel-interpretation loop consuming roughly 40% of agent token budgets. A typed tool surface inside the tab is how those tokens come back.

There is a second cost that is harder to see in the bill: reliability. Pixels lie. A button moves three pixels, the model misses it, the run fails halfway through. Typed tools do not have that failure mode. `submitForReview({ expenseId })` either succeeds or returns a structured error. The agent reads the error and tries again. The recovery loop becomes deterministic, which is the part the user actually feels.

## What the page is doing

A WebMCP-enabled page registers tool definitions at load time, the same way a normal page registers event listeners. The page knows its own state — which expense is open, which vendor is filtered, who the logged-in user is — so the tool signatures can be narrow and specific. After a route change, the page re-registers the tools that now apply. The agent, which is already sitting in front of the tab, gets a fresh tool list without having to re-read the DOM.

The clever part: the app author writes the tools once, in the same codebase that already renders the UI, and every agent that visits the page inherits them.

## Where WebMCP does not fit

WebMCP is a browser thing. If an agent is a backend job pulling Slack messages on a schedule, the tab is not running and the tools are not there — that is a job for a regular remote MCP server. Same for any flow with no human-driven session: headless scrapers, cron-style automations, CI bots. WebMCP only shines when there is a real tab open and an agent on the other side of it.

It also does not replace a backend auth model. The page still calls the API under the user's session. WebMCP is the part the agent sees; the security perimeter of the app stays exactly where it was yesterday.

## The opinion

Web apps that expect agents to use them should expose existing client-side actions as WebMCP tools and abandon the idea that a model should ever have to look at the UI. The screenshot loop was a bridge. WebMCP is the road.
