---
title: 'SCIM for AI agents'
description: 'SCIM AI agents lifecycle management: why SCIM 2.0 is table stakes for enterprise AI agent platforms, what gets synced, and how deprovisioning cascades.'
isNote: true
author: 'Mack Chi'
---

# SCIM for AI agents

SCIM AI agents support is the unglamorous identity feature enterprises actually buy on. SCIM (System for Cross-domain Identity Management) is the gate every AI agent platform must pass through procurement, and in 2026 it is non-negotiable. SCIM AI agents integration covers user lifecycle, group membership, role attributes, and — for serious platforms — the cascade of deprovisioning into every downstream credential an agent holds on a user's behalf. Skip SCIM and an enterprise procurement cycle stalls. Ship SCIM correctly and the conversation moves on. This note walks through what SCIM AI agents implementations actually push, the agent-identity layer most teams miss, and why this boring protocol decides deals.

## The problem in plain terms

A person joins a company. On day one they receive a laptop, an email account, and a row in Workday. That row describes who they are, which team they're on, and what their job title is. When they get promoted, the row updates. When they get fired, the row is deactivated.

Now consider the same person with access to an AI agent platform that can read Salesforce, send email on their behalf, and run queries against the data warehouse. When they are terminated on a Friday afternoon, who turns off the agent? If the answer is "a human admin has to remember to log into the agent platform and click delete," the access remains. The agent can still act on behalf of someone who is no longer an employee. The security team finds out on Monday.

SCIM prevents this. It is the plumbing that propagates the Workday update to every downstream system automatically. When HR deactivates the row, the agent platform deactivates the user, and access is revoked within minutes.

## What SCIM actually pushes

SCIM is a REST API that an identity provider (Okta, Entra, JumpCloud, etc.) calls against downstream applications. The IdP is the source of truth. The downstream app is the receiver. The protocol is mostly `POST /Users`, `PATCH /Users/{id}`, `DELETE /Users/{id}`, and the same pattern for `/Groups`.

Three things matter for an agent platform:

- **Users** — create, update, deactivate. Names, emails, employee IDs. The basics.
- **Groups** — engineering, sales, legal, contractors. Who belongs to what.
- **Role and attribute claims** — job title, department, manager, custom fields like "cleared for prod data." These drive policy decisions inside the agent platform.

Buyers evaluating SCIM AI agents support should ask: does the platform accept SCIM 2.0? Does it sync group memberships, not just users? Does it support `PATCH` operations and not only full replace? Does it map IdP groups to internal teams or roles automatically? If any answer is "we're working on it," there is a procurement risk.

## The agent identity problem

Here is the part specific to AI agents that most identity teams have not thought through.

A human user has one identity. An AI agent platform often has _many_ identities per human — the user's identity, the agent's service identity, downstream service accounts the agent uses to call Salesforce or GitHub, and sometimes per-agent ephemeral credentials. When the human is terminated, deactivating the human's SSO record is not enough. Every downstream credential that agent ever held on their behalf must be revoked.

SCIM handles the first layer (the human user). Agent platforms must plumb the second layer themselves: when SCIM signals "this user is deactivated," that event must cascade into "and therefore every agent acting on their behalf loses its downstream tokens, every refresh token tied to that user is invalidated, and every scheduled agent run owned by that user is canceled."

That cascade is the actual product. SCIM is just the trigger.

### Agents as SCIM-managed identities

Some agent platforms expose agents themselves as a kind of identity — service accounts, bot users, whatever the naming is that quarter. Those identities should also be SCIM-managed so admins can provision and deprovision them centrally instead of clicking through twelve UIs. The IdP-as-source-of-truth model is more powerful than it looks once extended to non-human principals.

## What this looks like in practice

The practical setup is two-sided. On the IdP side, an admin creates a SCIM connector for the agent platform — usually a base URL and a bearer token — then picks which groups to push and which attributes to map. On the agent platform side, an admin links IdP groups to internal teams or roles, so an Okta group called `engineering-prod` becomes the `Engineering` team in the platform with the corresponding permissions.

Then it runs. Someone joins `engineering-prod` in Okta and within minutes appears in the agent platform on the engineering team with the right scopes. Someone leaves the group and is removed. Someone is fully deactivated in Okta and loses access entirely.

This is where SCIM connects to the broader auth stack. SSO via [OAuth 2.1](/blog/mcp-oauth-21-quickref) answers "is this the right person logging in right now?" SCIM answers "should this person still exist as a user at all?" [Enterprise-managed authorization](/blog/enterprise-managed-authorization-mcp) answers "given that they are logged in, what should they actually be allowed to do today?" The three pieces stack — SCIM at the lifecycle layer, SSO at the login layer, ID-JAG or JWKS at the per-request layer. Miss any of them and a security team will find the gap.

For MCP gateway builders and evaluators, team sync is the operational layer. Archestra exposes the IdP-group-to-team mapping directly — see the docs at [/docs/platform-sso-team-sync](/docs/platform-sso-team-sync) for how Handlebars templates extract groups from custom claim shapes (Okta tends to send roles as JSON-encoded strings inside other strings).

## The opinion

SCIM is unfashionable. It is a 2011-era REST spec with an XML legacy and a `urn:ietf:params:scim:schemas:` namespace that nobody loves typing. Nobody is launching a video about SCIM support. Nobody puts "SCIM-native" on a homepage hero.

And yet — every enterprise procurement checklist in the last year has it on page one. Customers do not care whether agent reasoning is best in class. They care that when payroll terminates someone, the AI agent that person built three months earlier cannot keep emailing customers on Monday morning. That is a board-level question, and SCIM AI agents support is how to answer it cleanly. SCIM will not win demos. It will lose procurement.

So: ship SCIM. Accept users, groups, and meaningful attribute claims. Cascade deprovisioning into every credential the platform holds on a user's behalf. Test the deactivation path, not only the create path — that is where most implementations are weakest. Agent platforms without SCIM today should prioritize it above the next ten roadmap features.
