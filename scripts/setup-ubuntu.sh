#!/usr/bin/env bash
# Cardo
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

step()  { printf '\n\033[36m=> %s\033[0m\n' "$1"; }
ok()    { printf '   \033[32m%s\033[0m\n' "$1"; }
warn()  { printf '   \033[33m%s\033[0m\n' "$1"; }
fail()  { printf '   \033[31m%s\033[0m\n' "$1"; }

echo ""
echo "Cardo Development Setup"
echo "For Ubuntu/Debian Linux"
echo "======================="

if ! command -v apt-get &>/dev/null; then
    fail "This script requires apt-get (Debian/Ubuntu)."
    exit 1
fi

missing=()

# --- System packages for Tauri v2 ---
step "Installing system packages for Tauri v2..."

PACKAGES=(
    build-essential
    curl
    wget
    file
    libssl-dev
    libwebkit2gtk-4.1-dev
    libappindicator3-dev
    librsvg2-dev
    patchelf
)

sudo apt-get update || warn "Some repositories failed to update (non-fatal)."
sudo apt-get install -y "${PACKAGES[@]}"
ok "System packages installed."

# --- Rust ---
step "Checking Rust..."
if command -v rustc &>/dev/null; then
    ok "Rust installed ($(rustc --version))"
else
    warn "Rust not found."
    read -rp "   Install via rustup? (y/N) " ans
    if [[ "$ans" == "y" ]]; then
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        # shellcheck disable=SC1091
        source "$HOME/.cargo/env"
        ok "Rust installed ($(rustc --version))"
    else
        echo "   Install from: https://rustup.rs"
        missing+=("Rust")
    fi
fi

# --- Node.js (>= 18 required) ---
step "Checking Node.js..."
node_ok=false
if command -v node &>/dev/null; then
    node_ver=$(node --version)
    node_major=${node_ver#v}
    node_major=${node_major%%.*}
    if [[ "$node_major" -ge 18 ]]; then
        ok "Node.js installed ($node_ver)"
        node_ok=true
    else
        warn "Node.js $node_ver is too old. Version 18+ is required."
        echo "   Update from: https://nodejs.org"
        echo "   Or via NodeSource: curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs"
        missing+=("Node.js >= 18 (current: $node_ver)")
    fi
else
    warn "Node.js not found."
    echo "   Install Node.js LTS from: https://nodejs.org"
    echo "   Or via NodeSource: curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs"
    missing+=("Node.js")
fi

# --- pnpm ---
step "Checking pnpm..."
if command -v pnpm &>/dev/null; then
    ok "pnpm installed ($(pnpm --version))"
else
    if [[ "$node_ok" == true ]]; then
        read -rp "   pnpm not found. Install via npm? (y/N) " ans
        if [[ "$ans" == "y" ]]; then
            sudo npm install -g pnpm
            ok "pnpm installed."
        else
            missing+=("pnpm")
        fi
    else
        warn "pnpm not found (install Node.js 18+ first)."
        missing+=("pnpm")
    fi
fi

# --- VS Code config ---
step "Setting up VS Code config..."
cp "$SCRIPT_DIR/../.vscode/launch.linux.json" "$SCRIPT_DIR/../.vscode/launch.json"
ok "Copied launch.linux.json → .vscode/launch.json"

# --- Summary ---
echo ""
echo "----------------------------------"
if [[ ${#missing[@]} -eq 0 ]]; then
    echo -e "\033[32mAll dependencies satisfied!\033[0m"
    echo "Run 'pnpm install' then 'pnpm tauri dev' to start developing."
else
    echo -e "\033[33mMissing dependencies:\033[0m"
    for m in "${missing[@]}"; do echo "  - $m"; done
    echo ""
    echo "Install the above, then re-run this script to verify."
fi
echo ""
