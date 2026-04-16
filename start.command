#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#   Academic DSS — One-Click Startup (Double-click in Finder)
# ═══════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

clear
echo "╔══════════════════════════════════════╗"
echo "║  🎓  Academic DSS — Starting Up      ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Find Python
if command -v python3 &>/dev/null; then
    PYTHON=python3
elif command -v python &>/dev/null; then
    PYTHON=python
else
    echo "❌  Python not found!"
    echo "    Install from: https://www.python.org/downloads/"
    read -p "Press Enter to exit..."; exit 1
fi
echo "✅  Python: $($PYTHON --version)"

# Kill anything on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null
sleep 1

# Start the server (no pip needed!)
echo "🚀  Starting server..."
cd "$SCRIPT_DIR"
$PYTHON run.py
