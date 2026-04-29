---

## Bug/Feature: LLM Search is Unreliable

**What's the problem?**
The LLM-powered search mode frequently fails or returns poor results. Users see "Server error (HTTP 504), try keyword mode" — forcing them to fall back to basic keyword search.

**What happens:**
1. Toggle search to "LLM" mode
2. Enter a natural language query (e.g., "AI safety researchers in DC")
3. Get HTTP 504 timeout error after a few seconds
4. Fallback message: "Server error (HTTP 504), try keyword mode"

**When it does work, results are inconsistent:**
- "people who work on AI safety" → few/no results (even though there are 100+ safety researchers)
- "critics of OpenAI" → empty results (despite known critics in the dataset)
- "government regulators" → misses most policymakers
- Relevance ranking seems arbitrary

**What users expect:**
- LLM search should handle natural language queries reliably
- Queries like "show me AI safety orgs" or "tech policy critics" should return relevant entities
- No timeouts — either fast results or graceful degradation

**Technical context:**
- LLM search hits `/semantic-search` Lambda endpoint
- 504 = API Gateway timeout (Lambda taking >29s or Anthropic API slow)
- Possible causes: cold start, large context window, inefficient prompt

**Suggested fixes:**
1. Add Lambda provisioned concurrency to avoid cold starts
2. Reduce context size sent to LLM (don't send full entity list)
3. Add caching for common queries
4. Improve error handling — show partial results instead of failing completely
5. Consider hybrid approach: LLM reranks keyword results instead of searching from scratch

**How to reproduce:**
1. Go to https://mapping-ai.org/map
2. Toggle search mode to "LLM" (if available)
3. Try queries like: "AI safety researchers", "tech critics", "DC policy orgs"
4. Observe 504 errors or poor results

---

## Bug Report: Map Performance Issues

What happened:
Two performance issues on the map:

1. Node click is laggy — When clicking a node, there's a noticeable delay (2-3 seconds) before the map zooms to that node. The UI feels unresponsive.
2. Thumbnail images load slowly — Entity images (people photos, org logos) take a while to appear, sometimes showing placeholder circles first.

What you expected:
- Clicking a node should zoom smoothly within ~300ms
- Thumbnails should either load quickly or show graceful placeholders without visual "pop-in"

Steps to reproduce:
1. Go to https://mapping-ai.org/map
2. Wait for initial load
3. Click any person or organization node
4. Observe delay before zoom animation starts
5. Scroll around to see thumbnails loading progressively

Browser / device:
Affects all browsers (Chrome, Safari, Firefox) on desktop and mobile

Screenshot or URL:
https://mapping-ai.org/map

Technical context:
- map-data.json is 1.6MB (700+ people, 700+ orgs, 2000+ edges)
- Thumbnails are fetched from multiple sources:
  - Admin-uploaded images (S3)
  - Wikipedia API (for people without uploads)
  - Google Favicons (for orgs)
- On click, showDetail() + dimUnconnected() run before zoom
- D3 force simulation may still be running, competing for main thread

Possible causes to investigate:
- dimUnconnected() iterates all nodes/edges on every click
- Wikipedia API calls are made on-demand, not pre-cached
- No loading state shown during zoom transition
- Force simulation doesn't pause during interactions
