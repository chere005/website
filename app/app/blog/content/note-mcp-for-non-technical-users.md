---
title: 'MCP for Non-Technical Users: Fixing the Install UX'
description: 'MCP for non-technical users still means editing JSON. That is the worst install UX in modern software, and the patterns to replace it are emerging now.'
isNote: true
author: 'Mack Chi'
---

## MCP for Non-Technical Users Starts With the Install Flow

MCP for non-technical users is gated by one thing: the install flow. The protocol itself is sound. The catalog is sound. What blocks adoption outside engineering is the requirement that a user open a hidden config folder and paste JSON into a text editor. No teacher, lawyer, accountant, or operations lead will do that, and no amount of documentation will change it. Solving MCP for non-technical users means deleting the JSON step entirely, not styling it. The first product to ship a clean install path for MCP for non-technical users captures the long tail of adoption.

## What the MCP Install Looks Like Today

The real-world flow for adding an MCP server to a desktop assistant in May 2026 is unchanged from a year ago. Quit the app. Locate a hidden config directory. Open a JSON file in a text editor. Paste five lines containing an `npx` command, a package name, and possibly an API key. Save. Restart the app. A misplaced comma causes silent failure with no surfaced error.

Reports from operations and finance teams at mid-sized companies are consistent: onboarding stalls the moment IT says "just edit the config." The project ends there. Editing a JSON file is the worst installation UX in modern software, and MCP inherited it.

## Three Patterns That Hide the JSON From Non-Technical Users

The fix is not a prettier JSON editor. The fix is to never expose JSON. Three patterns are starting to work for MCP for non-technical users.

### Zero-Config Remote Servers

The user clicks a link, signs in with an existing SSO identity, and the assistant gains the tool. No file, no path, no restart. This works for any MCP server hosted on a vendor's infrastructure rather than the user's laptop. It is the install flow non-developers should expect.

### Browser-Driven Installers

A web page detects the local agent, prompts the user with "add Notion to your assistant?", handles OAuth in a popup, and writes the config behind the scenes. The user never sees a file path. Archestra implements a flow close to this, and it is the single largest adoption lever for non-technical rollouts.

### Opinionated Bundle Apps

Ship a desktop application with ten servers pre-installed and a checkbox UI to toggle them. No config, no catalog, no choices the user does not need. This matches how an app store works and aligns with what software installation is expected to feel like in 2026.

## The Open Problem: Permission UX

Permission UX is unsolved. When an assistant asks "can I send this email on your behalf?", a developer reads the tool name, infers behavior, and approves. A non-technical user reads `execute_send_email_via_smtp` and either approves everything blindly or refuses everything. Neither outcome is safe.

The fix is permission prompts that read "Claude wants to send an email to ben@acme.com with the subject 'Q2 review'. Allow?", generated automatically from tool schemas rather than hand-written per server. That is a hard product problem and it remains wide open. The opinion here is direct: the spec is the easy part, the catalog is the easy part, and getting a non-developer to install an MCP server and trust the permissions at runtime is where the next year of work lives.

For the deployment side of rolling MCP out to non-developers inside a company, the [Claude Desktop vs Archestra comparison](/blog/claude-desktop-vs-archestra) covers the same problem from the admin angle. The install UX described above is the user-facing half of it.
