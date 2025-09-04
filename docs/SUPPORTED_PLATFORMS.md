# Supported Platforms

## Primary Support (Fully Tested)

### 🍎 macOS
- **macOS 11 (Big Sur)** and later
- **Intel and Apple Silicon** (M1/M2/M3)
- **Homebrew** as package manager
- **Command Line Tools** required

**Installation:**
```bash
./setup.sh --all
```

### 🐧 Ubuntu Linux
- **Ubuntu 20.04 LTS** and later
- **AMD64 (x86_64)** architecture
- **APT** package manager
- **sudo** access required

**Installation:**
```bash
./setup.sh --all
```

## Secondary Support (Community Tested)

### 🐧 Debian
- **Debian 10 (Buster)** and later
- Most Ubuntu instructions apply
- May require additional repositories

**Known Issues:**
- Some PPAs may not be available
- Older package versions possible

### 🐧 CentOS/RHEL
- **CentOS 8+** / **RHEL 8+**
- **DNF/YUM** package manager
- Limited package availability

**Installation:**
```bash
# May need EPEL repository
sudo dnf install epel-release
./setup.sh --dev-tools --dotfiles
```

### 🐧 Fedora
- **Fedora 35+**
- **DNF** package manager
- Generally good compatibility

### 🐧 Arch Linux
- **Rolling release**
- **Pacman** package manager
- Advanced users only

## Experimental Support

### 🐧 Alpine Linux
- **Alpine 3.15+**
- **APK** package manager
- Docker-focused, minimal setup

### 🐧 openSUSE
- **Leap 15.3+** / **Tumbleweed**
- **Zypper** package manager

## Not Supported

### ❌ Windows
**Use WSL2 instead:**
```bash
# Install Ubuntu in WSL2
wsl --install -d Ubuntu
# Then run setup.sh inside WSL
```

### ❌ Old Distributions
- Ubuntu < 20.04
- Debian < 10
- CentOS < 8
- macOS < 11

## Architecture Support

### ✅ Supported
- **AMD64 (x86_64)** - Primary
- **ARM64 (Apple Silicon)** - macOS only
- **AArch64** - Linux ARM64 (limited)

### ❌ Not Supported
- **i386 (32-bit)**
- **ARMv7**
- **PowerPC**
- **RISC-V** (yet)

## Package Managers

### Primary
- **Homebrew** (macOS)
- **APT** (Ubuntu/Debian)
- **DNF** (Fedora/CentOS/RHEL)

### Detected/Supported
- **YUM** (older CentOS/RHEL)
- **Zypper** (openSUSE)
- **Pacman** (Arch Linux)
- **APK** (Alpine Linux)

## Cloud Platforms

### ✅ Tested
- **GitHub Codespaces**
- **AWS EC2** (Amazon Linux 2, Ubuntu)
- **Google Cloud Shell**
- **Azure Cloud Shell**

### ⚠️ Auto-Detection
Script automatically detects cloud/CI environments and:
- Switches to `--dry-run` mode by default
- Skips interactive components
- Requires `--ci-allow` flag to proceed

### ✅ CI/CD Integration
- **GitHub Actions** (Ubuntu/macOS runners)
- **GitLab CI** (Docker containers)
- **Jenkins** (various agents)

## Container Support

### ✅ Docker Images
```dockerfile
# Ubuntu base
FROM ubuntu:22.04
COPY setup.sh /tmp/
RUN /tmp/setup.sh --yes --dev-tools

# Alpine base (minimal)
FROM alpine:3.17
COPY setup.sh /tmp/
RUN /tmp/setup.sh --yes --dev-tools --no-docker
```

### ⚠️ Limitations in Containers
- No systemd services (Docker, security tools)
- Limited privilege escalation
- Some dotfiles may not apply

## Validation Matrix

| Platform | Dev Tools | Dotfiles | Docker | Security | Status |
|----------|-----------|----------|--------|----------|--------|
| macOS 13+ | ✅ | ✅ | ✅ | ⚠️ | Primary |
| Ubuntu 22.04 | ✅ | ✅ | ✅ | ✅ | Primary |
| Ubuntu 20.04 | ✅ | ✅ | ✅ | ✅ | Primary |
| Debian 11 | ✅ | ✅ | ⚠️ | ⚠️ | Secondary |
| CentOS 8+ | ⚠️ | ✅ | ⚠️ | ❌ | Limited |
| Fedora 37+ | ⚠️ | ✅ | ✅ | ⚠️ | Secondary |

**Legend:**
- ✅ Fully supported and tested
- ⚠️ Partial support, may have issues
- ❌ Not supported or broken

## Reporting Issues

When reporting platform-specific issues, include:
```bash
# Platform information
uname -a
cat /etc/os-release     # Linux only
sw_vers                 # macOS only

# Package manager
which apt dnf yum brew pacman
```