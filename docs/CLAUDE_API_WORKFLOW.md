# Claude Code API Workflow

How to use Claude Code API alongside Cursor as your development homebase.

## Setup

1. **API Key**: Add `ANTHROPIC_API_KEY` to `.env` (already gitignored)
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

2. **Environment**: The project loads `.env` via `dotenv`. Server and scripts can access `process.env.ANTHROPIC_API_KEY`.

## Cursor vs Claude API

| Use case | Tool |
|----------|------|
| In-editor assistance, refactors, quick fixes | Cursor (built-in AI) |
| Batch operations, scripts, automation | Claude Code API |
| Complex multi-file changes | Cursor (has full repo context) |
| API-driven workflows, CI, external tools | Claude Code API |

## Calling Claude API from Scripts

Example Node/TypeScript script:

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Your prompt here' }],
});
```

Install: `npm install @anthropic-ai/sdk`

## Workflow Tips

- **Cursor rules** (`.cursor/rules/`) and **AGENTS.md** guide both Cursor and Claude — keep them in sync
- **CLAUDE.md** is the primary context file for this repo
- When automating with Claude API: pass relevant file paths or `CLAUDE.md` content for context
- Use Cursor for interactive edits; use Claude API for one-off scripts or CI jobs
