---
title: 'Okta Entra MCP authorization: implementer comparison'
description: 'Okta Entra MCP authorization compared: OAuth 2.1, JWKS, DCR, OBO, custom scopes, policy, SCIM. Both ship enterprise MCP today. The gap lives in token exchange.'
isNote: true
author: 'Mack Chi'
---

# Okta Entra MCP authorization compared

Both Okta and Entra fully service an enterprise MCP rollout in 2026. OAuth 2.1, OIDC discovery, JWKS, and groups claims work nearly identically on each. The Okta Entra MCP authorization gap opens the moment custom scopes, policy, and on-behalf-of token exchange enter the picture. This note compares the two from an integrator's seat — what's shared, where the path diverges, and the sharp edges that bite during Okta Entra MCP setup.

For the underlying concepts first, [the OAuth 2.1 quick reference](/blog/mcp-oauth-21-quickref) and [the developer's guide to MCP authentication](/blog/mcp-authentication-guide) are prerequisites.

## What the reader actually wants

Platform engineers and identity leads at organizations already running one of these IdPs do not get to pick a new IdP because MCP looks easier on the other one. The real question: **does the IdP already in place do everything an MCP rollout needs, or will a wall appear in three months?**

For both Okta and Entra in 2026, the answer is yes — the wall does not exist. The path is shaped differently.

## The shared OAuth surface for Okta Entra MCP

The following pieces are nearly identical across the two IdPs:

- **OAuth 2.1 + PKCE** for sign-in into Archestra. Both handle authorization code + S256 exactly the way the MCP spec requires.
- **OIDC discovery** at `/.well-known/openid-configuration`. Paste an issuer URL and the rest is auto-discovered.
- **JWKS endpoint** for validating tokens. Both expose a real `jwks_uri` with rotating keys. JWKS validation against the upstream IdP is the same code on both sides — [covered in the JWKS post](/blog/enterprise-mcp-servers-jwks).
- **Groups claim** for team sync. Okta has a quirk where the groups claim filter must be scoped (the `Archestra_` prefix is canonical); Entra has a quirk where it ships under **Token configuration** rather than as a scope. End result: `groups` in the ID token, mapped to Archestra teams.
- **RP-initiated logout** for centralized sign-out. Both support it.

If the requirement is "users sign in with SSO, tools call downstream APIs as a long-lived service account," **either Okta Entra MCP integration is done in an afternoon.** That's the unglamorous truth.

## Where Okta Entra MCP integrations diverge

The moment each user's MCP tool call should run as **that** user against a downstream API, the integration leaves OAuth 2.1 baseline territory and enters each IdP's flavored token-exchange extension. That's where the products feel genuinely different.

The comparison table from the integrator's seat:

| Capability                                       | Okta                                                                                                                                      | Entra ID                                                                                                                              |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| OAuth 2.1 authorization code + PKCE              | yes                                                                                                                                       | yes                                                                                                                                   |
| OIDC discovery + JWKS                            | yes                                                                                                                                       | yes                                                                                                                                   |
| Dynamic Client Registration (RFC 7591)           | yes, via custom auth server                                                                                                               | partial (app registration UI is canonical)                                                                                            |
| Token exchange standard                          | RFC 8693 token exchange ([Okta AI agent token exchange](https://developer.okta.com/docs/guides/ai-agent-token-exchange/authserver/main/)) | [On-Behalf-Of](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-on-behalf-of-flow), Microsoft's flavor of RFC 8693 |
| What gets exchanged                              | the user's **ID token**                                                                                                                   | the user's **access token**                                                                                                           |
| Client auth for exchange                         | `private_key_jwt` (signed JWT, public key on the app)                                                                                     | `client_secret_post` (shared secret)                                                                                                  |
| Custom scopes / authorization servers            | strong — bespoke auth servers, custom scope vocabularies                                                                                  | weak — scopes tied to "expose an API" + `api://<client-id>/<scope>`                                                                   |
| Policy management                                | strong — access policies and auth server rules are first-class                                                                            | weaker — policy lives across conditional access, app roles, admin consent                                                             |
| SCIM provisioning                                | yes, mature                                                                                                                               | yes, mature                                                                                                                           |
| Fit for Archestra's enterprise-managed auth flow | user ID token → token scoped to downstream API                                                                                            | user access token → token scoped to downstream API (`.default` expansion)                                                             |
| Walkthrough docs                                 | [Okta SSO + Token Exchange](/docs/platform-okta-setup)                                                                                    | [Entra ID SSO + OBO](/docs/platform-entra-obo-setup)                                                                                  |

A few notes on the rows that matter:

### Entra is further along with on-behalf-of

OBO has been a first-class flow in the Microsoft platform for years. The docs are clear, the failure modes are well known, and the platform has opinions about what a "resource" means and how `.default` expands scopes at runtime. Entra has thought about this flow.

### Okta is further along with custom scopes and policy

Okta authorization servers are real, first-class objects. They mint custom scope vocabularies, attach access policies, and configure exactly which clients can exchange what for what. Entra essentially imposes its OBO shape on the integration; Okta provides a blank canvas with policy rules. The trade: those scopes must be designed up front.

### Exchange client auth differs and it matters

Okta defaults to `private_key_jwt` — generate a keypair, register the public half on the app, sign a short-lived JWT for every token exchange. Nothing long-lived sits in a config file. Entra OBO uses `client_secret_post` — a shared secret rotated every six months with hopes nobody pastes it into a Slack message. Both work. Okta's posture is stronger. Entra's is faster to set up.

### What gets exchanged differs

Okta wants the user's **ID token** as the subject. Entra OBO wants the user's **access token** with the Archestra app's exposed scope as the audience. Wiring one the way the other expects results in an opaque rejection from the IdP.

## The opinion

There is no "best" IdP for MCP. Pick whichever the org already runs.

The cost of switching IdPs to make MCP slightly easier is enormously higher than the cost of working with the one already in place. Both Okta and Entra can fully service an enterprise MCP rollout today. The gap between them is real but small. The gap between either of them and "no IdP, just a shared API key" is gigantic. That's the gap that actually matters.

The bigger architectural question — the one most teams skip past — is **whether the MCP gateway has a clean abstraction over the IdP differences.** Once OBO with Entra handles users in a U.S. business while Okta-managed exchange handles users in the EU subsidiary (a real, recurring scenario), neither shape should leak into MCP server code. An MCP server should not know whether the token in `Authorization: Bearer ...` came from an Entra OBO exchange or an Okta `urn:ietf:params:oauth:grant-type:token-exchange` flow. The gateway eats the IdP shape. The MCP server stays clean.

That's most of the integration work. The IdP-specific config is a one-time setup wizard. The gateway abstraction is the thing that lives forever.

## Sharp edges in Okta Entra MCP setup

- **Okta DPoP.** Okta exposes "Require Demonstrating Proof of Possession (DPoP) header in token requests" on the app's client credentials. Archestra does not support DPoP for SSO clients yet. Sign-in fails with `invalid_dpop_proof` and the error message is unhelpful. Turn it off on the app.
- **Entra "authorized client applications."** OBO requires the app to authorize **itself** as a client of the scope it just exposed. The same client ID goes into the **Authorized client applications** box on the **Expose an API** page.
- **Okta groups prefix.** The OIN app integration only ships groups whose names start with `Archestra_` in the `groups` claim. A group called `Engineering` will never reach Archestra without the prefix.
- **Entra `.default` expansion.** The **Managed Resource Identifier** becomes `<resource>/.default` during OBO. `.default` means "every delegated permission consented for this resource." Forget admin consent for `Mail.Read` and the exchange succeeds while the Graph call fails with a permissions error.
- **Token type confusion.** Okta wants ID token, Entra wants access token. Cross the wires and the error is vague.

Both products work. Both are well-documented. Neither is a wrong choice for Okta Entra MCP rollout. The differences are real but not the kind that should drive an IdP migration. Run the one already in place, give the MCP gateway a clean abstraction over the IdP shape, and move on to the parts of MCP rollout that actually deserve attention — like deciding which servers to expose and to whom.

For the step-by-step on the Okta side, [the Okta setup walkthrough](/docs/platform-okta-setup) has the full app integration, signing key, and exchange config. The Entra walkthrough lives next to it and follows the same six-section shape, so reading both shows exactly where they diverge.
