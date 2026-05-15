---
title: 'How the Archestra MCP server quality score works'
description: 'Breakdown of the four sub-scores behind the Archestra MCP server quality score, what each component measures, and why a single number is a filter, not a verdict.'
isNote: true
author: 'Mack Chi'
---

The Archestra MCP server quality score is a 0-to-100 number assigned to every server in the [catalog](/mcp-catalog), built from four weighted sub-scores: MCP protocol implementation (40 points), GitHub metrics (20), documentation (20), and code quality (20). The MCP server quality score is a filter for triage, not a safety stamp. This note documents the methodology, the weights, and the limits.

## What the MCP server quality score solves

Selecting an MCP server means plugging code from a stranger into an agent loop. That code can read files, call APIs, and write data on the user's behalf. The MCP server quality score exists to make that triage faster across a catalog that lists close to 900 servers, ranging from small-team production builds to single-author weekend projects with three GitHub stars.

The score is one filter. It indicates whether a server is worth the next 30 minutes of evaluation or whether the next entry on the list deserves attention. It is not a stamp of approval. The opinion on that follows below.

This note covers three things. First, the four sub-scores and what each one measures. Second, the rationale for the weights. Third, the part most write-ups skip: what the MCP server quality score does not tell you.

## The four sub-scores

The total is out of 100. Here is how the 100 splits.

### 1. MCP Protocol Implementation, up to 40 points

This is the largest chunk and the most important component of the MCP server quality score. The MCP spec defines a range of capabilities a server can implement. Tools (functions the agent can call). Resources (data the agent can read). Prompts (reusable templates). Sampling (the server requesting completions from the model). Plus transports like stdio and streamable HTTP, and operational features like logging, roots, and OAuth.

The breakdown:

- 8 points each for tools and resources (the two pillars of MCP)
- 5 points each for prompts and sampling
- 4 points each for stdio and streamable HTTP transports
- 3 points each for roots and logging
- 2 points for OAuth

A server that only implements one tool over stdio gets 12 here. A server that implements tools, resources, prompts, both transports, and logging is closer to 32. The score rewards servers that took the protocol seriously and built more than a quick demo.

### 2. GitHub metrics, up to 20 points

Stars, contributors, and issues. Crude, but a useful sanity check. A repo with 2,000 stars and 30 contributors is not the same animal as a fork with 3 stars and one drive-by commit.

- Stars contribute up to 10 points, on a curve. More than 1,000 stars gets full credit. Under 10 stars gets zero.
- Contributors contribute up to 6 points. More than 10 contributors gets the max. A single-author repo gets zero here.
- Issues contribute up to 4 points. Counterintuitive at first, but an active issue tracker signals that real users run the thing and report bugs.

When a single repo hosts multiple MCP servers, these numbers are divided by the server count. Otherwise a monorepo with 50 servers would have every server inheriting the same 20-point GitHub halo, which is misleading.

### 3. Documentation, up to 20 points

Mostly README quality. A real README, not a "hello world" stub. Whether the server explains what it does, how to install it, how to configure it, what environment variables it expects. Documentation is the lowest-effort thing a maintainer can do, and its absence correlates strongly with everything else being broken.

This slot also checks whether the maintainer linked back to the Archestra [catalog](/mcp-catalog) or badge. That is a small piece. The main signal is whether someone wrote down what this thing does for the next human who shows up.

### 4. Code quality, up to 20 points

This category bundles a few things: dependency footprint, deployment maturity (does the repo have CI/CD, does it publish releases), and whether the dependencies it uses are common or weirdly obscure. A server with zero dependencies scores well here. A server with 40 dependencies, half of which are packages no one else uses, gets dinged.

The dependency check is the part of the MCP server quality score targeted for ongoing tightening. A server that pulls in something niche and abandoned is a supply-chain time bomb, and the score should flinch when it sees one.

## Why these weights

Forty points for protocol implementation, twenty each for the other three. The reasoning is simple. Stars and a README do not make a working MCP server. Protocol implementation does. The weighting reflects the thing the server is actually supposed to do and treats the rest as context.

GitHub metrics are easy to game and easy to be unlucky about. A great server from a small team with no marketing might sit at 50 stars forever. So 20 points is the cap, never more. Documentation matters but is shallow. Code quality matters but is hard to measure without running the thing.

If GitHub stars were worth 50 points, the catalog would become a popularity contest. That contest already runs in plenty of other places.

## What the MCP server quality score does not tell you

This is the opinion part. A single score is reductive. It always is.

Here is the recommended way to use it. Below 40: move on. The signal is that the server is too early or too rough; revisit later. Between 40 and 70: read the breakdown and the README. The score indicates the entry is worth a closer look, not that it is safe. Above 80: still do an independent review before letting it touch anything that matters. A 95 means the maintainer has done their homework. It does not mean the server is safe for a specific stack, dataset, or threat model.

Do not ship a 35. Do not ship a 95 without an independent review either. Treat the score like a code review comment from a junior reviewer: it caught the obvious stuff; the rest is on the operator.

The other thing the MCP server quality score deliberately does not measure is intent. The methodology can detect whether a server has tests and a README. It cannot detect whether the maintainer is going to push a malicious update next Tuesday. That is a different problem and the reason Archestra ships a [sandboxing layer](/blog/why-we-found-archestra) in the first place. The score is hygiene. Sandboxing is defense.

Maintainers who want to see their own number can check the [catalog](/mcp-catalog): every server is evaluated automatically and the scoring code is open source. Run it locally, review the flags, and if a check feels wrong, open an issue. The methodology improves when people argue with it.
