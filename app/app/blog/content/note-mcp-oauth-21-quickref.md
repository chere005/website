---
title: 'MCP OAuth 2.1 Quick Reference'
description: 'MCP OAuth 2.1 quick reference: the five endpoints, PKCE flow with curl, discovery document, and the audience claim most implementations forget.'
isNote: true
author: 'Mack Chi'
---

# MCP OAuth 2.1 Quick Reference

MCP OAuth 2.1 boils down to five HTTP endpoints, an Authorization Code + PKCE flow, two `.well-known` discovery documents, and one audience claim that almost every implementation gets wrong. this page is the cheat sheet — plain-english first, spec-accurate second. it covers what each endpoint returns, how the PKCE exchange looks on the wire, and which fields the [MCP authorization spec](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization) actually requires.

before the endpoints — the plain-english version of why any of this exists:

an MCP client (an IDE, a desktop AI app, a CLI agent) wants to call an MCP server on a user's behalf. the server doesn't trust the client blindly. so the server says "go get a permission slip from this authorization server first." the client opens a browser, the user logs in and clicks "allow," and the authorization server hands the client a short-lived token. the client shows that token on every request. that's it. the rest is just figuring out which url returns what.

for the long-form walkthrough of why MCP chose OAuth 2.1, what discovery looks like end-to-end, and how CIMD vs DCR plays out — that lives in [A Developer's Guide to MCP Authentication](/blog/mcp-authentication-guide). this post stays narrow on the endpoints and the wire format.

## The Five MCP OAuth 2.1 Endpoints

every MCP OAuth 2.1 authorization server exposes the same handful of HTTP endpoints. four are required for the standard authorization code flow, the fifth is technically optional but should ship anyway (more on that below).

| Endpoint                                  | Spec      | Who calls it              | When                                          | Key field returned                            |
| ----------------------------------------- | --------- | ------------------------- | --------------------------------------------- | --------------------------------------------- |
| `/.well-known/oauth-authorization-server` | RFC 8414  | MCP client                | once, after the initial 401                   | URLs for all the endpoints below              |
| `/.well-known/oauth-protected-resource`   | RFC 9728  | MCP client                | once, from the `WWW-Authenticate` header      | `authorization_servers` array                 |
| `/authorize`                              | OAuth 2.1 | user's browser            | start of the flow, with `code_challenge`      | authorization `code` (via redirect)           |
| `/token`                                  | OAuth 2.1 | MCP client (back channel) | exchange `code` + `code_verifier`, or refresh | `access_token`, `refresh_token`, `expires_in` |
| `/register`                               | RFC 7591  | MCP client                | once, if using Dynamic Client Registration    | `client_id`                                   |
| `/revoke`                                 | RFC 7009  | MCP client                | on logout or token compromise                 | 200 OK, empty body                            |

a couple of notes:

- the MCP spec adopted **CIMD** (Client ID Metadata Documents) as the default registration method in the 2025-11-25 revision. if a client uses a CIMD URL as its `client_id`, `/register` is never called — the authorization server fetches the client's metadata from the URL instead. `/register` is still important for backwards compatibility with DCR clients, so don't rip it out.
- **opinion:** `/revoke` is listed as "optional" in OAuth 2.1, but that's the kind of optional that turns into a security incident in 18 months. MCP clients sign users out, devices get lost, refresh tokens leak. ship `/revoke`. it's twelve lines of code and it's the difference between "user logged out" and "token still works until it expires three days from now." it's the most underused endpoint in the whole spec and arguably should have been required.

## The PKCE Flow, in One Diagram

the MCP OAuth 2.1 spec mandates Authorization Code + PKCE for every client. no implicit grant. no password grant. no client secret stuffed into a desktop binary where anyone with `strings` can find it. the full exchange in five steps:

1. client generates a random `code_verifier` (43-128 chars, unreserved URL characters).
2. client computes `code_challenge = BASE64URL(SHA256(code_verifier))`. method must be `S256`. `plain` exists in the spec but provides no security benefit — do not use it.
3. client opens the system browser to `/authorize` with `code_challenge`, `client_id`, `redirect_uri`, `scope`, `state`, and `resource`.
4. user logs in and consents. server redirects to the client's `redirect_uri` with `?code=<code>&state=<state>`.
5. client POSTs the `code` and the **original** `code_verifier` to `/token`. server verifies `SHA256(code_verifier) == code_challenge` from step 3 and returns tokens.

the minimal `/token` exchange:

```bash
curl -X POST https://auth.example.com/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=abc123" \
  -d "redirect_uri=http://127.0.0.1:34567/callback" \
  -d "client_id=https://cursor.com/.well-known/oauth-client/mcp" \
  -d "code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk" \
  -d "resource=https://server.example/v1/mcp"
```

response:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "dhl3kJo9sE...",
  "scope": "mcp:tools mcp:resources"
}
```

important — a few sharp edges that bite almost every implementation:

- the MCP spec requires `S256`. always check `code_challenge_methods_supported` in the discovery document before assuming. if `plain` shows up, the server is non-compliant for MCP — don't paper over it, fix it.
- MCP clients usually redirect to a loopback address with a dynamic port (`http://127.0.0.1:<port>/callback`). the authorization server must allow flexible port matching per RFC 8252. if an auth server insists on an exact port match, every client restart breaks the flow.
- include the `state` parameter and verify it on the callback. skipping `state` opens the door to CSRF on the authorization response. it's two extra lines. just do it.

