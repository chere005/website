---
title: 'MCP tool description drift: how to detect and prevent it'
description: 'MCP tool description drift quietly poisons agent behavior. Two patterns catch it before the model picks the wrong tool or fills the wrong parameter.'
isNote: true
author: 'Mack Chi'
---

# MCP tool description drift: how to detect and prevent it

MCP tool description drift happens when a tool's natural-language description falls out of sync with its actual schema, handler, or backend contract. The model reads the stale description, trusts it, and produces calls that fail validation — or worse, succeed with the wrong shape. The fix is to make the description and the implementation share a machine-checkable contract.

A typical example: an agent keeps calling `create_ticket` with a `priority` of `"normal"` — a value the backend stopped accepting two sprints ago. The schema was updated. The handler was updated. The Jira-side enum was updated. The tool description was not, and still cheerfully lists `low | normal | high`. Every call returns 400. That is MCP tool description drift in production: not a crash, not an exception, not a security incident — the agent quietly being wrong in a way that looks like the agent's fault. The implementation moved. The prompt didn't.

## The tool description is the prompt

**The tool description _is_ the prompt the model sees. The moment it is out of sync with the code, the model is lying to itself.**

The case for treating descriptions as prompts is made in [Your tool description IS a prompt](/blog/mcp-tool-descriptions-as-prompts). This note is the operational follow-up: once descriptions are accepted as prompts, MCP tool description drift has to be controlled the same way any other prompt is kept honest — with a source of truth and a check that fails loudly when they diverge.

Two patterns address this. Pick one and ship it this week.

## Pattern 1: Generate the description from the schema

The cleanest fix for MCP tool description drift is to stop hand-writing the parts that drift. Anything mechanical — parameter names, allowed enum values, required vs. optional, return shape — should be assembled from the same Pydantic / Zod / TypeBox model the handler uses. The hand-written piece shrinks to the bits a generator cannot know: the trigger ("use when the user references a person or company") and the negative case ("do NOT use for bulk exports").

```python
def tool_description(handler):
    schema = handler.input_model.model_json_schema()
    enums = {k: v["enum"] for k, v in schema["properties"].items() if "enum" in v}
    return f"{handler.intent}\n\nAllowed values:\n" + "\n".join(
        f"- {k}: {v}" for k, v in enums.items()
    )
```

When the backend drops `"normal"` from the priority enum, the model's prompt updates on the same deploy. No human in the loop. No stale doc.

## Pattern 2: A CI check that diffs description against signature

If generation is not an option — sometimes the description is genuinely prose and that is by design — drift must at least be caught before merge. The check is small: parse the description for parameter names and enum values, parse the schema for the same, fail the build if they disagree.

```python
def assert_description_matches_schema(tool):
    described = set(re.findall(r"`(\w+)`", tool.description))
    declared = set(tool.input_schema["properties"].keys())
    missing = declared - described
    extra = described - declared
    assert not missing and not extra, f"drift: missing={missing} extra={extra}"
```

Run it in the same job that runs unit tests. The first time it fires, expect to find at least one tool whose description references a parameter that no longer exists. That is the tool that was costing tool-selection accuracy nobody knew they were losing.

The point of both patterns is the same: the description and the implementation share a contract, and the contract is machine-checkable. Anything less and MCP tool description drift is a matter of when, not if.

Boring? Yes. The alternative is hearing from a confused customer that the agent has been hallucinating `"normal"` priorities for a month.
