---
title: 'MCP vs REST API: the actual answer'
description: 'MCP vs REST API is the wrong frame. REST is the substrate. MCP is the catalog the model was post-trained to use.'
isNote: true
author: 'Mack Chi'
---

# MCP vs REST API: the actual answer

MCP vs REST API is the wrong frame. REST is the substrate. MCP is the catalog the model was post-trained to use. A working REST API does not mean an agent will use it well. The model can read an OpenAPI spec at runtime, but it has to be taught to do that inside a prompt, and tokens are burned every turn. MCP vs REST API is not a replacement debate, it is a layering question: REST stays underneath, MCP labels it for the model. This note covers the discoverability gap, the side-by-side surface, when REST is still the right call, and the upgrade path for teams comparing MCP vs REST API.

Imagine walking into a kitchen with 200 unlabeled cupboards and a 400-page manual listing every drawer. Reading the manual before making coffee works, but labeling the coffee drawer in a familiar shape works better. That is the practical difference between OpenAPI and MCP.

## The discoverability gap

REST is the substrate and is not going anywhere. Slack endpoints, Stripe endpoints, internal `/api/v2/orders` routes, all of it is still HTTP, JSON, and a status code. MCP does not replace any of it.

What MCP does is sit one layer up and present the model with a tool catalog the model was post-trained to use. The big labs trained Claude, GPT, and Gemini on the shape of an MCP `tools/list` response. They did not train them on arbitrary OpenAPI YAML. The model can technically parse an OpenAPI spec at runtime, but it has to be instructed how, and those instructions live in the prompt on every turn.

Discoverability and post-training are the two things REST cannot catch up on in the MCP vs REST API comparison. The model already knows how to use a tool catalog. It has to be taught to read an OpenAPI spec at runtime.

## Same endpoint, two surfaces

Slack's `chat.postMessage` as REST plus OpenAPI:

```yaml
/chat.postMessage:
  post:
    parameters:
      - { name: channel, in: body, required: true, schema: { type: string } }
      - { name: text, in: body, required: true, schema: { type: string } }
    security: [{ bearer: [] }]
```

The agent now needs to: fetch the spec, find the path, parse the auth scheme, construct a request, sign it, retry on 429, parse the response. Every one of those steps lives in the prompt.

Same endpoint as an MCP tool:

```json
{
  "name": "slack_send_message",
  "description": "Send a message to a Slack channel as the current user.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "channel": { "type": "string" },
      "text": { "type": "string" }
    },
    "required": ["channel", "text"]
  }
}
```

That is it. Auth lives in the server. Retries live in the server. The model sees one verb with two arguments. This is the same primitive covered in the [MCP vs function calling note](/blog/mcp-vs-function-calling), one layer down: MCP is the grammar, the REST API is what gets called underneath.

## When REST is still the right answer

If there is no LLM in the loop, ship REST. Server-to-server traffic, webhooks, mobile clients talking to a backend, a cron job calling Stripe. None of that needs MCP. In the MCP vs REST API decision, MCP is the layer to add when the caller is a model that has to decide, at runtime, which tool to invoke and what to put in the arguments. For everything else, REST is fine and lighter.

## The actual upgrade path

If a REST API already exists, the MCP server is a thin adapter, not a rewrite. Pick the five endpoints an agent would actually want, wrap each one in a tool with a description written for the model, and the work is done. Auth and audit move to the adapter layer. The REST API does not change. The [Archestra platform docs](/docs/platform-mcp) walk through the recommended shape, but the principle holds anywhere: do not rebuild the API, label it for the model.

The five-tool wrapper pattern is the default end state of every serious MCP vs REST API rollout. The REST API keeps serving everything that is not an agent. The agent stops guessing endpoint names.
