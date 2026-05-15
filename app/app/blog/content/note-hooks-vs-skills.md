---
title: 'When to reach for a Claude hook vs a skill'
description: 'Claude hooks vs skills: a decision matrix for picking between descriptive workflows and deterministic gates at the execution boundary.'
isNote: true
author: 'Mack Chi'
---

# Claude hooks vs skills: when to reach for which

The Claude hooks vs skills question keeps coming up because skills get most of the attention and hooks get almost none. Both extend Claude Code. They are not interchangeable. The short version of Claude hooks vs skills: skills describe how the agent should approach a class of task, hooks fire at the execution boundary and enforce something deterministic. If the requirement is "teach the agent a workflow," reach for a skill. If the requirement is "this must happen, or must never happen, regardless of what the model decides," reach for a hook.

## The 30-second definitions

A skill is a descriptive bundle — a `SKILL.md` plus optional scripts and assets — that the agent loads into context when it matches the situation. It nudges behavior. The model still decides whether to follow it, when to invoke the scripts, and how to interpret the instructions. Skills are good at "here is the shape of this kind of task."

A hook is a shell command wired to a lifecycle event — `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, `Notification`, `SubagentStop`. The runtime fires it whether or not the model wants it fired. A `PreToolUse` hook can block a tool call before it executes. A `PostToolUse` hook can run a linter, a formatter, or a check against the output. The decision lives in code, not in the prompt.

## The decision matrix

| Need                                                       | Reach for |
| ---------------------------------------------------------- | --------- |
| Descriptive workflow the agent should follow when relevant | Skill     |
| Deterministic gate at the tool-call boundary               | Hook      |
| Mistake the team does not want repeated across sessions    | Hook      |
| Domain knowledge the agent should consult for a task class | Skill     |
| Audit trail of every tool invocation                       | Hook      |
| Optional context loaded by model judgement                 | Skill     |
| Format-on-save, lint-on-edit, test-on-commit               | Hook      |
| Multi-step procedure with branching the model should plan  | Skill     |

The pattern under the matrix: anything that depends on the model's discretion belongs in a skill. Anything that must hold regardless of discretion belongs in a hook.

> Skills tell the agent how to think. Hooks are where teams encode the mistakes they do not want repeated.

## Three worked examples

**Skill only — "writing release notes."** A `release-notes` skill describes the house format, tone, required sections, and how to summarize breaking changes. There is no enforcement requirement; the model drafts, a human reviews. Wiring this as a hook would be wrong — the work is generative and there is no execution boundary to fence.

**Hook only — "never commit to main."** A `PreToolUse` hook intercepts `git commit` and `git push`, inspects the branch, and exits non-zero on `main`. The model cannot talk past it. The rule has nothing to teach and everything to enforce. Encoding it as a skill would mean trusting the model to remember across sessions — exactly the failure mode hooks remove.

**Both — "edits to catalog data."** Catalog edits need a workflow (validate schema, regenerate badges, run tests) and an enforced gate (validator must pass before commit). A skill captures the procedure; a `PostToolUse` hook on writes to the catalog path runs the validator and blocks on failure. Skill for the shape of the work, hook for the floor under it.

## When in doubt

The default failure is over-using skills. Skills are easy to write and easy for the model to ignore. Hooks are slightly more work to set up and impossible to bypass. For anything load-bearing, the hook is the safer answer. For where skills sit relative to other extension surfaces, see [skills vs MCP](/blog/skills-vs-mcp).
