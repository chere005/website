---
title: 'Agent Tool Allowlist: Why Allowlists Beat Blocklists'
description: 'An agent tool allowlist starts from default-deny and scales with policy, not threat curation. Blocklists cannot keep up with the MCP catalog.'
isNote: true
author: 'Mack Chi'
---

An agent tool allowlist is the only posture that scales with AI agent deployments. Blocklists assume complete knowledge of every dangerous tool an agent might call, and that knowledge does not exist. The MCP catalog expands faster than any security team can curate denials, tool names mutate between releases, and arguments matter more than identifiers. The right default, the one the rest of the security industry settled on decades ago, is default-deny. Start from zero. Expand by review. An agent tool allowlist treats the agent as a privileged process that gets explicit grants, not a guest that gets reminded which doors to avoid.

Blocklist defaults to losing. That is the opinion this note defends.

## The five-year-old version of an agent tool allowlist

Picture a school's front gate. Option one: anyone walks in, except the people whose photos are taped to the office wall. Every morning new photos go up. By Friday the wall is full and nobody remembers who is still on it. Option two: only people with a school badge walk in. No badge, the receptionist gets involved. New badges issue after the principal signs off.

A blocklist is option one. An agent tool allowlist is option two. Schools do not run option one. Banks do not. Airports do not. The brand-new category of software that holds enterprise credentials and acts on enterprise accounts should not either.

## What the security industry already knows

Default-deny is the boring backbone of every mature security stack in production today.

- **Network firewalls** default to deny. Ports open on purpose, one at a time, after a change request.
- **Production database access** defaults to deny. A role gets requested, an approver clicks a button, a time-bounded grant arrives.
- **iOS app permissions** default to deny. The app asks for the camera, the user answers, and the OS enforces the answer.

None of those systems try to maintain a global list of "bad ports" or "bad SQL queries" to block. The question flipped forty years ago. It is no longer "is this dangerous?" It is "is this allowed?" Those are different questions, and only the second one has an answer a finite team can produce with a straight face.

Agents are the new privileged process on the network. They run as a user, they hold tokens, they make outbound calls. Treating them like a process that needs an explicit grant is the most ordinary thing in the world.

## Why blocklists lose, specifically

The Archestra MCP catalog crossed almost 900 servers around the [first 100 builders milestone](/blog/celebrating-100-mcp-servers-milestone). It is larger now. New entries land every week. A `send_email` tool today might be `send_email_v2` tomorrow with a parameter that bypasses every regex in the policy file.

A blocklist needs three things to work: complete knowledge of what is dangerous, fast curation, and stable tool names. Agents deliver zero of the three. The catalog is open-ended. Curation is one engineer staring at a wiki on a Friday. Tool names are whatever the maintainer felt like that morning.

A related point appears in [`npx mcp-something` is not installation](/blog/npx-mcp-is-not-installation): if the version of a tool that ran today is unknowable, maintaining a list of which versions are dangerous is also unknowable. Pinning, signing, and allowlisting are the same conversation from three angles. They reduce to one rule: decide on purpose, not by exception.

## What an agent tool allowlist actually looks like

A useful agent tool allowlist is more than a list of names. The interesting questions are about context.

- Which user is the agent acting for, and what are they allowed to do in the underlying system?
- Is the tool being called with safe arguments, or is it about to send mail to an external domain?
- Has the conversation already touched untrusted data, like the contents of an inbound email, so the next tool call has a higher bar?
- Is this a one-off action that needs approval, or a routine read that runs on its own?

This is why Archestra's [AI tool guardrails](/docs/platform-ai-tool-guardrails) ship default-deny and then layer policy on top. Tool call policies inspect arguments before a tool runs, not just the name. A `send_email` to `@mycompany.com` recipients can be "allow always," and the same tool to an outside domain can be "require approval" or "block always." Tool result policies inspect what came back and mark the context sensitive when the data looks adversarial. Once the context is sensitive, the allowlist tightens automatically. Same agent, same tool, different decision, depending on whether the conversation has crossed a trust boundary.

That capability does not exist on a blocklist. A blocklist has no notion of context. It is a switch. An agent tool allowlist with context-aware policies is a posture.

## The honest objection

The most common objection: "An allowlist will slow the team down."

Yes. That is the point. New tools are how the bad day starts. A small amount of friction at adoption is a rounding error compared to one agent quietly exfiltrating a CRM at 3 a.m. because someone copy-pasted an `npx -y` line from a tutorial.

The fix to friction is process, not posture. A path to add a tool to the allowlist should take minutes, not weeks. Safe tools default in. Internal-only tools get a fast lane. Heavy review is reserved for tools that touch external systems or sensitive data. The agent tool allowlist is not a moat. It is a sign-in sheet.

## What to do this week

A platform is not required to start:

1. Write down the tools agents actually called this week. Not could call, did call. That is the starting allowlist.
2. For each tool, write the one-line answer to "what is this allowed to do, and for which users?" If that line cannot be written, the tool is not ready for the list.
3. Pick one tool on the list that talks to the outside world and require explicit approval for it for the next sprint. Observe what breaks. Adjust.

That is the airport playbook applied to an agent fleet. The interesting work happens after step three, when context-aware rules go on top, but the posture flip is the part that matters.

Stop asking which tools to block. Start asking which tools to allow. The first question has no answer. The second one is the security policy.
