---
title: 'Archestra Now Supports All Types of LLM Auth'
date: '2026-05-05'
author: 'Joey Orlando'
description: 'How Archestra authenticates LLM gateway calls across provider keys, virtual keys, OAuth, and enterprise identity providers.'
image: '/blog/2026-05-05-llm-proxy-auth-overview.webp'
---

## Authentication for LLM Gateways Is Challenging

Nowadays it's hard to find an enterprise that doesn't route all of its AI traffic via some sort of LLM gateway. They do it for [guardrails](/docs/platform-ai-tool-guardrails), [request and response logging](http://localhost:3001/docs/platform-observability), [cost tracking](/docs/platform-costs-and-limits), [usage limits](/docs/platform-costs-and-limits#usage-limits), caller and app attribution (via [custom headers](/docs/platform-llm-proxy#custom-headers) or [OAuth clients](/docs/platform-llm-proxy-authentication#llm-oauth-clients)), and many other things.

One may notice that I'm mostly writing about auth in this blog, and this exact blog post won't be an exception. Even with LLM gateways, auth is the problem. Again.

Most OpenAI-compatible clients understand only two ways to authenticate against an LLM gateway: `baseURL` and `apiKey`. Some support custom headers. A few apps can implement OAuth. There is no universal spec that tells every LLM client how to discover an authorization server, open a browser, run PKCE, and refresh tokens.

It's a bit ironic, especially as MCP, a protocol used by the same clients and apps, has a real authentication story. It has OAuth 2.1, PKCE, discovery, client registration, and a growing set of enterprise patterns around JWKS and ID-JAG. I wrote about that in the recent MCP auth series ([OAuth 2.1 and MCP auth](/blog/mcp-authentication-guide), [enterprise MCP servers with JWKS](/blog/enterprise-mcp-servers-jwks), [enterprise-managed authorization and ID-JAG](/blog/enterprise-managed-authorization-mcp)).

## Archestra v1.2.33: Support All of Them

We can't force every LLM client to support advanced auth. What we can do is make sure that the latest version of Archestra (v1.2.33) supports five ways to authenticate LLM Proxy traffic, from the basic ones to the most advanced:

1. Direct provider key
2. Virtual API key
3. OAuth client credentials
4. User OAuth
5. Identity provider JWKS

## Auth Method 1: Direct Provider Key

This is the simplest path: the caller sends the real provider key to the provider-specific proxy route.

```http
Authorization: Bearer sk-your-openai-key
```

Archestra forwards the request to the matching provider and still applies the LLM Proxy's policy, logging, and observability layer. Direct provider keys are useful for local testing, simple provider-specific integrations, and cases where the caller already owns the provider key and does not need Archestra to hide it. This method won't work with the [Model Router](/docs/platform-llm-proxy#openai-compatible-model-router).

Use this when simplicity matters more than credential isolation. Don't tell your CISO, though 😉

## Auth Method 2: Virtual API Key

A virtual key is an Archestra-issued bearer token that maps to one or more provider API keys stored in Archestra (or your secret storage).

The caller only sees:

```http
Authorization: Bearer arch_...
```

Archestra resolves that virtual key to the right provider key at request time. Virtual keys are the default answer for generic LLM clients and individual developers. If a client only supports `baseURL` and `apiKey`, a virtual key is usually the cleanest fit. Works great with the [Model Router](/docs/platform-llm-proxy#openai-compatible-model-router), and will make your CISO a bit happier ☺️

## Auth Method 3: OAuth Client Credentials

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

Then it uses the resulting access token as the LLM Proxy bearer token. Use this for backend services, production apps, scheduled jobs, bots, and server-side integrations where you control the code and can fetch a token before making LLM calls. Works great with the [Model Router](/docs/platform-llm-proxy#openai-compatible-model-router)!

Use this when the caller is a backend application with its own identity.

## Auth Method 4: User OAuth

User OAuth is for custom applications that act on behalf of an individual Archestra user.

The app runs an OAuth authorization code flow, the user sees a consent screen, and the app receives an Archestra-issued access token with the `llm:proxy` scope. The app then uses that token to call provider-specific routes or the [Model Router](/docs/platform-llm-proxy#openai-compatible-model-router).

The important difference from OAuth client credentials is key resolution:

- OAuth client credentials use provider key mappings configured on the app registration
- User OAuth resolves provider keys from the signed-in user's accessible keys: personal keys, team keys, and organization keys

Use this when user identity matters more than generic client compatibility, and when the app should inherit the user's access instead of acting as one shared service account. Examples include internal tools, custom chat apps, IDE extensions, and user-facing apps where the right answer depends on who is signed in.

## Auth Method 5: Identity Provider JWKS

JWKS auth lets clients send a JWT issued by an enterprise identity provider. Archestra validates the JWT signature using the IdP's JWKS endpoint, matches the token to an Archestra user, checks access, and resolves provider keys from that user's available keys.

This is the LLM Proxy version of an enterprise pattern that also shows up in MCP: "Trust the organization's identity provider and validate its signed tokens directly."

JWKS is useful when an enterprise already has an identity provider such as Okta, Auth0, Microsoft Entra ID, or Keycloak, and wants LLM Proxy access to align with existing SSO and token issuance.

Today this is primarily a provider-route pattern. [Model Router](/docs/platform-llm-proxy#openai-compatible-model-router) access is better served by virtual keys, OAuth client credentials, or user OAuth.

Use this when enterprise SSO tokens are already the source of caller identity.

## Choosing the Right One

Unfortunately, the dividing line is usually not "which method is most secure?" It is "what can the caller actually do?" Still, we'll try to provide some recommendations:

| Caller                                        | Recommended auth         |
| --------------------------------------------- | ------------------------ |
| Local test or simple provider-specific script | Direct provider key      |
| Generic OpenAI-compatible client              | Virtual API key          |
| Individual developer using a shared proxy     | Virtual API key          |
| Backend service, bot, or production app       | OAuth client credentials |
| Custom app acting for a signed-in user        | User OAuth               |
| Enterprise app with existing IdP JWTs         | Identity provider JWKS   |

Every auth method is a tradeoff between compatibility, identity, and central control. We can't force every caller into the most elegant protocol, but we can make the secure path available for the caller you actually have.

For setup details, see the [LLM Proxy Authentication docs](/docs/platform-llm-proxy-authentication) and the [Model Router examples](/docs/platform-model-router-user-oauth-example).

If you have any questions about auth, you can always find me in our Slack community!
