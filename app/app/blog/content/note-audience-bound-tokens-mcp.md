---
title: 'Audience-bound tokens, in one example'
description: 'The aud claim is the most boring JWT field and the most important. Here is the audience claim MCP check that prevents token reuse across resource servers.'
isNote: true
author: 'Mack Chi'
---

# Audience claim MCP: the field that stops token reuse

The audience claim MCP servers must validate is `aud` — a single JWT field that binds a token to one specific resource server. Without it, a token minted for MCP server A will authenticate successfully against MCP server B sitting behind the same authorization server. Signature checks pass, issuer checks pass, expiry checks pass, and the wrong server hands over real data. The fix is one extra parameter on the validator. The failure mode is the kind of thing that ends up in a postmortem.

Picture two MCP servers behind one authorization server: an internal tickets tool and a code-search tool. Paste the tickets token into the code-search server. It works. Both servers call `jwtVerify`, both report "valid signature, not expired, looks great," and both serve real data. Neither server checks who the token was actually for. That is the entire post in one paragraph, but it is worth slowing down on — because the audience claim MCP fix is small and the consequences of skipping it are not.

For the wider auth picture — OAuth 2.1, PKCE, discovery, all of it — see [a developer's guide to MCP authentication](/blog/mcp-authentication-guide). This post stays tight on one field: `aud`.

## The five-year-old version

A token is a permission slip. An audience claim is the name written on the front of the envelope. Without a name on the envelope, anyone who finds it can walk up to any door and try it. With a name on it, only the door that matches the name accepts it.

That is it. That is the feature.

## What `aud` actually looks like

Decode a typical MCP access token and the payload looks like this:

```json
{
  "iss": "https://auth.example.com",
  "sub": "alice@example.com",
  "aud": "https://tickets.example.com/v1/mcp",
  "scope": "mcp:tools mcp:resources",
  "exp": 1747238400,
  "iat": 1747234800,
  "client_id": "https://cursor.com/.well-known/oauth-client/mcp"
}
```

The load-bearing line is `aud`. That is the resource server this token was minted for. The authorization server stamps it there when the client requests the token with a `resource` parameter ([RFC 8707](https://datatracker.ietf.org/doc/html/rfc8707)) — the same `resource=` sent on `/authorize` and `/token` (covered in the [MCP OAuth 2.1 quick reference](/blog/mcp-oauth-21-quickref)).

The part that bites people: a JWT library will happily verify signature, issuer, and expiration without ever looking at `aud`. Those checks confirm the token is **real**. They do not confirm it was meant for **this server**.

## The five-line audience claim MCP fix

Every MCP resource server needs to do this. Node with `jose`:

```ts
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(new URL('https://auth.example.com/.well-known/jwks.json'));

const { payload } = await jwtVerify(token, JWKS, {
  issuer: 'https://auth.example.com',
  audience: 'https://tickets.example.com/v1/mcp', // throws if aud mismatches
});
```

Python with `pyjwt`:

```python
claims = jwt.decode(
    token, signing_key, algorithms=["RS256"],
    issuer="https://auth.example.com",
    audience="https://tickets.example.com/v1/mcp",  # raises InvalidAudienceError on mismatch
)
```

Pass `audience` in, the library does the comparison, done. Skip the parameter and the library skips the check. It is opt-in. That is the entire trap.

Important: `aud` can be a string or an array of strings — both are spec-valid per [RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519#section-4.1.3). A validator that only handles strings will silently fail open or throw something unhelpful on an array-form `aud`. Use the library's built-in audience check rather than rolling a custom equality comparison.

For the longer JWKS validation pattern — key rotation, clock skew, JWKS endpoint outages — see [building enterprise-ready MCP servers with JWKS and identity providers](/blog/enterprise-mcp-servers-jwks). This post is just the audience line.

## The attack audience claim MCP validation prevents

The canonical name is **token confusion** or **token reuse across resource servers**. It is not a clever attack — it is the absence of a check. The recipe:

1. One authorization server protects two MCP servers — call them A and B.
2. An attacker (or a buggy client) gets a valid token for server A. Logged proxy, leaky error message, compromised tool that legitimately received it, debug print someone forgot to remove.
3. The token is presented to server B.
4. Server B verifies signature + issuer + expiry. All pass. Token accepted.
5. The attacker now operates on server B with a token never minted for it.

Audience binding kills step 4. The token literally has the wrong destination written on it. A server that checks `aud` rejects it without ever reading the rest of the claims.

This is not theoretical — it is the same shape as the SAML "audience restriction" bypasses from a decade ago. RFC 8707 exists because the OAuth WG kept seeing this pattern in the wild.

## The opinion

Skipping `aud` validation because "there is only one MCP server right now" is one of the most expensive defaults in identity. It costs nothing to add. It costs everything to retrofit after a second server shows up. And a second server **always** shows up — that is six months from now, not five years.

The worst part is that the broken state looks identical to the working state. Tokens validate, requests succeed, tests pass. There is no error log that says "this token was not actually for you." Discovery happens the same way every time — someone pastes the wrong token into the wrong server and it works. By then the old tokens are already in production logs, in shell history, in CI artifacts. There is no retroactive fix that assumes the previous six months were fine.

The principle, stated bluntly: **an MCP resource server that does not check `aud` is not doing authentication, it is doing signature verification with extra steps.** Those are not the same thing. Ship the audience claim MCP check on day one even with only one server, because day-two memory is unreliable.

## The audience claim MCP checklist

Three things, in order, every time an MCP resource server stands up:

- **Client side**: send `resource=https://your-server/v1/mcp` on both `/authorize` and `/token`. Without this, the authorization server has no reason to stamp an `aud` on the token in the first place.
- **Auth server side**: decode one of the issued tokens with [jwt.io](https://jwt.io) and confirm `aud` is what is expected. Some auth servers ignore `resource` unless a flag is flipped.
- **Resource server side**: pass `audience` to the JWT library on every verify. No exceptions. If a gateway does this transparently, confirm it in the docs — do not assume.

One claim. One parameter. The difference between "audience binding is in place" and "a footgun is pointed at the next server to ship."
