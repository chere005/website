---
title: 'MCP prompts, resources, and sampling: the underused primitives'
description: 'MCP prompts resources sampling are in the spec, useful, and barely shipped. Why tools won the demo, and what the rest of the protocol leaves on the table.'
isNote: true
author: 'Mack Chi'
---

# MCP prompts, resources, and sampling: the underused primitives

MCP prompts resources sampling are the three Model Context Protocol primitives that almost no server ships, even though the spec defines them, the SDKs support them, and they solve problems the ecosystem keeps hand-rolling in app code. Tools are the fourth primitive and the only one with broad coverage. Audit any public MCP catalog and the pattern is consistent: dozens of tools per server, zero prompts, zero resources, no sampling support. The SDK quickstarts cover tools first, so server authors stop when the demo works.

## The tools-only default

A typical server in the wild ships twenty-plus tools and nothing else. No prompts. No resources. No sampling handler. The protocol gives a server four ways to talk to an AI app: tools, prompts, resources, and sampling. Tools are the one everyone ships, because tools are what demos on stage. The other three exist, they are documented, they work, and almost nobody uses them. Tools got attention because tools shipped first. Resources and sampling are the parts of the MCP spec that quietly solve the problems people are still hand-rolling.

For the full anatomy of tools, resources, and prompts with code examples, see [Tools, resources, prompts: the three MCP primitives](/blog/mcp-tools-resources-prompts). For sampling mechanics specifically, see [What does MCP 'sampling' actually do?](/blog/mcp-sampling-explained). This note is the opinion layer on top of both.

## Prompts: server-shipped slash commands nobody ships

A prompt is a template a user invokes on purpose. The user types `/summarize_quarterly_review`, the server expands it into a structured message, the model runs it. Prompts are how a server author ships an opinion about how their own data should be used.

Why nobody ships them: IDEs took a while to surface them in the UI, demo videos never include them, and the word "prompt" is overloaded into uselessness. A server maintainer knows the three workflows users will run. Shipping those as MCP prompts is two hours of work and it doubles how useful the server feels.

## Resources: the read-only handle people keep reinventing as a tool

A resource is read-only content the client attaches to context. The user picks. The model does not decide to call it. Nearly every public server has a `get_user_by_id` or a `read_file` tool sitting in `tools/list` that should be a resource. Each one burns a tool slot, eats schema tokens, and forces the model to decide on a read it should never have been deciding on.

Why nobody ships them: tools work in every client. Resources require the client to expose a picker, and not every client does. Server authors default to the lowest common denominator. Fair, but lazy. In a Postgres server, rows are resources. In a Jira server, tickets are resources. Treat read paths as MCP resources and the tool list shrinks by half.

## Sampling: the inversion the ecosystem refuses to use

Sampling lets the server ask the client to run an LLM call on the user's bill, with the user's model, with the user's consent. It is the only primitive that lets a server need an LLM inside a tool handler without smuggling an `OPENAI_API_KEY` into a Docker container. It is the cleanest idea in MCP and almost no client supports it, so almost no server bothers.

This is the chicken-and-egg failure of the protocol. Servers wait for clients. Clients wait for servers. Nobody moves. Meanwhile every framework reinvents the planner-worker pattern in app code, because the spec answer to it (a server samples the client mid-handler) does not work in the wild yet.

## What to ship

Server maintainers: ship one prompt and one resource this week. Client builders: support sampling. The half of MCP that nobody uses is the half that would make the catalog feel like products instead of search engines. Tools won the demo. MCP prompts, resources, and sampling are where the work is.
