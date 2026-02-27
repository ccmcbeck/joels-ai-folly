# Developing

## Mac Setup

Install required Homebrew packages:

```bash
bash scripts/install-mac-brew.sh
```

See [scripts/install-mac-brew.sh](../../scripts/install-mac-brew.sh) for the full package list.

## Shell Setup

macOS ships with an older system zsh (`/bin/zsh`). After installing Homebrew zsh, make it
your primary shell:

### 1. Allow Homebrew zsh as a login shell

```bash
echo /opt/homebrew/bin/zsh | sudo tee -a /etc/shells
```

> **Intel Macs**: use `/usr/local/bin/zsh` instead of `/opt/homebrew/bin/zsh` everywhere below.

### 2. Change your default shell

```bash
chsh -s /opt/homebrew/bin/zsh
```

Log out and back in (or open a new terminal) to pick up the change.

### 3. Configure Terminal.app to use Homebrew zsh

1. Open **Terminal → Settings → Profiles** (⌘,)
2. Select your profile and click the **Shell** tab
3. Check **"Run command"** and enter `/opt/homebrew/bin/zsh`
4. Check **"Run inside shell"**

Or set it as the default for all new windows:

1. Open **Terminal → Settings → General**
2. Set **"Shells open with"** → **"Command"** → `/opt/homebrew/bin/zsh`

### 3b. Configure ~/.zshrc

Add the following to your `~/.zshrc` so Homebrew tools and nvm are available in every
shell session:

```zsh
# Homebrew (Apple Silicon — Intel Macs use /usr/local instead of /opt/homebrew)
# Sets PATH, MANPATH, INFOPATH so Homebrew tools shadow system tools
eval "$(/opt/homebrew/bin/brew shellenv)"

# Personal scripts (optional — first on PATH, overrides everything)
export PATH="$HOME/bin:$PATH"

# nvm
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
[ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"
```

The `brew shellenv` line prepends `/opt/homebrew/bin` to `$PATH`, so Homebrew's versions of
`zsh`, `git`, `curl`, etc. take precedence over the older macOS system versions in `/usr/bin`.
Verify the order looks right after sourcing:

```bash
echo $PATH | tr ':' '\n' | head -10
```

You should see `/opt/homebrew/bin` near the top.

Then reload without opening a new window:

```bash
source ~/.zshrc
```

### 4. Verify

```bash
which zsh          # should be /opt/homebrew/bin/zsh
zsh --version      # should be 5.9 or newer
echo $SHELL        # should be /opt/homebrew/bin/zsh
```

## Claude Code

Install the Claude Code CLI globally:

```bash
npm install -g @anthropic/claude-code
```

Then launch it from the project root:

```bash
cd joels-ai-folly
claude
```

It will open a browser to authenticate with your Claude.ai account on first run.
See [CLAUDE_CODE.md](CLAUDE_CODE.md) for pricing, tips, and the AWS Bedrock alternative.

## Running the App

See [RUNNING.md](RUNNING.md) for full setup and run instructions.
