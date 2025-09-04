#!/usr/bin/env bash
# One-Click Badass — MIT License
# Turn a fresh Linux/macOS box into a productive dev machine — safely — in one command.
set -Eeuo pipefail
IFS=$'\n\t'

# Script metadata
VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG="${HOME}/.one-click-badass.log"
BK_ROOT="${HOME}/.one-click-badass/backups/$(date +%Y%m%d-%H%M%S)"

# Global flags
DRY_RUN=false
YES=false
ALL=false
CI_ALLOW=false
OFFLINE=false

# Module flags (set by --module-name or --all)
OCB_dev_tools=false
OCB_dotfiles=false
OCB_docker=false
OCB_security=false

# System detection
OS=""
DISTRO=""
PKG_MGR=""

# Error handling
trap 'handle_error $LINENO $BASH_LINENO "$BASH_COMMAND" $(printf "::%s" ${FUNCNAME[@]:-})' ERR
trap 'handle_exit' EXIT

handle_error() {
    local line_no=$1
    local bash_line_no=$2
    local command="$3"
    local stack="$4"
    
    log "❌ ERROR at line $line_no: $command"
    log "   Stack: ${stack//::/→}"
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "❌ One-Click Badass failed at line $line_no" >&2
    echo "Command: $command" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "📋 Last 50 lines of log:" >&2
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    tail -n 50 "$LOG" 2>/dev/null || echo "(Log file not accessible)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
    echo "💡 Try running with --dry-run to preview changes first" >&2
    echo "📖 See docs/TROUBLESHOOTING.md for common solutions" >&2
    exit 1
}

handle_exit() {
    local exit_code=$?
    if [[ $exit_code -eq 0 ]]; then
        log "✅ One-Click Badass completed successfully"
        [[ -d "$BK_ROOT" ]] && log "📁 Backups saved to: $BK_ROOT"
        log "📋 Full log: $LOG"
    fi
}

# Logging functions
log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    printf "%s [%s] %s\n" "$timestamp" "$$" "$*" | tee -a "$LOG"
}

debug() {
    [[ "${OCB_LOG_LEVEL:-info}" == "debug" ]] && log "🐛 DEBUG: $*"
}

warn() {
    log "⚠️  WARNING: $*"
}

error() {
    log "❌ ERROR: $*"
}

# Execution functions
run() {
    if $DRY_RUN; then
        log "[DRY RUN] $*"
        return 0
    fi
    
    log "💻 EXEC: $*"
    eval "$@"
}

run_quiet() {
    if $DRY_RUN; then
        debug "[DRY RUN] $* (quiet)"
        return 0
    fi
    
    debug "💻 EXEC (quiet): $*"
    eval "$@" &>/dev/null
}

# User interaction
confirm() {
    if $YES; then
        debug "Auto-confirmed: $*"
        return 0
    fi
    
    local prompt="${1:-Proceed?}"
    local response
    
    echo -n "$prompt [y/N] "
    read -r response
    [[ "$response" =~ ^[Yy]$ ]]
}

confirm_security() {
    # Always prompt for security operations, even with --yes
    local prompt="${1:-This security operation requires confirmation. Proceed?}"
    local response
    
    echo "🔒 SECURITY OPERATION" >&2
    echo -n "$prompt [y/N] "
    read -r response
    [[ "$response" =~ ^[Yy]$ ]]
}

# File operations
backup_file() {
    local file="$1"
    [[ -e "$file" ]] || return 0
    
    run "mkdir -p '$BK_ROOT'"
    run "cp -a '$file' '$BK_ROOT/$(basename "$file").$(date +%s)'"
    log "📋 Backed up: $file → $BK_ROOT/"
}

backup_dir() {
    local dir="$1"
    [[ -d "$dir" ]] || return 0
    
    run "mkdir -p '$BK_ROOT'"
    run "cp -a '$dir' '$BK_ROOT/$(basename "$dir").$(date +%s)'"
    log "📁 Backed up: $dir → $BK_ROOT/"
}

# System detection
detect_os() {
    if [[ "$OSTYPE" == darwin* ]]; then
        OS="macos"
        PKG_MGR="brew"
    elif [[ -f /etc/os-release ]]; then
        # shellcheck source=/dev/null
        source /etc/os-release
        OS="linux"
        DISTRO="${ID:-unknown}"
        
        # Detect package manager
        if command -v apt &>/dev/null; then
            PKG_MGR="apt"
        elif command -v dnf &>/dev/null; then
            PKG_MGR="dnf"
        elif command -v yum &>/dev/null; then
            PKG_MGR="yum"
        elif command -v pacman &>/dev/null; then
            PKG_MGR="pacman"
        elif command -v zypper &>/dev/null; then
            PKG_MGR="zypper"
        elif command -v apk &>/dev/null; then
            PKG_MGR="apk"
        else
            PKG_MGR="unknown"
        fi
    else
        error "Unsupported operating system: $OSTYPE"
        exit 3
    fi
    
    log "🖥️  Detected: OS=$OS DISTRO=${DISTRO:-n/a} PKG_MGR=$PKG_MGR"
}

