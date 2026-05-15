---
title: 'MCP server config sync: stop the drift, centralize the gateway'
description: 'MCP server config sync breaks across IDEs and agents at scale. Compare four mitigations and why an MCP gateway should be the source of truth.'
isNote: true
author: 'Mack Chi'
---

## Why MCP server config sync is a drift problem

MCP server config sync fails because every MCP client — Claude Desktop, Cursor, VSCode Copilot, Codex, internal chat apps — keeps its own list of which MCP servers exist, where they run, and which environment variables they require. The schemas look similar but differ in shape: `command` may be a string in one client and an array in another. The files sit in different folders. Several require a restart to pick up changes. Rotating a single credential means editing the same value across four or more places, and a typo in any one of them produces silent tool unavailability rather than a loud error.

The scaling math is unforgiving. Five MCP servers (GitHub, Slack, Postgres, an internal wiki, a custom one) across four clients and two environments (laptop and work VM) produces forty config entries describing the same five things. Adding a server means editing four files. Rotating a secret means editing four files. Onboarding a teammate means rebuilding four files from scratch, usually with errors. MCP server config sync is not a tooling-edge problem — it is the core operational experience.

## Four mitigations for MCP server config sync drift

### Dotfiles and symlinks

A single canonical config in a dotfiles repo, symlinked into each client's expected path. This works for exactly one client because each client expects a different schema. A render script becomes mandatory, which converts the approach into a manifest pipeline in disguise.

### Declarative manifests

One YAML file rendered by a script into each client's native format. This improves consistency but introduces a script to maintain. The manifest drifts from what each client has actually loaded. The silent-drop failure mode remains: an agent can decide a server is unavailable without surfacing it. Rendered files still contain raw tokens, so secret hygiene is unsolved.

### Per-client managed profiles

Some teams generate per-client profiles from a central template through CI. This narrows drift but multiplies artifacts and still leaves credentials sitting in plaintext on every workstation.

### Gateway as source of truth

Stop syncing. Run one MCP gateway. Point every client at it — one entry in `claude_desktop_config.json`, one in Cursor, one in Codex. The gateway holds the authoritative list of upstream servers, the real credentials, and per-user permissions. Clients see a single namespaced surface. Adding a server happens in one place. Rotating a token happens in one place. Onboarding a teammate becomes a single URL paste.

## Why the gateway should be the source of truth

MCP server config sync across laptops assumes the source of truth lives on the device. It should not. Config and credentials replicated into four files on every laptop expand the attack surface and the failure surface simultaneously. Centralizing in a gateway collapses both.

This is the role of [the Archestra MCP gateway](/docs/platform-mcp-gateway). The same architecture that fixes MCP server config sync also makes audit logging, namespace filtering, and credential injection tractable — but the first problem it removes is the four-files-and-one-typo failure mode. Past five MCP servers and more than one client, the issue stops being config sync and becomes architecture. A gateway is the fix.
