---
title: 'Three reasons to sandbox every MCP server'
description: 'Sandbox every MCP server because each one executes code, reads secrets, and opens network egress on the host machine. Three reasons, three examples.'
isNote: true
author: 'Mack Chi'
---

# Three reasons to sandbox every MCP server

Sandbox every MCP server by default. An MCP server is a process running as the user with permission to execute code, read every secret on disk, and open arbitrary outbound network connections. Each of those three powers needs a box around it. The protocol does not provide one, the install instructions do not provide one, and `npx -y` certainly does not. Whatever the maintainer ships, runs. Whatever a compromised maintainer ships, also runs. The case to sandbox MCP server processes is not theoretical, and the review-the-source model that some security teams cling to does not scale past a handful of integrations.

A typical AI client deployment connects dozens of servers within weeks. Nobody reads dozens of repositories. Nobody can. "I trust the maintainer" is not a control. The only durable answer is to sandbox MCP server processes at install time, by default, with no exceptions. The three sections below are the reasons, with concrete examples of what goes wrong when they are skipped.

## What this post is

Three reasons, three examples, in plain language. Code execution, secret access, network egress. The headers are the post. The examples are the receipts. This is the practical companion to [`npx mcp-something` is not "installing" anything](/blog/npx-mcp-is-not-installation) and [Every 10th MCP server is one person](/blog/mcp-supply-chain-risk), which cover why the defaults are broken. This one covers what to do once those defaults are accepted as broken.

## Reason 1: Code execution

An MCP server is a process that runs on the host machine and can do anything the user's shell can do.

That is the whole reason to sandbox MCP server installs. The protocol does not require a sandbox, the install instructions do not put one there, and `npx -y` certainly does not. Whatever the maintainer ships, runs. Whatever a compromised maintainer ships, also runs.

**Concrete example:** typosquatting. A blog post recommends an MCP server called `mcp-github-issues`. A user copy-pastes, fat-fingers, and types `mcp-github-isssues` (three s). The package exists. It has three downloads. It runs a Python script that writes a `launchd` plist into `~/Library/LaunchAgents` and reopens a reverse shell on every login. The install completes silently. Inside a container with no write access to the user's home directory, the plist write would have failed loudly, and the worst outcome would have been a confused error message.

What "sandbox MCP server" means here: run the server in a container, a VM, or [Archestra's per-server sandbox](/blog/why-we-found-archestra). Not in the same process tree as the editor. Not as the logged-in user. Docker is the lazy answer that works for most teams on day one. Anything is better than running it bare on the laptop.

## Reason 2: Secret access

An MCP server can read every credential the user's shell has, every config in the home directory, and every cookie in the browser profile.

This is the one most teams underestimate. The mental model is "the server needs my GitHub token" and the surface is treated as one variable. The actual surface is the entire process environment plus the filesystem. `process.env` exposes every shell export. `os.homedir()` reaches `~/.aws/credentials`, `~/.ssh/id_rsa`, `~/.kube/config`, `~/.config/gh/hosts.yml`, and the Chrome cookie store. The server does not have to ask for any of it. It just has to read the file.

**Concrete example:** a Slack MCP server that needs `SLACK_BOT_TOKEN`. The token gets pasted into the shell environment, the client is restarted, and tool calls work. A one-line `console.error(JSON.stringify(process.env))` added to a fork reveals the full dump: `AWS_ACCESS_KEY_ID`, `OPENAI_API_KEY`, `GITHUB_TOKEN`, a Stripe restricted key, and a Postgres connection string with the password in the URL. None of those have anything to do with Slack. A compromised version of that exact server, with a one-line exfiltration call, walks off with all of it. Maintainer reputation is not the point.

What "sandbox MCP server" means here: scope secrets explicitly. The container only sees the env vars passed in, not the parent shell. Sensitive paths like `~/.aws`, `~/.ssh`, and browser profiles are not mounted. Credentials get injected by a gateway at call time, not loaded at process start. If the server needs `SLACK_BOT_TOKEN`, the server gets `SLACK_BOT_TOKEN` and nothing else.

## Reason 3: Network egress

An MCP server can open an outbound connection to anywhere on the internet, and nothing on a default laptop is watching where it goes.

This is the cleanest exfiltration channel ever invented. The server already needs network access to do its job, talk to the GitHub API, the Slack API, the Postgres host. Adding one more DNS lookup to `attacker.example.com` is invisible noise inside that traffic. macOS Application Firewall does not catch it. Most corporate VPNs do not catch it. The IDP does not catch it.

**Concrete example:** a Postgres MCP server makes calls to a "telemetry" endpoint on the maintainer's personal domain. The payload is the schema of every database it has connected to, table names and column names included. The intent is innocent: the maintainer is building usage stats. The schema names include internal product codenames, customer table names, and one column literally called `pii_email_hash_salt`. That data leaves the laptop on every tool call, and the only reason it surfaces is a flow log on the wifi spotting an unfamiliar host. If the server had been sandboxed with egress restricted to the Postgres host and nothing else, the telemetry call would have failed and the data would never have shipped.

What "sandbox MCP server" means here: an allowlist of destinations the server is allowed to reach. The Slack server can talk to `slack.com`. The Postgres server can talk to its database host. Everything else returns "connection refused." This is the part most teams skip, and it is the part that catches the most subtle compromises, because exfiltration is what malicious code actually does once it is in.

## The take

Every MCP server gets a box. Code execution goes in the box. Secrets go in the box. Network goes through a filter on the way out of the box. The default of "run the maintainer's code as the user, with the user's credentials, and the user's network" is the bug. Sandboxing is the patch.

No platform is required to start. Wrap servers in Docker, scope the env vars passed in, and put an egress proxy in front of them where possible. To enforce this for an org rather than a single laptop, that is what [Archestra](/blog/why-we-found-archestra) is building. The deeper context is in the [founding story](/blog/why-we-found-archestra). The point of the sandbox is simple: a stranger's process should never inherit the user's shell, the user's secrets, and the user's network just because an install instruction said so.
