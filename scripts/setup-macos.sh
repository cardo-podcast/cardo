#!/usr/bin/env bash
# Cardo
set -euo pipefail

step()  { printf '\n\033[36m=> %s\033[0m\n' "$1"; }
ok()    { printf '   \033[32m%s\033[0m\n' "$1"; }
warn()  { printf '   \033[33m%s\033[0m\n' "$1"; }
fail()  { printf '   \033[31m%s\033[0m\n' "$1"; }

echo ""
echo "Cardo Development Setup"
echo "For macOS"
echo "======================="

missing=()

# --- Xcode Command Line Tools ---
step "Checking Xcode Command Line Tools..."
if xcode-select -p &>/dev/null; then
    ok "Xcode CLT installed ($(xcode-select -p))"
else
    warn "Xcode Command Line Tools not found."
    read -rp "   Install now? (y/N) " ans
    if [[ "$ans" == "y" ]]; then
        xcode-select --install
        echo "   Follow the dialog to complete installation, then re-run this script."
        exit 0
    else
        echo "   Install with: xcode-select --install"
        missing+=("Xcode Command Line Tools")
    fi
fi

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
        echo "   Or via Homebrew: brew install node"
        missing+=("Node.js >= 18 (current: $node_ver)")
    fi
else
    warn "Node.js not found."
    echo "   Install Node.js LTS from: https://nodejs.org"
    echo "   Or via Homebrew: brew install node"
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
            npm install -g pnpm
            ok "pnpm installed."
        else
            missing+=("pnpm")
        fi
    else
        warn "pnpm not found (install Node.js 18+ first)."
        missing+=("pnpm")
    fi
fi

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
