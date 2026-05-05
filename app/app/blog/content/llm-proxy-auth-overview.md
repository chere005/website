---
title: 'LLM Proxy Auth in Archestra'
date: '2026-05-05'
author: 'Joey Orlando'
description: 'How Archestra authenticates LLM proxy calls across provider keys, virtual keys, OAuth, and enterprise identity providers.'
image: '/blog/2026-05-05-llm-proxy-auth-overview.webp'
---

## LLM Auth Is Not MCP Auth

MCP has a real authentication story now. It has OAuth 2.1, PKCE, discovery, client registration, and a growing set of enterprise patterns around JWKS and ID-JAG. I wrote about that in the recent MCP auth series ([OAuth 2.1 and MCP auth](/blog/mcp-authentication-guide), [enterprise MCP servers with JWKS](/blog/enterprise-mcp-servers-jwks), [enterprise-managed authorization and ID-JAG](/blog/enterprise-managed-authorization-mcp)).

LLM clients are different.

Most OpenAI-compatible clients understand two knobs: `baseURL` and `apiKey`. Some support custom headers. A few apps can implement OAuth. There is no MCP-style universal spec that tells every LLM client how to discover an authorization server, open a browser, run PKCE, and refresh tokens.

That leaves platform teams with a practical problem: how do you put a secure gateway in front of LLM providers without forcing every caller into the same auth shape?

That is what Archestra's LLM Proxy auth model is designed for.

## What the LLM Proxy Does

Archestra's LLM Proxy sits between AI applications and LLM providers such as OpenAI, Anthropic, Google, Bedrock, and others. Clients call Archestra instead of calling the provider directly. Archestra then applies the platform controls before forwarding the request.

That gives you a single place to handle:

