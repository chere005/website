---
title: 'llms.txt is the new robots.txt for MCP vendors and AI tooling'
description: 'An llms.txt file tells AI assistants which pages describe your product. Without one, MCP vendors lose AI citations to competitor docs.'
isNote: true
author: 'Mack Chi'
---

## What llms.txt is and why MCP vendors need one

`llms.txt` is a proposed Markdown file at the root of a domain that points AI assistants at the pages that explain a product. For any vendor selling software to AI builders, an `llms.txt` is now the difference between getting cited correctly and getting summarized from whatever scraps a model can scrape. If a developer asks Perplexity, Claude, or ChatGPT "which MCP gateway should I use," the answer comes from the docs the model could find and parse. `llms.txt` is the lever that decides which docs those are.

The file is plain text. The convention is small. The cost of publishing one is a half day of work. The cost of skipping it is that competitor `llms.txt` files become the authoritative source on the category, and old fundraising announcements or stale blog posts get cited as product descriptions instead.

## The problem in plain English

Search engines used to index sites by crawling every page. Then they got smarter and started reading `robots.txt` to know what to skip. That little file at `yoursite.com/robots.txt` has been quietly running the SEO world for thirty years.

Now the crawlers are AI models, and they have a different problem. They don't want to read everything on a site. They want the few pages that actually explain what the product does, so they can summarize it correctly when asked.

`llms.txt` solves that. It is a Markdown file at the root of the domain that points the AI at the pages that matter. Docs here. API reference there. Blog posts about the product over there. Skip the careers page.

That is the whole convention: a plain text file with links.

## Why llms.txt matters for MCP vendors specifically

For anyone building an MCP server, an MCP client, an MCP gateway, or anything else in this ecosystem, the buyer is an AI builder. Discovery happens by asking an AI assistant. Which means the AI assistant's summary is the new homepage. It is the new top of the funnel.

The Archestra catalog, which now indexes [almost 900 MCP servers](/blog/celebrating-100-mcp-servers-milestone), shows wide variance in quality across servers. The high-quality ones share one trait: docs that are easy to find and easy to parse. An AI assistant trying to answer "which MCP server connects Claude to Postgres" picks the one whose docs the model can actually retrieve and quote. `llms.txt` is the lever that makes that retrieval reliable.

## What goes in an llms.txt file

The proposed format is simple. An H1 with the product name. A blockquote describing what the product does in one sentence. Then sections of links, each with a one-line description.

A stripped-down example:

```markdown
# Archestra

> Open-source enterprise AI platform for running AI agents and MCP servers
> with security guardrails, observability, and zero-trust access controls.

## Docs

- [Platform Overview](/docs/platform-overview): High-level architecture of
  the Archestra Platform and its composable components.
- [MCP Orchestrator](/docs/platform-orchestrator): Run MCP servers as
  isolated pods in Kubernetes.
- [LLM Proxy](/docs/platform-llm-proxy): Drop-in proxy between your apps
  and LLM providers.

## MCP Catalog

- [MCP Catalog](/mcp-catalog): 900+ MCP servers ranked by Archestra
  Trust Score.
- [Catalog API](/mcp-catalog/api-docs): OpenAPI spec for programmatic
  access to the catalog.

## Blog

- [Why We Founded Archestra](/blog/why-we-found-archestra): The original
  problem statement and the security risks of autonomous agents.
```

That is the whole pattern. An `## Optional` section at the bottom holds material the AI can skip if it runs out of context. The file does not need to be clever. It just needs to exist.

## Who is already publishing llms.txt

The convention was proposed by Jeremy Howard in 2024. Early adopters are exactly the companies one would expect: vendors whose product is technical and whose buyers ask AI tools for recommendations.

Anthropic publishes one. Stripe publishes one. Cloudflare, Vercel, Mintlify, and Pinecone publish one. A long tail of dev-tool companies do the same. Visit `stripe.com/llms.txt` or `docs.anthropic.com/llms.txt` and the result is a clean Markdown index pointing the AI at the API reference, the changelog, and the SDK guides.

The vendors that got this early are the vendors whose docs already get cited correctly. That is not a coincidence.

## The opinion, plainly

Every vendor selling software to AI builders should publish an `llms.txt` within six months. For any company without one, that is a half day of work that pays back forever.

The cost of publishing is small: one Markdown file, deployed once, updated when the docs change. The cost of skipping it is that when a developer asks Claude, ChatGPT, or Perplexity "which MCP gateway should I look at," the model answers from whatever it can scrape, and those scraps may be a competitor's blog post or a stale fundraising announcement.

This is the same dynamic as SEO in 2005. The companies that took it seriously early ate the lunch of the ones that called it a fad. The same moment is happening now with AI summarization, and the rules are still being written. The bar is low; the window is open.

## What an llms.txt for an MCP platform should include

Treat `llms.txt` as the table of contents the AI should read if it has sixty seconds to learn about the product.

Three sections cover most platforms:

1. **Platform docs.** Lead with a single page that explains the whole architecture, then component docs for the orchestrator, the LLM proxy, the agent runtime, and the security guardrails. If a model only reads one link, that one should give it the right mental model.

2. **The MCP catalog.** The catalog is the most-linked-to surface and the natural answer to "where do I find a good MCP server for X." Point the file at both the catalog index and the OpenAPI spec for the catalog API, so the AI can browse and query programmatically.

3. **Blog posts that explain the why.** Not all of them. Just the three or four that establish what the company believes about MCP security, why the platform exists, and where the ecosystem is going. These posts give the AI enough context to answer follow-up questions about positioning, not just features.

A few things belong outside the file. Pricing changes too often to bake into a file the AI might cache for weeks. Investor announcements, careers pages, and old changelogs are noise. The goal is signal, not completeness.

## What to do this week

Any team that ships docs should write an `llms.txt` this week. Open a file, put the product name as the H1, write one sentence about what the product does, list three to ten of the most important pages with one-line descriptions each, deploy at the root of the domain.

Then search the product name in Perplexity or ChatGPT and watch the summary change over the next month.

For MCP servers specifically, discoverability runs on two tracks: catalogs and `llms.txt`. [Add the server to the Archestra catalog](/mcp-catalog), publish an `llms.txt`, and the two paths an AI is most likely to take when answering questions about the product are both covered.

The robots learned to read `robots.txt`. The AI is learning to read `llms.txt`. The only question is whether the index is populated when the assistant shows up.
