---
title: 'Thin MCP vs Fat MCP: Why Wrapping REST Endpoints Fails'
description: 'Thin MCP vs fat MCP — why wrapping every REST endpoint as a tool stops working past five tools, and what to ship instead.'
isNote: true
author: 'Mack Chi'
---

# Thin MCP vs Fat MCP: Why Wrapping REST Endpoints Fails

Thin MCP vs fat MCP is the central design question for any team exposing an existing REST API to agents. A thin MCP server emits one tool per HTTP endpoint, usually generated straight from an OpenAPI spec. A fat MCP server is schema-designed: tools are built around the agent's job, not the API's shape. The thin MCP approach ships in an afternoon and works for the first three calls — then collapses under selection collisions, half-filled inputs, and silent partial writes. The fat MCP approach costs a week and holds up in production. Past roughly eight tools, the thin MCP vs fat MCP tradeoff stops being a tradeoff: design wins.

A typical thin MCP build looks like this. Take a service with 30 REST endpoints, loop over the OpenAPI spec, emit 30 tools, ship. Forty minutes of codegen, done before lunch. It works for the first three things the agent is asked to do. Then it picks `update_user_v2` when it should have picked `patch_user_profile`, passes half the fields blank because the schema didn't say which were required for the path it was actually on, and silently writes a corrupt row. The wrapper is technically correct. The agent still gets it wrong.

## The Thin MCP Wrapper Trap

A thin MCP wrapper assumes a tool surface and an HTTP surface are the same shape. They aren't. An HTTP endpoint is designed for a developer reading docs, holding state in their head, and writing the right combination of params for the call they intend to make. The model has none of that. It sees a tool name, three sentences of description, and a JSON schema, and it has about two seconds to pick the right one out of thirty.

A thin MCP fails in three predictable ways:

- **Selection collisions** — `get_user`, `get_user_by_email`, `lookup_user`, and `find_user` all sound interchangeable to a model that didn't write the API.
- **Half-filled inputs** — endpoints that accept twelve optional params look like they want twelve values; the agent hallucinates defaults rather than admit it doesn't know.
- **Silent partial success** — the call returns 200, the model believes it, the database state says otherwise.

The HTTP endpoint was designed for humans typing in a terminal. The tool description is what the model actually sees — design it for the model.

## What a Fat MCP Server Actually Looks Like

A fat MCP server starts from the agent's job, not the API surface. For the same 30-endpoint service, a schema-designed rewrite collapses to 7 tools. One `find_customer` takes any of email / id / domain and decides internally which underlying endpoint to hit. One `update_customer_contact` bundles the four endpoints anyone actually chains together. One `archive_customer` does the soft-delete + audit-log + downstream-notify sequence the docs tell humans to do manually.

Each tool carries a tight description with a clear trigger, a clear "don't use this when…", and a named return shape. That's covered in [Your tool description IS a prompt](/blog/mcp-tool-descriptions-as-prompts) — same principle, applied one level up. Fewer tools, written harder. The FastMCP "analyze, then describe" pattern formalizes this: inspect the underlying API, group related operations into a single tool, and write the description as a decision aid for the model rather than a reference for the developer.

### Cost of the Rewrite

The upfront cost is real. The 30-tool wrapper takes an afternoon. The 7-tool rewrite takes about a week, mostly spent watching the agent pick wrong and adjusting both the tool boundaries and the descriptions. The payoff: tool-selection accuracy moves from "frequently wrong" to "rarely wrong," and context cost per turn drops because there are fewer schemas to read.

## When a Thin MCP Is Fine

This isn't a universal law. For an internal admin tool with five endpoints and one user, a thin MCP is correct — anything else is over-engineering. The failure mode kicks in around eight to ten tools, or the moment two tools could plausibly answer the same question.

Past either threshold, stop wrapping. Design.
