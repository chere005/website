---
title: 'MCP Tool Naming Conventions for Reliable Agent Tool Selection'
description: 'MCP tool naming conventions that prevent wrong-tool calls: verb_object, no abbreviations, prompt-grade descriptions, and namespace prefixes.'
isNote: true
author: 'Mack Chi'
---

# MCP Tool Naming Conventions That Keep Agents Picking the Right Tool

MCP tool naming is the interface the planner LLM uses to choose which capability to invoke. Use `verb_object` in lowercase snake_case, pick one verb per operation, spell out abbreviations, prefix tools by system, and write descriptions like prompts. Names are not metadata — they are the dropdown the model scans on every turn, and bad MCP tool naming produces silent wrong-tool calls that surface only as user complaints.

Two tools named `fetch_user` and `get_user` on the same server, pointing at different backends, will be picked interchangeably by the model based on which sounds more authoritative in the current sentence. That ambiguity is authored into the namespace. Good MCP tool naming closes it before the model has to guess.

## Tool Names Are Microcopy, Not Developer Concerns

Treat an MCP tool namespace like product UX, not a Python module. Every word in a tool name and description costs context tokens and earns or loses agent trust. An LLM chooses between tools the way a person scans a menu — name first, description second, parameters last. If the name is wrong, step two never happens.

This matters more than it sounds. An MCP server with 30 tools hands the model a 30-item dropdown on every turn. The model has no view into the codebase. It cannot tell that `fetch_user` is a legacy wrapper around `get_user`. It sees two function names that look like synonyms and has to guess.

For background on which component does the picking, [the dual-LLM pattern](/blog/dual-llm) explains why the planner LLM is the one doing tool selection, and why everything downstream from a bad pick is downstream from a name. The planner does not run tools. It reads their names and decides.

## MCP Tool Naming Conventions Checklist

The following conventions keep agents from getting confused. Nothing exotic — most amount to "stop doing things no public API would allow."

### 1. `verb_object`, Always

Every tool name is `<verb>_<object>`. Lowercase, snake_case, no exceptions.

| Good                  | Bad                            |
| --------------------- | ------------------------------ |
| `create_issue`        | `issueCreate`                  |
| `list_pull_requests`  | `prs`                          |
| `search_documents`    | `docSearchV2`                  |
| `cancel_subscription` | `subscription_cancel_endpoint` |

The verb anchors the model's intent. When a user says "cancel my subscription," `cancel_subscription` matches almost word-for-word. `subscription_cancel_endpoint` matches "subscription" first and forces extra work to decide if it is the right shape.

### 2. One Verb per Concept. Pick It and Stick With It.

The worst offender by far. Pick one verb for each operation and use it everywhere on the server.

- Read a single thing → `get_*`
- Read many things → `list_*`
- Query/search → `search_*`
- Create → `create_*`
- Mutate → `update_*`
- Destroy → `delete_*`

If `get_user`, `fetch_user`, and `read_user` coexist on the same server, three tools mean "give me a user" and the model picks whichever sounds more confident in the current prompt. **The rule: if two tools could plausibly answer the same user sentence, one of them is named wrong.**

### 3. No Abbreviations the Model Has to Expand

`get_org` reads fine to an author. The model has to decide if "org" means organization, organism, or origin. It probably gets it right. Probably. Spell it out.

- Bad: `get_org`, `list_subs`, `update_perm`
- Good: `get_organization`, `list_subscriptions`, `update_permissions`

Context tokens are cheap. Wrong tool calls are expensive.

### 4. Namespace Overlapping Tools With a Prefix, Not a Suffix

For a server that talks to multiple systems, prefix by system. Prefixes anchor scanning.

- Bad: `user_get_github`, `user_get_jira`
- Good: `github_get_user`, `jira_get_user`

Bonus: when the model has to pick between two `get_user` tools across two different MCP servers (a constant in real deployments), the prefix is the only thing keeping it sane.

### 5. Descriptions Are Prompts. Write Them Like Prompts.

The MCP spec allows tool descriptions up to 1024 characters. Use them. Write them like the system prompt that triggers the tool, because that is what they are.

A bad description:

```json
{
  "name": "search_documents",
  "description": "Searches documents."
}
```

A good one:

```json
{
  "name": "search_documents",
  "description": "Full-text search across the user's internal documents (Notion, Confluence, Google Drive). Returns up to 20 results ranked by relevance. Use this when the user asks to find, look up, or search for written content. Do NOT use this for code search — use search_code instead."
}
```

Three things to notice:

- It tells the model **when** to use the tool, not just what it does.
- It tells the model **when not to** use the tool — the negative case is often more useful than the positive one.
- It names the sibling tool by name. The model reads both descriptions; cross-referencing them shrinks the ambiguity zone.

### 6. Avoid Shared Name Prefixes Within a Server Unless the Tools Are Siblings

`read_file` and `read_file_metadata` force disambiguation on a single suffix word. Usually fine. But `read_file`, `read_file_v2`, `read_file_metadata`, and `read_file_safe` together are a guessing game. Consolidate or rename.

### 7. Parameters Get the Same Treatment

`q`, `id`, `data`, `payload` — useless to the model. Name parameters the way they would appear in a function signature meant for a junior engineer who cannot ask questions. `query`, `user_id`, `document_content`. Parameter descriptions matter as much as tool descriptions; the model reads them when filling in the call.

## A Quick Before/After

A representative example — a server wrapping an internal CRM:

**Before:**

```
- crm_get
- crm_get_v2
- fetchContact
- searchPpl
- updateRec
- delete_contact_force
```

**After:**

```
- crm_get_contact
- crm_list_contacts
- crm_search_contacts
- crm_create_contact
- crm_update_contact
- crm_delete_contact
```

Every name is `<server>_<verb>_<object>`. No abbreviations. No version suffixes leaking into the namespace — if v2 ships, deprecate v1 and remove it rather than shipping both. The model can now resolve "find john's contact info" without thinking twice: `crm_search_contacts` is the only plausible match.

## The Non-Obvious Gotcha: Tool Names Eat Prompt Budget

One detail that is easy to miss: **tool names are part of the prompt budget.** Every tool definition gets serialized into the model's context on every turn. A server with 40 tools and 500-character descriptions can eat 8-10k tokens before the user has said hello. That pushes useful context out of the working window. Cap descriptions at what is actually needed, and if a server has 80 tools, it is probably two servers.

## Why MCP Tool Naming Matters More Than It Looks

Silent wrong-tool calls do not throw errors. They return the wrong answer, and the user trusts the agent less the next time. For an MCP server shipping into a real agent deployment, the cost of bad MCP tool naming is much higher than the cost of fixing it up front.

For the auth side of MCP, [the OAuth 2.1 quick reference](/blog/mcp-oauth-21-quickref) covers the endpoints to wire up once the tool layer is sorted. Get the names right first — auth does not help if the agent is calling the wrong tool.

Names are the interface. Write them like product copy, not like internal symbols.