detect_environment() {
    # Detect CI/cloud environments
    if [[ -n "${CI:-}" || -n "${GITHUB_ACTIONS:-}" || -n "${GITLAB_CI:-}" || -n "${JENKINS_URL:-}" ]]; then
        log "🤖 CI environment detected"
        if ! $CI_ALLOW && ! $DRY_RUN; then
            log "🛑 Switching to dry-run mode for safety. Use --ci-allow to override."
            DRY_RUN=true
        fi
    fi
    
    # Detect cloud shells
    if [[ -n "${CLOUD_SHELL:-}" || -n "${CODESPACES:-}" ]]; then
        log "☁️  Cloud environment detected"
        if ! $CI_ALLOW && ! $DRY_RUN; then
            log "🛑 Switching to dry-run mode for safety. Use --ci-allow to override."
            DRY_RUN=true
        fi
    fi
}

# Command line parsing
usage() {
    cat <<EOF
One-Click Badass v${VERSION}
Turn a fresh Linux/macOS box into a productive dev machine — safely — in one command.

USAGE:
    $0 [OPTIONS]

OPTIONS:
    --dry-run           Preview changes without making modifications
    --yes, -y           Skip confirmation prompts (auto-approve)
    --all               Enable all modules
    
MODULES:
    --dev-tools         Install development tools (Node, Python, Git, etc.)
    --dotfiles          Configure shell and dotfiles
    --docker            Install Docker + Docker Compose
    --security          Security hardening (firewall, fail2ban)
    
SPECIAL:
    --offline           Skip network-dependent operations
    --ci-allow          Allow execution in CI/cloud environments
    --help, -h          Show this help message

EXAMPLES:
    $0 --dry-run --all              # Preview all changes
    $0 --dev-tools --dotfiles       # Minimal developer setup
    $0 --all                        # Full installation with prompts
    $0 --yes --dev-tools --docker   # Automation-friendly

SAFETY:
    • Always creates backups in ~/.one-click-badass/backups/
    • Logs everything to ~/.one-click-badass.log
    • Idempotent - safe to run multiple times
    • Use --dry-run first to preview changes

MORE INFO:
    • Documentation: docs/
    • Troubleshooting: docs/TROUBLESHOOTING.md
    • Platform support: docs/SUPPORTED_PLATFORMS.md
    • All options: docs/OPTIONS.md

EOF
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                ;;
            --yes|-y)
                YES=true
                ;;
            --all)
                ALL=true
                OCB_dev_tools=true
                OCB_dotfiles=true
                OCB_docker=true
                OCB_security=true
                ;;
            --dev-tools)
                OCB_dev_tools=true
                ;;
            --dotfiles)
                OCB_dotfiles=true
                ;;
            --docker)
                OCB_docker=true
                ;;
            --security)
                OCB_security=true
                ;;
            --offline)
                OFFLINE=true
                ;;
            --ci-allow)
                CI_ALLOW=true
                ;;
            --help|-h)
                usage
                exit 0
                ;;
            *)
                error "Unknown argument: $1"
                echo "Use --help for usage information" >&2
                exit 2
                ;;
        esac
        shift
    done
    
    # Validate arguments
    if ! $OCB_dev_tools && ! $OCB_dotfiles && ! $OCB_docker && ! $OCB_security; then
        error "No modules selected. Use --all or specify individual modules."
        echo "Use --help for usage information" >&2
        exit 2
    fi
}

# Platform validation
validate_platform() {
    case "$OS" in
        macos)
            if ! command -v xcode-select &>/dev/null; then
                warn "Command Line Tools not found. Install with: xcode-select --install"
            fi
            ;;
        linux)
            case "$PKG_MGR" in
                apt|dnf|yum)
                    # Primary supported package managers
                    ;;
                pacman|zypper|apk)
                    warn "Package manager '$PKG_MGR' has limited support"
                    ;;
                unknown)
                    warn "Package manager not detected. Some features may not work."
                    ;;
            esac
            ;;
        *)
            error "Unsupported OS: $OS"
            exit 3
            ;;
    esac
}

# Main initialization
init() {
    # Create log file and backup directory
    mkdir -p "$(dirname "$LOG")" "$BK_ROOT"
    : > "$LOG"  # Clear/create log file
    
    log "🚀 One-Click Badass v${VERSION} starting..."
    log "📋 Command: $0 $*"
    log "📂 Working directory: $PWD"
    log "👤 User: $(whoami)"
    log "📅 Started: $(date)"
    
    if $DRY_RUN; then
        log "🔍 DRY RUN MODE - No changes will be made"
    fi
    
    detect_os
    detect_environment
    validate_platform
}

# Module template functions (implement these in your full script)
install_dev_tools() {
    log "🛠️  Installing development tools..."
    # Implementation goes here
    return 0
}

setup_dotfiles() {
    log "🏠 Setting up dotfiles..."
    # Implementation goes here
    return 0
}

install_docker() {
    log "🐳 Installing Docker..."
    # Implementation goes here
    return 0
}

setup_security() {
    log "🔒 Setting up security..."
    if ! confirm_security "Configure firewall and security hardening?"; then
        log "Skipping security setup"
        return 0
    fi
    # Implementation goes here
    return 0
}

# Main execution function
main() {
    init "$@"
    parse_args "$@"
    
    log "📋 Selected modules:"
    $OCB_dev_tools && log "  • Development tools"
    $OCB_dotfiles && log "  • Dotfiles"
    $OCB_docker && log "  • Docker"
    $OCB_security && log "  • Security"
    
    # Execute selected modules
    $OCB_dev_tools && install_dev_tools
    $OCB_dotfiles && setup_dotfiles
    $OCB_docker && install_docker
    $OCB_security && setup_security
    
    log "🎉 All selected modules completed!"
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi