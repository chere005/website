---
title: 'The MCP OAuth 2.1 sequence problem'
description: 'Most MCP OAuth 2.1 sequence bugs are not OAuth bugs — they are about which side initiates step N. A walkthrough for stdio and Streamable HTTP.'
isNote: true
author: 'Mack Chi'
---

# The MCP OAuth 2.1 sequence problem

Most MCP OAuth 2.1 sequence bugs reported in the wild are not OAuth bugs at all. The spec calls are correct, the PKCE math is correct, every endpoint returns what it is supposed to return — and the implementation still breaks because the client and the server disagree on who initiates step N. That disagreement, not the cryptography, is the source of half the failures.

The MCP OAuth 2.1 sequence problem is not documented in any diagram. The spec describes the five endpoints and the PKCE flow accurately, but says little about ordering across transports. For the spec-accurate cheat sheet, see the [MCP OAuth 2.1 quick reference](/blog/mcp-oauth-21-quickref). This note covers _the order things happen in_, which is where most MCP OAuth 2.1 sequence implementations diverge.

## The canonical MCP OAuth 2.1 sequence

An MCP client wants to call a tool. It has no token. It does not yet know that it needs one. Something has to say "stop, get a permission slip first" — something has to launch a browser, and something has to retry the original call once the token is in hand. Three different "somethings." That is the whole sequence problem.

The canonical flow:

1. Client calls the server with no `Authorization` header.
2. Server returns `401` with a `WWW-Authenticate` header pointing at `/.well-known/oauth-protected-resource`.
3. Client fetches that, follows the link to the authorization server's metadata, runs PKCE, gets a token.
4. Client retries the original call with `Authorization: Bearer <token>`.

Four steps. Easy on paper. The two MCP transports diverge sharply on which actor owns which step.

## stdio variant: who launches the browser?

stdio MCP servers are spawned as subprocesses by the client. There is no HTTP socket and no `WWW-Authenticate` header to emit. The question becomes: how does a subprocess tell its parent "I need auth, please open a browser?"

The spec answer is that stdio MCP servers should treat auth as a setup-time concern — credentials get injected via environment variables or a config file _before_ the process starts. The client owns the OAuth dance, not the server. Plenty of stdio servers nonetheless ship code that tries to initiate its own OAuth flow at first tool call, which means the model sees an error, retries, and the user sees nothing.

**Rule:** for stdio, auth happens _outside_ the JSON-RPC channel. The client (or a gateway) acquires the token first, hands it to the subprocess, done.

## Streamable HTTP variant: token on first call vs. negotiated upfront

Streamable HTTP is where MCP OAuth 2.1 sequence disagreements are sharpest. Two valid implementations exist:

- **Token-on-first-call.** Client calls the server with no token, eats the 401, runs the full discovery + PKCE dance, retries. One extra round trip per cold start, but the client assumes nothing.
- **Negotiated upfront.** Client knows it is talking to an authenticated server, runs OAuth at connect time, and the first JSON-RPC frame already carries the token. Faster, but the client must know in advance.

Both are in-spec. The bugs surface when the client assumes one model and the server assumes the other. Token-on-first-call requires the server to emit a useful `WWW-Authenticate` header (a surprising number do not). Negotiated-upfront requires the client to have cached the discovery document (a surprising number have not).

Always log the `401` and the `WWW-Authenticate` header on the client side. If the header is missing or malformed, hours get spent assuming the bug is in PKCE when it is actually three steps earlier.

Document which model the stack uses. Put it in the README. Half the bugs are sequence bugs, not OAuth bugs — naming the chosen MCP OAuth 2.1 sequence variant in writing eliminates most of them.
