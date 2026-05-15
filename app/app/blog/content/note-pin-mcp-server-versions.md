---
title: 'Pin your MCP server versions'
description: 'How to pin MCP server versions in Cursor, Claude, and other clients. Stop using `latest`, lock to a semver tag or digest, and treat the config like a lockfile.'
isNote: true
author: 'Mack Chi'
---

# Pin your MCP server version: stop trusting `latest`

To pin an MCP server version, append `@<version>` to the package name in the client config (`some-mcp-server@1.2.3`), use `==<version>` for `uvx`, and use a `@sha256:` digest for Docker images. That is the entire fix. Most MCP getting-started guides still ship `npx -y some-mcp-server` with no version, which is how supply-chain attacks land in agent configs. Pin the MCP server version, treat the config like a lockfile, and stop trusting a string.

An unpinned MCP server can change between sessions without warning. A maintainer ships a new minor version, a tool's argument signature shifts, and the agent silently starts calling the wrong shape. Nothing has to be hostile for this to break production. If a friendly maintainer doing routine work can swap the binary under a running agent by accident, a hostile one can do it on purpose.

The fix is one character and three digits. Pin the version. The MCP ecosystem treats pinning as optional. It shouldn't be.

## What pinning an MCP server version actually means

A pinned MCP server version is a contract: the client runs exactly the build identified by that version string, and nothing else, until the config is changed on purpose. `latest` is the opposite — an open instruction that says "run whatever the registry resolves to at startup time." The config becomes a moving target. Pinning closes it.

The MCP config is effectively a lockfile for the agent's tool surface. Pin it like one.

## What the average MCP config looks like today

Open any MCP server's README. Scroll to "Getting Started." The snippet looks like this, or within five characters of it:

```json
{
  "mcpServers": {
    "some-thing": {
      "command": "npx",
      "args": ["-y", "some-mcp-server"]
    }
  }
}
```

There is no version anywhere. The MCP client resolves `some-mcp-server` against npm, takes whatever `latest` points to at that moment, caches it, and runs it. Tomorrow it may run something else. There is no record of which version the agent actually used yesterday to send those emails or run those SQL queries.

This default was covered in [`npx mcp-something` is not "installing" anything](/blog/npx-mcp-is-not-installation). That post is about why `npx -y` isn't installation in any serious sense of the word. This one is about the single smallest thing that makes it less bad: kill `latest`.

## What a pinned MCP server config looks like

### Pin the version for `npx` (Node)

```json
{
  "mcpServers": {
    "some-thing": {
      "command": "npx",
      "args": ["-y", "some-mcp-server@1.2.3"]
    }
  }
}
```

Ten extra characters. The package version is now part of the config. When the maintainer publishes `1.2.4` tomorrow, the agent does not see it until the number changes. Upgrades happen on purpose, after reading the diff, the way any other dependency bump gets merged.

### Pin the version for `uvx` (Python)

For Python servers launched with `uvx`, same idea:

```json
{
  "command": "uvx",
  "args": ["some-mcp-server==1.2.3"]
}
```

### Pin the version for Docker-launched MCP servers

For Docker-launched servers, use a tagged image and ideally a digest:

```json
{
  "command": "docker",
  "args": ["run", "--rm", "-i", "ghcr.io/some-org/some-mcp@sha256:abc123..."]
}
```

A digest beats a tag. Tags can be moved. Digests cannot.

## Pinning MCP server versions is a 10-second fix

Pinning should be the default everywhere — in every README, every blog post, every "5-minute quickstart." It is a ten-second change with zero downside and obvious upside. The fact that the ecosystem still ships `latest` examples is a cultural problem, not a technical one. The pattern was copied from `npx` quickstarts written for one-off CLI tools and is now being used to wire long-lived agents into production credentials. That does not scale, and it will not survive the first real supply-chain incident.

Plainly: an MCP server README that tells users to install without a version is training those users into a bad habit. Fix the README. Teams maintaining MCP client configs should ban unpinned entries the same way they would ban an unpinned base image in a Dockerfile.

## "But updates"

Update on purpose. Subscribe to the repo's releases. Read the changelog. Bump the pin. Commit the change with a message that says why. This is what every grown-up package manager has been doing for fifteen years and it is not a hardship. A lockfile is not a punishment.

## When config-level pinning isn't enough: private MCP registries

If pinning feels heavy across twenty servers and thirty engineers, the problem is not pinning — it is registry sprawl. That is where a [Private MCP Registry](/docs/platform-private-registry) earns its keep: one place that defines the approved version of each server for the org, one place to bump it, one audit trail. Config-level version pinning is the floor. A controlled registry is the ceiling. Pick the one that matches how much the servers are allowed to touch.

## Pin every MCP server in the next 60 seconds

1. Open the MCP client config.
2. For every entry, add `@<version>` after the package name. If the current version is unknown, `npm view some-mcp-server version` returns the current `latest`. Pin that today, then upgrade deliberately later.
3. Commit the config to a repo. Treat it like a lockfile, because that is what it is.

`latest` is a promise from the maintainer to themselves, not to the user. Stop trusting a string. Pin the number.
