---
title: 'Auditing the MCP supply chain'
description: 'MCP supply chain audit rubric: three runtime checks SBOM scanners miss, and what an MCP SBOM must capture beyond npm dependencies.'
isNote: true
author: 'Mack Chi'
---

# MCP supply chain audit: three checks SBOMs miss

An MCP supply chain audit must cover three runtime properties that conventional SBOM tooling ignores: filesystem and network reach, executable surface, and replayable traceability. Standard SCA scanners report the npm dependency tree of an MCP server. They say nothing about what the server can actually do once it runs on a host. That gap is the entire problem.

Think of vetting a contractor. A background check returns employment history and references — the npm equivalent. It does not specify which rooms the contractor can enter, which filing cabinets open with their key, or whether anyone watches when they do. For an MCP server, those are the only questions that matter, and they define the scope of any serious MCP supply chain audit.

## What existing SBOM tools miss

SBOM tooling was built for libraries linked into a binary. It assumes the threat model is "a transitive dependency has a CVE." That model still applies — an MCP server is a Node or Python program and inherits everything wrong with its dependency tree. The new failure mode lives one layer up. An MCP server is a long-running process driven by an LLM. Its blast radius is defined by what it can reach on the host and the network at call time, not by what sits in its `package.json`.

CycloneDX will report the version of `axios` the server pulls in. It will not flag that one tool shells out to `git`, that another opens an outbound socket to a URL pulled from a config file, or that a third reads `~/.aws/credentials` on first invocation. That is the runtime permission boundary, and no current SBOM format carries it as a field.

## The three checks every audit needs

Three checks belong in every MCP supply chain audit before a server gets approved. Each one closes a gap the dependency scanner cannot see.

**Three checks before tool approval: what files and network the server can touch, what commands it can run, whether every call is logged in a replayable trace. Most scanners miss the runtime boundary.**

### 1. Reach

Start the server in a sandbox with deny-by-default filesystem and network. Observe what it requests. A weather tool that asks for `~/.ssh` is signaling something. The same idea, in checklist form, lives in the [7-item MCP security checklist](/blog/mcp-security-checklist) — this note is the audit-tooling version of that habit.

### 2. Executable surface

Grep the source for `spawn`, `exec`, `child_process`, `subprocess`, `eval`. Enumerate every external binary the server can launch. If the executable surface cannot be listed in fifteen minutes, the server is too opaque to install.

### 3. Traceability

Every tool call needs a record that includes the caller, the full arguments, the response, and a request id linking back to the agent transcript that produced it. A log line that reads "called `read_file`" is not an audit trail. It is a metric pretending to be evidence. When something goes wrong, the only artifact that helps is the one that can be replayed.

## The OSS landscape for audit tooling

A handful of projects are starting to fill these gaps. `mcp-scan` inspects static manifests and works as a first pass. The MCP Inspector exposes the protocol surface and covers the executable check. Container runtimes — rootless Podman, gVisor — handle the sandbox boundary when wired up. None of them, today, produces a single artifact a security team can sign off on. That artifact is what an MCP supply chain audit pipeline must produce.

The honest framing: the supply chain story for MCP is the npm story plus a runtime question SBOMs were never designed to answer. Until an audit covers all three checks, it audits the wrong layer.
