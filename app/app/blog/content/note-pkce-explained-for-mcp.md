---
title: 'PKCE MCP: Why Every MCP Client Requires It'
description: 'PKCE MCP explained: the 4-step Proof Key for Code Exchange flow, what it defends against, and the localStorage bug to avoid in every MCP client.'
isNote: true
author: 'Mack Chi'
---

# PKCE MCP: Why Every MCP Client Requires It

PKCE MCP is mandatory because MCP clients are public apps — Claude Desktop, Cursor, VS Code, CLI agents — running on user devices with no safe place to store a `client_secret`. The MCP specification requires PKCE (Proof Key for Code Exchange) on the Authorization Code flow, which is the only OAuth flow MCP allows. PKCE doesn't care whether the MCP server itself holds secrets; it cares whether the things calling that server can. They cannot. So PKCE is required, every time, for every MCP client.

This note covers the PKCE MCP flow in plain English: the 4-step protocol, the threat model PKCE defends against, and the one implementation bug that surfaces in nearly every browser-based MCP client.

For the long-form coverage of the entire MCP auth stack — discovery, dynamic client registration, the full OAuth 2.1 surface — see [A Developer's Guide to MCP Authentication](/blog/mcp-authentication-guide). This note stays narrow: PKCE only.

## What PKCE Actually Is

Legacy OAuth issued each client a `client_secret`. The client transmitted that secret on every token request, and the server trusted the request because only the legitimate client knew the secret. That model works for a backend service. It fails for a desktop app: ship a binary with a baked-in secret and any attacker with `strings` extracts it in seconds.

PKCE (pronounced "pixie", Proof Key for Code Exchange) replaces the static secret with a fresh one generated per login. The client invents a random string, hashes it, transmits the hash to the authorization server during the redirect, then transmits the original string when exchanging the code for tokens. The server compares hashes. A match proves the same client initiated both legs of the flow. The secret exists only for one login, never ships in a binary, and is never reused.

**The `client_secret` is a relic of the pre-mobile internet, and PKCE is the mechanism that made OAuth usable again.** Every MCP client uses PKCE because no MCP client has a safe place to store a long-lived secret. The MCP specification does not make this optional — PKCE is required for the Authorization Code flow, which is the only flow MCP permits.

## The 4-Step PKCE MCP Flow

Four steps. Three happen invisibly in the browser; one is the actual cryptographic work.

**1. Generate a code verifier.** The client creates a random string of 43–128 unreserved URL characters. In Node:

```js
const verifier = crypto.randomBytes(32).toString('base64url');
```

**2. Derive the challenge.** SHA-256 the verifier, then base64url-encode the digest:

```js
const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
```

The method is `S256`. The `plain` method exists in the spec — sending the verifier as the challenge — and provides zero security benefit. Don't use it. The MCP specification requires `S256`. A server advertising `plain` in `code_challenge_methods_supported` is non-compliant, not flexible.

**3. Send the challenge on `/authorize`.** The client opens the system browser and includes `code_challenge` and `code_challenge_method=S256` in the query string:

```
https://auth.example.com/authorize
  ?response_type=code
  &client_id=https://cursor.com/.well-known/oauth-client/mcp
  &redirect_uri=http://127.0.0.1:34567/callback
  &scope=mcp:tools+mcp:resources
  &state=<random>
  &code_challenge=<challenge>
  &code_challenge_method=S256
```

The user logs in, approves the request, and the authorization server redirects back to `redirect_uri` with an authorization `code`. The server stores the challenge alongside the code in its own state.

**4. Send the verifier on `/token`.** The client POSTs the code plus the **original** verifier to the token endpoint:

```bash
curl -X POST https://auth.example.com/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=abc123" \
  -d "redirect_uri=http://127.0.0.1:34567/callback" \
  -d "client_id=https://cursor.com/.well-known/oauth-client/mcp" \
  -d "code_verifier=<the original random string>"
```

The authorization server recomputes `SHA256(code_verifier)` and compares it to the `code_challenge` captured in step 3. Match → tokens. No match → 400. That is the entire mechanism.

## What PKCE MCP Defends Against

The PKCE threat model is **authorization code interception**. Before PKCE, mobile attackers could register a malicious app claiming the same redirect URI scheme as a legitimate one (`myapp://callback`). When authorization completed, the OS handed the redirect — code included — to whichever app responded first. The malicious app traded the code for tokens because the legacy flow needed only the code and the public `client_id`. Game over.

On desktop the equivalent vector is loopback redirects (`http://127.0.0.1:34567/callback`) — another process on the same machine listening on the same port range, plus the usual cross-process leaks: shell history, system logs, browser extensions, debug proxies. All can observe the code.

PKCE breaks the chain. An attacker now needs **both** the code AND the original verifier. The verifier never crosses the wire until step 4, inside a direct TLS-encrypted POST. The challenge does cross the wire in step 3, but as a SHA-256 hash — knowing it doesn't reverse the verifier.

To pull off the attack, an adversary must steal the verifier from the client's memory before the token request. By that point the device is already lost — no auth flow survives an attacker reading process memory. **PKCE doesn't promise security against a compromised endpoint. It promises that nothing on the wire is sufficient on its own.** That is the correct bar.

## The Common PKCE MCP Bug: localStorage

Every team building a browser-based MCP client for the first time stores the `code_verifier` in `localStorage` between redirect and callback. Then someone notices: `localStorage` is readable by any script on the same origin. If the verifier lives there and any third-party script ever loads on the callback page, PKCE is effectively disabled.

The verifier must live somewhere a malicious in-page script cannot reach. `sessionStorage` is marginally better (cleared on tab close) but still XSS-readable. The correct answer for web MCP clients is a same-origin `httpOnly` cookie, set by the backend before the redirect and scoped to the callback path. For desktop and CLI MCP clients it's simpler — keep the verifier in process memory and never write it to disk. It dies with the login attempt, which is fine.

Bonus footgun: do not log the verifier. It will end up in Datadog.

For the server-side implementation — discovery, token issuance, revocation — see the [MCP OAuth 2.1 Quick Reference](/blog/mcp-oauth-21-quickref). For a `401 Unauthorized` with a confusing `WWW-Authenticate` header, the [authentication guide](/blog/mcp-authentication-guide) is the place to start.
