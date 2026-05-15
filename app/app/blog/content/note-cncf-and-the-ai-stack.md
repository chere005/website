---
title: 'Why an AI security project belongs in the CNCF'
description: 'AI CNCF alignment is no longer optional. The agent stack runs on cloud native infrastructure, and the CNCF is the right home for it.'
isNote: true
author: 'Mack Chi'
---

# Why AI CNCF Alignment Matters for the Agent Stack

AI CNCF alignment is the shortest path to durable agent infrastructure. The agent stack already runs on cloud native infrastructure, so treating it as a separate category is a category error. The problems the CNCF spent ten years solving for microservices, identity, observability, policy, and interoperability, are the exact same problems AI agents face today, just relabeled. Open governance and neutral standards bodies are the only durable way to keep the layers in the middle out of vendor lock-in.

[Archestra joined the CNCF last year](/blog/archestra-joins-cncf-linux-foundation), and the first question from skeptical engineers was a polite version of "AI security in a cloud native foundation?" It is a fair question. "Cloud native" used to mean a very specific stack: containers, Kubernetes, service meshes, microservices, observability for HTTP traffic. None of that screams "LLM." Below is the case, in plain terms, for why every layer of the agent stack is becoming cloud native and why the AI CNCF intersection is where serious open-source agent work will live.

## The Problem in Five-Year-Old Terms

A company has a bunch of internal tools. ServiceNow, Snowflake, Jira, an HR system, a billing system. Until now, humans clicked buttons in those tools. Soon, an AI agent will click those buttons on behalf of a human. The agent has to log in as the right person, only touch what that person is allowed to touch, and leave a clean trail of what it did. If any of those go wrong, the company is in real trouble. Not "embarrassing demo" trouble. "Regulator on the phone" trouble.

That is the problem. Now, where does it run? In the same place all the other shared infrastructure runs: on a Kubernetes cluster somewhere, behind the same identity provider, monitored by the same security team. The agent does not get its own special universe. It joins the existing one.

## Three Claims About AI and the CNCF

This post argues three things. First, the agent stack already runs on cloud native infrastructure, so calling it something else is a category error. Second, the problems the CNCF spent ten years solving for microservices are the exact same problems agents have now, just with new names. Third, there is work the CNCF community has not solved yet, and that gap is where the next wave of AI CNCF projects will land.

## What "Cloud Native" Actually Means, and Why Agents Fit

Cloud native was never really about containers. Containers were the artifact. The real ideas were:

- Open standards beat vendor APIs.
- Any one piece should be swappable for another.
- Systems should be observable end to end, not just per-vendor.
- Identity, policy, and audit are platform concerns, not app concerns.

Now look at the agent stack being built right now. MCP gateways routing tool calls. Dual-LLM patterns where one model drafts and another reviews. Agent observability, which is "distributed tracing, but the spans are reasoning steps." Identity-bound tool routing, where the agent's permissions match the human it is acting for. Every one of those is the same shape as the cloud native problems from a decade ago. Different payload, same architecture.

Production agents at any scale already require open standards (otherwise the operator is locked to one model vendor), interoperability (because the model in production today is not the one in production eighteen months from now), and audit (because someone will ask what the agent did and why). The CNCF stands for all three. The fit is not metaphorical.

## What the AI CNCF Pairing Actually Brings

Two things, mostly.

### Open Governance

AI infrastructure right now is mostly controlled by the model vendors. That is fine for some layers, but it is a terrible idea for the layers in the middle, the ones that decide who can do what, where the traffic goes, and what gets logged. Those layers need to be neutral. The same way nobody wants their Kubernetes controller to be owned by their cloud provider, nobody serious wants their agent gateway to be owned by their model provider. Open governance is the mechanism that keeps that from happening.

### Interoperability

The CNCF has spent years getting projects to agree on common interfaces. OpenTelemetry, OCI, CNI, the whole alphabet. Agents need the same treatment, fast. MCP is a good start. It is a common protocol for connecting models to tools, and it is only useful if everyone implements it the same way. That is exactly the kind of thing the CNCF is good at policing. The messy parts of MCP, especially [authentication](/blog/why-we-found-archestra), are the single biggest thing slowing enterprise adoption. Standards bodies fix that better than any one company can.

## What the AI CNCF Stack Is Still Missing

This is where the AI CNCF approach gets opinionated. It is the right approach, but the agent ecosystem has gaps that do not have obvious owners yet.

### Identity for Non-Human Actors

SPIFFE and SPIRE solved this for workloads. Nobody has fully solved it for agents acting on behalf of users. The handoff from "user identity" to "agent identity bound to user" is still ad hoc in most production setups, and it is where most of the real security bugs are going to live.

### Reasoning-Step Observability

Tracing a microservice call is a solved problem. Tracing why a model decided to call `delete_customer` is not. Logs exist, but a standard schema for the thing in the middle does not. OpenTelemetry will eventually swallow this, but the conventions need to be written.

### Policy at the Tool-Call Boundary

OPA is great for "can this service call that service." There is no equivalent for "can this agent, acting for this user, in this context, call this tool with these arguments right now." It is the same shape of problem, but the inputs are messier and the stakes are higher.

These are not small gaps. They are the kind of gaps that take three or four years of community work to close. Which, again, is why this work belongs in the CNCF. It is the only venue that has demonstrated multi-year cross-vendor coordination at this scale.

## A Prediction for AI CNCF Convergence

In five years, "AI infrastructure" as a separate category will not really exist. The agent gateway will sit next to the API gateway. The agent identity flow will run through the same IdP as everything else. The model traffic will show up in the same observability stack. The reason will be boring: the teams running production AI are the same teams running production everything else, and they will not operate two completely different worlds. They will pull the agent stack into the one they already trust.

That world looks an awful lot like CNCF. Which is why Archestra joined, and why anyone building serious open-source agent infrastructure should be there too.
