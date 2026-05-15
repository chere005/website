---
title: 'npx MCP server install is not installation'
description: 'The npx MCP server install pattern is not installation. It downloads and executes arbitrary npm code on every start, with full local credentials.'
isNote: true
author: 'Mack Chi'
---

# The npx MCP server install pattern is not installation

The npx MCP server install pattern that every getting-started guide promotes, `npx -y some-mcp-server` pasted into a Cursor or Claude Desktop config, is not installation. It is downloading and executing arbitrary code from npm on every client start, with no version pin, no signature check, and no sandbox. The MCP ecosystem normalized running code from strangers in three lines of config and decided to call it "install." The word is doing a lot of work it shouldn't.

## What `npx` actually does

`npx -y some-package` resolves the package name against the npm registry, downloads the latest version matching the dist-tag (usually `latest`), drops it into a cache directory, and runs its bin script. The `-y` flag skips the confirmation prompt. There is no version pinned to the config. There is no signature to verify. There is no review of what changed since yesterday. Anyone with publish rights to that package, the maintainer, a co-maintainer, a compromised npm token, a typosquatter who tricked someone into copy-pasting the wrong name, can ship new code that runs the next time the MCP client starts.

And it runs with the user's local credentials. Shell environment, `~/.aws`, `~/.ssh`, browser cookies if the server asks for them. Nothing stands between that process and the rest of the machine. That is not a clever exploit. That is `npx -y` doing exactly what `npx -y` is designed to do.

## Why the npx MCP server install pattern is the supply-chain story of 2026

Three facts stack on top of each other:

1. **MCP servers run as the user.** No container, no separate user, no capability restriction by default. The whole point of an MCP server is to act on the user's behalf, read their repos, send their emails, query their databases.
2. **The catalog is huge and thin.** When Archestra [thanked the first 100 builders who joined the trust-score effort](/blog/celebrating-100-mcp-servers-milestone), nearly 900 servers were already cataloged. [Sorting that catalog by quality](/mcp-catalog?sort=quality&dir=asc) shows roughly every 10th server is a solo project with almost no engineering visibility. One person, one npm token, full local access on every install. This is exactly [the problem Archestra was founded to fix](/blog/why-we-found-archestra).
3. **npm has done this dance before.** `event-stream` in 2018. `ua-parser-js` in 2021. `coa`, `rc`, `node-ipc`, the colors.js sabotage. Each incident traced back to a single maintainer or a stolen token, and each time the blast radius was bounded by what the affected package could do in a CI runner or a build step. MCP servers are different. They are designed to hold credentials and act on accounts. The blast radius is the user's working life.

The MCP ecosystem is repeating the npm supply-chain pattern at a worse blast radius and shipping it via copy-paste install instructions. That is not a community oversight. That is a default that needs to die.

## What real installation looks like

Installation, the way the rest of computing means the word, is a deliberate act. Pick a version. Verify the artifact came from who it claims to be from. Decide what it is allowed to touch. Roll back when something goes wrong.

For MCP, that means version pinning by default, signature verification on the package, an allowlist of approved publishers at the org level, and a sandbox that contains the process when it finally runs. None of that is exotic. Every grown-up package manager works this way. `npx -y` does not.

This is what Archestra is building. A [Private MCP Registry](/docs/platform-private-registry) is the approved catalog for an org, with pinned versions, curated entries, and controlled credentials. The [security model](/docs/platform-security-concepts) enforces guardrails at the LLM proxy, before a tool call ever leaves the gateway, so a compromised server cannot improvise. The point is to make "install" mean something again.

## How to harden an npx MCP server install in 60 seconds

A platform is not required to stop the worst of this tonight:

1. **Pin versions.** In the MCP client config, write `npx -y some-mcp-server@1.2.3`, not `some-mcp-server`. A pinned version cannot be silently upgraded out from under the client. Bump versions on purpose, after reading the diff.
2. **Read the source before the first run.** All of it. Use `npm view some-mcp-server` to inspect maintainers and the tarball URL. Download the tarball, open it, skim it. If that feels like too much work for a tool about to receive shell credentials, the tool is too dangerous to run.
3. **Run it inside something.** A container, a separate macOS user, a VM, [Archestra's sandbox](/blog/why-we-found-archestra), anything that is not "my laptop, my credentials, my home directory." A bare `npx` invocation has none of these. Add one.

Stop calling `npx -y` installation. It is `curl | sh` with extra steps and worse marketing. Until the MCP ecosystem stops shipping that as the default, the burden falls on operators to refuse it.
