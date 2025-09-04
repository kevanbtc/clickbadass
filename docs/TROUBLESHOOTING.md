# Troubleshooting Guide

## Common Issues

### Permission Errors
```bash
# Error: Permission denied
sudo chown -R $USER:$USER ~/.one-click-badass
# Or run with --dry-run first to see what would be changed
```

### Network/Download Failures
```bash
# Check connectivity
curl -Is https://github.com
# Run offline after manual downloads
./setup.sh --offline --dev-tools
```

### macOS Specific

#### Command Line Tools
```bash
# If xcode-select fails
sudo xcode-select --install
# Accept license if needed
sudo xcodebuild -license accept
```

#### Homebrew Issues
```bash
# Reset Homebrew permissions
sudo chown -R $(whoami) $(brew --prefix)/*
# Or reinstall
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/uninstall.sh)"
```

### Linux Specific

#### Package Manager Issues
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade
# CentOS/RHEL
sudo yum update
# Or try with --no-package-manager flag
```

#### Docker Permission
```bash
# Add user to docker group
sudo usermod -aG docker $USER
# Then logout/login or:
newgrp docker
```

### General Debugging

#### Enable Verbose Mode
```bash
# Add debug flag (if available)
bash -x setup.sh --dry-run --all
```

#### Check Logs
```bash
# Full log
tail -f ~/.one-click-badass.log
# Just errors
grep -i error ~/.one-click-badass.log
```

#### Clean Slate
```bash
# Remove all traces and start over
rm -rf ~/.one-click-badass*
# Remove installed tools (manual)
```

### Recovery Options

#### Restore from Backup
```bash
# Backups are stored under:
ls ~/.one-click-badass/backups/
# Restore manually:
cp ~/.one-click-badass/backups/YYYYMMDD-HHMMSS/file /original/location
```

#### Safe Mode
```bash
# Run with minimal changes
./setup.sh --dev-tools --dry-run
# Then selectively enable features
```

## Getting Help

1. **Check the logs** in `~/.one-click-badass.log`
2. **Run with --dry-run** to see what would change
3. **Search issues** on GitHub
4. **Open an issue** with:
   - OS/distro version
   - Command that failed
   - Last 50 lines of log file
   - Output of `./setup.sh --dry-run --all`

## Platform Support

- ✅ **Ubuntu 20.04+** (Primary)
- ✅ **macOS 11+** (Primary) 
- ⚠️ **Debian 10+** (Tested)
- ⚠️ **CentOS 8+** (Limited)
- ❌ **Windows** (Use WSL2)