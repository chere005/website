---
title: 'Entra On-Behalf-Of flow for MCP, explained'
description: 'Entra OBO MCP guide: what On-Behalf-Of is, when an MCP gateway needs it, and the four token-exchange params that trip up teams.'
isNote: true
author: 'Mack Chi'
---

## Entra OBO MCP: the preposition that changes the request

Wiring an MCP gateway against an Entra tenant where the gateway must read the signed-in user's mailbox through a Graph-backed MCP server is a common source of 401s from Microsoft Graph. The cause is usually a wrong question to Entra: "give me a token to call Graph" versus "give me a token to call Graph **as the user who is calling me right now**." Those are not the same request, and they do not use the same OAuth grant.

That distinction is what On-Behalf-Of (OBO) solves. Entra OBO MCP integration is a Microsoft-specific token exchange that lets a middle-tier service obtain a downstream token without re-prompting the user. For an MCP gateway sitting between an AI app and a Microsoft-protected MCP server, OBO is how the original user's identity is preserved on every downstream call instead of being melted into a shared service account.

This note is for teams whose IdP is Entra and who are standing up an MCP gateway in front of it. It defines OBO, shows when it is needed versus plain access tokens or client credentials, walks through the four params of the exchange, and ends with a runnable curl. A broader spec view of enterprise MCP auth lives in [Enterprise-Managed Authorization for MCP](/blog/enterprise-managed-authorization-mcp) — OBO is the Microsoft-flavored cousin of the same idea. For OAuth basics see [MCP OAuth 2.1 Quick Reference](/blog/mcp-oauth-21-quickref).

## The plain-English version

A user named Alice opens an AI app. She is signed in with her work Microsoft account. She asks the agent to summarize her unread email. The agent's MCP gateway needs to call Microsoft Graph — but as Alice, not as itself.

The gateway already has Alice's access token from sign-in. The problem: that token's audience is the gateway, not Graph. It cannot be forwarded as-is. The gateway's own service identity cannot be used to call Graph either — that turns Microsoft 365 logs into "the service account read Alice's mail," which is exactly the audit outcome a security team is trying to avoid.

OBO is Microsoft's fix. The gateway hands Alice's access token back to Entra and requests an exchange for a new token, scoped to Graph, but still representing Alice. Entra checks policy, mints the new token, and the request shows up in Alice's audit trail as Alice. That is the entire feature.

## When OBO is the right tool

A short "when to reach for what" list, because this is where most Entra OBO MCP deployments go off the rails on the first try:

- **Plain access token (no exchange).** The MCP server is the resource the user signed into. The audience on the token already matches the server. No middle tier is in play. Do not overcomplicate it.
- **Client credentials.** The call has no human attached. A scheduled job, a webhook handler, an automation that runs at 3am. The call is made as the app, not as a user. There is no user identity to preserve because there is no user.
- **On-behalf-of.** There is a real user on the other end of the request, the gateway sits in the middle, and the downstream API is Entra-protected. The downstream call should carry the user's identity, scopes, and audit trail. This is the MCP gateway case.

If the environment is Entra and there is a middle-tier MCP gateway, OBO is the correct answer. Teams often reach for client credentials first because it is simpler, and then months later a compliance team asks "who read this customer's mailbox on Tuesday?" and the only answer in the logs is the service principal. That is not an audit trail. OBO is more work upfront, but it is the only path that keeps per-user permissions and per-user logs intact all the way down to Graph.

## The Entra OBO MCP flow, end to end

Where OBO fits in the auth dance:

1. Alice signs in to the AI app, which signs in to the gateway, which signs in to Entra. Standard OIDC code flow. The gateway holds Alice's access token. Audience: the gateway's app registration.
2. Alice asks for something that needs Graph. A tool call arrives at the gateway.
3. The gateway hits the Entra token endpoint with `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer`, passes Alice's token as the `assertion`, sets `requested_token_use=on_behalf_of`, and names the downstream scope, e.g. `https://graph.microsoft.com/.default`.
4. Entra evaluates policy. Assuming the app registrations and consents are correct, it returns a new access token. Audience: Graph. Subject: still Alice.
5. The gateway calls Graph with that token. Graph checks Alice's permissions, returns Alice's mail. Logs in M365 attribute the read to Alice.
6. The token expires in roughly an hour. A refresh token (if `offline_access` was requested) lets the gateway repeat step 3 without bouncing Alice through consent.

