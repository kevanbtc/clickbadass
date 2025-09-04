# Command Line Options

## Core Flags

### `--dry-run`
Preview all changes without making any modifications.
```bash
./setup.sh --dry-run --all
# Shows what would be installed/configured
```

### `--yes` / `-y`
Skip all confirmation prompts (auto-approve).
```bash
./setup.sh --yes --dev-tools
# Useful for automation/CI
```

### `--help` / `-h`
Show usage information and exit.

## Module Flags

### `--all`
Enable all available modules (equivalent to combining all flags below).
```bash
./setup.sh --all
# Installs everything: dev tools, dotfiles, Docker, security
```

### `--dev-tools`
Install core development tools.
**Includes:**
- Node.js (via NVM)
- Python 3 + pip
- Git + enhanced config
- Build essentials (gcc, make, etc.)
- Common utilities (jq, tree, htop, curl, wget)

```bash
./setup.sh --dev-tools
```

### `--dotfiles`
Set up shell configuration and dotfiles.
**Includes:**
- Enhanced .bashrc/.zshrc
- Git aliases and config
- Vim configuration
- tmux setup
- Shell history improvements

```bash
./setup.sh --dotfiles
```

### `--docker`
Install Docker and Docker Compose.
**Includes:**
- Docker CE
- Docker Compose v2
- User group configuration
- Basic security settings

```bash
./setup.sh --docker
```

### `--security`
⚠️ **Advanced users only** - Configure security hardening.
**Includes:**
- Firewall (UFW/iptables) setup
- Fail2ban installation
- SSH hardening
- Automatic security updates

```bash
./setup.sh --security --yes
# Requires --yes or interactive confirmation
```

## Special Flags

### `--offline`
Skip network-dependent installations.
```bash
./setup.sh --offline --dotfiles
# Only configure local files
```

### `--ci-allow`
Allow execution in CI/cloud environments (normally auto-detected and restricted).
```bash
./setup.sh --ci-allow --dev-tools
```

### `--confirm`
Force confirmation prompts even with --yes (for security modules).
```bash
./setup.sh --yes --security --confirm
# Will still prompt for dangerous operations
```

## Example Combinations

### Minimal Setup
```bash
./setup.sh --dev-tools --dotfiles
# Just the essentials
```

### Full Development Machine
```bash
./setup.sh --all
# Everything including Docker and security
```

### Preview Everything
```bash
./setup.sh --dry-run --all
# See what would be installed
```

### Automation-Friendly
```bash
./setup.sh --yes --dev-tools --docker --offline
# No prompts, core tools only, no downloads
```

### Security-Focused Server
```bash
./setup.sh --security --confirm
# Only security hardening with confirmations
```

## Environment Variables

### `OCB_LOG_LEVEL`
Control logging verbosity.
```bash
export OCB_LOG_LEVEL=debug
./setup.sh --dev-tools
# Values: debug, info, warn, error
```

### `OCB_BACKUP_DIR`
Override default backup location.
```bash
export OCB_BACKUP_DIR="/tmp/my-backups"
./setup.sh --dotfiles
```

### `OCB_SKIP_BREW`
Skip Homebrew installation on macOS.
```bash
export OCB_SKIP_BREW=1
./setup.sh --dev-tools
```

## Return Codes

- `0` - Success
- `1` - General error
- `2` - Invalid arguments
- `3` - Unsupported platform
- `4` - Network error
- `5` - Permission error
- `126` - Command not executable
- `127` - Command not found