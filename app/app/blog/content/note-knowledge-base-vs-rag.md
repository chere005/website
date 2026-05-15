---
title: '"Knowledge base" vs "RAG": what is the actual difference?'
description: 'Knowledge base RAG explained: the knowledge base is the store, RAG is the retrieval pattern. Why conflating them breaks architecture diagrams.'
isNote: true
author: 'Mack Chi'
---

# Knowledge base RAG: what is the actual difference?

Knowledge base RAG gets conflated in design docs, marketing copy, and architecture diagrams all the time. The two terms describe different things. A knowledge base is a store. RAG is a pattern. They are not interchangeable, and treating them as synonyms hides bugs, scrambles ownership, and turns architecture reviews into definition fights.

The shorthand "RAG as a knowledge base" is wrong the same way "walking to the bookshelf is a bookshelf" is wrong. Knowledge base RAG only works as a phrase when both halves keep their meaning: the noun for storage, the verb for retrieval. The rest of this note pulls them apart and explains why the distinction matters once more than one team touches the system.

## The 5-year-old version of knowledge base RAG

Imagine a kid asking a question about dinosaurs.

Someone walks to the shelf. Finds the dinosaur book. Flips to the right page. Reads a couple of paragraphs out loud, paraphrased.

In this story:

- The **bookshelf** is the knowledge base. It is where the information lives.
- **Walking, flipping, and reading aloud** is RAG. It is the procedure.

If the bookshelf is empty, no procedure will save the answer. If the bookshelf is great but no procedure exists, the book just sits there. Both are required. They are not the same thing. Nobody would say "walk to the shelf is my bookshelf." That sentence is nonsense. The AI equivalent gets said constantly.

## The actual definitions

**RAG** stands for Retrieval-Augmented Generation. It is a pattern with three steps:

1. Take the user's question.
2. Retrieve relevant chunks of text from somewhere.
3. Stuff those chunks into the LLM prompt and let it generate an answer.

That is it. RAG is the verb. It is the arrow between "user asks something" and "model answers."

A **knowledge base** is the somewhere. It is the corpus that was indexed, the embeddings that were stored, the database that gets queried. It is the noun. In the Archestra platform it is PostgreSQL with pgvector, plus connectors that pull from Jira, Confluence, GitHub, Notion, SharePoint, Google Drive, and Salesforce. In a LightRAG setup it is Neo4j plus Qdrant. In a quick prototype it might just be a folder of markdown files with a flat index. The technology varies. The role does not.

For a longer walkthrough of how an actual KB is structured, see [the LightRAG movie agent post](/blog/lightrag) — a good companion to this note, because it makes the noun very concrete.

## Why "RAG is the arrow, not the box" matters

Here is the architecture sketch that belongs on whiteboards. Drawn twice — once wrong, once right.

**The wrong diagram** (the one that keeps showing up):

```
[ User ] --> [ Agent ] --> [ RAG ] --> [ LLM ] --> [ Answer ]
```

What is in the RAG box? A database? A retriever? An embedding model? A reranker? All of the above? Nobody knows. Two engineers will read this diagram and build two different things.

**The right diagram:**

```
                  +-------------------+
                  |   Knowledge Base  |
                  |  (pgvector / KG / |
                  |   vector index)   |
                  +---------+---------+
                            ^
                            | retrieve
                            |
[ User ] --> [ Agent ] -----+-----> [ LLM ] --> [ Answer ]
                  \                    ^
                   \___ augment _______/
                       (stuff chunks
                        into prompt)
```

The knowledge base is a thing with a clear location, a clear schema, and a clear owner. RAG is the dotted line. It is what the agent _does_ with the knowledge base on every request. It cannot be pointed at on an org chart. The KB can.

This is not a pedantic distinction. It changes ownership:

- The KB has an owner. Someone is on call when ingestion breaks, embeddings drift, or a connector starts returning 401s.
- The RAG pattern has an owner too, but it is the agent team. They decide top-k, rerank thresholds, how chunks are formatted in the prompt, when to fall back.

Collapse both into one "RAG" box and nobody owns either piece. The same failure mode has shown up across multiple deployments.

## "RAG" the buzzword vs RAG the pattern

There is a second reason the terms got muddled. Vendors started shipping "RAG products," and what they meant was "a managed knowledge base with a retrieval API on top of it." So now "RAG" colloquially means "the whole bundle." Fine for marketing. Terrible for architecture.

The rule: in a blog post or a press release, "RAG" as shorthand is fine. In a diagram, design doc, or Jira ticket, separate them. Write **knowledge base** for the store. Write **retrieval** or **RAG pipeline** for the procedure. The five extra characters are worth it.

There is a parallel to [the Dual LLM post](/blog/dual-llm) — the security pattern there only makes sense when it is clear which component holds the untrusted data and which component generates output from it. The same clarity matters for knowledge base RAG. Pattern and storage are different roles. Conflating them hides bugs.

## What knowledge base RAG looks like in practice

[Knowledge Bases inside Archestra](/docs/platform-knowledge-bases) make the noun explicit in the product. Navigate to **Settings > Knowledge**, pick an embedding model and a reranking model, create a Knowledge Base, attach connectors to it. That is the store. It has a name. It has an owner. It can be shared across agents.

The RAG part — the retrieval, the rank fusion, the reranking, the ACL filter — happens automatically when an agent calls `query_knowledge_sources`. It is the dotted line in the diagram. Agents do not "have a RAG." They have a tool that performs RAG against an attached knowledge base.

The product naming is opinionated on purpose. A tab called "RAG" would have to contain everything and therefore nothing.

## The one-line distinction

Knowledge base is _where_. RAG is _how_. Any architecture diagram with a single box labeled "RAG" needs redrawing. The box is the knowledge base. The arrow into the prompt is the RAG pipeline. Name them separately and the next design review will be twenty minutes shorter.
