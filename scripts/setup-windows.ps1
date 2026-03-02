# Cardo
# Run as: powershell -ExecutionPolicy Bypass -File scripts\setup-windows.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step { param([string]$msg) Write-Host "`n=> $msg" -ForegroundColor Cyan }
function Write-Ok   { param([string]$msg) Write-Host "   $msg" -ForegroundColor Green }
function Write-Warn { param([string]$msg) Write-Host "   $msg" -ForegroundColor Yellow }
function Write-Err  { param([string]$msg) Write-Host "   $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "Cardo Development Setup"
Write-Host "======================="
Write-Host ""

$missing = @()

# --- WebView2 ---
Write-Step "Checking WebView2 Runtime..."
$wv2 = Get-ItemProperty -Path "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" -ErrorAction SilentlyContinue
if (-not $wv2) {
    $wv2 = Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" -ErrorAction SilentlyContinue
}
if ($wv2) {
    Write-Ok "WebView2 is installed (version $($wv2.pv))"
} else {
    Write-Warn "WebView2 not found. It is pre-installed on Windows 10 (1803+) and Windows 11."
    Write-Warn "If builds fail, install it from: https://developer.microsoft.com/en-us/microsoft-edge/webview2/"
    $missing += "WebView2 (may already be available)"
}

# --- MSVC Build Tools ---
Write-Step "Checking MSVC Build Tools..."
$vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$hasMSVC = $false
if (Test-Path $vsWhere) {
    $vsInstalls = & $vsWhere -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath 2>$null
    if ($vsInstalls) { $hasMSVC = $true }
}
if ($hasMSVC) {
    Write-Ok "MSVC Build Tools found"
} else {
    Write-Warn "MSVC Build Tools not found."
    Write-Host "   Install Visual Studio Build Tools with the 'Desktop development with C++' workload."
    Write-Host "   Download: https://visualstudio.microsoft.com/visual-cpp-build-tools/"

    $install = Read-Host "`n   Attempt to install via winget? (y/N)"
    if ($install -eq 'y') {
        Write-Host "   Installing Visual Studio Build Tools (this may take a while)..."
        winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "Build Tools installed. You may need to restart your terminal."
        } else {
            Write-Err "Installation failed. Please install manually."
            $missing += "MSVC Build Tools"
        }
    } else {
        $missing += "MSVC Build Tools"
    }
}

# --- Rust ---
Write-Step "Checking Rust..."
$rustc = Get-Command rustc -ErrorAction SilentlyContinue
if ($rustc) {
    $rustVersion = & rustc --version
    Write-Ok "Rust is installed ($rustVersion)"
} else {
    Write-Warn "Rust not found."

    $install = Read-Host "   Install Rust via rustup? (y/N)"
    if ($install -eq 'y') {
        Write-Host "   Downloading rustup-init..."
        $rustupInit = "$env:TEMP\rustup-init.exe"
        Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile $rustupInit
        & $rustupInit -y
        if ($LASTEXITCODE -eq 0) {
            # Add cargo to current session PATH
            $env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
            Write-Ok "Rust installed. Restart your terminal for PATH changes to take effect."
        } else {
            Write-Err "Rust installation failed."
            $missing += "Rust"
        }
    } else {
        Write-Host "   Install from: https://rustup.rs"
        $missing += "Rust"
    }
}

# --- Node.js (>= 18 required) ---
Write-Step "Checking Node.js..."
$node = Get-Command node -ErrorAction SilentlyContinue
$nodeOk = $false
if ($node) {
    $nodeVersion = & node --version
    $major = [int]($nodeVersion -replace '^v(\d+).*', '$1')
    if ($major -ge 18) {
        Write-Ok "Node.js is installed ($nodeVersion)"
        $nodeOk = $true
    } else {
        Write-Warn "Node.js $nodeVersion is too old. Version 18+ is required."
        Write-Host "   Update from: https://nodejs.org"
        $missing += "Node.js >= 18 (current: $nodeVersion)"
    }
} else {
    Write-Warn "Node.js not found."
    Write-Host "   Install Node.js LTS from: https://nodejs.org"
    $missing += "Node.js"
}

# --- pnpm ---
Write-Step "Checking pnpm..."
$pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if ($pnpm) {
    $pnpmVersion = & pnpm --version
    Write-Ok "pnpm is installed ($pnpmVersion)"
} else {
    if ($nodeOk) {
        $install = Read-Host "   pnpm not found. Install via npm? (y/N)"
        if ($install -eq 'y') {
            npm install -g pnpm
            if ($LASTEXITCODE -eq 0) {
                # Add npm global bin directory to the current session PATH
                $npmPrefix = & npm config get prefix
                $npmBin = Join-Path $npmPrefix ""
                if ($env:PATH -notlike "*$npmBin*") {
                    $env:PATH = "$npmBin;$env:PATH"
                }
                Write-Ok "pnpm installed."
            } else {
                Write-Err "pnpm installation failed."
                $missing += "pnpm"
            }
        } else {
            $missing += "pnpm"
        }
    } else {
        Write-Warn "pnpm not found (install Node.js 18+ first)."
        $missing += "pnpm"
    }
}

# --- Summary ---
Write-Host ""
Write-Host "----------------------------------"
if ($missing.Count -eq 0) {
    Write-Host "All dependencies satisfied!" -ForegroundColor Green
    Write-Host "Run 'pnpm install' then 'pnpm tauri dev' to start developing.`n"
} else {
    Write-Host "Missing dependencies:" -ForegroundColor Yellow
    foreach ($m in $missing) { Write-Host "  - $m" -ForegroundColor Yellow }
    Write-Host "`nInstall the above, then re-run this script to verify.`n"
}
