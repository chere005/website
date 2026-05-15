---
title: 'The confused deputy problem, MCP edition'
description: 'The confused deputy MCP problem: shared service tokens make gateways act under the wrong authority. The fix is per-identity routing and per-call authority checks.'
isNote: true
author: 'Mack Chi'
---

# The Confused Deputy MCP Problem

The confused deputy MCP problem describes any setup where an MCP gateway holds privileged credentials and acts on instructions whose authority it never verifies. An MCP agent that holds service-account credentials and acts on content from random third parties is a confused deputy by construction. The fix is not a better prompt and not a smarter model — it is per-identity routing and authority checks on every call.

A common pattern: an MCP gateway holds a single admin-scoped service token for a downstream system (ticketing, CRM, code host). Every call from the agent — regardless of which user is talking to it — goes out under that one token. The downstream system happily returns everything the admin can see. The calling user's session, their org, their permissions never make it to the API. The agent is a deputy. The downstream system trusts it. The agent has no idea whose authority it is supposed to be acting under.

That is the confused deputy MCP pattern, and almost every MCP setup in the wild has some flavor of it.

## A 1988 Problem In A 2026 Wrapper

The original "confused deputy" paper is from [Norm Hardy, 1988](https://www.cap-lore.com/CapTheory/ConfusedDeputy.html). The example is a compiler that has the privilege to write to a billing file, and a user who asks the compiler to write its output to that same billing file path. The compiler does what it's told. The user could not have written to the billing file directly — but the deputy (the compiler) could, and it did not check whether the _caller_ had the right to ask.

The formal definition: a confused deputy is a program with privileges that gets tricked into using them on behalf of someone who lacks those privileges. The capability to act is not the same thing as the authority to act. The deputy has the capability. The caller is supposed to bring the authority. Skip that check on any call and the result is a vulnerability.

Mapping that onto MCP:

- the MCP gateway has a token (the **capability**) for a downstream service — say, a ticketing system, a CRM, a code host
- a user is talking to an agent through the gateway. the user has some level of access to that downstream service (the **authority**) — maybe none, maybe partial, maybe full
- the agent calls a tool. the gateway uses its token to hit the downstream API
- did anyone check the user's authority before the call went out?

If the answer is "no, the gateway just used its own creds," that deployment has a confused deputy. And unlike the 1988 compiler, a modern MCP deputy is also accepting instructions from web pages and emails it scraped two tool-calls ago. Same bug, more attack surface.

## Why MCP Makes The Confused Deputy Problem Worse By Default

Three things conspire in a default MCP deployment:

1. **MCP servers usually hold service-account credentials.** A typical install for Jira, GitHub, or an internal ticketing tool is: paste in one API token, done. That token belongs to whoever generated it — often an admin or a service account. Every downstream call inherits _that_ identity, not the calling user's.

2. **The agent acts on untrusted input.** An MCP agent reads emails, fetches web pages, summarizes tickets. Any of that content can contain instructions. ([See the lethal trifecta](/docs/platform-lethal-trifecta) for why this is a hard problem on its own.) The "caller" of a tool is not always a human — sometimes it is text that snuck in from a webpage telling the agent to call `delete_ticket(id=...)`.

3. **There is no concept of "on behalf of whom" in most MCP server implementations.** The protocol carries tool calls. It does not natively carry the caller's identity through to the downstream API. Unless the gateway adds that explicitly, the downstream service has no way to scope the call to the actual user.

Stack those together and the default state of an MCP deployment is: shared privileged creds + an agent that takes instructions from text + no per-call authority check. That is not a security weakness — that is a confused deputy MCP setup by construction.

## What "Per-Identity Tool Routing" Means In Practice

The fix is an architectural move: **pin every tool call to the identity of the caller, and route to credentials that actually represent that caller's authority.**

Concretely, when a tool call comes in, the gateway needs to:

1. know who the calling user is (from the MCP client's auth — see the [authentication guide](/blog/mcp-authentication-guide) for how that token gets there in the first place)
2. select credentials _for that user_, not a shared admin token — either the user's own OAuth token to the downstream service, or a delegated grant minted on their behalf ([enterprise-managed authorization](/blog/enterprise-managed-authorization-mcp) is one way to do this cleanly)
3. evaluate any tool-call policy with the user's identity as part of the input, not just the tool name and args ([AI tool guardrails](/docs/platform-ai-tool-guardrails) is where this enforcement lives in Archestra)

In pseudo-code, the bad version looks like this:

```python
# confused deputy. don't do this.
def handle_tool_call(tool_name, args, calling_user):
    creds = SERVICE_ACCOUNT_TOKEN  # one token for everyone
    return downstream_api.call(tool_name, args, auth=creds)
```

The user is right there in the function signature. The function ignores them. The downstream API sees only the service account. There is no point at which the user's authority is checked against what the call is actually doing.

The per-identity version:

```python
def handle_tool_call(tool_name, args, calling_user):
    # 1. resolve credentials that represent THIS user's authority
    creds = credential_store.for_user(calling_user, downstream="ticketing")
    if creds is None:
        raise NotAuthorized(f"{calling_user} has no creds for ticketing")

    # 2. policy check with identity in the input, not just tool + args
    decision = policy.evaluate(
        tool=tool_name,
        args=args,
        user=calling_user,
        context=current_conversation_context(),
    )
    if decision.block:
        raise Blocked(decision.reason)

    # 3. now call downstream as the user, not as the gateway
    return downstream_api.call(tool_name, args, auth=creds)
```

The shape is the same. The difference is that authority is pinned to the caller on every single call. If the agent gets prompt-injected by a webpage and tries to `delete_ticket(id=999)`, the deletion goes out under the calling user's creds — and if that user cannot delete that ticket, the downstream system rejects it. The deputy is no longer confused, because it stopped pretending to be everyone at once.

## Opinion: Per-Identity Routing Should Be A Default, Not A Feature

"Per-identity tool routing" sounds like a fancy enterprise add-on. It should not. It is the only configuration of an MCP gateway that is not a confused deputy. Shared-credential setups deserve the same treatment as a web app that ran every request as `root`: technically functional, but never something to ship on purpose.

A few things every MCP deployment should be able to answer without having to dig:

- which downstream identity was used for this tool call?
- which calling user authorized it?
- if the answers to those two are different, why — and is that intentional (e.g. a deliberate service-to-service call) or accidental (e.g. nobody ever wired user creds through)?

If a deployment cannot answer the third one, it does not have a security model — it has a deputy and some hope. Norm Hardy figured this out in the 80s. The confused deputy MCP pattern should not have to be relearned one prompt injection at a time.

A couple of related posts worth pulling on: [a developer's guide to MCP authentication](/blog/mcp-authentication-guide) covers how the caller's identity reaches the gateway in the first place, and [enterprise-managed authorization for MCP](/blog/enterprise-managed-authorization-mcp) covers one clean way to mint per-user grants for downstream MCP servers so the gateway never has to hold a shared admin token at all.
