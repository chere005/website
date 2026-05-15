---
title: 'Every 10th MCP server is one person'
description: 'Roughly 10% of catalog MCP servers are solo-maintained with no review, no signing, and full laptop access. The MCP supply chain is unfolding faster than npm.'
isNote: true
author: 'Mack Chi'
---

# The MCP Supply Chain Risk: Every 10th Server Is One Person

Roughly 10% of MCP servers in the public catalog are maintained by a single developer, with no code review, no package signing, and full access to the laptop they run on. The MCP supply chain is reproducing every failure mode of npm's worst years, on a faster timeline and with a wider blast radius. This note lays out what the catalog data shows, why MCP supply chain risk is structurally worse than past registry incidents, and what the right defensive defaults look like.

An MCP server is a process that runs on a knowledge worker's machine with the same authority as the person at the keyboard. Pasting an install line into a client config and restarting is, in practice, executing unread code as the logged-in user, with the user's shell credentials, file access, and browser cookies. That is the default behavior of the ecosystem, not an edge case.

## What the catalog data shows

The [Archestra MCP catalog](/mcp-catalog) indexes public MCP servers and scores them on stars, contributors, recent commit cadence, presence of tests, documentation, and a handful of protocol-level signals. Sorting [worst scores first](/mcp-catalog?sort=quality&dir=asc) surfaces a consistent pattern in the bottom decile of the MCP supply chain:

- One contributor, ever.
- A repo created in the last six months.
- No GitHub Actions, no test files, no release process.
- A `package.json` with a single `bin` entry and a half-written README that ends in "TODO."
- An install line that reads `npx -y their-package` and shows up in an "awesome-mcp" list.

This is not a critique of solo developers. The category problem is scope of access. An MCP server is not a CLI utility or a small library. It is a long-running process that reads repos, drafts emails, queries databases, and drives a browser on the user's behalf. A solo project with that scope of access, distributed by copy-paste, with no version pinning by default, is a class of software that barely existed a year ago.

## Why MCP supply chain risk is worse than npm's bad years

The npm registry has run this experiment before. `event-stream` in 2018: a maintainer handed off a popular package to a stranger who slipped in a wallet-stealing payload. `ua-parser-js` in 2021: a stolen npm token shipped a crypto miner to every CI runner that ran `npm install` for a few hours. `coa`, `rc`, `node-ipc`, the `colors.js` sabotage. Each incident traced back to a single maintainer or a stolen token, and each one taught the same lesson: the default of "latest version of whatever is on the registry" is structurally unsafe.

Every one of those incidents had a bounded blast radius. The package ran in a build step or got bundled into a frontend. Nasty, sometimes very nasty, but bounded.

MCP servers are not bounded. They run as the user. The whole point of the protocol is to give the model the user's hands. A compromised MCP server is not an annoyance in a CI log. It is a phishing attack that already has the credentials.

Stacked against the catalog data, the math gets ugly. If 10% of servers are one person, and one person can lose an npm token, the question is not whether a compromised MCP server will ship to production users. The question is when, and how loud the news cycle gets. The mechanics of why `npx -y` makes this so easy are covered in [`npx mcp-something` is not "installing" anything](/blog/npx-mcp-is-not-installation). This note is the demographic side of the same MCP supply chain problem.

## The opinion

The MCP ecosystem is repeating npm's worst patterns at a worse blast radius, and it is doing so faster. npm took years to accumulate the bad defaults. MCP shipped with them on day one because it copied the install conventions wholesale.

A warning label will not fix this. "Be careful what you install" is what the industry has been saying about npm for a decade, and the incidents keep coming. Solo-maintained MCP servers with full local credentials are not a "be careful" category. They are an "immune system" category. Untrusted code is not made safe by asking users to read it. It is made safe by putting the code somewhere it cannot hurt the host when it misbehaves.

That means three shifts in the default, in order of how much they move the needle:

1. **Provenance.** Who published the package, when, and whether anything changed since the version the org approved. The npm registry exposes the metadata. The MCP supply chain just does not look at it.
2. **Curation at the org level.** A single approved catalog, with pinned versions, that the AI client points at instead of "whatever is on npm." Most enterprise teams will not curate a thousand servers, but they will absolutely curate the twenty they actually use.
3. **A sandbox by default.** The MCP server runs in a container, not on the laptop. Credentials are injected by the gateway, not by environment variables. A compromised server gets to misbehave inside a box, not on the filesystem.

This is the thesis behind [Archestra](/blog/why-we-found-archestra). The catalog data turned a hunch into a number. One in ten.

## What to do this week

A platform is not required to start. Three habits, in priority order:

1. Check the contributors page before installing anything. One person, repo three months old: treat it the way a random PowerShell script from a forum post would be treated. That is the correct mental model.
2. Pin versions in the client config. `npx -y package@1.4.2`, never `npx -y package`. A pinned version cannot be silently swapped underneath.
3. Do not run MCP servers as the laptop user. A container, a separate macOS account, a VM — anything that is not the home directory and the shell environment. The friction is worth it.

The ecosystem will get bigger before the defaults get better. The catalog is the cleanest available view of where MCP supply chain risk actually sits, and the data is unambiguous. Every tenth server is one person nobody has met. Act accordingly.
