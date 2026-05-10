# Verification Pipeline Agents

Multi-agent verification system using Claude Managed Agents API.

## Architecture

```
Coordinator (Opus)
├── enum-validator (code)
├── enum-repair (Sonnet)
├── decomposer (Sonnet)
├── url-validator (Haiku)
├── search-attribution (Sonnet) ← NO access to candidate URLs
├── prosecutor (Sonnet)
├── defender (Sonnet)
├── judge (Opus) ← ONLY sees debate transcript
├── correction-proposal (Sonnet)
└── write-back (Haiku)
```

## Setup

1. Install Anthropic SDK: `npm install @anthropic-ai/sdk`
2. Set `ANTHROPIC_API_KEY` in `.env`
3. Run `node setup-agents.js` to create agents
4. Run `node test-sample.js` to test with sample entities

## Files

- `setup-agents.js` - Creates all agents and coordinator
- `prompts/` - System prompts for each agent
- `test-sample.js` - Test runner for sample entities
- `lib/` - Shared utilities (DB, schema validation)
