# Developing

## Mac Setup

Install required Homebrew packages:

```bash
bash scripts/install-mac-brew-packages.sh
```

See [scripts/install-mac-brew-packages.sh](../../scripts/install-mac-brew-packages.sh) for the full package list.

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

### 4. Verify

```bash
which zsh          # should be /opt/homebrew/bin/zsh
zsh --version      # should be 5.9 or newer
echo $SHELL        # should be /opt/homebrew/bin/zsh
```

## Running the App

See [RUNNING.md](RUNNING.md) for full setup and run instructions.
