#!/bin/bash
set -e

cd "$(dirname "$0")"
bun install

if [ -f "svc/backend/package.json" ]; then
  cd svc/backend
  bun install
fi
