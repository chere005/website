---
title: 'How one production AI bot got owned in 10 seconds'
description: 'A prompt injection production case study: how a public chatbot leaked its system prompt and insulted its own team in under a minute.'
isNote: true
author: 'Mack Chi'
---

# How one production AI bot got owned in 10 seconds: a prompt injection production case study

Prompt injection production incidents keep landing the same way. A major news organization shipped a public-facing election chatbot to its homepage. A reporter typed roughly ten characters of adversarial input. The bot insulted its own developers, agreed to write campaign slogans for a candidate it was supposed to remain neutral on, and emitted its full system prompt verbatim. Total elapsed time, from prompt to compromise, was under a minute. Every defense that would have stopped this is well-documented. None of them were in the deployment. The walkthrough below covers the attack chain and the four defenses that would have closed it.

## The setup

A consumer-facing enterprise org wanted a chatbot for an event window. The build was the now-standard pattern: a thin wrapper over a frontier model, a system prompt of a few hundred words instructing the model to stay on-topic, remain neutral, refuse to discuss competitors, and never reveal its instructions. No retrieval layer. No tool calls. No structured output. A single text-in, text-out endpoint exposed through a chat UI on a public domain.

That shape is the most common prompt injection production target on the internet today. Every defense in the literature assumes the attacker can already submit arbitrary text. A naked LLM behind a chat UI hands them exactly that, with the model's full context window as the playing field.

## The attack chain

The attack ran in three turns.

1. **Instruction override.** The reporter sent a variant of the classic "ignore previous instructions" prompt, asking the model to disregard prior rules and adopt a new persona. The model complied. No filter caught the phrase. No second model audited the request before it hit the production prompt.
2. **Policy violation on demand.** With the override accepted, the reporter asked the bot to write a campaign slogan for one party and a series of insulting one-liners about the engineering team that built it. The bot produced both, in tone, on request.
3. **System prompt exfiltration.** The reporter asked the bot to repeat its instructions back, verbatim, inside a code block. The bot complied. The full system prompt — internal team names, deployment date, editorial guardrails — landed on a public news feed within the hour.

A naked LLM behind a chat UI is a prompt-injection target dressed up as a product. The org owned the brand damage, the leaked prompt, and the follow-up press cycle.

## Four defenses that would have stopped it

None of these are exotic. All of them ship in production stacks today.

- **Input classification before the model call.** A small, fast classifier — or a second LLM with a tight prompt — inspects user input for instruction-override patterns, policy bypass attempts, and prompt-exfiltration probes. The "ignore previous instructions" family fails this on the first turn.
- **Dual-LLM separation.** Untrusted user input goes to a quarantined model that cannot see or modify the system prompt. The privileged model only ever sees a structured summary of what the user asked for. See [the dual-LLM pattern](/blog/dual-llm) for the full topology. Instruction-override attacks have nothing to override on the privileged side.
- **Output filtering for prompt leakage.** A deterministic post-hoc check scans the response for substrings of the system prompt before it leaves the server. Cheap, simple, and catches verbatim exfiltration with zero false positives.
- **No raw model behind a public endpoint.** The structural fix. If the product is a chatbot, the gateway in front of it should enforce input classification, output sanitization, and a constrained response schema. The model never speaks directly to the public internet. For the threat-model background, the [prompt injection primer](/blog/what-is-a-prompt-injection) covers why the attack class is structural, not a model-training problem.

The honest read on incidents like this one is that the failure was deployment, not the model. The model did what it was trained to do — follow instructions in its context window. The chat UI fed adversarial instructions straight into that window. The fence belongs at the gateway, not inside the weights.
