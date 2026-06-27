#!/usr/bin/env bash
#
# Reproducible web (PWA) bundle build for the cockpit-pwa container.
#
# WHY THIS SCRIPT EXISTS:
#   `npx expo export -p web` fails out-of-the-box in this monorepo with
#   "Invalid call ... process.env.EXPO_ROUTER_APP_ROOT" because babel-preset-expo
#   (hoisted to the repo root) cannot resolve expo-router (nested in
#   packages/app/node_modules). The root cause is dependency drift: a transitive
#   loose `expo` range floats expo@56 to the repo root, displacing the SDK55
#   expo-router so it never hoists. babel-preset-expo's hasModule('expo-router')
#   gate then fails and the expo-router babel transform (which injects
#   EXPO_ROUTER_APP_ROOT) is never applied.
#
#   This script bridges resolution with an idempotent symlink so the export is
#   reproducible. The cleaner long-term fix is to de-drift the root tree to a
#   single SDK55 (see docs/architecture/cockpit.md "PWA build" — tracked follow-up);
#   until then, this script is the supported, reproducible web-build entrypoint.
#
# OUTPUT: packages/app/dist  (consumed by packages/app/Dockerfile.web)
#
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$HERE/.." && pwd)"            # packages/app
ROOT_DIR="$(cd "$APP_DIR/../.." && pwd)"     # repo root (workspace root)

# 1. Make expo-router resolvable from the repo root (where babel-preset-expo lives).
LINK="$ROOT_DIR/node_modules/expo-router"
TARGET="../packages/app/node_modules/expo-router"
if [ ! -e "$LINK" ]; then
  ln -s "$TARGET" "$LINK"
  echo "[build-web] linked expo-router into repo-root node_modules"
else
  echo "[build-web] expo-router already resolvable from root"
fi

# 2. Export the static web bundle.
cd "$APP_DIR"
rm -rf dist
echo "[build-web] running: expo export -p web"
EXPO_ROUTER_APP_ROOT="$APP_DIR/app" npx expo export -p web

if [ ! -f "$APP_DIR/dist/index.html" ]; then
  echo "[build-web] ERROR: export did not produce dist/index.html" >&2
  exit 1
fi
echo "[build-web] OK -> $APP_DIR/dist ($(du -sh "$APP_DIR/dist" | cut -f1))"
echo "[build-web] next: docker build -f packages/app/Dockerfile.web -t cockpit-pwa:latest packages/app"
