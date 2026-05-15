---
title: 'ID token vs ID-JAG vs MCP access token'
description: 'ID-JAG token vs ID token vs MCP access token: what each one is for, who issues it, and the exact handoff between them.'
isNote: true
author: 'Mack Chi'
---

## ID-JAG token, ID token, and MCP access token explained

The [enterprise-managed authorization](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization) flow involves three different JWTs, and the naming is misleading. The biggest trap: the identity provider's token-exchange response looks like this:

```json
{
  "access_token": "eyJhbGciOi...the ID-JAG...",
  "token_type": "N_A",
  "issued_token_type": "urn:ietf:params:oauth:token-type:id-jag"
}
```

The field is called `access_token`. It is **not** an access token. It is an **ID-JAG token** — a grant that must be redeemed at a different server for the real access token. The `token_type` is `N_A` because the issuer is signalling "do not present this anywhere as a bearer credential."

That naming inherits from [RFC 8693](https://datatracker.ietf.org/doc/html/rfc8693)'s generic token-exchange shape, not from MCP. The result is the same regardless: the flow is easy to confuse on first contact, because the ID-JAG token rides in a field named after a different token type.

This note is the cheat sheet for the three "tokens" in enterprise-managed MCP authorization: ID token, ID-JAG token, and MCP access token — what each is for, who issues it, who consumes it, and the exact handoff. For the full walkthrough of the surrounding flow, see [Enterprise-Managed Authorization for MCP](/blog/enterprise-managed-authorization-mcp). This note is the narrower "what's the difference between these three things" companion.

## The three tokens at a glance

One-liner for each:

- **ID token** — proves who the user is. Issued by the IdP. Audience is the MCP client (Archestra, Cursor, etc.).
- **ID-JAG token** — proves the user authorized _this client_ to obtain access to _this MCP server_. Issued by the IdP. Audience is the MCP authorization server.
- **MCP access token** — what the client actually sends on real MCP requests. Issued by the MCP authorization server. Audience is the MCP resource server.

Three different jobs, three different audiences, two different issuers (the IdP issues two of them, for different purposes). The same information as a table:

|                           | ID token                                    | ID-JAG                                                            | MCP access token                        |
| ------------------------- | ------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------- |
| **what it's for**         | "the user is logged in"                     | "this client may request access for this user, for this resource" | "present this on MCP API calls"         |
| **issued by**             | enterprise IdP                              | enterprise IdP                                                    | MCP authorization server                |
| **audience (`aud`)**      | the MCP client                              | the MCP authorization server                                      | the MCP resource server                 |
| **what's inside**         | user identity claims (`sub`, `email`, etc.) | `sub`, `client_id`, `resource`, `aud`, scopes                     | scopes, `aud` of the resource server    |
| **JWT `typ`**             | `JWT` (or none)                             | `oauth-id-jag+jwt`                                                | usually `at+jwt`                        |
| **client presents it to** | nobody — it's stored                        | the MCP authorization server (once, to swap)                      | the MCP resource server (on every call) |

The audience is the giveaway. "Who is this token supposed to be shown to?" identifies which of the three is in hand without reading the body.

## The handoff, step by step

The flow is short: four hops. The user performs one of them. The client performs the other three.

```text
1. user → IdP                : "log the user in"
   IdP → client (ID token)   : "here's who they are"

2. client → IdP (ID token)   : "requesting access to MCP server X for this user"
   IdP → client (ID-JAG)     : "approved — here's a grant scoped to server X"

3. client → MCP auth server  : "redeem this ID-JAG, please"
   MCP auth server → client  : "here's an MCP access token"
                              : (the grant is now spent)

4. client → MCP resource     : "tools/list" + Bearer access_token
   MCP resource → client     : tools
```

Step 1 is normal OIDC login. Nothing new.

Step 2 is RFC 8693 token exchange. The client posts to the IdP's `/token` with `grant_type=urn:ietf:params:oauth:grant-type:token-exchange`, `subject_token=<the ID token from step 1>`, and a `resource` parameter pointing at the target MCP server. The IdP evaluates its policy ("is this client allowed to reach that resource on behalf of this user?"). On approval, it returns the ID-JAG token. **This is the response that puts the ID-JAG token in the `access_token` field.** The naming is misleading; the `issued_token_type` is authoritative.

Step 3 is RFC 7523 JWT-bearer. The client posts to the MCP authorization server's `/token` with `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer` and `assertion=<the ID-JAG>`. The MCP authorization server validates the JWT (signature against the IdP's JWKS, `aud` matches itself, `resource` matches what's being requested, `client_id` matches the requesting client, `typ` is `oauth-id-jag+jwt`, not expired). On success, it mints an MCP access token. The ID-JAG token is single-use at this point and must not be replayed.

Step 4 is regular MCP: `Authorization: Bearer <mcp_access_token>` on every request. When the access token expires, the client does not return to step 1 — it returns to step 2 (the ID token is still valid), gets a fresh ID-JAG token, redeems it, and gets a fresh access token. The user sees zero prompts.

## Why three tokens instead of one

A common first reaction to this flow is "why the extra hop? Can't the MCP server just trust the ID token directly?" The answer is what makes the spec interesting.

If the client sent the raw ID token to the MCP server, the MCP server would have to ask the IdP two completely different questions at once:

1. Is this user real?
2. Is this client allowed to talk to this server on this user's behalf?

An ID token can answer question 1. It cannot answer question 2 — its audience is the client, it has no `resource` claim, and it has no `client_id` claim describing who is _requesting_ access. That would reuse a login artifact as an API authorization, with the wrong audience.

The ID-JAG token is purpose-built for question 2. Its `aud` is the MCP authorization server. Its `resource` claim says exactly which MCP server it is good for. Its `client_id` says which client is asking. When the MCP authorization server validates it, every relevant claim is present in the JWT — no extra round trip to the IdP, no introspection call, no ambiguity.

The third token — the MCP access token — exists because the MCP server still wants to issue its own short-lived bearer that is audience-bound to its own resource URL, refreshable on its own clock, and revocable on its own terms. That is the same shape as any [OAuth 2.1 access token](/blog/mcp-oauth-21-quickref) issued in a normal MCP flow. The only difference is where the grant in front of it came from.

## Common gotchas

Things that trip up implementors and debuggers of this flow:

- **The `access_token` field in the token-exchange response is the ID-JAG token, not an access token.** The `token_type=N_A` and `issued_token_type=urn:ietf:params:oauth:token-type:id-jag` signal this. If a client sends that value to the MCP resource server as a bearer credential, step 3 was skipped — and the request will 401.
- **The ID-JAG token's `aud` is the MCP authorization server, not the resource server.** Putting the resource server's URL in `aud` causes the auth server to reject the grant for not being addressed to itself. These are two different URLs even when hosted by the same product.
- **The JWT `typ` header must be `oauth-id-jag+jwt`.** This is how the auth server distinguishes a grant from any other JWT the IdP might have issued. A missing or wrong `typ` typically produces a vague `invalid_grant` error and a long debugging session.
- **The ID-JAG token is one-shot.** Redeem it, get an access token, discard it. When a new access token is needed, perform token exchange again from the ID token to get a fresh ID-JAG token. Caching and replaying the same grant is not supported.

## Related reading

For the longer narrative on where this flow fits in enterprise MCP rollouts — why it exists, how it compares to the JWKS validation pattern, and how a gateway implements it — see [Part 3 of the auth series](/blog/enterprise-managed-authorization-mcp). This note is the deeper-but-narrower companion to that one.

For readers earlier in the journey ("what does normal MCP OAuth even look like"), start with [the OAuth 2.1 quick reference](/blog/mcp-oauth-21-quickref). The access token in step 4 above is the same shape as any access token from that flow — the enterprise-managed difference is purely in how the grant in front of it gets minted.
