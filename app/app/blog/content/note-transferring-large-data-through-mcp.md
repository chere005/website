---
title: 'MCP Large Data Transfer: Use Resources and Pre-Signed URLs'
description: 'MCP large data transfer done right: stop returning bytes through tool responses. Return a pre-signed URL and an MCP Resource handle.'
isNote: true
author: 'Mack Chi'
---

# MCP Large Data Transfer: Use Resources and Pre-Signed URLs

MCP large data transfer should never push raw bytes through tool responses. The correct pattern is to upload the payload to object storage, return a pre-signed URL plus an MCP Resource handle, and let the client fetch only what the model actually needs. This single change cuts token bills, shrinks context windows, and keeps audit trails intact. Treating MCP large data transfer as a link-passing problem rather than a byte-passing problem is the difference between an MCP server that scales and one that quietly doubles inference costs.

A real-world failure mode looks like this: an MCP tool named `get_report` returns a 4 MB JSON blob — a useful, well-shaped report. An agent calls it three or four times per session. Each call lands the whole blob in the context window. At Sonnet input rates, with cache misses, the math works out to roughly $0.15 per call across thousands of calls a day. Nobody did that math when the tool was written. The JSON just shipped.

This is the most preventable cost mistake in MCP servers today, and the fix is one line: don't return the bytes. Return a link.

## The Failure Mode, in Numbers

A tool response goes into the model's context. Every byte of that response is billed as input tokens on the next turn, and on every turn after that until it ages out of the conversation. A 4 MB JSON payload is roughly 1M tokens. The model almost never needs all of it — it usually wants one field, one row, one chart. But the whole payload is already paid for, and the bill keeps growing as the conversation continues.

The instinct to "just return everything, the model will figure it out" is the same instinct that produces `SELECT *` in production. It feels safe. It is the opposite.

## The Fix: MCP Resources Plus a Pre-Signed URL

MCP has a primitive built for MCP large data transfer. Resources are read-only, addressable content the client fetches on demand, not on every tool call. For background, see [Tools, resources, prompts: the three MCP primitives](/blog/mcp-tools-resources-prompts) — that is the foundation this pattern builds on.

The recipe: the tool generates the data, parks it on object storage, and returns a pre-signed URL plus a Resource handle. The model sees a one-line response. If it needs to look inside, it asks the client to fetch the resource — and even then, a good client streams or paginates.

### Python Recipe

```python
import boto3
from mcp.server import Server
from mcp.types import Resource

s3 = boto3.client("s3")

@server.tool("generate_report")
async def generate_report(team: str) -> dict:
    key = f"reports/{team}/{uuid4()}.json"
    s3.put_object(Bucket="reports", Key=key, Body=build_report(team))
    url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": "reports", "Key": key},
        ExpiresIn=900,  # 15 minutes
    )
    return {"resource_uri": f"s3://reports/{key}", "url": url, "expires_in": 900}
```

### TypeScript Recipe

```ts
server.tool('generate_report', async ({ team }) => {
  const key = `reports/${team}/${crypto.randomUUID()}.json`;
  await s3.putObject({ Bucket: 'reports', Key: key, Body: buildReport(team) });
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: 'reports', Key: key }), {
    expiresIn: 900,
  });
  return { resource_uri: `s3://reports/${key}`, url, expires_in: 900 };
});
```

The tool response is now ~200 bytes. The 4 MB lives on S3. The model only pulls it if the user actually needs to look at it.

## Tradeoffs to Settle Before Shipping

Three things matter before this pattern goes to production for MCP large data transfer:

1. **Lifetime.** Pre-signed URLs leak if they live too long. 15 minutes is usually enough for an agent session; longer than an hour turns the URL into a side channel. Match the expiry to the turn budget.
2. **Auth.** A pre-signed URL is a bearer credential. If the data is sensitive, scope the URL to a single object and a single GET, and log every fetch on the bucket side, not the MCP side.
3. **Audit.** The natural "the model saw this" trace disappears, because the bytes never go through the gateway. Log the resource URI alongside the tool call. Replay requires knowing which object was handed out.

**Data belongs on external storage. MCP returns the link, not the bytes.** Anything else is a way to pay for the same JSON twice.
