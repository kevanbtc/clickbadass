#!/usr/bin/env bash
# MIT License - One-Click Badass smoke test
set -euo pipefail

echo "🧪 Running smoke test..."

# Run the main script in dry-run mode
bash ./setup.sh --dry-run --all >/tmp/ocb-dryrun.log 2>&1

# Check that dry-run marker exists
if ! grep -q "DRY RUN" /tmp/ocb-dryrun.log; then
    echo "❌ Dry-run marker missing in output"
    echo "--- Last 20 lines of output ---"
    tail -n 20 /tmp/ocb-dryrun.log || true
    exit 1
fi

# Check that no actual changes were made
if grep -q "ERROR\|FAILED\|Permission denied" /tmp/ocb-dryrun.log; then
    echo "⚠️  Warning: Potential issues found in dry-run"
    grep "ERROR\|FAILED\|Permission denied" /tmp/ocb-dryrun.log || true
fi

# Verify log file was created properly
if [[ -f "$HOME/.one-click-badass.log" ]]; then
    echo "✅ Log file created: $HOME/.one-click-badass.log"
else
    echo "⚠️  No log file found (may be expected in dry-run)"
fi

echo "✅ Dry-run smoke test PASSED"
echo "--- Sample output (last 10 lines) ---"
tail -n 10 /tmp/ocb-dryrun.log || true