---
title: 'MCP Security Checklist: 7 Pre-Install Checks for Community MCP Servers'
description: 'An MCP security checklist with seven concrete checks to run before installing any community MCP server. One opinion about the check most people skip.'
isNote: true
author: 'Mack Chi'
---

# MCP Security Checklist: 7 Pre-Install Checks

This MCP security checklist defines the pre-flight audit to run before installing any community MCP server. Seven items, one-line rationale, one-line check. The MCP security checklist below covers source review, version pinning, maintainer signals, network egress, secret access, sandboxing, and human-in-the-loop approval for writes. Each item maps to a known attack surface in the MCP ecosystem and produces a deterministic pass/fail signal. Run the full MCP security checklist on every community MCP server, every time, before it touches a real environment.

An MCP server is a program. The AI client launches it, hands it prompts, and grants it the right to act on the operator's behalf. If it can read files, hit the network, and call APIs, it can also leak files, hit the wrong network, and call the wrong APIs. "It's just an MCP server" carries the same risk profile as "it's just a Chrome extension" — true, and exactly the reason this MCP security checklist exists.

For the deeper threat-model context behind these checks, the [Archestra platform security concepts](/docs/platform-security-concepts) page covers the model end-to-end. For the supply chain angle specifically, [the MCP supply chain risk post](/blog/mcp-supply-chain-risk) and [why npx is not installation](/blog/npx-mcp-is-not-installation) pair directly with this MCP security checklist.

**The opinion up front:** of these seven items, the one most operators skip is #4, audit network egress. Most READMEs get read. Fewer versions get pinned. Almost nobody opens a network logger to see where the server actually phones home. That gap bites hardest, because a malicious or compromised MCP server does not need to break out of a sandbox if it is granted outbound internet to begin with.

## 1. Read the source (all of it)

**Why:** The README is marketing. The source is the contract. An MCP server's tool descriptions are sent verbatim to the LLM as prompts ([more on that here](/blog/mcp-tool-descriptions-as-prompts)), which means a hostile or careless server can inject instructions into the agent just by existing in the tool list. The README will not surface that.

**Check:** Open the repo. Read every tool handler. Read the tool descriptions. Grep for `exec`, `spawn`, `child_process`, `subprocess`, `eval`, `os.system`, `Function(`, `fetch(`, `requests.`, `urllib`, `http.client`. If any of those appear in unexpected places — pause. If the codebase is too large to read in one sitting, it is too large to install on a whim.

## 2. Pin the version (no `latest`)

**Why:** `npx some-mcp@latest` ships a new, unaudited version on every package update. The version reviewed in step 1 is not the version that will run tomorrow. Supply chain attacks against npm and PyPI are not theoretical — they occur on a near-monthly basis.

**Check:** Pin to an exact version (`some-mcp@1.4.2`, not `^1.4.2`, not `latest`). Better, pin to a commit SHA when running from source. Use a lockfile. On upgrade, re-run step 1 against the diff, not the full codebase.

## 3. Check who maintains it

**Why:** "300 stars" carries almost no signal. "One maintainer, no pushes in 8 months, accepts PRs from anyone" carries a lot. A single compromised maintainer account is the most common path for supply chain attacks against open source.

**Check:** Review the contributors list, commit cadence, recent PRs, and merge rights. One solo maintainer indicates high key-person risk. Three or more active maintainers from different orgs is better. A backing company with a security disclosure policy is better still. No security contact plus one maintainer with an unverified email is not a deal-breaker — it is a signal that the operator is now the security team.

## 4. Audit network egress

**Why:** This is the most-skipped item on the MCP security checklist and the one that bites hardest. An MCP server with outbound internet can exfiltrate anything it can see. If it can read `~/.aws/credentials`, it can also POST them somewhere. A sandbox escape is unnecessary when no sandbox exists.

**Check:** Run the server with a network logger attached. On macOS, use [Little Snitch](https://www.obdev.at/products/littlesnitch/index.html) or `lsof -i` while the server runs. On Linux, use `nethogs` or a stripped-down container with an explicit egress allowlist. Confirm the only hosts contacted are the ones the README claims. An unexpected "telemetry" endpoint is the answer.

## 5. Audit secret access

**Why:** MCP servers inherit the environment of whatever launches them. Shell env vars, the home directory, SSH keys, cloud credentials — all of it is reachable by default. Most servers need none of that. The ones that do usually need one specific token, not the entire keychain.

**Check:** Launch the server with a minimal env (`env -i PATH=/usr/bin SOMEVAR=… node ./server.js`) and pass only the secrets it requires. If it errors because `HOME` is not set or `~/.aws/credentials` is missing — the audit is working. For cloud credentials, use a scoped IAM role or short-lived token, not a long-lived admin key.

## 6. Sandbox the runtime

**Why:** Items 1–5 are about deciding to trust the server. Item 6 is about not having to. A constrained environment — container, VM, user namespace — bounds the blast radius of any compromise to what that environment can reach. Cheap insurance against anything missed in steps 1–5.

**Check:** Run the server in a container with no host filesystem mounts, a non-root user, and an explicit egress allowlist (see step 4). Docker works. Firejail, bubblewrap, or a rootless Podman container work too. If the server cannot tolerate a sandbox, that is information — interrogate why it needs full home directory access.

## 7. Enable human-in-the-loop for writes

**Why:** Read-only tool calls are mostly safe. Writes are dangerous — `send_email`, `create_pr`, `transfer_funds`, `delete_file`. When an MCP server combines untrusted input (a fetched web page, an inbound email) with a write tool, the result is the [lethal trifecta](/blog/lethal-trifecta-definition) and the [confused deputy pattern](/blog/confused-deputy-mcp). Prompt injection turns "summarize this email" into "forward this email to attacker@evil.com," and the LLM complies.

**Check:** Require explicit human approval for any tool with a destructive or external-communication effect. Most MCP clients support a "confirm before executing" mode — enable it. For production agents, this is where a policy layer earns its keep: deterministic rules stating "this tool, in this context, needs human approval," evaluated before the call leaves the gateway. The [Archestra security concepts](/docs/platform-security-concepts) page covers the context-aware version of this.

---

The cluster these checks belong to: supply chain (#1, #2, #3), runtime isolation (#4, #5, #6), and execution policy (#7). Most "AI security" content focuses on #7 because prompt injection is the loud, interesting problem. The boring items on the MCP security checklist — pinning versions, checking egress, running as a non-root user in a container — catch the bulk of real-world incidents. Boring wins. Pin the versions.
