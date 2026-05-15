---
title: 'MCP Context Window Too Many Servers: Why 100 MCP Servers Crush Your Agent'
description: 'MCP context window too many servers problem: 20 mounted servers eat 240k tokens before the first prompt. Three fixes, default-off as the rule.'
isNote: true
author: 'Mack Chi'
---

# MCP Context Window Too Many Servers: Why 100 Mounted Servers Crush Your Agent

The MCP context window too many servers problem is structural, not configurational. Mount 20 MCP servers and the manifest alone consumes ~240,000 tokens before a user types a single character. That is the entire context window on most production models, spent describing capabilities the agent will not invoke this turn. The fix is to treat the manifest as a budget: default every plugin off, consolidate overlapping servers, and filter at the gateway. Anything else just delays the ceiling.

This MCP context window too many servers issue is distinct from [how many MCP tools is too many](/blog/how-many-mcp-tools-too-many). That note covers per-task selection accuracy — the model picking badly when the menu gets long. This one covers steady-state context pollution: the cost paid on every request, on every agent, just for having servers _mounted_, whether the task needs them or not.

The MCP context window too many servers failure mode looks like a rate limit. It is not. It is a self-inflicted ceiling. Imagine walking into a kitchen to make toast and finding every appliance from every kitchen in the building dragged onto the counter — fondue pots, ice cream makers, a sous-vide rig, four blenders. The toaster is still there. It is still findable. But the counter is now the room.

## The Token Math

A mounted MCP server is not free. A typical server exposes ~30 tools, each with name, description, JSON schema, and often a usage hint. Average that to ~400 tokens of schema per tool — sometimes much more for tools with rich argument shapes. Twenty servers at 30 tools at 400 tokens is 240,000 tokens before the user has typed anything. That is the entire context window on most production models, gone, to describe capabilities the agent will not use this turn.

It gets worse on long conversations, because the manifest stays resident the whole time. The cost is paid on turn one. It is paid again on turn fifty.

## Three Fixes for the MCP Context Window Too Many Servers Problem

### Fix 1: Per-Session Tool Gating (Default Off)

Default every plugin to _off_. The model should only see tools granted for this task, not the tools it _could_ have. That is the rule. Most MCP setups today work the opposite way — everything mounted, the model picks. Flip it. Grant tools per session, per role, or per task. The Slack agent does not see GitHub. The triage agent does not see the finance DB. The manifest shrinks from "everything we own" to "what this run needs."

### Fix 2: One Server, Many Plugins

Consolidate. A lot of the bloat is structural: every team ships its own server and the schemas overlap. Three servers that each expose `search_user`, `get_user`, `list_users` is three near-duplicate descriptions competing for the model's attention and the token budget. Collapse them. One internal directory server with a clean tool surface beats three thin wrappers every time.

### Fix 3: Gateway-Side Manifest Filtering

Filter at the gateway. When servers cannot be removed — and most enterprises cannot remove them, because someone somewhere depends on each one — filter on the way out. A gateway sitting between the agent and the servers can drop tools the agent is not allowed to call, namespace-scope what the agent _is_ allowed to call, and serve a manifest that reflects this user, this role, this session. Same servers underneath. Different surface per agent. This is what Archestra's gateway implements, and it is the only one of the three fixes that does not require touching the servers themselves.

## What to Do Tomorrow

Count tokens, not servers. Print the manifest the agent actually sees and measure it. If it exceeds ~20,000 tokens before the first user message, half the context is already lost to introductions.

Then pick the cheapest fix that applies. If the agents are under control, default-off per task. If the servers are under control, consolidate. If neither is — which is most enterprises with three years of accumulated MCP — put a gateway in front and let it scope the manifest down to what each user needs.

The ceiling is not the model. It is the room the model was left in.
