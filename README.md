# One-Click Badass 🚀

Turn a fresh Linux/macOS box into a productive dev machine — safely — in one command.

[![CI](https://github.com/kevanbtc/one-click-badass/workflows/CI/badge.svg)](https://github.com/kevanbtc/one-click-badass/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux-blue)](docs/SUPPORTED_PLATFORMS.md)

## TL;DR

```bash
# Preview (no changes made)
./setup.sh --dry-run --all

# Install core dev tools only
./setup.sh --dev-tools --dotfiles

# Full setup with prompts
./setup.sh --all
```

**Features:** Cross-platform, backups created, comprehensive logging, idempotent; Node (NVM), Python 3, Git pro config, Docker+Compose, build tools, vim/tmux/jq/htop/tree, optional firewall + fail2ban (opt-in).

## What Gets Installed

### 🛠️ Dev Tools (`--dev-tools`)
- **Node.js** via NVM (latest LTS + npm)
- **Python 3** + pip, virtualenv
- **Git** with enhanced config & aliases
- **Build essentials** (gcc, make, cmake)
- **CLI utilities** (jq, tree, htop, curl, wget, zip)

### 🏠 Dotfiles (`--dotfiles`) 
- **Enhanced shell** (.bashrc/.zshrc improvements)
- **Git configuration** (user, aliases, diff tools)
- **Vim/Neovim** basic setup
- **tmux** configuration
- **Shell history** improvements (timestamps, search)

### 🐳 Docker (`--docker`)
- **Docker CE** latest stable
- **Docker Compose** v2
- **User permissions** (docker group)
- **Basic security** settings

### 🔒 Security (`--security`) ⚠️
- **Firewall** setup (UFW on Ubuntu, basic iptables)
- **Fail2ban** installation & config
- **SSH hardening** (if SSH server detected)
- **Auto-updates** configuration

## Quick Start

### 1. Get the Script
```bash
git clone https://github.com/kevanbtc/one-click-badass.git
cd one-click-badass
```

### 2. Preview Changes
```bash
./setup.sh --dry-run --all
# See what would be installed without making changes
```

### 3. Install What You Need
```bash
# Minimal setup
./setup.sh --dev-tools --dotfiles

# Full development machine
./setup.sh --all

# Automation-friendly (no prompts)
./setup.sh --yes --dev-tools --docker
```

## Safety Features

### 🛡️ Always Safe
- **Dry-run mode** - preview all changes first
- **Automatic backups** - stored in `~/.one-click-badass/backups/`
- **Comprehensive logging** - full log at `~/.one-click-badass.log`
- **Idempotent** - safe to run multiple times
- **Non-destructive** - won't overwrite existing configs without backup

### 🧪 Testing
```bash
# Run the smoke test
./test/smoke-dry-run.sh

# CI runs on every PR
# - Ubuntu and macOS
# - Shellcheck linting
# - Dry-run functionality test
```

## Command Line Options

| Flag | Description |
|------|-------------|
| `--dry-run` | Preview changes only, make no modifications |
| `--yes` / `-y` | Skip confirmation prompts |
| `--all` | Enable all modules |
| `--dev-tools` | Install development tools |
| `--dotfiles` | Configure shell and dotfiles |
| `--docker` | Install Docker + Compose |
| `--security` | Security hardening (requires confirmation) |
| `--help` | Show usage information |

See [`docs/OPTIONS.md`](docs/OPTIONS.md) for complete flag reference.

## Platform Support

| Platform | Status | Notes |
|----------|---------|-------|
| **macOS 11+** | ✅ Primary | Intel + Apple Silicon |
| **Ubuntu 20.04+** | ✅ Primary | Full feature support |
| **Debian 10+** | ⚠️ Tested | Most features work |
| **CentOS 8+** | ⚠️ Limited | Basic tools only |
| **Windows** | ❌ | Use WSL2 + Ubuntu |

See [`docs/SUPPORTED_PLATFORMS.md`](docs/SUPPORTED_PLATFORMS.md) for detailed compatibility.

## Examples

### New Developer Machine
```bash
# Get everything for development
./setup.sh --all --yes
# Installs: dev tools, dotfiles, Docker, security hardening
```

### Server Setup
```bash
# Secure server with essential tools
./setup.sh --dev-tools --security
# Installs: basic tools + firewall/fail2ban
```

### CI/Cloud Environment
```bash
# Minimal, automation-friendly
export OCB_CI_ALLOW=1
./setup.sh --yes --dev-tools --offline
```

### Just Configuration
```bash
# Only dotfiles, no package installation
./setup.sh --dotfiles --offline
```

## Troubleshooting

### Quick Fixes
```bash
# Check the log
tail -50 ~/.one-click-badass.log

# Run with dry-run to debug
./setup.sh --dry-run --all

# Reset and start over
rm -rf ~/.one-click-badass*
```

### Common Issues
- **Permission errors** → Check `sudo` access and file permissions
- **Network failures** → Try `--offline` mode or check connectivity
- **macOS Command Line Tools** → Run `xcode-select --install`
- **Docker permissions** → Logout/login after installation

See [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) for detailed solutions.

## Security Considerations

### 🔒 Security Module
- **Opt-in only** - requires `--security` flag
- **Confirmation required** - prompts before dangerous changes
- **Non-destructive** - backs up existing configs
- **Detection first** - checks for existing security tools

### 🛡️ Script Security
- **No curl|bash** - clone first, review, then run
- **Shellcheck clean** - linted for common issues
- **Transparent** - all changes logged and backed up
- **Open source** - review the code first

### ⚠️ What Security Module Does
```bash
# Preview security changes first
./setup.sh --dry-run --security

# Shows exactly what firewall rules, fail2ban configs, etc.
# Only proceed if you understand and approve the changes
```

## Contributing

### Quick Start
```bash
git clone https://github.com/kevanbtc/one-click-badass.git
cd one-click-badass

# Make changes
vim setup.sh

# Test changes
./test/smoke-dry-run.sh
shellcheck -S style setup.sh

# Submit PR
```

### Development
- **Shellcheck clean** - no warnings/errors
- **Idempotent** - safe to run multiple times
- **Logged** - all changes go to log file
- **Backed up** - existing files backed up before changes
- **Cross-platform** - test on macOS and Linux

## License

MIT License - see [LICENSE](LICENSE) file.

## Acknowledgments

Built for developers who want their machines set up **right**, **fast**, and **safely**.

---

**💡 Pro tip:** Always run with `--dry-run` first to see what changes will be made to your system.