The part that feels counterintuitive: the input to the exchange is the user's access token whose audience is the gateway itself. Not a refresh token — the access token. Entra needs that audience claim to confirm "yes, this token was minted for the app that is now asking to exchange it" before it will trust the OBO request.

## The four params that matter

The OBO request is a POST to `https://login.microsoftonline.com/<tenant>/oauth2/v2.0/token` with a form body. Four params do the actual work:

| Param                 | Value                                                            | Why it matters                                                                                                                                   |
| --------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `grant_type`          | `urn:ietf:params:oauth:grant-type:jwt-bearer`                    | Tells Entra this is a JWT-bearer exchange, not an auth-code redeem or a client-credentials grab                                                  |
| `assertion`           | The user's access token (the one whose audience is the gateway)  | The input being exchanged. **Must be the access token, not the ID token.** Entra rejects ID tokens here                                          |
| `requested_token_use` | `on_behalf_of`                                                   | The magic string that distinguishes OBO from a plain JWT-bearer exchange                                                                         |
| `scope`               | Downstream scope(s), e.g. `https://graph.microsoft.com/.default` | The audience of the returned token. `.default` expands to whatever delegated permissions are consented on the app registration for that resource |

Plus the usual housekeeping: `client_id` and `client_secret` (or a client assertion for cert auth, which is the production path). Those are how Entra confirms the middle-tier app is making the call.

Important: the `assertion` must be the **access token**, not the ID token. This trips teams up because the ID token feels more "identity-ish" and the field is literally named `assertion`. Entra wants the access token because it carries the audience claim that proves the token was issued for the calling app. Sending the ID token returns `AADSTS500131`.

## A runnable curl

```bash
curl -X POST "https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer" \
  -d "client_id=${MIDDLE_TIER_CLIENT_ID}" \
  -d "client_secret=${MIDDLE_TIER_CLIENT_SECRET}" \
  -d "assertion=${USER_ACCESS_TOKEN}" \
  -d "requested_token_use=on_behalf_of" \
  -d "scope=https://graph.microsoft.com/.default"
```

Response, trimmed:

```json
{
  "token_type": "Bearer",
  "scope": "Mail.Read User.Read",
  "expires_in": 3599,
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "0.AXoA..."
}
```

That `access_token` is the new token, audience `https://graph.microsoft.com`, subject still the original user. Drop it in an `Authorization: Bearer` header and call Graph.

Sharp edges that commonly break Entra OBO MCP setups:

- The middle-tier app has to **expose an API** in Entra and **authorize itself as a client** of that API. Without that, Entra rejects the exchange with a vague error about the audience. The [Entra OBO setup guide](/docs/platform-entra-obo-setup) walks through the exact Azure portal toggles.
- The input access token's audience must be the middle-tier app, not Graph. If the user's sign-in token came back with `aud=https://graph.microsoft.com`, there is nothing to exchange — the token is already for Graph.
- Downstream API permissions have to be **consented** for the tenant. `.default` only expands to permissions with admin or user consent. Unconsented scopes return 403.
- Include `offline_access` in the original sign-in scopes so the gateway can refresh without prompting the user every hour.

## Why this matters for MCP

MCP pushes everything toward middle-tier architectures. AI app -> gateway -> MCP server -> enterprise API. Three hops, and every hop is a chance to preserve identity or drop it.

OBO is the Entra-flavored answer for keeping identity on every hop when the downstream is Microsoft-protected. It is not the only pattern — JWKS works for servers that just validate the enterprise JWT directly, and the spec-level [enterprise-managed authorization](/blog/enterprise-managed-authorization-mcp) extension generalizes the idea across IdPs. But when the stack is Entra and the downstream is Graph or an Entra-protected internal API, Entra OBO MCP is the path that yields real per-user audit logs instead of a shared service principal in every log line.

The params do not change. The four fields that get missed at midnight are the four in the table above.