- provider key management
- [tool guardrails](/docs/platform-ai-tool-guardrails)
- request and response logging
- [cost tracking](/docs/platform-costs-and-limits)
- [usage limits](/docs/platform-costs-and-limits#usage-limits)
- caller and app attribution ([custom headers](/docs/platform-llm-proxy#custom-headers), [OAuth clients](/docs/platform-llm-proxy-authentication#llm-oauth-clients))
- custom provider [base URLs](/docs/platform-llm-proxy-authentication#custom-base-urls) and [headers](/docs/platform-llm-proxy#custom-headers)

The proxy is not only a credential vault. It is the policy and observability boundary for LLM traffic.

## What the Model Router Adds

Provider-specific routes are useful when the client already speaks the provider's native API shape:

```text
/v1/openai/{llmProxyId}/chat/completions
/v1/anthropic/{llmProxyId}/messages
/v1/gemini/{llmProxyId}/models/{model}:generateContent
```

The Model Router adds a more portable option:

```text
/v1/model-router/{llmProxyId}/chat/completions
/v1/model-router/{llmProxyId}/responses
```

It accepts OpenAI-compatible requests and uses provider-qualified model IDs like:

```text
openai:gpt-5.4
anthropic:claude-haiku-4-5-20251001
gemini:gemini-2.5-flash
```

Archestra resolves the provider prefix, finds the mapped provider key, translates between OpenAI-style and provider-native formats when needed, runs the normal LLM Proxy pipeline, and returns an OpenAI-compatible response.

That matters for auth because a Model Router credential is not just "one OpenAI key." It can represent access to one or more provider keys behind a single OpenAI-compatible endpoint.

## The Five Auth Methods

Archestra supports five practical ways to authenticate LLM Proxy traffic:

1. Direct provider key
2. Virtual API key
3. OAuth client credentials
4. User OAuth
5. Identity provider JWKS

They are intentionally different. A local prototype, a generic OpenAI SDK client, a backend service, a user-facing SaaS app, and an enterprise SSO environment do not need the same credential model.

## 1. Direct Provider Key

This is the simplest path: the caller sends the real provider key to the provider-specific proxy route.

```http
Authorization: Bearer sk-your-openai-key
```

Archestra forwards the request to the matching provider and still applies the LLM Proxy's policy, logging, and observability layer.

**Where it fits**

Direct provider keys are useful for local testing, simple provider-specific integrations, and cases where the caller already owns the provider key and does not need Archestra to hide it.

**Pros**

- Lowest setup cost
- Works with existing provider-specific clients
- Easy to debug because the credential is exactly the upstream provider credential

**Cons**

- The real provider key leaves the platform
- Harder to centrally revoke without rotating the upstream key
- No Model Router support, because Model Router needs mapped provider keys
- Weak app attribution unless the caller also sends stable labels

Use this when simplicity matters more than credential isolation.

## 2. Virtual API Key

A virtual key is an Archestra-issued bearer token that maps to one or more provider API keys stored in Archestra.

The caller only sees:

```http
Authorization: Bearer arch_...
```

Archestra resolves that virtual key to the right provider key at request time.

**Where it fits**

Virtual keys are the default answer for generic LLM clients and individual developers. If a client only supports `baseURL` and `apiKey`, a virtual key is usually the cleanest fit.

They work on provider-specific proxy routes and on Model Router routes. For provider-specific routes, the virtual key needs a mapping for that provider. For Model Router, it can map multiple providers and expose them through one OpenAI-compatible endpoint.

**Pros**

- Real provider keys stay inside Archestra
- Works with clients that only support API-key auth
- Can be revoked without rotating the upstream provider key
- Supports Model Router provider mappings
- Good fit for individual developers, demos, scripts, and OpenAI-compatible tools

**Cons**

- Still a bearer secret that must be stored by the caller
- Does not prove a user identity by itself
- Caller attribution depends on key naming, ownership, scope, and optional request labels
- Rotation is application-specific because generic LLM clients do not know an OAuth refresh flow

Use this when compatibility with existing LLM clients is the priority.

## 3. OAuth Client Credentials

OAuth client credentials are for apps that can authenticate as an app.

An admin registers an LLM OAuth client in Archestra, maps the provider keys it can use, selects which LLM proxies it can call, and copies a `client_id` plus one-time `client_secret`.

The app exchanges those credentials for a short-lived access token:

```http
POST /api/auth/oauth2/token
grant_type=client_credentials
client_id=...
client_secret=...
scope=llm:proxy
```

Then it uses the resulting access token as the LLM Proxy bearer token.

**Where it fits**

Use this for backend services, production apps, scheduled jobs, bots, and server-side integrations where you control the code and can fetch a token before making LLM calls.

This works with provider-specific routes and Model Router.

**Pros**

- App identity is explicit
- Access tokens are short-lived
- Provider keys remain mapped and hidden in Archestra
- Allowed LLM proxies and provider mappings are centrally managed
- Logs and traces can show the authenticated OAuth client, not just a caller-supplied label

**Cons**

- Requires the app to implement token acquisition
- Not a fit for generic LLM clients that only accept `baseURL` and `apiKey`
- The client secret still needs secure storage by the app
- This is app-level auth, not per-user auth

Use this when the caller is a backend application with its own identity.

## 4. User OAuth

User OAuth is for custom applications that act on behalf of an individual Archestra user.

The app runs an OAuth authorization code flow, the user sees a consent screen, and the app receives an Archestra-issued access token with the `llm:proxy` scope. The app then uses that token to call provider-specific routes or the Model Router.

The important difference from OAuth client credentials is key resolution:

- OAuth client credentials use provider key mappings configured on the app registration
- User OAuth resolves provider keys from the signed-in user's accessible keys: personal keys, team keys, and organization keys

**Where it fits**

Use this when the app should inherit the user's access instead of acting as one shared service account. Examples include internal tools, custom chat apps, IDE extensions, and user-facing apps where the right answer depends on who is signed in.

**Pros**

- Per-user access and attribution
- Uses consent and standard OAuth authorization code patterns
- Can use the same `llm:proxy` scope for provider-specific routes and Model Router
- Respects the user's accessible provider keys and team memberships
- Better fit when the app should not have broad app-level provider mappings

**Cons**

- The app must implement OAuth
- Most generic LLM SDK clients do not know how to do this flow
- Users may need to complete a browser authorization step
- Provider key selection is policy-driven, so admins should understand the priority model

Use this when user identity matters more than generic client compatibility.

## 5. Identity Provider JWKS

JWKS auth lets clients send a JWT issued by an enterprise identity provider. Archestra validates the JWT signature using the IdP's JWKS endpoint, matches the token to an Archestra user, checks access, and resolves provider keys from that user's available keys.

This is the LLM Proxy version of an enterprise pattern that also shows up in MCP: "trust the organization's identity provider and validate its signed tokens directly."

**Where it fits**

JWKS is useful when an enterprise already has an identity provider such as Okta, Auth0, Microsoft Entra ID, or Keycloak, and wants LLM Proxy access to align with existing SSO and token issuance.

Today this is primarily a provider-route pattern. Model Router access is better served by virtual keys, OAuth client credentials, or user OAuth.

**Pros**

- Reuses enterprise identity infrastructure
- Stateless token validation through public keys
- Strong user attribution when JWT claims map cleanly to Archestra users
- Good fit for internal platforms that already mint user JWTs
- No Archestra-specific bearer secret needs to be issued to the client

**Cons**

- Requires identity provider configuration
- Requires clean claim mapping, usually email or another stable user identifier
- Token audience and issuer settings must be correct
- Less convenient for off-the-shelf LLM clients
- Not the primary Model Router auth path

Use this when enterprise SSO tokens are already the source of caller identity.

## Choosing the Right One

Here is the quick version:

| Caller                                        | Recommended auth         |
| --------------------------------------------- | ------------------------ |
| Local test or simple provider-specific script | Direct provider key      |
| Generic OpenAI-compatible client              | Virtual API key          |
| Individual developer using a shared proxy     | Virtual API key          |
| Backend service, bot, or production app       | OAuth client credentials |
| Custom app acting for a signed-in user        | User OAuth               |
| Enterprise app with existing IdP JWTs         | Identity provider JWKS   |

The dividing line is usually not "which method is most secure?" It is "what can the caller actually do?"

If the caller only knows `baseURL` and `apiKey`, use a virtual key.

If the caller is your backend service, use OAuth client credentials.

If the caller is a custom app with real users, use user OAuth.

If the caller is already inside an enterprise identity system, use JWKS.

If you just need to get a provider-specific route working quickly, direct provider keys are still there.

## The Main Tradeoff

Every auth method is a tradeoff between compatibility, identity, and central control.

Virtual keys win on compatibility. OAuth client credentials win on app identity. User OAuth wins on per-user delegation. JWKS wins on enterprise identity reuse. Direct provider keys win on simplicity.

Archestra supports all five because LLM traffic is not one workflow. A developer testing locally, a LangChain app in production, a browser-based internal tool, and an enterprise platform with SSO all need to reach the same LLM Proxy boundary in different ways.

The goal is not to force every caller into the most elegant protocol. The goal is to make the secure path available for the caller you actually have.

For setup details, see the [LLM Proxy Authentication docs](/docs/platform-llm-proxy-authentication) and the [Model Router examples](/docs/platform-model-router-user-oauth-example).
