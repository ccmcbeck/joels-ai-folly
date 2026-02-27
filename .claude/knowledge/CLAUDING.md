# Setting Up Claude Code with claude.ai

Step-by-step guide for first-time setup. See [CLAUDE_CODE.md](CLAUDE_CODE.md) for pricing
options and general tips.

## Step 1: Create a claude.ai account

1. Go to [claude.ai](https://claude.ai)
2. Click **Sign up**
3. Create an account with email or Google/Apple — no credit card required for the free tier

Free tier is rate-limited but sufficient to try things out. Upgrade to Pro ($20/month) for
regular use.

## Step 2: Install Node.js

Claude Code requires Node. If you haven't already, install nvm and Node:

```bash
brew install nvm
```

Add to `~/.zshrc` (see [DEVELOPING.md](DEVELOPING.md) for full shell setup):

```zsh
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
```

Then:

```bash
source ~/.zshrc
nvm install --lts
```

## Step 3: Install Claude Code

If you've already cloned the repo:

```bash
bash scripts/install-claude.sh
```

Or run directly from GitHub without cloning first:

```bash
curl -fsSL https://raw.githubusercontent.com/ccmcbeck/joels-ai-folly/main/scripts/install-claude.sh | bash
```

After installing, verify `claude` is on your PATH:

```bash
which claude   # should print something like ~/.nvm/versions/node/v20.x.x/bin/claude
```

If the command is not found, find where npm puts global binaries and add it to `~/.zshrc`:

```bash
npm bin -g     # prints the global bin directory, e.g. /opt/homebrew/bin or ~/.nvm/.../bin
```

Add to `~/.zshrc` (only needed if it's not already covered by `brew shellenv` or nvm):

```zsh
export PATH="$HOME/.local/bin:$(npm bin -g):$PATH"
```

`$HOME/.local/bin` covers tools that install to a user-local prefix (including some Claude
Code installation paths on certain systems).

> **nvm users**: nvm automatically adds the active Node version's bin to `$PATH` when you
> source `nvm.sh`, so `claude` is usually available immediately without any extra PATH config.
> If you upgrade Node versions later, re-run the install script for the new version.

## Step 4: Authenticate

```bash
claude
```

On first run it opens a browser tab. Log in with your claude.ai account and click
**Authorize**. Return to the terminal — you're in.

## Step 5: Configure permissions (optional but recommended)

By default Claude Code prompts for approval on every file read/write. You can pre-approve
access to your projects directory so it works without interruption.

Create `~/.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Read(~/projects/**)",
      "Write(~/projects/**)",
      "Bash(git *)",
      "Bash(npm *)",
      "Bash(npx *)"
    ]
  }
}
```

Adjust the path to match where you keep your code (e.g. `~/Developer/**`). The `Bash` entries
let Claude run git and npm commands without prompting each time.

## Step 6: Open the project

```bash
cd joels-ai-folly
claude
```

Claude automatically reads `CLAUDE.md` and `.claude/knowledge/` to understand the codebase.
No extra setup needed.

## Verify it's working

Type a question at the prompt, for example:

```
How does the push-to-talk system work?
```

Claude will read the relevant files and explain the architecture.

## Updating Claude Code

```bash
npm update -g @anthropic/claude-code
```
