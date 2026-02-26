# Using Claude Code with This Project

## What is Claude Code?

Claude Code is an AI coding assistant from Anthropic that runs in your terminal. It reads
the project's `CLAUDE.md` and `.claude/knowledge/` files automatically, giving it full
context about the codebase.

## Getting Access

You need a Claude.ai account to use Claude Code:

| Plan | Cost | Good for |
|------|------|----------|
| **Pro** | $20/month | Occasional use, getting started |
| **Max** | $100/month | Daily active development |
| **API key** | Pay per token | Power users who want control over spend |
| **AWS Bedrock** | Pay per token via AWS | Best if you already have an AWS account with Bedrock access |

Sign up at [claude.ai](https://claude.ai) or [console.anthropic.com](https://console.anthropic.com).

### AWS Bedrock Alternative

If you have an AWS account with Bedrock access, you can run Claude Code without a Claude.ai subscription:

```bash
export CLAUDE_CODE_USE_BEDROCK=1
export AWS_REGION=us-west-2   # or your region
export AWS_PROFILE=your-profile
claude
```

Bedrock pricing is pay-per-token with no monthly fee — cost-effective if usage is light or
you're already paying for AWS.

## Installation

```bash
npm install -g @anthropic/claude-code
```

Then authenticate:

```bash
claude
```

It will open a browser to log in with your Claude.ai account.

## Running in This Project

```bash
cd joels-ai-folly
claude
```

Claude Code automatically reads `CLAUDE.md` and `.claude/knowledge/` for project context —
no extra setup needed.

## Tips

- **Be specific** — "Add a button to the Group tab that..." works better than "improve the UI"
- **Let it read first** — Claude will read files before editing them
- **Review changes** — Claude shows diffs before writing; you approve each change
- **Commit often** — Claude can commit for you; small commits are easier to review
- **Ask questions** — "How does the PTT system work?" is a valid prompt
