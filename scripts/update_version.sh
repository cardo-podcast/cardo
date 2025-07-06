#!/bin/bash
set -e

new_version="$1"

if [[ -z "$new_version" ]]; then
    echo "Please include a version argument"
    exit 1
fi

# Update package.json
jq --arg v "$new_version" '.version = $v' package.json > tmp && mv tmp package.json

# Update tauri.conf.json
jq --arg v "$new_version" '.version = $v' src-tauri/tauri.conf.json > tmp && mv tmp src-tauri/tauri.conf.json

# Update Cargo.toml
sed -i.bak '/^\[package\]/,/^\[/{s/^version = .*/version = "'"$new_version"'"/}' src-tauri/Cargo.toml
rm src-tauri/Cargo.toml.bak

# Git operations
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "updated version to $new_version"