## Scopes and Audience-Bound Tokens

OAuth scopes in MCP OAuth 2.1 do two jobs: gate capabilities at the resource server, and bind the token to a specific MCP resource via the `resource` parameter (RFC 8707).

scope strings should be specific. the MCP spec doesn't standardize a scope vocabulary, but the conventions that have shaken out look like this:

- `mcp:tools` — call `tools/list` and `tools/call`
- `mcp:resources` — read MCP resources
- `mcp:prompts` — read MCP prompts

now for the part most implementations get wrong, and this is the **strongest opinion** in this post: the `resource` parameter is load-bearing. it's not optional polish. it's not a "nice to have." it's the thing that stops a token minted for Server A from being replayed against Server B when both happen to trust the same authorization server.

send `resource` on both `/authorize` and `/token`:

```
resource=https://server.example/v1/mcp
```

the resulting access token — typically a JWT — includes an `aud` (audience) claim matching that URL. the resource server **must** reject tokens whose `aud` does not match its own identifier. a resource server that skips this check doesn't have audience binding, it has a footgun. this gets skipped more than once in real deployments, usually because "there's only one MCP server right now." there will be a second one in six months. check the claim.

for the JWT validation pattern itself, see [Building Enterprise-Ready MCP Servers with JWKS and Identity Providers](/blog/enterprise-mcp-servers-jwks). that post covers the actual `jose.jwtVerify` / Python `pyjwt` code.

## What the Discovery Document Looks Like

`GET /.well-known/oauth-authorization-server` returns a single JSON document. the minimal valid response for an MCP OAuth 2.1 authorization server:

```json
{
  "issuer": "https://auth.example.com",
  "authorization_endpoint": "https://auth.example.com/authorize",
  "token_endpoint": "https://auth.example.com/token",
  "registration_endpoint": "https://auth.example.com/register",
  "revocation_endpoint": "https://auth.example.com/revoke",
  "jwks_uri": "https://auth.example.com/.well-known/jwks.json",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"],
  "token_endpoint_auth_methods_supported": ["none", "client_secret_basic"],
  "scopes_supported": ["mcp:tools", "mcp:resources"]
}
```

a few fields worth calling out:

- `token_endpoint_auth_methods_supported` must include `none` to support public clients (desktop apps, CLIs). public clients can't safely store a `client_secret` — that's the whole reason PKCE exists.
- `code_challenge_methods_supported` must be `["S256"]`. if `plain` shows up, the server is non-compliant for MCP.
- `jwks_uri` is not strictly required by RFC 8414, but if the server issues JWT access tokens, it's needed so resource servers can validate signatures.
- if the server supports the device-code flow for headless clients (CLI agents, CI runners), also include `"urn:ietf:params:oauth:grant-type:device_code"` in `grant_types_supported`.

the companion document at `/.well-known/oauth-protected-resource` (RFC 9728) is served by the **resource server**, not the authorization server. it tells a client which authorization server protects a given MCP endpoint:

```json
{
  "resource": "https://server.example/v1/mcp",
  "authorization_servers": ["https://auth.example.com"],
  "scopes_supported": ["mcp:tools", "mcp:resources"]
}
```

one spec ambiguity that catches people: RFC 9728 specifies path-aware resource metadata, so the canonical URL is `/.well-known/oauth-protected-resource/v1/mcp` (with the resource path appended), not the bare `/.well-known/oauth-protected-resource`. some servers serve both. clients should follow the URL from the `WWW-Authenticate` header verbatim and not invent the path themselves.

## What Changes for Enterprise

once deployment leaves single-user-on-laptop territory, two things show up that aren't in the OAuth 2.1 spec proper.

first, **enterprise-managed authorization**: instead of the user consenting per server, the enterprise identity provider issues an Identity Assertion JWT Authorization Grant (ID-JAG), and the MCP authorization server exchanges that grant for an access token. the five endpoints above still exist — `/token` just also accepts `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer`. see [Enterprise-Managed Authorization for MCP](/blog/enterprise-managed-authorization-mcp) for the full flow and the part where the ID-JAG comes back in the `access_token` field even though it's not an access token (RFC 8693's fault, not MCP's).

second, **JWKS validation**: the resource server validates JWTs directly against the enterprise IdP's `jwks_uri` without minting its own tokens. see [Building Enterprise-Ready MCP Servers with JWKS and Identity Providers](/blog/enterprise-mcp-servers-jwks) for the validation code, and the [Archestra MCP authentication docs](/docs/mcp-authentication) for how this composes with a gateway. for deployments also fronting LLM traffic, [LLM Proxy authentication](/docs/platform-llm-proxy-authentication) follows the same patterns.
